package com.quickstay.Controller;

import com.quickstay.Dto.UserDTO;
import com.quickstay.Security.AuthService;
import com.quickstay.Security.JWTAuthFilter;
import com.quickstay.Advice.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private AuthService authService;
    @MockBean private JWTAuthFilter jwtAuthFilter;

    @Test
    void login_sets_refresh_cookie_and_returns_access_token() throws Exception {
        when(authService.login(org.mockito.ArgumentMatchers.any())).thenReturn(new String[]{"access", "refresh"});

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"a@b.com","password":"pw"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("access"))
                .andExpect(cookie().exists("refreshToken"));
    }

    @Test
    void signup_manager_returns_created_user() throws Exception {
        UserDTO userDTO = new UserDTO();
        userDTO.setEmail("manager@example.com");
        userDTO.setName("Manager User");
        when(authService.signUpManager(org.mockito.ArgumentMatchers.any())).thenReturn(userDTO);

        mockMvc.perform(post("/auth/signup-manager")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Manager User","email":"manager@example.com","password":"password123","managerCode":"invite-123"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value("manager@example.com"));
    }

    @Test
    void refresh_without_cookie_returns_401() throws Exception {
        mockMvc.perform(post("/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_with_cookie_returns_new_access_token() throws Exception {
        when(authService.refreshToken(anyString())).thenReturn("newAccess");

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "abc")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("newAccess"));
    }
}

