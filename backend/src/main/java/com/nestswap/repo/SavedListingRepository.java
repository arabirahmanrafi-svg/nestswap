package com.nestswap.repo;

import com.nestswap.model.SavedListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface SavedListingRepository extends JpaRepository<SavedListing, Long> {

    Optional<SavedListing> findByUserIdAndListingId(Long userId, Long listingId);

    List<SavedListing> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Which of these listing ids has the user saved? Used to draw filled hearts on a page of results. */
    @Query("select s.listing.id from SavedListing s where s.userId = :userId and s.listing.id in :ids")
    Set<Long> findSavedIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);
}
