package com.nestswap.service;

import com.nestswap.dto.Dtos.*;
import com.nestswap.model.User;
import com.nestswap.repo.UserRepository;
import com.nestswap.security.JwtService;
import com.nestswap.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class AuthService {

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(15);
    private final SecureRandom random = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final MailService mail;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, MailService mail) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.mail = mail;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with that email already exists. Try logging in.");
        }
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setDisplayName(req.displayName().trim());
        users.save(u);
        sendCode(u);   // start verification right away; it's optional but gets them the badge
        return new AuthResponse(jwt.issue(u.getId()), Me.of(u));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .filter(found -> encoder.matches(req.password(), found.getPasswordHash()))
                // Same message for "no such user" and "wrong password" so emails can't be probed.
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        return new AuthResponse(jwt.issue(u.getId()), Me.of(u));
    }

    @Transactional(readOnly = true)
    public Me me(Long userId) {
        return Me.of(load(userId));
    }

    @Transactional
    public Me updateProfile(Long userId, UpdateProfileRequest req) {
        User u = load(userId);
        u.setDisplayName(req.displayName().trim());
        return Me.of(u);
    }

    @Transactional
    public void requestVerification(Long userId) {
        User u = load(userId);
        if (u.isEmailVerified()) throw ApiException.badRequest("Your email is already verified.");
        sendCode(u);
    }

    @Transactional
    public Me confirmVerification(Long userId, String code) {
        User u = load(userId);
        if (u.isEmailVerified()) return Me.of(u);
        boolean valid = u.getVerificationCode() != null
                && u.getVerificationCode().equals(code.trim())
                && u.getVerificationExpires() != null
                && Instant.now().isBefore(u.getVerificationExpires());
        if (!valid) throw ApiException.badRequest("That code is wrong or expired. Request a new one.");
        u.setEmailVerified(true);
        u.setVerificationCode(null);
        u.setVerificationExpires(null);
        return Me.of(u);
    }

    private void sendCode(User u) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        u.setVerificationCode(code);
        u.setVerificationExpires(Instant.now().plus(CODE_LIFETIME));
        String studentNote = u.getEmail().endsWith(".edu")
                ? "\nBecause this is a .edu address, you'll also get the Verified Student badge.\n" : "";
        mail.send(u.getEmail(), "Your NestSwap verification code: " + code,
                "Hi " + u.getDisplayName() + ",\n\n"
                        + "Your verification code is: " + code + "\n"
                        + "It expires in 15 minutes.\n" + studentNote
                        + "\nVerified accounts get a badge on their listings, which helps people trust them.\n\n"
                        + "- NestSwap");
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Account"));
    }
}
