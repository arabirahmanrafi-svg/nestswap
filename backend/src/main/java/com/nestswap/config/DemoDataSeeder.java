package com.nestswap.config;

import com.nestswap.model.*;
import com.nestswap.repo.ListingRepository;
import com.nestswap.repo.RoommatePostRepository;
import com.nestswap.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Adds a few sample accounts and listings so the site isn't empty during a demo.
 * Only runs when app.seed-demo=true and the database has no users yet.
 * Log in as maya@emich.edu / password123 (or jordan@example.com / password123).
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository users;
    private final ListingRepository listings;
    private final RoommatePostRepository roommatePosts;
    private final PasswordEncoder encoder;

    public DemoDataSeeder(UserRepository users, ListingRepository listings,
                          RoommatePostRepository roommatePosts, PasswordEncoder encoder) {
        this.users = users;
        this.listings = listings;
        this.roommatePosts = roommatePosts;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;

        User maya = user("maya@emich.edu", "Maya", true);
        User jordan = user("jordan@example.com", "Jordan", false);
        LocalDate today = LocalDate.now();

        listing(maya, "Sunny 1BR near EMU campus — Jan to May", ListingType.SUBLEASE, 875, 1, "1",
                "1020 Washtenaw Ave", "Ypsilanti", 42.2475, -83.6262, today.plusMonths(2), today.plusMonths(7), true, false, true, 0);
        listing(jordan, "Take over my 2BR lease in Depot Town", ListingType.LEASE_TAKEOVER, 1240, 2, "1.5",
                "45 E Cross St", "Ypsilanti", 42.2445, -83.6105, today.plusWeeks(3), today.plusMonths(10), false, true, false, 0);
        listing(maya, "Private room in a quiet 3BR house", ListingType.ROOM, 650, 1, "1",
                "312 S Division St", "Ann Arbor", 42.2779, -83.7441, today.plusMonths(1), today.plusMonths(6), true, false, true, 2);
        listing(jordan, "Studio by Kerrytown — summer sublet", ListingType.SUBLEASE, 980, 0, "1",
                "400 N Fifth Ave", "Ann Arbor", 42.2836, -83.7466, today.plusMonths(6), today.plusMonths(9), true, false, false, 0);

        roommate(jordan, "Grad student looking for 1–2 roommates near campus", "EMU grad student, data science",
                550, 750, "Ypsilanti", "Near EMU or Depot Town", 42.2506, -83.6240, today.plusMonths(2), 12,
                SleepSchedule.EARLY, Cleanliness.VERY_TIDY, false, false);
        User sam = user("sam@umich.edu", "Sam", true);
        roommate(sam, "Summer intern in Ann Arbor, want to split a 2BR", "Software intern",
                700, 1000, "Ann Arbor", "Kerrytown or downtown", 42.2808, -83.7430, today.plusMonths(7), 3,
                SleepSchedule.LATE, Cleanliness.TIDY, false, true);

        log.info("Demo data added. Log in as maya@emich.edu / password123");
    }

    private User user(String email, String name, boolean verified) {
        User u = new User();
        u.setEmail(email);
        u.setDisplayName(name);
        u.setPasswordHash(encoder.encode("password123"));
        u.setEmailVerified(verified);
        return users.save(u);
    }

    private void roommate(User owner, String headline, String occupation, int min, int max, String city,
                          String area, double lat, double lng, LocalDate moveIn, Integer months,
                          SleepSchedule sleep, Cleanliness clean, boolean smokes, boolean pet) {
        RoommatePost p = new RoommatePost();
        p.setOwner(owner);
        p.setHeadline(headline);
        p.setAbout("Quiet during the week, happy to cook together on weekends. Looking for someone respectful "
                + "who pays on time. Message me and we can grab coffee and look at places together.");
        p.setOccupation(occupation);
        p.setBudgetMin(min);
        p.setBudgetMax(max);
        p.setCity(city);
        p.setState("MI");
        p.setPreferredArea(area);
        p.setLatitude(lat);
        p.setLongitude(lng);
        p.setMoveInDate(moveIn);
        p.setStayMonths(months);
        p.setSleepSchedule(sleep);
        p.setCleanliness(clean);
        p.setSmokes(smokes);
        p.setHasPet(pet);
        roommatePosts.save(p);
    }

    private void listing(User owner, String title, ListingType type, int rent, int beds, String baths,
                         String address, String city, double lat, double lng, LocalDate from, LocalDate to,
                         boolean furnished, boolean pets, boolean utilities, int roommates) {
        Listing l = new Listing();
        l.setOwner(owner);
        l.setTitle(title);
        l.setDescription("Bright and clean, close to campus and the bus line. Laundry in the building and street parking. "
                + "I'm leaving early for an internship, so I'm looking for someone to take it over. Message me with questions!");
        l.setListingType(type);
        l.setMonthlyRent(rent);
        l.setBedrooms(beds);
        l.setBathrooms(new BigDecimal(baths));
        l.setAddress(address);
        l.setCity(city);
        l.setState("MI");
        l.setLatitude(lat);
        l.setLongitude(lng);
        l.setAvailableFrom(from);
        l.setAvailableTo(to);
        l.setFurnished(furnished);
        l.setPetsAllowed(pets);
        l.setUtilitiesIncluded(utilities);
        l.setCurrentRoommates(roommates);
        if (type == ListingType.ROOM) {
            l.setGenderPreference(GenderPreference.FEMALE);
            l.setHouseholdVibe(HouseholdVibe.QUIET);
        }
        l.setSubletPermissionConfirmed(true);
        listings.save(l);
    }
}
