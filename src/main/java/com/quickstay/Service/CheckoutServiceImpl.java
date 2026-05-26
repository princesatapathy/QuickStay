package com.quickstay.Service;

import com.quickstay.Dto.BookingPaymentInitResponseDTO;
import com.quickstay.Entities.BookingEntity;
import com.quickstay.Repositories.BookingRepository;
import com.quickstay.Service.Interfaces.CheckoutService;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutServiceImpl implements CheckoutService {

    private final BookingRepository bookingRepository;
    private final RazorpayClient razorpayClient;

    @Value("${razorpay.API.key}")
    private String razorpayKeyId;

    @Override
    public BookingPaymentInitResponseDTO createOrder(BookingEntity booking) {
        log.info("Creating Razorpay order for booking ID: {}", booking.getId());
        try {
            // Amount in paise (INR x 100)
            long amountInPaise = booking.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "booking_" + booking.getId());
            orderRequest.put("notes", new JSONObject()
                    .put("bookingId", booking.getId())
                    .put("hotel", booking.getHotel().getName()));

            Order order = razorpayClient.orders.create(orderRequest);
            String orderId = order.get("id");

            // Store Razorpay orderId in paymentSessionId field (reusing existing column)
            booking.setPaymentSessionId(orderId);
            bookingRepository.save(booking);

            log.info("Razorpay order created: {} for booking: {}", orderId, booking.getId());

            return new BookingPaymentInitResponseDTO(orderId, amountInPaise, "INR", razorpayKeyId);

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for booking {}: {}", booking.getId(), e.getMessage());
            throw new RuntimeException("Payment gateway error: " + e.getMessage(), e);
        }
    }
}
