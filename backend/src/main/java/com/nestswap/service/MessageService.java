package com.nestswap.service;

import com.nestswap.dto.Dtos.*;
import com.nestswap.model.*;
import com.nestswap.repo.*;
import com.nestswap.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * In-app messages between a listing's owner and interested people, so nobody has
 * to share a phone number with a stranger. The React app polls every few seconds.
 */
@Service
public class MessageService {

    /** Email the recipient about a new message at most this often per conversation. */
    private static final Duration EMAIL_COOLDOWN = Duration.ofMinutes(30);

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ListingRepository listings;
    private final RoommatePostRepository roommatePosts;
    private final UserRepository users;
    private final ListingMapper mapper;
    private final MailService mail;

    public MessageService(ConversationRepository conversations, MessageRepository messages,
                          ListingRepository listings, RoommatePostRepository roommatePosts,
                          UserRepository users, ListingMapper mapper, MailService mail) {
        this.conversations = conversations;
        this.messages = messages;
        this.listings = listings;
        this.roommatePosts = roommatePosts;
        this.users = users;
        this.mapper = mapper;
        this.mail = mail;
    }

    /** "Message the poster" button: reuses the existing thread if there is one. */
    @Transactional
    public ConversationDetail start(Long userId, Long listingId, String body) {
        Listing listing = listings.findById(listingId).orElseThrow(() -> ApiException.notFound("Listing"));
        if (listing.getOwner().getId().equals(userId)) {
            throw ApiException.badRequest("This is your own listing.");
        }
        if (listing.getStatus() == ListingStatus.TAKEN) {
            throw ApiException.badRequest("This place has already been taken.");
        }
        User me = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        Conversation c = conversations.findByListingIdAndGuestId(listingId, userId)
                .orElseGet(() -> conversations.save(new Conversation(listing, me, listing.getOwner())));
        addMessage(c, me, body);
        return detail(c, userId);
    }

    /** "Message" button on a roommate post. */
    @Transactional
    public ConversationDetail startForRoommatePost(Long userId, Long postId, String body) {
        RoommatePost post = roommatePosts.findById(postId).orElseThrow(() -> ApiException.notFound("Roommate post"));
        if (post.getOwner().getId().equals(userId)) {
            throw ApiException.badRequest("This is your own post.");
        }
        if (post.getStatus() == ListingStatus.TAKEN) {
            throw ApiException.badRequest("This person already found roommates.");
        }
        User me = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        Conversation c = conversations.findByRoommatePostIdAndGuestId(postId, userId)
                .orElseGet(() -> conversations.save(new Conversation(post, me, post.getOwner())));
        addMessage(c, me, body);
        return detail(c, userId);
    }

    @Transactional
    public ConversationDetail send(Long userId, Long conversationId, String body) {
        Conversation c = loadMine(conversationId, userId);
        User me = c.getGuest().getId().equals(userId) ? c.getGuest() : c.getHost();
        addMessage(c, me, body);
        return detail(c, userId);
    }

    /** Opening a conversation marks the other person's messages as read. */
    @Transactional
    public ConversationDetail open(Long userId, Long conversationId) {
        Conversation c = loadMine(conversationId, userId);
        messages.markRead(c.getId(), userId, Instant.now());
        return detail(c, userId);
    }

    @Transactional(readOnly = true)
    public List<ConversationSummary> inbox(Long userId) {
        return conversations.findInbox(userId).stream().map(c -> summary(c, userId)).toList();
    }

    @Transactional(readOnly = true)
    public UnreadCount unread(Long userId) {
        return new UnreadCount(messages.countAllUnread(userId));
    }

    // ------------------------------------------------------------------ helpers

    private void addMessage(Conversation c, User sender, String body) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) throw ApiException.badRequest("Message can't be empty.");

        Instant previous = c.getUpdatedAt();
        boolean firstMessage = messages.findFirstByConversationIdOrderByCreatedAtDesc(c.getId()).isEmpty();

        messages.save(new Message(c, sender, text));
        c.setUpdatedAt(Instant.now());

        // Light email nudge so people don't miss replies (not on every single message).
        if (firstMessage || previous.isBefore(Instant.now().minus(EMAIL_COOLDOWN))) {
            User recipient = c.otherParty(sender.getId());
            mail.send(recipient.getEmail(),
                    "New message about \"" + subjectTitle(c) + "\"",
                    sender.getDisplayName() + " wrote:\n\n" + text
                            + "\n\nReply on NestSwap (your Messages page). Tip: never pay a deposit before seeing the place in person.");
        }
    }

    private ConversationDetail detail(Conversation c, Long userId) {
        List<MessageView> list = messages.findByConversationIdOrderByCreatedAtAsc(c.getId()).stream()
                .map(m -> MessageView.of(m, userId)).toList();
        return new ConversationDetail(summary(c, userId), list);
    }

    private ConversationSummary summary(Conversation c, Long userId) {
        var last = messages.findFirstByConversationIdOrderByCreatedAtDesc(c.getId());
        Listing l = c.getListing();
        RoommatePost p = c.getRoommatePost();
        return new ConversationSummary(
                c.getId(),
                l != null ? "LISTING" : "ROOMMATE",
                l != null ? l.getId() : p.getId(),
                subjectTitle(c),
                l != null ? mapper.cover(l) : null,
                l != null ? l.getStatus() : p.getStatus(),
                PublicUser.of(c.otherParty(userId)), c.getHost().getId().equals(userId),
                last.map(Message::getBody).orElse(""),
                last.map(Message::getCreatedAt).orElse(c.getCreatedAt()),
                messages.countUnread(c.getId(), userId));
    }

    private static String subjectTitle(Conversation c) {
        return c.getListing() != null ? c.getListing().getTitle() : c.getRoommatePost().getHeadline();
    }

    private Conversation loadMine(Long conversationId, Long userId) {
        Conversation c = conversations.findById(conversationId).orElseThrow(() -> ApiException.notFound("Conversation"));
        if (!c.involves(userId)) throw ApiException.forbidden();
        return c;
    }
}
