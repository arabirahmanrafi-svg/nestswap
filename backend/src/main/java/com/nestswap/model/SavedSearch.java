package com.nestswap.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "saved_searches")
public class SavedSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    /** The filter values (a ListingSearch) serialized as JSON. */
    @Column(name = "query_json", nullable = false, columnDefinition = "TEXT")
    private String queryJson;

    @Column(name = "email_alerts", nullable = false)
    private boolean emailAlerts = true;

    /** Listings created after this moment count as "new" for the next alert. */
    @Column(name = "last_notified_at", nullable = false)
    private Instant lastNotifiedAt = Instant.now();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SavedSearch() {}

    public SavedSearch(User user, String name, String queryJson, boolean emailAlerts) {
        this.user = user;
        this.name = name;
        this.queryJson = queryJson;
        this.emailAlerts = emailAlerts;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getName() { return name; }
    public String getQueryJson() { return queryJson; }
    public boolean isEmailAlerts() { return emailAlerts; }
    public void setEmailAlerts(boolean emailAlerts) { this.emailAlerts = emailAlerts; }
    public Instant getLastNotifiedAt() { return lastNotifiedAt; }
    public void setLastNotifiedAt(Instant lastNotifiedAt) { this.lastNotifiedAt = lastNotifiedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
