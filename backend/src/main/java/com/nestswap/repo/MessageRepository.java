package com.nestswap.repo;

import com.nestswap.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    /** Unread = sent by the other person and not yet opened. */
    @Query("select count(m) from Message m where m.conversation.id = :convId and m.sender.id <> :userId and m.readAt is null")
    long countUnread(@Param("convId") Long conversationId, @Param("userId") Long userId);

    @Query("""
           select count(m) from Message m
           where m.readAt is null and m.sender.id <> :userId
             and (m.conversation.guest.id = :userId or m.conversation.host.id = :userId)
           """)
    long countAllUnread(@Param("userId") Long userId);

    @Modifying
    @Query("update Message m set m.readAt = :now where m.conversation.id = :convId and m.sender.id <> :userId and m.readAt is null")
    int markRead(@Param("convId") Long conversationId, @Param("userId") Long userId, @Param("now") Instant now);
}
