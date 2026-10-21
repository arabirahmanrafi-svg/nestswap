package com.nestswap.model;

/** What kind of deal the poster is offering. */
public enum ListingType {
    /** Short-term: someone moves in for part of the lease, original tenant stays on the lease. */
    SUBLEASE,
    /** Someone takes over the rest of the lease and becomes the tenant. */
    LEASE_TAKEOVER,
    /** A single room in a shared unit. */
    ROOM
}
