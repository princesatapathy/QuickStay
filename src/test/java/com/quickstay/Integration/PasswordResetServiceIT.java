package com.quickstay.Integration;

import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.Role;
import com.quickstay.Repositories.PasswordResetOtpRepository;
import com.quickstay.Repositories.UserRepository;
import com.quickstay.Security.PasswordResetMailer;
import com.quickstay.Security.PasswordResetService;
import com.quickstay.Testcontainers.PostgresTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
class PasswordResetServiceIT extends PostgresTestBase {

    private static final String EMAIL = "reset-user@example.com";

    @Autowired private PasswordResetService passwordResetService;
    @Autowired private PasswordResetOtpRepository otpRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean private PasswordResetMailer mailer;

    @BeforeEach
    void freshUser() {
        otpRepository.deleteAll();
        userRepository.findByEmail(EMAIL).ifPresent(userRepository::delete);
        UserEntity user = new UserEntity();
        user.setEmail(EMAIL);
        user.setPassword(passwordEncoder.encode("old-password"));
        user.setRoles(Set.of(Role.GUEST));
        userRepository.saveAndFlush(user);
    }

    private String requestAndCaptureCode() {
        passwordResetService.requestReset(EMAIL);
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(mailer).sendResetCode(eq(EMAIL), code.capture());
        return code.getValue();
    }

    private String wrongCodeFor(String realCode) {
        return realCode.equals("000000") ? "111111" : "000000";
    }

    @Test
    void unknown_email_sends_nothing_and_stores_nothing() {
        passwordResetService.requestReset("nobody@example.com");

        verify(mailer, never()).sendResetCode(anyString(), anyString());
        assertThat(otpRepository.count()).isZero();
    }

    @Test
    void known_email_gets_a_six_digit_code_and_only_a_hash_is_stored() {
        String code = requestAndCaptureCode();

        assertThat(code).matches("\\d{6}");
        assertThat(otpRepository.findAll()).hasSize(1)
                .allSatisfy(stored -> assertThat(stored.getOtpHash()).isNotEqualTo(code).startsWith("$2"));
    }

    @Test
    void a_second_request_inside_the_cooldown_sends_no_second_mail() {
        passwordResetService.requestReset(EMAIL);
        passwordResetService.requestReset(EMAIL);

        verify(mailer, times(1)).sendResetCode(eq(EMAIL), anyString());
        assertThat(otpRepository.count()).isEqualTo(1);
    }

    @Test
    void mail_failure_is_swallowed_so_the_response_cannot_reveal_the_account() {
        doThrow(new IllegalStateException("smtp down")).when(mailer).sendResetCode(anyString(), anyString());

        passwordResetService.requestReset(EMAIL);
    }

    @Test
    void valid_code_changes_the_password_once() {
        String code = requestAndCaptureCode();

        passwordResetService.resetPassword(EMAIL, code, "brand-new-password");

        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("brand-new-password", user.getPassword())).isTrue();
        assertThatThrownBy(() -> passwordResetService.resetPassword(EMAIL, code, "another-password"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void wrong_code_is_rejected_and_password_is_unchanged() {
        String code = requestAndCaptureCode();

        assertThatThrownBy(() -> passwordResetService.resetPassword(EMAIL, wrongCodeFor(code), "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class);

        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("old-password", user.getPassword())).isTrue();
    }

    @Test
    void code_for_an_unknown_email_is_rejected_with_the_same_error() {
        assertThatThrownBy(() -> passwordResetService.resetPassword("nobody@example.com", "123456", "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Code is invalid or has expired");
    }

    @Test
    void five_wrong_guesses_burn_the_code_even_for_the_right_answer() {
        String code = requestAndCaptureCode();

        for (int guess = 0; guess < 5; guess++) {
            assertThatThrownBy(() -> passwordResetService.resetPassword(EMAIL, wrongCodeFor(code), "brand-new-password"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        assertThatThrownBy(() -> passwordResetService.resetPassword(EMAIL, code, "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class);
        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("old-password", user.getPassword())).isTrue();
    }

    @Test
    void expired_code_is_rejected_and_password_is_unchanged() {
        String code = requestAndCaptureCode();
        otpRepository.findAll().forEach(stored -> {
            stored.setExpiresAt(Instant.now().minusSeconds(1));
            otpRepository.saveAndFlush(stored);
        });

        assertThatThrownBy(() -> passwordResetService.resetPassword(EMAIL, code, "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class);

        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("old-password", user.getPassword())).isTrue();
    }
}
