package com.nestswap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// We log people in with our own JWT tokens, so Spring's default demo user isn't needed.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class NestSwapApplication {
    public static void main(String[] args) {
        SpringApplication.run(NestSwapApplication.class, args);
    }
}
