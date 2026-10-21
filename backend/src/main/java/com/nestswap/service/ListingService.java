package com.nestswap.service;

import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.ListingSearch;
import com.nestswap.model.*;
import com.nestswap.repo.*;
import com.nestswap.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class ListingService {

    private final ListingRepository listings;
    private final UserRepository users;
    private final SavedListingRepository saved;
    private final ConversationRepository conversations;
    private final StorageService storage;
    private final ListingMapper mapper;
    private final int maxImages;

    public ListingService(ListingRepository listings, UserRepository users, SavedListingRepository saved,
                          ConversationRepository conversations, StorageService storage, ListingMapper mapper,
                          @Value("${app.max-images-per-listing}") int maxImages) {
        this.listings = listings;
        this.users = users;
        this.saved = saved;
        this.conversations = conversations;
        this.storage = storage;
        this.mapper = mapper;
        this.maxImages = maxImages;
    }

    // ------------------------------------------------------------------ browse

    @Transactional(readOnly = true)
    public PageResult<ListingCard> search(ListingSearch s, int page, int size, Long viewerId) {
        size = Math.max(1, Math.min(size, 100));
        page = Math.max(0, page);
        PageRequest pr = PageRequest.of(page, size, sortFor(s.sort()));
        Page<Listing> result = listings.findAll(ListingSpecs.from(s), pr);
        List<ListingCard> cards = toCards(result.getContent(), viewerId, s);
        return new PageResult<>(cards, page, size, result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ListingDetail get(Long id, Long viewerId) {
        Listing l = load(id);
        boolean isSaved = false;
        Long convId = null;
        if (viewerId != null) {
            isSaved = saved.findByUserIdAndListingId(viewerId, id).isPresent();
            convId = conversations.findByListingIdAndGuestId(id, viewerId).map(Conversation::getId).orElse(null);
        }
        return mapper.toDetail(l, viewerId, isSaved, convId);
    }

    @Transactional(readOnly = true)
    public List<ListingCard> mine(Long userId) {
        return toCards(listings.findByOwnerIdOrderByCreatedAtDesc(userId), userId, null);
    }

    // ------------------------------------------------------------------ create / edit

    @Transactional
    public ListingDetail create(Long userId, ListingForm form, List<MultipartFile> photos) {
        List<MultipartFile> files = nonEmpty(photos);
        if (files.isEmpty()) throw ApiException.badRequest("Add at least one photo — listings with photos get far more replies.");
        if (files.size() > maxImages) throw ApiException.badRequest("You can upload up to " + maxImages + " photos.");

        User owner = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        Listing l = new Listing();
        l.setOwner(owner);
        apply(l, form);
        arrangePhotos(l, form, files);
        listings.save(l);
        return mapper.toDetail(l, userId, false, null);
    }

    @Transactional
    public ListingDetail update(Long userId, Long id, ListingForm form, List<MultipartFile> photos) {
        Listing l = loadOwned(id, userId);
        apply(l, form);
        arrangePhotos(l, form, nonEmpty(photos));
        listings.flush();
        return get(id, userId);
    }

    /**
     * Applies the photo order the user arranged in the form. Works for both create and edit:
     * existing photos missing from photoOrder are deleted, new files are stored, and every
     * photo gets its final sort position (position 0 is the cover photo).
     */
    private void arrangePhotos(Listing l, ListingForm form, List<MultipartFile> files) {
        List<String> order = form.photoOrder();
        if (order == null) {                         // client didn't send an order: keep all, append new
            order = new ArrayList<>();
            for (ListingImage img : l.getImages()) order.add("e:" + img.getId());
            for (int i = 0; i < files.size(); i++) order.add("n:" + i);
        }
        if (order.isEmpty()) throw ApiException.badRequest("A listing needs at least one photo.");
        if (order.size() > maxImages) throw ApiException.badRequest("You can have up to " + maxImages + " photos.");

        Map<Long, ListingImage> existing = new HashMap<>();
        l.getImages().forEach(img -> existing.put(img.getId(), img));
        Set<Long> keep = new HashSet<>();
        for (String token : order) {
            if (token.startsWith("e:")) keep.add(parseId(token));
        }

        // 1) delete removed photos (orphanRemoval deletes the rows; we delete the files)
        Iterator<ListingImage> it = l.getImages().iterator();
        while (it.hasNext()) {
            ListingImage img = it.next();
            if (!keep.contains(img.getId())) {
                storage.delete(img.getFileName());
                it.remove();
            }
        }

        // 2) place kept + new photos in the requested order
        List<String> alts = form.newImageAltTexts();
        Map<Long, String> existingAlts = form.existingAltTexts() == null ? Map.of() : form.existingAltTexts();
        Set<Integer> usedNew = new HashSet<>();
        int pos = 0;
        for (String token : order) {
            if (token.startsWith("e:")) {
                ListingImage img = existing.get(parseId(token));
                if (img == null) throw ApiException.badRequest("One of the photos no longer exists. Reload and try again.");
                img.setSortOrder(pos++);
                if (existingAlts.containsKey(img.getId())) img.setAltText(trimOrNull(existingAlts.get(img.getId())));
            } else if (token.startsWith("n:")) {
                int idx = (int) parseId(token);
                if (idx < 0 || idx >= files.size() || !usedNew.add(idx)) throw ApiException.badRequest("Photo order didn't match the uploaded files.");
                String alt = (alts != null && idx < alts.size()) ? trimOrNull(alts.get(idx)) : null;
                l.getImages().add(new ListingImage(l, storage.store(files.get(idx)), alt, pos++));
            } else {
                throw ApiException.badRequest("Unknown photo entry: " + token);
            }
        }
        l.getImages().sort(Comparator.comparingInt(ListingImage::getSortOrder));
    }

    private static long parseId(String token) {
        try {
            return Long.parseLong(token.substring(2));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Unknown photo entry: " + token);
        }
    }

    private static String trimOrNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    @Transactional
    public ListingDetail setStatus(Long userId, Long id, ListingStatus status) {
        Listing l = loadOwned(id, userId);
        l.setStatus(status);
        return mapper.toDetail(l, userId, false, null);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Listing l = loadOwned(id, userId);
        l.getImages().forEach(img -> storage.delete(img.getFileName()));
        listings.delete(l);
    }

    // ------------------------------------------------------------------ helpers

    List<ListingCard> toCards(List<Listing> page, Long viewerId, ListingSearch search) {
        Set<Long> savedIds = Set.of();
        if (viewerId != null && !page.isEmpty()) {
            savedIds = saved.findSavedIds(viewerId, page.stream().map(Listing::getId).toList());
        }
        Set<Long> finalSaved = savedIds;
        return page.stream().map(l -> mapper.toCard(l, finalSaved, search)).toList();
    }

    private void apply(Listing l, ListingForm f) {
        if (f.availableTo() != null && f.availableTo().isBefore(f.availableFrom())) {
            throw ApiException.badRequest("The end date must be after the move-in date.");
        }
        l.setTitle(f.title().trim());
        l.setDescription(f.description().trim());
        l.setListingType(f.listingType());
        l.setMonthlyRent(f.monthlyRent());
        l.setBedrooms(f.bedrooms());
        l.setBathrooms(f.bathrooms());
        l.setAddress(f.address().trim());
        l.setCity(f.city().trim());
        l.setState(f.state().trim());
        l.setZipCode(f.zipCode() == null ? null : f.zipCode().trim());
        l.setLatitude(f.latitude());
        l.setLongitude(f.longitude());
        l.setAvailableFrom(f.availableFrom());
        l.setAvailableTo(f.availableTo());
        l.setFurnished(f.furnished());
        l.setPetsAllowed(f.petsAllowed());
        l.setUtilitiesIncluded(f.utilitiesIncluded());
        l.setCurrentRoommates(f.currentRoommates());
        l.setGenderPreference(f.genderPreference() == null ? GenderPreference.ANY : f.genderPreference());
        l.setHouseholdVibe(f.householdVibe() == null ? HouseholdVibe.MIXED : f.householdVibe());
        l.setSubletPermissionConfirmed(f.subletPermissionConfirmed());
    }

    private static List<MultipartFile> nonEmpty(List<MultipartFile> files) {
        if (files == null) return List.of();
        return files.stream().filter(f -> f != null && !f.isEmpty()).toList();
    }

    private static Sort sortFor(String sort) {
        if (sort == null) sort = "newest";
        return switch (sort) {
            case "price_asc" -> Sort.by("monthlyRent").ascending().and(Sort.by("id").descending());
            case "price_desc" -> Sort.by("monthlyRent").descending().and(Sort.by("id").descending());
            case "soonest" -> Sort.by("availableFrom").ascending().and(Sort.by("id").descending());
            default -> Sort.by("createdAt").descending().and(Sort.by("id").descending());
        };
    }

    Listing load(Long id) {
        return listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing"));
    }

    private Listing loadOwned(Long id, Long userId) {
        Listing l = load(id);
        if (!l.getOwner().getId().equals(userId)) throw ApiException.forbidden();
        return l;
    }
}
