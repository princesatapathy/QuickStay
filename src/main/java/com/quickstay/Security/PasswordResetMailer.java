package com.quickstay.Security;

public interface PasswordResetMailer {
    void sendResetLink(String toEmail, String resetUrl);
}
