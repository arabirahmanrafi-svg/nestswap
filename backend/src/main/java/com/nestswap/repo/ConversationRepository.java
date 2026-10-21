package com.nestswap.repo;

import com.nestswap.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByListingIdAndGuestId(Long listingId, Long guestId);

    Optional<Conversation> findByRoommatePostIdAndGuestId(Long roommatePostId, Long guestId);

    @Query("select c from Conversation c where c.guest.id = :userId or c.host.id = :userId order by c.updatedAt desc")
    List<Conversation> findInbox(@Param("userId") Long userId);
}
