package com.nestswap.service;

import com.nestswap.dto.ListingSearch;
import com.nestswap.model.Listing;
import com.nestswap.model.SavedSearch;
import com.nestswap.repo.ListingRepository;
import com.nestswap.repo.ListingSpecs;
import com.nestswap.repo.SavedSearchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Runs every hour (configurable). For each saved search with alerts on, finds listings
 * posted since the last alert and emails a short digest.
 */
@Component
public class SavedSearchAlertJob {

    private static final Logger log = LoggerFactory.getLogger(SavedSearchAlertJob.class);

    private final SavedSearchRepository searches;
    private final ListingRepository listings;
    private final SavedService savedService;
    private final MailService mail;
    private final String frontendUrl;

    public SavedSearchAlertJob(SavedSearchRepository searches, ListingRepository listings,
                               SavedService savedService, MailService mail,
                               @Value("${app.frontend-url}") String frontendUrl) {
        this.searches = searches;
        this.listings = listings;
        this.savedService = savedService;
        this.mail = mail;
        this.frontendUrl = frontendUrl;
    }

    @Scheduled(initialDelayString = "${app.alerts.initial-delay-ms:60000}",
               fixedDelayString = "${app.alerts.interval-ms:3600000}")
    @Transactional
    public void sendAlerts() {
        for (SavedSearch s : searches.findByEmailAlertsTrue()) {
            try {
                processOne(s);
            } catch (Exception e) {
                log.warn("Saved search {} alert failed: {}", s.getId(), e.getMessage());
            }
        }
    }

    private void processOne(SavedSearch s) {
        Instant now = Instant.now();
        ListingSearch q = savedService.read(s.getQueryJson());
        Long ownerId = s.getUser().getId();
        Specification<Listing> spec = ListingSpecs.from(q)
                .and(ListingSpecs.createdAfter(s.getLastNotifiedAt()))
                .and((root, cq, cb) -> cb.notEqual(root.get("owner").get("id"), ownerId)); // skip own posts

        Page<Listing> fresh = listings.findAll(spec, PageRequest.of(0, 5, Sort.by("createdAt").descending()));
        s.setLastNotifiedAt(now);
        if (fresh.getTotalElements() == 0) return;

        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(s.getUser().getDisplayName()).append(",\n\n")
            .append(fresh.getTotalElements()).append(" new place(s) match your saved search \"")
            .append(s.getName()).append("\":\n\n");
        for (Listing l : fresh.getContent()) {
            body.append("• ").append(l.getTitle()).append(" — $").append(l.getMonthlyRent()).append("/mo, ")
                .append(l.getCity()).append(", ").append(l.getState()).append('\n')
                .append("  ").append(frontendUrl).append("/listings/").append(l.getId()).append("\n\n");
        }
        body.append("Turn off these alerts any time from Saved → Searches on NestSwap.");
        mail.send(s.getUser().getEmail(), "New matches for \"" + s.getName() + "\"", body.toString());
    }
}
