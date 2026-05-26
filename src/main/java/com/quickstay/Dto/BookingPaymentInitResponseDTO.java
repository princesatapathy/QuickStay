package com.quickstay.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingPaymentInitResponseDTO {
    private String orderId;       // Razorpay order ID
    private Long   amount;        // Amount in paise (INR × 100)
    private String currency;      // "INR"
    private String keyId;         // Razorpay public key — safe to expose to frontend
}
