package com.quickstay.Security;

import com.quickstay.Entities.PasswordResetTokenEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Repositories.PasswordResetTokenRepository;
import com.quickstay.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration TOKEN_LIFETIME = Duration.ofMinutes(30);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final String INVALID_LINK = "Reset link is invalid or has expired";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer mailer;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /** Always returns normally so callers cannot tell whether the email has an account. */
    @Transactional
    public void requestReset(String email) {
        Optional<UserEntity> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            return;
        }
        UserEntity user = found.get();

        Instant now = Instant.now();
        boolean askedRecently = tokenRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .map(latest -> latest.getCreatedAt().isAfter(now.minus(RESEND_COOLDOWN)))
                .orElse(false);
        if (askedRecently) {
            return;
        }

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setUser(user);
        token.setTokenHash(sha256Hex(rawToken));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plus(TOKEN_LIFETIME));
        tokenRepository.save(token);

        try {
            mailer.sendResetLink(email, frontendUrl + "/reset-password?token=" + rawToken);
        } catch (RuntimeException e) {
            log.error("Could not send password reset email", e);
        }
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetTokenEntity token = tokenRepository.findByTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new IllegalArgumentException(INVALID_LINK));
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException(INVALID_LINK);
        }

        UserEntity user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.deleteByUser(user);
    }

    private static String sha256Hex(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
