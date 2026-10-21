package com.nestswap.repo;

import com.nestswap.model.RoommatePost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RoommatePostRepository extends JpaRepository<RoommatePost, Long>, JpaSpecificationExecutor<RoommatePost> {
    List<RoommatePost> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
