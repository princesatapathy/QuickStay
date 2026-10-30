package com.quickstay.Security;

public interface PasswordResetMailer {
    void sendResetCode(String toEmail, String code);
}
