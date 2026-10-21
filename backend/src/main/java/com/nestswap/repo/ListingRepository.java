package com.nestswap.repo;

import com.nestswap.model.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long>, JpaSpecificationExecutor<Listing> {
    List<Listing> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
