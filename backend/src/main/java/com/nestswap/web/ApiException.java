package com.nestswap.web;

import org.springframework.http.HttpStatus;

/** Throw this anywhere to send a clean JSON error like {"error": "Listing not found."}. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, what + " not found.");
    }

    public static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "You can't do that.");
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
