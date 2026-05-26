package com.quickstay.Service;

import com.quickstay.Dto.BookingDTO;
import com.quickstay.Dto.BookingRequest;
import com.quickstay.Dto.GuestDTO;
import com.quickstay.Dto.RazorpayVerifyDTO;
import com.quickstay.Entities.BookingEntity;
import com.quickstay.Entities.GuestEntity;
import com.quickstay.Entities.HotelEntity;
import com.quickstay.Entities.RoomEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.BookingStatus;
import com.quickstay.Exceptions.UnAuthorisedException;
import com.quickstay.Repositories.BookingRepository;
import com.quickstay.Repositories.GuestRepository;
import com.quickstay.Repositories.HotelRepository;
import com.quickstay.Repositories.InventoryRepository;
import com.quickstay.Repositories.RoomRepository;
import com.quickstay.Service.Interfaces.CheckoutService;
import com.quickstay.Strategy.PricingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.modelmapper.ModelMapper;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    @Mock private GuestRepository guestRepository;
    @Mock private ModelMapper modelMapper;
    @Mock private BookingRepository bookingRepository;
    @Mock private HotelRepository hotelRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private CheckoutService checkoutService;
    @Mock private PricingService pricingService;

    @InjectMocks private BookingServiceImpl bookingService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private static UserEntity userWithId(Long id) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setRoles(Set.of(com.quickstay.Enums.Role.GUEST));
        return user;
    }

    @Test
    void initialiseBooking_throws_when_inventory_insufficient() {
        BookingRequest req = new BookingRequest();
        req.setHotelId(1L);
        req.setRoomId(2L);
        req.setCheckInDate(LocalDate.of(2026, 1, 1));
        req.setCheckOutDate(LocalDate.of(2026, 1, 3)); // 3 days (inclusive in service logic)
        req.setRoomsCount(1);

        HotelEntity hotel = new HotelEntity();
        hotel.setId(1L);
        RoomEntity room = new RoomEntity();
        room.setId(2L);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(hotel));
        when(roomRepository.findById(2L)).thenReturn(Optional.of(room));
        when(inventoryRepository.findAndLockAvailableInventory(eq(2L), any(), any(), eq(1)))
                .thenReturn(List.of()); // insufficient

        assertThatThrownBy(() -> bookingService.initialiseBooking(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not available");

        verify(inventoryRepository, never()).initBooking(anyLong(), any(), any(), anyInt());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void addGuests_throws_when_booking_does_not_belong_to_current_user() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        UserEntity otherUser = userWithId(11L);

        BookingEntity booking = new BookingEntity();
        booking.setId(99L);
        booking.setUser(otherUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.RESERVED);
        booking.setGuests(new HashSet<>());

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.addGuests(99L, List.of(new GuestDTO())))
                .isInstanceOf(UnAuthorisedException.class)
                .hasMessageContaining("does not belong");
    }

    @Test
    void addGuests_throws_when_booking_not_reserved() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        BookingEntity booking = new BookingEntity();
        booking.setId(99L);
        booking.setUser(currentUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setGuests(new HashSet<>());

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.addGuests(99L, List.of(new GuestDTO())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cannot add guests");
    }

    @Test
    void initiatePayments_updates_status_to_payments_pending_and_returns_order() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        BookingEntity booking = new BookingEntity();
        booking.setId(123L);
        booking.setUser(currentUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.GUESTS_ADDED);

        com.quickstay.Dto.BookingPaymentInitResponseDTO orderResp =
                new com.quickstay.Dto.BookingPaymentInitResponseDTO(
                        "order_test123", 100000L, "INR", "rzp_test_key");

        when(bookingRepository.findById(123L)).thenReturn(Optional.of(booking));
        when(checkoutService.createOrder(eq(booking))).thenReturn(orderResp);

        com.quickstay.Dto.BookingPaymentInitResponseDTO result =
                bookingService.initiatePayments(123L);

        assertThat(result.getOrderId()).isEqualTo("order_test123");

        ArgumentCaptor<BookingEntity> captor = ArgumentCaptor.forClass(BookingEntity.class);
        verify(bookingRepository).save(captor.capture());
        assertThat(captor.getValue().getBookingStatus()).isEqualTo(BookingStatus.PAYMENTS_PENDING);
    }

    @Test
    void initiatePayments_throws_when_guests_have_not_been_added() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        BookingEntity booking = new BookingEntity();
        booking.setId(123L);
        booking.setUser(currentUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.RESERVED);

        when(bookingRepository.findById(123L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.initiatePayments(123L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Guests must be added");

        verify(checkoutService, never()).createOrder(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void addGuests_initializes_guest_collection_when_missing() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        BookingEntity booking = new BookingEntity();
        booking.setId(99L);
        booking.setUser(currentUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.RESERVED);

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        GuestEntity mappedGuest = new GuestEntity();
        when(modelMapper.map(any(GuestDTO.class), eq(GuestEntity.class))).thenReturn(mappedGuest);
        when(guestRepository.save(any(GuestEntity.class))).thenReturn(mappedGuest);
        when(modelMapper.map(any(BookingEntity.class), eq(BookingDTO.class))).thenReturn(new BookingDTO());
        when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.addGuests(99L, List.of(new GuestDTO()));

        verify(bookingRepository).save(argThat(b ->
                b.getBookingStatus() == BookingStatus.GUESTS_ADDED && b.getGuests().contains(mappedGuest)));
    }

    @Test
    void addGuests_saves_guest_and_sets_status_to_guests_added() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );

        BookingEntity booking = new BookingEntity();
        booking.setId(99L);
        booking.setUser(currentUser);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingStatus(BookingStatus.RESERVED);
        booking.setGuests(new HashSet<>());

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        GuestEntity mappedGuest = new GuestEntity();
        when(modelMapper.map(any(GuestDTO.class), eq(GuestEntity.class))).thenReturn(mappedGuest);
        when(guestRepository.save(any(GuestEntity.class))).thenReturn(mappedGuest);

        BookingDTO mappedBooking = new BookingDTO();
        when(modelMapper.map(any(BookingEntity.class), eq(BookingDTO.class))).thenReturn(mappedBooking);
        when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.addGuests(99L, List.of(new GuestDTO()));

        verify(guestRepository).save(any(GuestEntity.class));
        verify(bookingRepository).save(argThat(b -> b.getBookingStatus() == BookingStatus.GUESTS_ADDED));
    }

    @Test
    void verifyPayment_with_valid_signature_confirms_booking_and_inventory() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );
        ReflectionTestUtils.setField(bookingService, "razorpaySecret", "test_secret");

        BookingEntity booking = paymentPendingBooking(currentUser);
        RazorpayVerifyDTO verifyDTO = verifyDto(
                "order_test123",
                "pay_test123",
                signatureFor("order_test123", "pay_test123", "test_secret")
        );

        when(bookingRepository.findById(123L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelMapper.map(any(BookingEntity.class), eq(BookingDTO.class))).thenReturn(new BookingDTO());

        bookingService.verifyPayment(123L, verifyDTO);

        verify(inventoryRepository).findAndLockReservedInventory(2L,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 3), 1);
        verify(inventoryRepository).confirmBooking(2L,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 3), 1);
        verify(bookingRepository).save(argThat(b -> b.getBookingStatus() == BookingStatus.CONFIRMED));
    }

    @Test
    void verifyPayment_with_invalid_signature_does_not_confirm_booking() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );
        ReflectionTestUtils.setField(bookingService, "razorpaySecret", "test_secret");

        BookingEntity booking = paymentPendingBooking(currentUser);
        RazorpayVerifyDTO verifyDTO = verifyDto("order_test123", "pay_test123", "bad_signature");

        when(bookingRepository.findById(123L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.verifyPayment(123L, verifyDTO))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("invalid signature");

        verify(inventoryRepository, never()).confirmBooking(anyLong(), any(), any(), anyInt());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void verifyPayment_rejects_order_id_that_does_not_match_booking_payment_session() {
        UserEntity currentUser = userWithId(10L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, currentUser.getAuthorities())
        );
        ReflectionTestUtils.setField(bookingService, "razorpaySecret", "test_secret");

        BookingEntity booking = paymentPendingBooking(currentUser);
        RazorpayVerifyDTO verifyDTO = verifyDto(
                "order_other",
                "pay_test123",
                signatureFor("order_other", "pay_test123", "test_secret")
        );

        when(bookingRepository.findById(123L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.verifyPayment(123L, verifyDTO))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("order id does not match");

        verify(inventoryRepository, never()).confirmBooking(anyLong(), any(), any(), anyInt());
        verify(bookingRepository, never()).save(any());
    }

    private static BookingEntity paymentPendingBooking(UserEntity user) {
        HotelEntity hotel = new HotelEntity();
        hotel.setId(1L);
        hotel.setName("Payment Check Hotel");

        RoomEntity room = new RoomEntity();
        room.setId(2L);
        room.setHotel(hotel);

        BookingEntity booking = new BookingEntity();
        booking.setId(123L);
        booking.setUser(user);
        booking.setHotel(hotel);
        booking.setRoom(room);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setCheckInDate(LocalDate.of(2026, 1, 1));
        booking.setCheckOutDate(LocalDate.of(2026, 1, 3));
        booking.setRoomsCount(1);
        booking.setBookingStatus(BookingStatus.PAYMENTS_PENDING);
        booking.setPaymentSessionId("order_test123");
        return booking;
    }

    private static RazorpayVerifyDTO verifyDto(String orderId, String paymentId, String signature) {
        RazorpayVerifyDTO dto = new RazorpayVerifyDTO();
        dto.setRazorpay_order_id(orderId);
        dto.setRazorpay_payment_id(paymentId);
        dto.setRazorpay_signature(signature);
        return dto;
    }

    private static String signatureFor(String orderId, String paymentId, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8));
            StringBuilder signature = new StringBuilder();
            for (byte b : hash) signature.append(String.format("%02x", b));
            return signature.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Could not create test Razorpay signature", e);
        }
    }
}

