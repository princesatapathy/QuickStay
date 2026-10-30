package com.quickstay.Security;

import com.quickstay.Entities.PasswordResetOtpEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Repositories.PasswordResetOtpRepository;
import com.quickstay.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final String INVALID_CODE = "Code is invalid or has expired";

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer mailer;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Always returns normally so callers cannot tell whether the email has an account. */
    @Transactional
    public void requestReset(String email) {
        Optional<UserEntity> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            return;
        }
        UserEntity user = found.get();

        Instant now = Instant.now();
        Optional<PasswordResetOtpEntity> existing = otpRepository.findByUser(user);
        if (existing.isPresent() && existing.get().getCreatedAt().isAfter(now.minus(RESEND_COOLDOWN))) {
            return;
        }
        existing.ifPresent(otpRepository::delete);
        otpRepository.flush();

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));

        PasswordResetOtpEntity otp = new PasswordResetOtpEntity();
        otp.setUser(user);
        otp.setOtpHash(passwordEncoder.encode(code));
        otp.setCreatedAt(now);
        otp.setExpiresAt(now.plus(CODE_LIFETIME));
        otpRepository.save(otp);

        try {
            mailer.sendResetCode(email, code);
        } catch (RuntimeException e) {
            log.error("Could not send password reset email", e);
        }
    }

    /** A wrong guess must stay committed so the attempt counter works, hence noRollbackFor. */
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void resetPassword(String email, String code, String newPassword) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE));
        PasswordResetOtpEntity otp = otpRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE));

        if (otp.getExpiresAt().isBefore(Instant.now()) || otp.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            otpRepository.delete(otp);
            throw new IllegalArgumentException(INVALID_CODE);
        }
        if (!passwordEncoder.matches(code, otp.getOtpHash())) {
            otp.setFailedAttempts(otp.getFailedAttempts() + 1);
            otpRepository.save(otp);
            throw new IllegalArgumentException(INVALID_CODE);
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpRepository.delete(otp);
    }
}
