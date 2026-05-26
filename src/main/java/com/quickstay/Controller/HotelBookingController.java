package com.quickstay.Controller;

import com.quickstay.Dto.*;
import com.quickstay.Service.Interfaces.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Booking Flow", description = "Operations related to booking and payments")
public class HotelBookingController {

    private final BookingService bookingService;

    @PostMapping("/init")
    @Operation(summary = "Initialize a new booking", tags = {"Booking Flow"})
    public ResponseEntity<BookingDTO> initialiseBooking(@Valid @RequestBody BookingRequest bookingRequest) {
        return ResponseEntity.ok(bookingService.initialiseBooking(bookingRequest));
    }

    @PostMapping("/{bookingId}/addGuests")
    @Operation(summary = "Add guests to a booking", tags = {"Booking Guests"})
    public ResponseEntity<BookingDTO> addGuests(@PathVariable Long bookingId,
                                                @Valid @RequestBody List<@Valid GuestDTO> guestDtoList) {
        return ResponseEntity.ok(bookingService.addGuests(bookingId, guestDtoList));
    }

    @PostMapping("/{bookingId}/payments")
    @Operation(summary = "Create Razorpay order for the booking", tags = {"Booking Flow"})
    public ResponseEntity<BookingPaymentInitResponseDTO> initiatePayment(@PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.initiatePayments(bookingId));
    }

    @PostMapping("/{bookingId}/verify-payment")
    @Operation(summary = "Verify Razorpay payment and confirm booking", tags = {"Booking Flow"})
    public ResponseEntity<BookingDTO> verifyPayment(@PathVariable Long bookingId,
                                                    @Valid @RequestBody RazorpayVerifyDTO verifyDTO) {
        return ResponseEntity.ok(bookingService.verifyPayment(bookingId, verifyDTO));
    }

    @PostMapping("/{bookingId}/cancel")
    @Operation(summary = "Cancel the booking", tags = {"Booking Flow"})
    public ResponseEntity<Void> cancelBooking(@PathVariable Long bookingId) {
        bookingService.cancelBooking(bookingId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{bookingId}/mock-confirm")
    @Operation(summary = "Mock-confirm booking without payment (dev/demo only)", tags = {"Booking Flow"})
    public ResponseEntity<BookingDTO> mockConfirm(@PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.mockConfirmBooking(bookingId));
    }

    @GetMapping("/{bookingId}")
    @Operation(summary = "Get booking details", tags = {"Booking Flow"})
    public ResponseEntity<BookingDTO> getBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.getBookingById(bookingId));
    }

    @GetMapping("/{bookingId}/status")
    @Operation(summary = "Check the status of the booking", tags = {"Booking Flow"})
    public ResponseEntity<BookingStatusResponseDTO> getBookingStatus(@PathVariable Long bookingId) {
        return ResponseEntity.ok(new BookingStatusResponseDTO(bookingService.getBookingStatus(bookingId)));
    }
}
