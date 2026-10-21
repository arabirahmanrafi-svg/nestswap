package com.nestswap.web;

import com.nestswap.dto.Dtos.*;
import com.nestswap.security.CurrentUser;
import com.nestswap.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class MessageController {

    private final MessageService messages;

    public MessageController(MessageService messages) {
        this.messages = messages;
    }

    @GetMapping
    public List<ConversationSummary> inbox() {
        return messages.inbox(CurrentUser.id());
    }

    /** Small endpoint the navbar polls for the red unread badge. */
    @GetMapping("/unread")
    public UnreadCount unread() {
        return messages.unread(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public ConversationDetail open(@PathVariable Long id) {
        return messages.open(CurrentUser.id(), id);
    }

    @PostMapping("/{id}/messages")
    public ConversationDetail send(@PathVariable Long id, @Valid @RequestBody SendMessageRequest req) {
        return messages.send(CurrentUser.id(), id, req.body());
    }
}
