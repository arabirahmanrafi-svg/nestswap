package com.nestswap.web;

import com.nestswap.dto.Dtos.*;
import com.nestswap.security.CurrentUser;
import com.nestswap.service.SavedService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved")
public class SavedController {

    private final SavedService saved;

    public SavedController(SavedService saved) {
        this.saved = saved;
    }

    @GetMapping("/listings")
    public List<ListingCard> listings() {
        return saved.savedListings(CurrentUser.id());
    }

    @GetMapping("/searches")
    public List<SavedSearchView> searches() {
        return saved.searches(CurrentUser.id());
    }

    @PostMapping("/searches")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedSearchView createSearch(@Valid @RequestBody SavedSearchRequest req) {
        return saved.createSearch(CurrentUser.id(), req);
    }

    @PatchMapping("/searches/{id}")
    public SavedSearchView toggleAlerts(@PathVariable Long id, @RequestBody ToggleAlertsRequest req) {
        return saved.setAlerts(CurrentUser.id(), id, req.emailAlerts());
    }

    @DeleteMapping("/searches/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSearch(@PathVariable Long id) {
        saved.deleteSearch(CurrentUser.id(), id);
    }
}
