package com.nestswap.dto;

import com.nestswap.model.GenderPreference;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Filters for the Roommates page, from query-string parameters, e.g.
 * /api/roommates?city=Ypsilanti&canPay=600&noSmoking=true
 */
public record RoommateSearch(
        String q,
        String city,
        String state,
        /* Show people who can pay at least this much (their budgetMax >= canPay). */
        Integer canPay,
        /* Show people whose budget starts at or below this (their budgetMin <= maxBudget). */
        Integer maxBudget,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate moveInBy,
        GenderPreference genderPreference,
        Boolean noSmoking,
        Double lat,
        Double lng,
        Double radiusMiles,
        String nearLabel,
        /* newest | soonest | budget_desc */
        String sort
) {
    public boolean hasGeo() {
        return lat != null && lng != null && radiusMiles != null && radiusMiles > 0;
    }
}
