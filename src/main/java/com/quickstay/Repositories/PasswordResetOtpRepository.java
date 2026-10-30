package com.quickstay.Repositories;

import com.quickstay.Entities.PasswordResetOtpEntity;
import com.quickstay.Entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtpEntity, Long> {
    Optional<PasswordResetOtpEntity> findByUser(UserEntity user);

    void deleteByUser(UserEntity user);
}
