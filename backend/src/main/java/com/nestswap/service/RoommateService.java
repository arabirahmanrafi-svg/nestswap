package com.nestswap.service;

import com.nestswap.dto.Dtos.*;
import com.nestswap.dto.RoommateSearch;
import com.nestswap.model.*;
import com.nestswap.repo.*;
import com.nestswap.web.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** "Looking for roommates" posts: people without a place who want others to rent with. */
@Service
public class RoommateService {

    private final RoommatePostRepository posts;
    private final UserRepository users;
    private final ConversationRepository conversations;

    public RoommateService(RoommatePostRepository posts, UserRepository users, ConversationRepository conversations) {
        this.posts = posts;
        this.users = users;
        this.conversations = conversations;
    }

    @Transactional(readOnly = true)
    public PageResult<RoommateView> search(RoommateSearch s, int page, int size, Long viewerId) {
        size = Math.max(1, Math.min(size, 100));
        page = Math.max(0, page);
        Sort sort = switch (s.sort() == null ? "newest" : s.sort()) {
            case "soonest" -> Sort.by("moveInDate").ascending().and(Sort.by("id").descending());
            case "budget_desc" -> Sort.by("budgetMax").descending().and(Sort.by("id").descending());
            default -> Sort.by("createdAt").descending().and(Sort.by("id").descending());
        };
        Page<RoommatePost> result = posts.findAll(RoommateSpecs.from(s), PageRequest.of(page, size, sort));
        List<RoommateView> items = result.getContent().stream().map(p -> view(p, viewerId, s)).toList();
        return new PageResult<>(items, page, size, result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public RoommateView get(Long id, Long viewerId) {
        return view(load(id), viewerId, null);
    }

    @Transactional(readOnly = true)
    public List<RoommateView> mine(Long userId) {
        return posts.findByOwnerIdOrderByCreatedAtDesc(userId).stream().map(p -> view(p, userId, null)).toList();
    }

    @Transactional
    public RoommateView create(Long userId, RoommateForm form) {
        User owner = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        RoommatePost p = new RoommatePost();
        p.setOwner(owner);
        apply(p, form);
        posts.save(p);
        return view(p, userId, null);
    }

    @Transactional
    public RoommateView update(Long userId, Long id, RoommateForm form) {
        RoommatePost p = loadOwned(id, userId);
        apply(p, form);
        return view(p, userId, null);
    }

    @Transactional
    public RoommateView setStatus(Long userId, Long id, ListingStatus status) {
        RoommatePost p = loadOwned(id, userId);
        p.setStatus(status);
        return view(p, userId, null);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        posts.delete(loadOwned(id, userId));
    }

    // ------------------------------------------------------------------ helpers

    private void apply(RoommatePost p, RoommateForm f) {
        if (f.budgetMin() > f.budgetMax()) {
            throw ApiException.badRequest("The lowest budget can't be more than the highest.");
        }
        p.setHeadline(f.headline().trim());
        p.setAbout(f.about().trim());
        p.setOccupation(blankToNull(f.occupation()));
        p.setBudgetMin(f.budgetMin());
        p.setBudgetMax(f.budgetMax());
        p.setCity(f.city().trim());
        p.setState(f.state().trim());
        p.setPreferredArea(blankToNull(f.preferredArea()));
        p.setLatitude(f.latitude());
        p.setLongitude(f.longitude());
        p.setMoveInDate(f.moveInDate());
        p.setStayMonths(f.stayMonths());
        p.setRoommatesWanted(Math.max(1, f.roommatesWanted()));
        p.setGenderPreference(f.genderPreference() == null ? GenderPreference.ANY : f.genderPreference());
        p.setHouseholdVibe(f.householdVibe() == null ? HouseholdVibe.MIXED : f.householdVibe());
        p.setSleepSchedule(f.sleepSchedule() == null ? SleepSchedule.FLEXIBLE : f.sleepSchedule());
        p.setCleanliness(f.cleanliness() == null ? Cleanliness.TIDY : f.cleanliness());
        p.setSmokes(f.smokes());
        p.setHasPet(f.hasPet());
    }

    private RoommateView view(RoommatePost p, Long viewerId, RoommateSearch search) {
        Double distance = null;
        if (search != null && search.hasGeo() && p.getLatitude() != null && p.getLongitude() != null) {
            distance = Math.round(ListingSpecs.haversineMiles(search.lat(), search.lng(), p.getLatitude(), p.getLongitude()) * 10) / 10.0;
        }
        boolean mine = viewerId != null && viewerId.equals(p.getOwner().getId());
        Long convId = (viewerId == null || mine) ? null
                : conversations.findByRoommatePostIdAndGuestId(p.getId(), viewerId).map(Conversation::getId).orElse(null);
        return new RoommateView(
                p.getId(), p.getHeadline(), p.getAbout(), p.getOccupation(),
                p.getBudgetMin(), p.getBudgetMax(), p.getCity(), p.getState(), p.getPreferredArea(),
                p.getLatitude(), p.getLongitude(), distance,
                p.getMoveInDate(), p.getStayMonths(), p.getRoommatesWanted(),
                p.getGenderPreference(), p.getHouseholdVibe(),
                p.getSleepSchedule(), p.getCleanliness(), p.isSmokes(), p.isHasPet(),
                p.getStatus(), p.getCreatedAt(),
                PublicUser.of(p.getOwner()), mine, convId);
    }

    RoommatePost load(Long id) {
        return posts.findById(id).orElseThrow(() -> ApiException.notFound("Roommate post"));
    }

    private RoommatePost loadOwned(Long id, Long userId) {
        RoommatePost p = load(id);
        if (!p.getOwner().getId().equals(userId)) throw ApiException.forbidden();
        return p;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
