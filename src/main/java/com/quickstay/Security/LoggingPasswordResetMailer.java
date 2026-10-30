package com.quickstay.Security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Local-only stand-in used when no SMTP host is set. Never active in prod, where the code is a credential. */
@Slf4j
@Component
@Profile("!prod")
@ConditionalOnExpression("'${spring.mail.host:}'.isEmpty()")
public class LoggingPasswordResetMailer implements PasswordResetMailer {

    @Override
    public void sendResetCode(String toEmail, String code) {
        log.warn("No SMTP configured. Password reset code for {}: {}", toEmail, code);
    }
}
