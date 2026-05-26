package com.quickstay.Controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Webhook endpoint (placeholder).
 * Razorpay uses client-side callback + server-side /verify-payment instead of webhooks.
 * This endpoint is kept for future webhook integration.
 */
@RestController
@RequestMapping("/webhook")
@Tag(name = "Webhook", description = "Webhook endpoint")
public class WebhookController {

    @PostMapping("/payment")
    @Operation(summary = "Webhook payment handler", tags = {"Webhook"})
    public ResponseEntity<Void> handlePaymentWebhook(@RequestBody String payload) {
        // Razorpay payment verification is handled at /bookings/{id}/verify-payment
        return ResponseEntity.ok().build();
    }
}
