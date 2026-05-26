package com.quickstay.Controller;

import com.quickstay.Advice.GlobalExceptionHandler;
import com.quickstay.Security.JWTAuthFilter;
import com.quickstay.Service.Interfaces.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WebhookController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class WebhookControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private BookingService bookingService;
    @MockBean private JWTAuthFilter jwtAuthFilter;

    @Test
    void payment_webhook_returns_200() throws Exception {
        mockMvc.perform(post("/webhook/payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }
}
