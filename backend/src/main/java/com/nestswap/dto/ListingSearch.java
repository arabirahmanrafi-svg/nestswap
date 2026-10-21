package com.nestswap.dto;

import com.nestswap.model.GenderPreference;
import com.nestswap.model.ListingType;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Every filter on the search page. Spring fills this from query-string parameters
 * (e.g. /api/listings?city=Ypsilanti&maxRent=900), and the same object is stored as
 * JSON when someone saves a search.
 *
 * All fields are optional; null means "don't filter on this".
 */
public record ListingSearch(
        String q,
        String city,
        String state,
        Integer minRent,
        Integer maxRent,
        Integer minBedrooms,
        ListingType type,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate availableBy,
        Boolean furnished,
        Boolean petsAllowed,
        Boolean utilitiesIncluded,
        GenderPreference genderPreference,
        /* "Within X miles of a point" — the frontend turns a typed place into lat/lng. */
        Double lat,
        Double lng,
        Double radiusMiles,
        String nearLabel,
        /* newest | price_asc | price_desc | soonest */
        String sort
) {
    public boolean hasGeo() {
        return lat != null && lng != null && radiusMiles != null && radiusMiles > 0;
    }
}
