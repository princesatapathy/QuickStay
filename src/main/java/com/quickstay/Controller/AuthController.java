package com.quickstay.Controller;

import com.quickstay.Dto.LoginDTO;
import com.quickstay.Dto.LoginResponseDTO;
import com.quickstay.Dto.ManagerSignUpRequestDTO;
import com.quickstay.Dto.SignUpRequestDTO;
import com.quickstay.Dto.UserDTO;
import com.quickstay.Security.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "User Authentication", description = "Authentication Operations related to users")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/signup")
    @Operation(summary = "Sign up a new user", description = "Creates a new user account.")
    public ResponseEntity<UserDTO> signup(@Valid @RequestBody SignUpRequestDTO signUpRequestDto) {
        return new ResponseEntity<>(authService.signUp(signUpRequestDto), HttpStatus.CREATED);
    }

    @PostMapping("/signup-manager")
    @Operation(summary = "Sign up a hotel manager", description = "Creates a hotel manager account using an invite code.")
    public ResponseEntity<UserDTO> signupManager(@Valid @RequestBody ManagerSignUpRequestDTO signUpRequestDto) {
        return new ResponseEntity<>(authService.signUpManager(signUpRequestDto), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticates a user and returns an JWT access token.")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginDTO loginDto, HttpServletRequest httpServletRequest) {
        String[] tokens = authService.login(loginDto);

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", tokens[1])
                .httpOnly(true)
                .secure(httpServletRequest.isSecure())
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(60L * 60 * 24 * 30 * 6)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(new LoginResponseDTO(tokens[0]));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generates a new access token using a refresh token.")
    public ResponseEntity<LoginResponseDTO> refresh(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            throw new AuthenticationServiceException("Refresh token not found inside the Cookies");
        }

        String refreshToken = Arrays.stream(cookies).
                filter(cookie -> "refreshToken".equals(cookie.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElseThrow(() -> new AuthenticationServiceException("Refresh token not found inside the Cookies"));

        String accessToken = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(new LoginResponseDTO(accessToken));
    }

    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Clears the refresh token cookie.")
    public ResponseEntity<Void> logout(HttpServletRequest httpServletRequest) {
        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(httpServletRequest.isSecure())
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .build();
    }
}
