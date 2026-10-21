package com.nestswap.dto;

import com.nestswap.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Request and response shapes for the REST API, kept in one place so it's easy
 * to see exactly what JSON goes over the wire. Entities are never sent directly.
 */
public final class Dtos {

    private Dtos() {}

    // ---------------------------------------------------------------- auth / users

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password,
            @NotBlank @Size(max = 80) String displayName) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record VerifyRequest(@NotBlank String code) {}

    public record UpdateProfileRequest(@NotBlank @Size(max = 80) String displayName) {}

    /** The logged-in user's own account. */
    public record Me(Long id, String email, String displayName, boolean emailVerified, boolean verifiedStudent) {
        public static Me of(User u) {
            return new Me(u.getId(), u.getEmail(), u.getDisplayName(), u.isEmailVerified(), u.isVerifiedStudent());
        }
    }

    public record AuthResponse(String token, Me user) {}

    /** What other people can see about a poster. Email is never exposed. */
    public record PublicUser(Long id, String displayName, boolean emailVerified, boolean verifiedStudent, Instant memberSince) {
        public static PublicUser of(User u) {
            return new PublicUser(u.getId(), u.getDisplayName(), u.isEmailVerified(), u.isVerifiedStudent(), u.getCreatedAt());
        }
    }

    // ---------------------------------------------------------------- listings

    /** JSON part of the multipart create/update request. Photos travel as separate file parts. */
    public record ListingForm(
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 5000) String description,
            @NotNull ListingType listingType,
            @NotNull @Min(1) @Max(50000) Integer monthlyRent,
            @NotNull @Min(0) @Max(20) Integer bedrooms,
            @NotNull @DecimalMin("0.5") @DecimalMax("20") BigDecimal bathrooms,
            @NotBlank @Size(max = 255) String address,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 50) String state,
            @Size(max = 10) String zipCode,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotNull LocalDate availableFrom,
            LocalDate availableTo,
            boolean furnished,
            boolean petsAllowed,
            boolean utilitiesIncluded,
            @Min(0) @Max(20) int currentRoommates,
            GenderPreference genderPreference,
            HouseholdVibe householdVibe,
            @AssertTrue(message = "please confirm your lease allows subletting or transfer")
            boolean subletPermissionConfirmed,
            /*
             * Final photo order, one token per photo: "e:<imageId>" keeps an existing photo,
             * "n:<index>" is the index of a newly uploaded file. Existing photos not listed are deleted.
             * If null, photos keep their current order and new ones go last.
             */
            List<String> photoOrder,
            /* Alt text for each NEW photo, same order as the uploaded files. */
            List<@Size(max = 200) String> newImageAltTexts,
            /* Updated alt text for kept photos, keyed by image id. */
            java.util.Map<Long, @Size(max = 200) String> existingAltTexts) {}

    public record StatusRequest(@NotNull ListingStatus status) {}

    /** alt = text for screen readers (owner's description or a generated one); ownerAlt = only what the owner wrote. */
    public record ImageView(Long id, String url, String alt, String ownerAlt) {
        public static ImageView of(ListingImage img, String fallbackAlt) {
            boolean hasOwn = img.getAltText() != null && !img.getAltText().isBlank();
            return new ImageView(img.getId(), "/uploads/" + img.getFileName(),
                    hasOwn ? img.getAltText() : fallbackAlt, hasOwn ? img.getAltText() : "");
        }
    }

    /** Compact version used in the search results grid and on the map. */
    public record ListingCard(
            Long id, String title, ListingType listingType, int monthlyRent,
            int bedrooms, BigDecimal bathrooms, String city, String state,
            LocalDate availableFrom, LocalDate availableTo,
            boolean furnished, boolean petsAllowed, boolean utilitiesIncluded,
            ImageView cover, int photoCount,
            Double latitude, Double longitude, Double distanceMiles,
            boolean saved, boolean posterVerified, ListingStatus status, Instant createdAt) {}

    /** Everything shown on a listing's own page. */
    public record ListingDetail(
            Long id, String title, String description, ListingType listingType, int monthlyRent,
            int bedrooms, BigDecimal bathrooms, String address, String city, String state, String zipCode,
            Double latitude, Double longitude,
            LocalDate availableFrom, LocalDate availableTo,
            boolean furnished, boolean petsAllowed, boolean utilitiesIncluded,
            int currentRoommates, GenderPreference genderPreference, HouseholdVibe householdVibe,
            boolean subletPermissionConfirmed,
            ListingStatus status, Instant createdAt,
            List<ImageView> images, PublicUser owner,
            boolean mine, boolean saved, Long myConversationId) {}

    public record PageResult<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}

    // ---------------------------------------------------------------- saved searches

    public record SavedSearchRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Valid ListingSearch query,
            boolean emailAlerts) {}

    public record SavedSearchView(Long id, String name, ListingSearch query, boolean emailAlerts, Instant createdAt) {}

    public record ToggleAlertsRequest(boolean emailAlerts) {}

    // ---------------------------------------------------------------- messaging

    public record SendMessageRequest(@NotBlank @Size(max = 4000) String body) {}

    public record MessageView(Long id, Long senderId, String body, Instant createdAt, boolean mine, Instant readAt) {
        public static MessageView of(Message m, Long me) {
            return new MessageView(m.getId(), m.getSender().getId(), m.getBody(), m.getCreatedAt(),
                    m.getSender().getId().equals(me), m.getReadAt());
        }
    }

    /**
     * One row in the inbox. A conversation is about a listing or a roommate post:
     * subjectType is "LISTING" or "ROOMMATE", and subjectId is that post's id.
     */
    public record ConversationSummary(
            Long id, String subjectType, Long subjectId, String subjectTitle, ImageView subjectCover,
            ListingStatus subjectStatus,
            PublicUser otherUser, boolean iAmHost,
            String lastMessage, Instant lastMessageAt, long unread) {}

    public record ConversationDetail(ConversationSummary summary, List<MessageView> messages) {}

    public record UnreadCount(long unread) {}

    // ---------------------------------------------------------------- roommate posts

    /** Create/edit body for a "looking for roommates" post. */
    public record RoommateForm(
            @NotBlank @Size(max = 140) String headline,
            @NotBlank @Size(max = 4000) String about,
            @Size(max = 120) String occupation,
            @NotNull @Min(0) @Max(20000) Integer budgetMin,
            @NotNull @Min(1) @Max(20000) Integer budgetMax,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 50) String state,
            @Size(max = 160) String preferredArea,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotNull LocalDate moveInDate,
            @Min(1) @Max(36) Integer stayMonths,
            @Min(1) @Max(6) int roommatesWanted,
            GenderPreference genderPreference,
            HouseholdVibe householdVibe,
            SleepSchedule sleepSchedule,
            Cleanliness cleanliness,
            boolean smokes,
            boolean hasPet) {}

    public record RoommateView(
            Long id, String headline, String about, String occupation,
            int budgetMin, int budgetMax, String city, String state, String preferredArea,
            Double latitude, Double longitude, Double distanceMiles,
            LocalDate moveInDate, Integer stayMonths, int roommatesWanted,
            GenderPreference genderPreference, HouseholdVibe householdVibe,
            SleepSchedule sleepSchedule, Cleanliness cleanliness, boolean smokes, boolean hasPet,
            ListingStatus status, Instant createdAt,
            PublicUser owner, boolean mine, Long myConversationId) {}
}
