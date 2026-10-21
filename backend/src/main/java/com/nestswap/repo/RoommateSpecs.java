package com.nestswap.repo;

import com.nestswap.dto.RoommateSearch;
import com.nestswap.model.GenderPreference;
import com.nestswap.model.ListingStatus;
import com.nestswap.model.RoommatePost;
import org.springframework.data.jpa.domain.Specification;

/** WHERE-clause pieces for the Roommates page. Null means "don't filter". */
public final class RoommateSpecs {

    private RoommateSpecs() {}

    public static Specification<RoommatePost> from(RoommateSearch s) {
        Specification<RoommatePost> spec = Specification.where(active());
        if (s.q() != null && !s.q().isBlank()) {
            String like = "%" + s.q().trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("headline")), like),
                    cb.like(cb.lower(root.get("about")), like),
                    cb.like(cb.lower(root.get("preferredArea")), like),
                    cb.like(cb.lower(root.get("occupation")), like)));
        }
        if (s.city() != null && !s.city().isBlank()) {
            String city = s.city().trim().toLowerCase();
            spec = spec.and((root, q, cb) -> cb.equal(cb.lower(root.get("city")), city));
        }
        if (s.state() != null && !s.state().isBlank()) {
            String state = s.state().trim().toLowerCase();
            spec = spec.and((root, q, cb) -> cb.equal(cb.lower(root.get("state")), state));
        }
        if (s.canPay() != null) {
            int canPay = s.canPay();
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("budgetMax"), canPay));
        }
        if (s.maxBudget() != null) {
            int max = s.maxBudget();
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("budgetMin"), max));
        }
        if (s.moveInBy() != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("moveInDate"), s.moveInBy()));
        }
        GenderPreference pref = s.genderPreference();
        if (pref != null && pref != GenderPreference.ANY) {
            spec = spec.and((root, q, cb) -> root.get("genderPreference").in(pref, GenderPreference.ANY));
        }
        if (Boolean.TRUE.equals(s.noSmoking())) {
            spec = spec.and((root, q, cb) -> cb.isFalse(root.get("smokes")));
        }
        if (s.hasGeo()) {
            spec = spec.and(ListingSpecs.<RoommatePost>withinMiles(s.lat(), s.lng(), s.radiusMiles()));
        }
        return spec;
    }

    public static Specification<RoommatePost> active() {
        return (root, q, cb) -> cb.equal(root.get("status"), ListingStatus.ACTIVE);
    }
}
