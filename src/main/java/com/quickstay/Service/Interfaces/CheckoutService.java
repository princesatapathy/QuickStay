package com.quickstay.Service.Interfaces;

import com.quickstay.Dto.BookingPaymentInitResponseDTO;
import com.quickstay.Entities.BookingEntity;

public interface CheckoutService {
    BookingPaymentInitResponseDTO createOrder(BookingEntity booking);
}
