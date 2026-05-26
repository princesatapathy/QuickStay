package com.quickstay.Controller;

import com.quickstay.Service.Interfaces.BookingService;
import com.quickstay.Security.JWTAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = HotelBookingController.class)
@AutoConfigureMockMvc(addFilters = true)
class HotelBookingControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private BookingService bookingService;
    @MockBean private JWTAuthFilter jwtAuthFilter;

    @Test
    void booking_endpoints_require_authentication() throws Exception {
        mockMvc.perform(get("/bookings/1/status"))
                .andExpect(status().isUnauthorized());
    }
}

