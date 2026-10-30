package com.quickstay.Repositories;

import com.quickstay.Entities.PasswordResetTokenEntity;
import com.quickstay.Entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    Optional<PasswordResetTokenEntity> findFirstByUserOrderByCreatedAtDesc(UserEntity user);

    void deleteByUser(UserEntity user);
}
