package com.nestswap.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.ListingSearch;
import com.nestswap.model.Listing;
import com.nestswap.model.SavedListing;
import com.nestswap.model.SavedSearch;
import com.nestswap.model.User;
import com.nestswap.repo.*;
import com.nestswap.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Hearted listings and saved searches. */
@Service
public class SavedService {

    private static final int MAX_SAVED_SEARCHES = 20;

    private final SavedListingRepository savedListings;
    private final SavedSearchRepository savedSearches;
    private final ListingRepository listings;
    private final UserRepository users;
    private final ListingService listingService;
    private final ObjectMapper json;

    public SavedService(SavedListingRepository savedListings, SavedSearchRepository savedSearches,
                        ListingRepository listings, UserRepository users,
                        ListingService listingService, ObjectMapper json) {
        this.savedListings = savedListings;
        this.savedSearches = savedSearches;
        this.listings = listings;
        this.users = users;
        this.listingService = listingService;
        this.json = json;
    }

    // ------------------------------------------------------------ saved listings

    @Transactional
    public void save(Long userId, Long listingId) {
        if (savedListings.findByUserIdAndListingId(userId, listingId).isPresent()) return;
        Listing l = listings.findById(listingId).orElseThrow(() -> ApiException.notFound("Listing"));
        savedListings.save(new SavedListing(userId, l));
    }

    @Transactional
    public void unsave(Long userId, Long listingId) {
        savedListings.findByUserIdAndListingId(userId, listingId).ifPresent(savedListings::delete);
    }

    @Transactional(readOnly = true)
    public List<ListingCard> savedListings(Long userId) {
        List<Listing> list = savedListings.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SavedListing::getListing).toList();
        return listingService.toCards(list, userId, null);
    }

    // ------------------------------------------------------------ saved searches

    @Transactional(readOnly = true)
    public List<SavedSearchView> searches(Long userId) {
        return savedSearches.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::view).toList();
    }

    @Transactional
    public SavedSearchView createSearch(Long userId, SavedSearchRequest req) {
        if (savedSearches.findByUserIdOrderByCreatedAtDesc(userId).size() >= MAX_SAVED_SEARCHES) {
            throw ApiException.badRequest("You can keep up to " + MAX_SAVED_SEARCHES + " saved searches. Delete one first.");
        }
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        SavedSearch s = new SavedSearch(u, req.name().trim(), write(req.query()), req.emailAlerts());
        return view(savedSearches.save(s));
    }

    @Transactional
    public SavedSearchView setAlerts(Long userId, Long id, boolean on) {
        SavedSearch s = owned(userId, id);
        s.setEmailAlerts(on);
        return view(s);
    }

    @Transactional
    public void deleteSearch(Long userId, Long id) {
        savedSearches.delete(owned(userId, id));
    }

    private SavedSearch owned(Long userId, Long id) {
        SavedSearch s = savedSearches.findById(id).orElseThrow(() -> ApiException.notFound("Saved search"));
        if (!s.getUser().getId().equals(userId)) throw ApiException.forbidden();
        return s;
    }

    SavedSearchView view(SavedSearch s) {
        return new SavedSearchView(s.getId(), s.getName(), read(s.getQueryJson()), s.isEmailAlerts(), s.getCreatedAt());
    }

    String write(ListingSearch q) {
        try {
            return json.writeValueAsString(q);
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Could not save those filters.");
        }
    }

    ListingSearch read(String raw) {
        try {
            return json.readValue(raw, ListingSearch.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt saved search JSON", e);
        }
    }
}
