package com.nestswap.service;

import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.ListingSearch;
import com.nestswap.model.Listing;
import com.nestswap.model.ListingImage;
import com.nestswap.repo.ListingSpecs;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/** Converts Listing entities into the JSON shapes in Dtos. Call inside a transaction. */
@Component
public class ListingMapper {

    public ListingCard toCard(Listing l, Set<Long> savedIds, ListingSearch search) {
        List<ListingImage> imgs = l.getImages();
        ImageView cover = imgs.isEmpty() ? null : ImageView.of(imgs.get(0), coverAlt(l));
        Double distance = null;
        if (search != null && search.hasGeo() && l.getLatitude() != null && l.getLongitude() != null) {
            double d = ListingSpecs.haversineMiles(search.lat(), search.lng(), l.getLatitude(), l.getLongitude());
            distance = Math.round(d * 10) / 10.0;
        }
        return new ListingCard(
                l.getId(), l.getTitle(), l.getListingType(), l.getMonthlyRent(),
                l.getBedrooms(), l.getBathrooms(), l.getCity(), l.getState(),
                l.getAvailableFrom(), l.getAvailableTo(),
                l.isFurnished(), l.isPetsAllowed(), l.isUtilitiesIncluded(),
                cover, imgs.size(),
                l.getLatitude(), l.getLongitude(), distance,
                savedIds.contains(l.getId()), l.getOwner().isEmailVerified(),
                l.getStatus(), l.getCreatedAt());
    }

    public ListingDetail toDetail(Listing l, Long viewerId, boolean saved, Long myConversationId) {
        List<ListingImage> imgs = l.getImages();
        List<ImageView> images = new java.util.ArrayList<>();
        for (int i = 0; i < imgs.size(); i++) {
            images.add(ImageView.of(imgs.get(i), "Photo " + (i + 1) + " of " + imgs.size() + ": " + l.getTitle()));
        }
        boolean mine = viewerId != null && viewerId.equals(l.getOwner().getId());
        return new ListingDetail(
                l.getId(), l.getTitle(), l.getDescription(), l.getListingType(), l.getMonthlyRent(),
                l.getBedrooms(), l.getBathrooms(), l.getAddress(), l.getCity(), l.getState(), l.getZipCode(),
                l.getLatitude(), l.getLongitude(),
                l.getAvailableFrom(), l.getAvailableTo(),
                l.isFurnished(), l.isPetsAllowed(), l.isUtilitiesIncluded(),
                l.getCurrentRoommates(), l.getGenderPreference(), l.getHouseholdVibe(),
                l.isSubletPermissionConfirmed(),
                l.getStatus(), l.getCreatedAt(),
                images, PublicUser.of(l.getOwner()),
                mine, saved, myConversationId);
    }

    public ImageView cover(Listing l) {
        return l.getImages().isEmpty() ? null : ImageView.of(l.getImages().get(0), coverAlt(l));
    }

    private String coverAlt(Listing l) {
        return "Main photo: " + l.getTitle();
    }
}
