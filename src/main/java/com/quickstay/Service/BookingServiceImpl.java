package com.quickstay.Service;

import com.quickstay.Dto.*;
import com.quickstay.Entities.*;
import com.quickstay.Enums.BookingStatus;
import com.quickstay.Exceptions.ResourceNotFoundException;
import com.quickstay.Exceptions.UnAuthorisedException;
import com.quickstay.Repositories.*;
import com.quickstay.Service.Interfaces.BookingService;
import com.quickstay.Service.Interfaces.CheckoutService;
import com.quickstay.Strategy.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

import static com.quickstay.Utils.AppUtils.getCurrentUser;

@Service
@Slf4j
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final GuestRepository guestRepository;
    private final ModelMapper modelMapper;
    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final InventoryRepository inventoryRepository;
    private final CheckoutService checkoutService;
    private final PricingService pricingService;

    @Value("${frontend.url}")
    private String frontendUrl;

    @Value("${razorpay.API.secret}")
    private String razorpaySecret;

    @Override
    @Transactional
    public BookingDTO initialiseBooking(BookingRequest bookingRequest) {
        log.info("Initialising booking for hotel: {}, room: {}, date {}-{}",
                bookingRequest.getHotelId(), bookingRequest.getRoomId(),
                bookingRequest.getCheckInDate(), bookingRequest.getCheckOutDate());

        HotelEntity hotel = hotelRepository.findById(bookingRequest.getHotelId()).orElseThrow(() ->
                new ResourceNotFoundException("Hotel not found with id: " + bookingRequest.getHotelId()));

        RoomEntity room = roomRepository.findById(bookingRequest.getRoomId()).orElseThrow(() ->
                new ResourceNotFoundException("Room not found with id: " + bookingRequest.getRoomId()));

        List<InventoryEntity> inventoryList = inventoryRepository.findAndLockAvailableInventory(
                room.getId(), bookingRequest.getCheckInDate(), bookingRequest.getCheckOutDate(),
                bookingRequest.getRoomsCount());

        long daysCount = ChronoUnit.DAYS.between(bookingRequest.getCheckInDate(), bookingRequest.getCheckOutDate()) + 1;

        if (inventoryList.size() != daysCount) {
            throw new IllegalStateException("Room is not available anymore");
        }

        inventoryRepository.initBooking(room.getId(), bookingRequest.getCheckInDate(),
                bookingRequest.getCheckOutDate(), bookingRequest.getRoomsCount());

        BigDecimal priceForOneRoom = pricingService.calculateTotalPrice(inventoryList);
        BigDecimal totalPrice = priceForOneRoom.multiply(BigDecimal.valueOf(bookingRequest.getRoomsCount()));

        BookingEntity booking = BookingEntity.builder()
                .bookingStatus(BookingStatus.RESERVED)
                .hotel(hotel)
                .room(room)
                .checkInDate(bookingRequest.getCheckInDate())
                .checkOutDate(bookingRequest.getCheckOutDate())
                .user(getCurrentUser())
                .roomsCount(bookingRequest.getRoomsCount())
                .amount(totalPrice)
                .guests(new HashSet<>())
                .build();

        booking = bookingRepository.save(booking);
        return modelMapper.map(booking, BookingDTO.class);
    }

    @Override
    @Transactional
    public BookingDTO addGuests(Long bookingId, List<GuestDTO> guestDtoList) {
        log.info("Adding guests for booking with id: {}", bookingId);

        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(() ->
                new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        if (hasBookingExpired(booking)) {
            throw new IllegalStateException("Booking has already expired");
        }
        if (booking.getBookingStatus() != BookingStatus.RESERVED) {
            throw new IllegalStateException("Booking is not under reserved state, cannot add guests");
        }
        if (booking.getGuests() == null) {
            booking.setGuests(new HashSet<>());
        }

        for (GuestDTO guestDto : guestDtoList) {
            GuestEntity guest;
            if (guestDto.getId() != null) {
                guest = guestRepository.findById(guestDto.getId()).orElseThrow(() ->
                        new ResourceNotFoundException("Guest not found with id: " + guestDto.getId()));
                if (!user.equals(guest.getUser())) {
                    throw new UnAuthorisedException("Guest does not belong to this user with id: " + user.getId());
                }
            } else {
                guest = modelMapper.map(guestDto, GuestEntity.class);
                guest.setUser(user);
                guest = guestRepository.save(guest);
            }
            booking.getGuests().add(guest);
        }

        booking.setBookingStatus(BookingStatus.GUESTS_ADDED);
        booking = bookingRepository.save(booking);
        return modelMapper.map(booking, BookingDTO.class);
    }

    @Override
    @Transactional
    public BookingPaymentInitResponseDTO initiatePayments(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        if (hasBookingExpired(booking)) {
            throw new IllegalStateException("Booking has already expired");
        }
        if (booking.getBookingStatus() != BookingStatus.GUESTS_ADDED) {
            throw new IllegalStateException("Guests must be added before initiating payment");
        }

        BookingPaymentInitResponseDTO responseDTO = checkoutService.createOrder(booking);

        booking.setBookingStatus(BookingStatus.PAYMENTS_PENDING);
        bookingRepository.save(booking);

        return responseDTO;
    }

    @Override
    @Transactional
    public BookingDTO verifyPayment(Long bookingId, RazorpayVerifyDTO verifyDTO) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        if (booking.getPaymentSessionId() == null || booking.getPaymentSessionId().isBlank()) {
            throw new IllegalStateException("Payment has not been initiated for booking with id: " + bookingId);
        }
        if (!booking.getPaymentSessionId().equals(verifyDTO.getRazorpay_order_id())) {
            throw new RuntimeException("Payment verification failed: order id does not match booking");
        }

        // Verify Razorpay HMAC-SHA256 signature
        // Signature = HMAC_SHA256(orderId + "|" + paymentId, keySecret)
        verifyRazorpaySignature(
                verifyDTO.getRazorpay_order_id(),
                verifyDTO.getRazorpay_payment_id(),
                verifyDTO.getRazorpay_signature()
        );

        // Confirm inventory
        inventoryRepository.findAndLockReservedInventory(
                booking.getRoom().getId(), booking.getCheckInDate(),
                booking.getCheckOutDate(), booking.getRoomsCount());

        inventoryRepository.confirmBooking(
                booking.getRoom().getId(), booking.getCheckInDate(),
                booking.getCheckOutDate(), booking.getRoomsCount());

        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking = bookingRepository.save(booking);

        log.info("Payment verified and booking {} confirmed", bookingId);
        return modelMapper.map(booking, BookingDTO.class);
    }

    private void verifyRazorpaySignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            String computed = sb.toString();
            if (!computed.equals(signature)) {
                log.error("Razorpay signature mismatch. Expected: {}, Got: {}", computed, signature);
                throw new RuntimeException("Payment verification failed: invalid signature");
            }
            log.info("Razorpay signature verified successfully");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Payment signature verification error", e);
        }
    }

    @Override
    @Transactional
    public void cancelBooking(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled");
        }

        BookingStatus previousStatus = booking.getBookingStatus();
        booking.setBookingStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        inventoryRepository.findAndLockReservedInventory(booking.getRoom().getId(), booking.getCheckInDate(),
                booking.getCheckOutDate(), booking.getRoomsCount());

        if (previousStatus == BookingStatus.CONFIRMED) {
            inventoryRepository.cancelBooking(booking.getRoom().getId(), booking.getCheckInDate(),
                    booking.getCheckOutDate(), booking.getRoomsCount());
        } else {
            inventoryRepository.cancelReservation(booking.getRoom().getId(), booking.getCheckInDate(),
                    booking.getCheckOutDate(), booking.getRoomsCount());
        }
        // Note: Razorpay refunds must be initiated from Razorpay dashboard or via Razorpay Refund API
        log.info("Booking {} cancelled. Refund (if applicable) must be issued via Razorpay dashboard.", bookingId);
    }

    @Override
    @Transactional
    public BookingDTO mockConfirmBooking(Long bookingId) {
        log.info("Mock-confirming booking with id: {}", bookingId);
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        if (hasBookingExpired(booking)) {
            throw new IllegalStateException("Booking has already expired");
        }
        if (booking.getBookingStatus() == BookingStatus.CONFIRMED) {
            return modelMapper.map(booking, BookingDTO.class);
        }

        inventoryRepository.findAndLockReservedInventory(booking.getRoom().getId(), booking.getCheckInDate(),
                booking.getCheckOutDate(), booking.getRoomsCount());
        inventoryRepository.confirmBooking(booking.getRoom().getId(), booking.getCheckInDate(),
                booking.getCheckOutDate(), booking.getRoomsCount());

        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking = bookingRepository.save(booking);
        return modelMapper.map(booking, BookingDTO.class);
    }

    @Override
    public BookingDTO getBookingById(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        return modelMapper.map(booking, BookingDTO.class);
    }

    @Override
    public BookingStatus getBookingStatus(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElseThrow(
                () -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        UserEntity user = getCurrentUser();
        if (!user.equals(booking.getUser())) {
            throw new UnAuthorisedException("Booking does not belong to this user with id: " + user.getId());
        }
        return booking.getBookingStatus();
    }

    @Override
    public List<BookingDTO> getAllBookingsByHotelId(Long hotelId) {
        HotelEntity hotel = hotelRepository.findById(hotelId).orElseThrow(() ->
                new ResourceNotFoundException("Hotel not found with ID: " + hotelId));
        UserEntity user = getCurrentUser();
        if (!user.equals(hotel.getOwner()))
            throw new AccessDeniedException("You are not the owner of hotel with id: " + hotelId);

        return bookingRepository.findByHotel(hotel)
                .stream()
                .map(e -> modelMapper.map(e, BookingDTO.class))
                .collect(Collectors.toList());
    }

    @Override
    public HotelReportDTO getHotelReport(Long hotelId, LocalDate startDate, LocalDate endDate) {
        HotelEntity hotel = hotelRepository.findById(hotelId).orElseThrow(() ->
                new ResourceNotFoundException("Hotel not found with ID: " + hotelId));
        UserEntity user = getCurrentUser();
        if (!user.equals(hotel.getOwner()))
            throw new AccessDeniedException("You are not the owner of hotel with id: " + hotelId);

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        List<BookingEntity> bookings = bookingRepository.findByHotelAndCreatedAtBetween(hotel, startDateTime, endDateTime);

        Long totalConfirmed = bookings.stream()
                .filter(b -> b.getBookingStatus() == BookingStatus.CONFIRMED)
                .count();

        BigDecimal totalRevenue = bookings.stream()
                .filter(b -> b.getBookingStatus() == BookingStatus.CONFIRMED)
                .map(BookingEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgRevenue = totalConfirmed == 0 ? BigDecimal.ZERO :
                totalRevenue.divide(BigDecimal.valueOf(totalConfirmed), RoundingMode.HALF_UP);

        return new HotelReportDTO(totalConfirmed, totalRevenue, avgRevenue);
    }

    @Override
    public List<BookingDTO> getMyBookings() {
        return bookingRepository.findByUser(getCurrentUser())
                .stream()
                .map(e -> modelMapper.map(e, BookingDTO.class))
                .collect(Collectors.toList());
    }

    public boolean hasBookingExpired(BookingEntity booking) {
        return booking.getCreatedAt().plusMinutes(10).isBefore(LocalDateTime.now());
    }
}
