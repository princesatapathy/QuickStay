package com.quickstay.Security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnExpression("!'${spring.mail.host:}'.isEmpty()")
@RequiredArgsConstructor
public class SmtpPasswordResetMailer implements PasswordResetMailer {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@quickstay.local}")
    private String from;

    @Override
    public void sendResetLink(String toEmail, String resetUrl) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("Reset your QuickStay password");
        message.setText("Use this link to choose a new password. It expires in 30 minutes and works once:\n\n"
                + resetUrl + "\n\nIf you did not ask for this, ignore this email.");
        mailSender.send(message);
    }
}
