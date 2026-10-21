package com.nestswap.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "saved_listings")
public class SavedListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SavedListing() {}

    public SavedListing(Long userId, Listing listing) {
        this.userId = userId;
        this.listing = listing;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Listing getListing() { return listing; }
    public Instant getCreatedAt() { return createdAt; }
}
