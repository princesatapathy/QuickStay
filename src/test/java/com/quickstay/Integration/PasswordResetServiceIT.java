package com.quickstay.Integration;

import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.Role;
import com.quickstay.Repositories.PasswordResetTokenRepository;
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
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean private PasswordResetMailer mailer;

    @BeforeEach
    void freshUser() {
        tokenRepository.deleteAll();
        userRepository.findByEmail(EMAIL).ifPresent(userRepository::delete);
        UserEntity user = new UserEntity();
        user.setEmail(EMAIL);
        user.setPassword(passwordEncoder.encode("old-password"));
        user.setRoles(Set.of(Role.GUEST));
        userRepository.saveAndFlush(user);
    }

    private String requestAndCaptureToken() {
        passwordResetService.requestReset(EMAIL);
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailer).sendResetLink(eq(EMAIL), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + "token=".length());
    }

    @Test
    void unknown_email_sends_nothing_and_stores_nothing() {
        passwordResetService.requestReset("nobody@example.com");

        verify(mailer, never()).sendResetLink(anyString(), anyString());
        assertThat(tokenRepository.count()).isZero();
    }

    @Test
    void known_email_gets_one_link_and_only_the_hash_is_stored() {
        String rawToken = requestAndCaptureToken();

        assertThat(tokenRepository.findAll()).hasSize(1)
                .allSatisfy(stored -> assertThat(stored.getTokenHash()).isNotEqualTo(rawToken).hasSize(64));
    }

    @Test
    void a_second_request_inside_the_cooldown_sends_no_second_mail() {
        passwordResetService.requestReset(EMAIL);
        passwordResetService.requestReset(EMAIL);

        verify(mailer, times(1)).sendResetLink(eq(EMAIL), anyString());
        assertThat(tokenRepository.count()).isEqualTo(1);
    }

    @Test
    void mail_failure_is_swallowed_so_the_response_cannot_reveal_the_account() {
        doThrow(new IllegalStateException("smtp down")).when(mailer).sendResetLink(anyString(), anyString());

        passwordResetService.requestReset(EMAIL);
    }

    @Test
    void valid_token_changes_the_password_once() {
        String rawToken = requestAndCaptureToken();

        passwordResetService.resetPassword(rawToken, "brand-new-password");

        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("brand-new-password", user.getPassword())).isTrue();
        assertThatThrownBy(() -> passwordResetService.resetPassword(rawToken, "another-password"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unknown_token_is_rejected() {
        assertThatThrownBy(() -> passwordResetService.resetPassword("not-a-real-token", "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void expired_token_is_rejected_and_password_is_unchanged() {
        String rawToken = requestAndCaptureToken();
        tokenRepository.findAll().forEach(stored -> {
            stored.setExpiresAt(Instant.now().minusSeconds(1));
            tokenRepository.saveAndFlush(stored);
        });

        assertThatThrownBy(() -> passwordResetService.resetPassword(rawToken, "brand-new-password"))
                .isInstanceOf(IllegalArgumentException.class);

        UserEntity user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches("old-password", user.getPassword())).isTrue();
    }
}
