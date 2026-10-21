package com.nestswap.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends plain-text email. If no SMTP server is configured (spring.mail.host not set),
 * the email is printed to the console instead, so verification codes and alerts
 * can still be tested locally.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> senderProvider;
    private final String from;
    private final boolean configured;

    public MailService(ObjectProvider<JavaMailSender> senderProvider,
                       @Value("${app.mail.from:NestSwap <no-reply@nestswap.local>}") String from,
                       @Value("${spring.mail.host:}") String host) {
        this.senderProvider = senderProvider;
        this.from = from;
        this.configured = host != null && !host.isBlank();
    }

    public void send(String to, String subject, String body) {
        JavaMailSender sender = configured ? senderProvider.getIfAvailable() : null;
        if (sender == null) {
            log.info("""

                    ===== EMAIL (no SMTP configured, printed instead) =====
                    To:      {}
                    Subject: {}

                    {}
                    =======================================================""", to, subject, body);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            sender.send(msg);
        } catch (Exception e) {
            log.warn("Could not send email to {}: {}", to, e.getMessage());
        }
    }
}
