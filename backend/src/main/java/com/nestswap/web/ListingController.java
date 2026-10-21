package com.nestswap.web;

import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.ListingSearch;
import com.nestswap.security.CurrentUser;
import com.nestswap.service.ListingService;
import com.nestswap.service.MessageService;
import com.nestswap.service.SavedService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final ListingService listings;
    private final SavedService saved;
    private final MessageService messages;

    public ListingController(ListingService listings, SavedService saved, MessageService messages) {
        this.listings = listings;
        this.saved = saved;
        this.messages = messages;
    }

    /**
     * Search. Every field of ListingSearch is an optional query parameter, e.g.
     * GET /api/listings?city=Ypsilanti&maxRent=900&minBedrooms=1&sort=price_asc&page=0&size=20
     */
    @GetMapping
    public PageResult<ListingCard> search(@ModelAttribute ListingSearch search,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return listings.search(search, page, size, CurrentUser.idIfLoggedIn().orElse(null));
    }

    @GetMapping("/{id}")
    public ListingDetail get(@PathVariable Long id) {
        return listings.get(id, CurrentUser.idIfLoggedIn().orElse(null));
    }

    @GetMapping("/mine")
    public List<ListingCard> mine() {
        return listings.mine(CurrentUser.id());
    }

    /** Multipart: a "data" part with the ListingForm JSON plus zero or more "photos" file parts. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ListingDetail create(@Valid @RequestPart("data") ListingForm form,
                                @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        return listings.create(CurrentUser.id(), form, photos);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ListingDetail update(@PathVariable Long id,
                                @Valid @RequestPart("data") ListingForm form,
                                @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        return listings.update(CurrentUser.id(), id, form, photos);
    }

    /** Mark as TAKEN (hides it from search) or back to ACTIVE. */
    @PatchMapping("/{id}/status")
    public ListingDetail setStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return listings.setStatus(CurrentUser.id(), id, req.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        listings.delete(CurrentUser.id(), id);
    }

    // ---- save / unsave (the heart button)

    @PutMapping("/{id}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@PathVariable Long id) {
        saved.save(CurrentUser.id(), id);
    }

    @DeleteMapping("/{id}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsave(@PathVariable Long id) {
        saved.unsave(CurrentUser.id(), id);
    }

    // ---- "Message the poster"

    @PostMapping("/{id}/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDetail startConversation(@PathVariable Long id, @Valid @RequestBody SendMessageRequest req) {
        return messages.start(CurrentUser.id(), id, req.body());
    }
}
