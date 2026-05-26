package com.quickstay.Integration;

import com.quickstay.Dto.BookingDTO;
import com.quickstay.Dto.BookingPaymentInitResponseDTO;
import com.quickstay.Dto.BookingRequest;
import com.quickstay.Dto.GuestDTO;
import com.quickstay.Dto.HotelPriceDTO;
import com.quickstay.Dto.HotelSearchRequest;
import com.quickstay.Dto.RazorpayVerifyDTO;
import com.quickstay.Entities.BookingEntity;
import com.quickstay.Entities.HotelEntity;
import com.quickstay.Entities.InventoryEntity;
import com.quickstay.Entities.RoomEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.BookingStatus;
import com.quickstay.Enums.Gender;
import com.quickstay.Enums.Role;
import com.quickstay.Repositories.BookingRepository;
import com.quickstay.Repositories.GuestRepository;
import com.quickstay.Repositories.HotelRepository;
import com.quickstay.Repositories.InventoryRepository;
import com.quickstay.Repositories.RoomRepository;
import com.quickstay.Repositories.UserRepository;
import com.quickstay.Service.Interfaces.BookingService;
import com.quickstay.Service.Interfaces.CheckoutService;
import com.quickstay.Service.Interfaces.InventoryService;
import com.quickstay.Testcontainers.PostgresTestBase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class BookingPaymentFlowTest extends PostgresTestBase {

    private static final String ORDER_ID = "order_integration_test";
    private static final String PAYMENT_ID = "pay_integration_test";
    private static final String RAZORPAY_SECRET = "razorpay_test_secret_dummy";

    @Autowired private BookingService bookingService;
    @Autowired private InventoryService inventoryService;
    @Autowired private UserRepository userRepository;
    @Autowired private HotelRepository hotelRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private GuestRepository guestRepository;

    @MockBean private CheckoutService checkoutService;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        cleanDatabase();
    }

    @Test
    void booking_payment_flow_confirms_booking_and_moves_inventory_from_reserved_to_booked() {
        BookingFixture fixture = createBookingFixture("payment-success");
        setCurrentUser(fixture.guest());
        mockCheckoutOrder();

        BookingDTO booking = bookingService.initialiseBooking(bookingRequest(fixture));
        bookingService.addGuests(booking.getId(), List.of(guest("Integration Guest")));

        BookingPaymentInitResponseDTO payment = bookingService.initiatePayments(booking.getId());
        assertThat(payment.getOrderId()).isEqualTo(ORDER_ID);
        assertThat(payment.getCurrency()).isEqualTo("INR");
        assertThat(payment.getAmount()).isPositive();
        assertThat(payment.getKeyId()).isEqualTo("rzp_test_dummy");

        RazorpayVerifyDTO verifyDTO = verifyDto(ORDER_ID, PAYMENT_ID,
                signatureFor(ORDER_ID, PAYMENT_ID, RAZORPAY_SECRET));
        BookingDTO confirmed = bookingService.verifyPayment(booking.getId(), verifyDTO);

        assertThat(confirmed.getBookingStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getBookingStatus())
                .isEqualTo(BookingStatus.CONFIRMED);
        assertInventoryCounts(fixture.room(), 0, 1);
    }

    @Test
    void invalid_or_mismatched_payment_verification_does_not_confirm_booking() {
        BookingFixture fixture = createBookingFixture("payment-failure");
        setCurrentUser(fixture.guest());
        mockCheckoutOrder();

        BookingDTO booking = bookingService.initialiseBooking(bookingRequest(fixture));
        bookingService.addGuests(booking.getId(), List.of(guest("Failure Guest")));
        bookingService.initiatePayments(booking.getId());

        RazorpayVerifyDTO mismatchedOrder = verifyDto("order_other", PAYMENT_ID,
                signatureFor("order_other", PAYMENT_ID, RAZORPAY_SECRET));
        assertThatThrownBy(() -> bookingService.verifyPayment(booking.getId(), mismatchedOrder))
                .hasMessageContaining("order id does not match");

        RazorpayVerifyDTO invalidSignature = verifyDto(ORDER_ID, PAYMENT_ID, "bad_signature");
        assertThatThrownBy(() -> bookingService.verifyPayment(booking.getId(), invalidSignature))
                .hasMessageContaining("invalid signature");

        BookingEntity storedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(storedBooking.getBookingStatus()).isEqualTo(BookingStatus.PAYMENTS_PENDING);
        assertInventoryCounts(fixture.room(), 1, 0);
    }

    @Test
    void payment_cannot_start_before_guests_are_added() {
        BookingFixture fixture = createBookingFixture("guest-required");
        setCurrentUser(fixture.guest());

        BookingDTO booking = bookingService.initialiseBooking(bookingRequest(fixture));

        assertThatThrownBy(() -> bookingService.initiatePayments(booking.getId()))
                .hasMessageContaining("Guests must be added");

        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getBookingStatus())
                .isEqualTo(BookingStatus.RESERVED);
        assertInventoryCounts(fixture.room(), 1, 0);
    }

    @Test
    void search_requires_one_room_to_be_available_for_the_whole_requested_date_range() {
        UserEntity manager = user("search-manager@example.com", Role.HOTEL_MANAGER);
        HotelEntity hotel = hotel("Search Correctness Hotel", "Delhi", manager);
        RoomEntity firstRoom = room(hotel, "Partial A", 1000);
        RoomEntity secondRoom = room(hotel, "Partial B", 1200);
        RoomEntity continuousRoom = room(hotel, "Continuous", 900);
        LocalDate start = LocalDate.now().plusDays(40);
        LocalDate end = start.plusDays(1);

        inventory(hotel, firstRoom, start, 0, 0, 1, 1000, false);
        inventory(hotel, secondRoom, end, 0, 0, 1, 1200, false);

        Page<HotelPriceDTO> partialOnly = inventoryService.searchHotels(searchRequest("Delhi", start, end));
        assertThat(partialOnly.getContent()).isEmpty();

        inventory(hotel, continuousRoom, start, 0, 0, 1, 900, false);
        inventory(hotel, continuousRoom, end, 0, 0, 1, 900, false);

        Page<HotelPriceDTO> withContinuousRoom = inventoryService.searchHotels(searchRequest("Delhi", start, end));
        assertThat(withContinuousRoom.getContent()).hasSize(1);
        assertThat(withContinuousRoom.getContent().get(0).getHotel().getId()).isEqualTo(hotel.getId());
        assertThat(withContinuousRoom.getContent().get(0).getPrice()).isEqualTo(900.0);
    }

    private void mockCheckoutOrder() {
        when(checkoutService.createOrder(any(BookingEntity.class))).thenAnswer(invocation -> {
            BookingEntity booking = invocation.getArgument(0);
            booking.setPaymentSessionId(ORDER_ID);
            bookingRepository.save(booking);
            long amountInPaise = booking.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
            return new BookingPaymentInitResponseDTO(ORDER_ID, amountInPaise, "INR", "rzp_test_dummy");
        });
    }

    private BookingFixture createBookingFixture(String suffix) {
        UserEntity guest = user("payment-check-guest-" + suffix + "@example.com", Role.GUEST);
        UserEntity manager = user("payment-check-manager-" + suffix + "@example.com", Role.HOTEL_MANAGER);
        HotelEntity hotel = hotel("Payment Check Hotel " + suffix, "Delhi", manager);
        RoomEntity room = room(hotel, "Double", 1000);
        LocalDate start = LocalDate.now().plusDays(30);
        LocalDate end = start.plusDays(1);
        inventory(hotel, room, start, 0, 0, 2, 1000, false);
        inventory(hotel, room, end, 0, 0, 2, 1000, false);
        return new BookingFixture(guest, hotel, room, start, end);
    }

    private UserEntity user(String email, Role role) {
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setPassword("encoded-password");
        user.setName(email);
        user.setRoles(Set.of(role));
        return userRepository.save(user);
    }

    private HotelEntity hotel(String name, String city, UserEntity owner) {
        HotelEntity hotel = new HotelEntity();
        hotel.setName(name);
        hotel.setCity(city);
        hotel.setActive(true);
        hotel.setOwner(owner);
        return hotelRepository.save(hotel);
    }

    private RoomEntity room(HotelEntity hotel, String type, int basePrice) {
        RoomEntity room = new RoomEntity();
        room.setHotel(hotel);
        room.setType(type);
        room.setBasePrice(BigDecimal.valueOf(basePrice));
        room.setTotalCount(2);
        room.setCapacity(2);
        return roomRepository.save(room);
    }

    private InventoryEntity inventory(HotelEntity hotel, RoomEntity room, LocalDate date, int booked,
                                      int reserved, int total, int price, boolean closed) {
        InventoryEntity inventory = InventoryEntity.builder()
                .hotel(hotel)
                .room(room)
                .date(date)
                .bookCount(booked)
                .reservedCount(reserved)
                .totalCount(total)
                .surgeFactor(BigDecimal.ONE)
                .price(BigDecimal.valueOf(price))
                .city(hotel.getCity())
                .closed(closed)
                .build();
        return inventoryRepository.save(inventory);
    }

    private BookingRequest bookingRequest(BookingFixture fixture) {
        BookingRequest request = new BookingRequest();
        request.setHotelId(fixture.hotel().getId());
        request.setRoomId(fixture.room().getId());
        request.setCheckInDate(fixture.start());
        request.setCheckOutDate(fixture.end());
        request.setRoomsCount(1);
        return request;
    }

    private HotelSearchRequest searchRequest(String city, LocalDate start, LocalDate end) {
        HotelSearchRequest request = new HotelSearchRequest();
        request.setCity(city);
        request.setStartDate(start);
        request.setEndDate(end);
        request.setRoomsCount(1);
        request.setPage(0);
        request.setSize(10);
        return request;
    }

    private GuestDTO guest(String name) {
        GuestDTO guest = new GuestDTO();
        guest.setName(name);
        guest.setGender(Gender.MALE);
        guest.setAge(30);
        return guest;
    }

    private void setCurrentUser(UserEntity user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private void assertInventoryCounts(RoomEntity room, int reservedCount, int bookCount) {
        List<InventoryEntity> inventories = inventoryRepository.findByRoomOrderByDate(room);
        assertThat(inventories).hasSize(2);
        assertThat(inventories)
                .allSatisfy(inventory -> {
                    assertThat(inventory.getReservedCount()).isEqualTo(reservedCount);
                    assertThat(inventory.getBookCount()).isEqualTo(bookCount);
                });
    }

    private RazorpayVerifyDTO verifyDto(String orderId, String paymentId, String signature) {
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
            for (byte b : hash) {
                signature.append(String.format("%02x", b));
            }
            return signature.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Could not create test Razorpay signature", e);
        }
    }

    private void cleanDatabase() {
        bookingRepository.deleteAll();
        guestRepository.deleteAll();
        inventoryRepository.deleteAll();
        roomRepository.deleteAll();
        hotelRepository.deleteAll();
        userRepository.deleteAll();
    }

    private record BookingFixture(UserEntity guest, HotelEntity hotel, RoomEntity room, LocalDate start, LocalDate end) {
    }
}
