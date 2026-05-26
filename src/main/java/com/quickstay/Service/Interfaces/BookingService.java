package com.quickstay.Service.Interfaces;

import com.quickstay.Dto.BookingDTO;
import com.quickstay.Dto.BookingPaymentInitResponseDTO;
import com.quickstay.Dto.BookingRequest;
import com.quickstay.Dto.GuestDTO;
import com.quickstay.Dto.HotelReportDTO;
import com.quickstay.Dto.RazorpayVerifyDTO;
import com.quickstay.Enums.BookingStatus;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {
    BookingDTO initialiseBooking(BookingRequest bookingRequest);

    BookingDTO addGuests(Long bookingId, List<GuestDTO> guestDtoList);

    BookingPaymentInitResponseDTO initiatePayments(Long bookingId);

    BookingDTO verifyPayment(Long bookingId, RazorpayVerifyDTO verifyDTO);

    void cancelBooking(Long bookingId);

    BookingDTO getBookingById(Long bookingId);

    BookingStatus getBookingStatus(Long bookingId);

    List<BookingDTO> getAllBookingsByHotelId(Long hotelId);

    HotelReportDTO getHotelReport(Long hotelId, LocalDate startDate, LocalDate endDate);

    List<BookingDTO> getMyBookings();

    BookingDTO mockConfirmBooking(Long bookingId);
}
