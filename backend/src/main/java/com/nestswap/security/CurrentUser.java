package com.nestswap.security;

import com.nestswap.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/** Helpers to get the logged-in user's id inside controllers and services. */
public final class CurrentUser {

    private CurrentUser() {}

    public static Optional<Long> idIfLoggedIn() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return Optional.of(id);
        }
        return Optional.empty();
    }

    public static Long id() {
        return idIfLoggedIn().orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please log in first."));
    }
}
