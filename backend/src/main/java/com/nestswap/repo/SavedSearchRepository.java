package com.nestswap.repo;

import com.nestswap.model.SavedSearch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SavedSearch> findByEmailAlertsTrue();
}
