package com.nestswap.repo;

import com.nestswap.dto.ListingSearch;
import com.nestswap.model.GenderPreference;
import com.nestswap.model.Listing;
import com.nestswap.model.ListingStatus;
import com.nestswap.model.ListingType;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Small, composable WHERE-clause pieces for the search page.
 * Each method returns null when its filter is not set, and Spring ignores null specs.
 */
public final class ListingSpecs {

    public static final double EARTH_RADIUS_MILES = 3958.8;

    private ListingSpecs() {}

    /** Combine every filter in a ListingSearch into one WHERE clause. */
    public static Specification<Listing> from(ListingSearch s) {
        return Specification.where(active())
                .and(keyword(s.q()))
                .and(city(s.city()))
                .and(state(s.state()))
                .and(minRent(s.minRent()))
                .and(maxRent(s.maxRent()))
                .and(minBedrooms(s.minBedrooms()))
                .and(type(s.type()))
                .and(availableBy(s.availableBy()))
                .and(isTrue("furnished", s.furnished()))
                .and(isTrue("petsAllowed", s.petsAllowed()))
                .and(isTrue("utilitiesIncluded", s.utilitiesIncluded()))
                .and(genderPreference(s.genderPreference()))
                .and(s.hasGeo() ? ListingSpecs.<Listing>withinMiles(s.lat(), s.lng(), s.radiusMiles()) : null);
    }

    public static Specification<Listing> active() {
        return (root, q, cb) -> cb.equal(root.get("status"), ListingStatus.ACTIVE);
    }

    /** Keyword search over title, description, address and city. */
    public static Specification<Listing> keyword(String text) {
        if (text == null || text.isBlank()) return null;
        String like = "%" + text.trim().toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), like),
                cb.like(cb.lower(root.get("description")), like),
                cb.like(cb.lower(root.get("address")), like),
                cb.like(cb.lower(root.get("city")), like));
    }

    public static Specification<Listing> city(String city) {
        if (city == null || city.isBlank()) return null;
        return (root, q, cb) -> cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase());
    }

    public static Specification<Listing> state(String state) {
        if (state == null || state.isBlank()) return null;
        return (root, q, cb) -> cb.equal(cb.lower(root.get("state")), state.trim().toLowerCase());
    }

    public static Specification<Listing> minRent(Integer min) {
        if (min == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("monthlyRent"), min);
    }

    public static Specification<Listing> maxRent(Integer max) {
        if (max == null) return null;
        return (root, q, cb) -> cb.lessThanOrEqualTo(root.get("monthlyRent"), max);
    }

    public static Specification<Listing> minBedrooms(Integer beds) {
        if (beds == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("bedrooms"), beds);
    }

    public static Specification<Listing> type(ListingType type) {
        if (type == null) return null;
        return (root, q, cb) -> cb.equal(root.get("listingType"), type);
    }

    /** Move-in date: listing must be available on or before this date. */
    public static Specification<Listing> availableBy(LocalDate date) {
        if (date == null) return null;
        return (root, q, cb) -> cb.lessThanOrEqualTo(root.get("availableFrom"), date);
    }

    public static Specification<Listing> isTrue(String field, Boolean wanted) {
        if (wanted == null || !wanted) return null;
        return (root, q, cb) -> cb.isTrue(root.get(field));
    }

    /** A FEMALE searcher sees FEMALE + ANY listings, and so on. */
    public static Specification<Listing> genderPreference(GenderPreference pref) {
        if (pref == null || pref == GenderPreference.ANY) return null;
        return (root, q, cb) -> root.get("genderPreference").in(pref, GenderPreference.ANY);
    }

    public static Specification<Listing> createdAfter(Instant instant) {
        return (root, q, cb) -> cb.greaterThan(root.get("createdAt"), instant);
    }

    /**
     * Listings within `miles` of (lat, lng).
     * Step 1: a cheap bounding box that can use the (latitude, longitude) index.
     * Step 2: the exact great-circle distance (spherical law of cosines).
     *
     * distance = R * acos(X) <= miles   is the same as   X >= cos(miles / R)
     * (acos only gets smaller as X grows), so we compare X directly and never call
     * acos in SQL. That avoids rounding errors and works the same in MySQL and H2.
     */
    public static <T> Specification<T> withinMiles(double lat, double lng, double miles) {
        double latDelta = miles / 69.0;
        double lngDelta = miles / (69.0 * Math.max(0.01, Math.cos(Math.toRadians(lat))));
        double minCosine = Math.cos(miles / EARTH_RADIUS_MILES);
        return (root, q, cb) -> cb.and(
                cb.between(root.get("latitude"), lat - latDelta, lat + latDelta),
                cb.between(root.get("longitude"), lng - lngDelta, lng + lngDelta),
                cb.greaterThanOrEqualTo(cosineOfAngle(root, cb, lat, lng), minCosine));
    }

    /** X = cos(lat1)·cos(lat2)·cos(lng2 − lng1) + sin(lat1)·sin(lat2), all in radians. */
    private static <T> Expression<Double> cosineOfAngle(Root<T> root, CriteriaBuilder cb, double lat, double lng) {
        // Convert the row's degrees to radians with plain multiplication (portable across databases).
        double toRad = Math.PI / 180.0;
        Expression<Double> rowLat = cb.prod(root.<Double>get("latitude"), toRad);
        Expression<Double> rowLng = cb.prod(root.<Double>get("longitude"), toRad);
        double pLat = Math.toRadians(lat);
        double pLng = Math.toRadians(lng);

        Expression<Double> term1 = cb.prod(
                cb.prod(fn(cb, "cos", rowLat), Math.cos(pLat)),
                fn(cb, "cos", cb.diff(rowLng, pLng)));
        Expression<Double> term2 = cb.prod(fn(cb, "sin", rowLat), Math.sin(pLat));
        return cb.sum(term1, term2);
    }

    private static Expression<Double> fn(CriteriaBuilder cb, String name, Expression<?> arg) {
        return cb.function(name, Double.class, arg);
    }

    /** Same formula in Java, used to show "2.3 mi away" on result cards. */
    public static double haversineMiles(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
    }
}
