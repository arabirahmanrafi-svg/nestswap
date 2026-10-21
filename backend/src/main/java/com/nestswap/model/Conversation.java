package com.nestswap.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A private thread between a poster (host) and one interested person (guest).
 * It is about either a listing or a roommate post: exactly one of the two is set.
 */
@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roommate_post_id")
    private RoommatePost roommatePost;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "guest_id")
    private User guest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_id")
    private User host;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /** Bumped on every new message so the inbox can sort by latest activity. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Conversation() {}

    public Conversation(Listing listing, User guest, User host) {
        this.listing = listing;
        this.guest = guest;
        this.host = host;
    }

    public Conversation(RoommatePost post, User guest, User host) {
        this.roommatePost = post;
        this.guest = guest;
        this.host = host;
    }

    public boolean involves(Long userId) {
        return guest.getId().equals(userId) || host.getId().equals(userId);
    }

    public User otherParty(Long userId) {
        return guest.getId().equals(userId) ? host : guest;
    }

    public Long getId() { return id; }
    public Listing getListing() { return listing; }
    public RoommatePost getRoommatePost() { return roommatePost; }
    public User getGuest() { return guest; }
    public User getHost() { return host; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
