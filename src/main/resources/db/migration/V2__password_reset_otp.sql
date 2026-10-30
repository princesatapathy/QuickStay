CREATE TABLE password_reset_otp (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    otp_hash VARCHAR(72) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_password_reset_otp_user UNIQUE (user_id),
    CONSTRAINT fk_password_reset_otp_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);
