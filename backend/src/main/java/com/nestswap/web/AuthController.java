package com.nestswap.web;

import com.nestswap.dto.Dtos.*;
import com.nestswap.security.CurrentUser;
import com.nestswap.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @GetMapping("/me")
    public Me me() {
        return auth.me(CurrentUser.id());
    }

    @PutMapping("/me")
    public Me updateMe(@Valid @RequestBody UpdateProfileRequest req) {
        return auth.updateProfile(CurrentUser.id(), req);
    }

    /** Sends (or re-sends) a 6-digit code to the user's email. */
    @PostMapping("/verify/request")
    public Map<String, String> requestCode() {
        auth.requestVerification(CurrentUser.id());
        return Map.of("message", "Code sent. Check your email (or the server console in dev).");
    }

    @PostMapping("/verify/confirm")
    public Me confirm(@Valid @RequestBody VerifyRequest req) {
        return auth.confirmVerification(CurrentUser.id(), req.code());
    }
}
