package com.nestswap.web;

import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.RoommateSearch;
import com.nestswap.security.CurrentUser;
import com.nestswap.service.MessageService;
import com.nestswap.service.RoommateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** "Looking for roommates" posts. */
@RestController
@RequestMapping("/api/roommates")
public class RoommateController {

    private final RoommateService roommates;
    private final MessageService messages;

    public RoommateController(RoommateService roommates, MessageService messages) {
        this.roommates = roommates;
        this.messages = messages;
    }

    /** GET /api/roommates?city=Ypsilanti&canPay=600&noSmoking=true&page=0&size=24 */
    @GetMapping
    public PageResult<RoommateView> search(@ModelAttribute RoommateSearch search,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "24") int size) {
        return roommates.search(search, page, size, CurrentUser.idIfLoggedIn().orElse(null));
    }

    @GetMapping("/{id}")
    public RoommateView get(@PathVariable Long id) {
        return roommates.get(id, CurrentUser.idIfLoggedIn().orElse(null));
    }

    @GetMapping("/mine")
    public List<RoommateView> mine() {
        return roommates.mine(CurrentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoommateView create(@Valid @RequestBody RoommateForm form) {
        return roommates.create(CurrentUser.id(), form);
    }

    @PutMapping("/{id}")
    public RoommateView update(@PathVariable Long id, @Valid @RequestBody RoommateForm form) {
        return roommates.update(CurrentUser.id(), id, form);
    }

    /** ACTIVE while searching, TAKEN once they found roommates. */
    @PatchMapping("/{id}/status")
    public RoommateView setStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return roommates.setStatus(CurrentUser.id(), id, req.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        roommates.delete(CurrentUser.id(), id);
    }

    @PostMapping("/{id}/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDetail message(@PathVariable Long id, @Valid @RequestBody SendMessageRequest req) {
        return messages.startForRoommatePost(CurrentUser.id(), id, req.body());
    }
}
