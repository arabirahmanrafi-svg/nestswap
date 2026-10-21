package com.nestswap.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

/**
 * "Looking for roommates": someone without a place who wants to find people to rent with.
 * (Someone who HAS a place and needs a roommate posts a normal Listing of type ROOM.)
 */
@Entity
@Table(name = "roommate_posts")
public class RoommatePost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String headline;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String about;

    private String occupation;

    @Column(name = "budget_min", nullable = false)
    private int budgetMin;

    @Column(name = "budget_max", nullable = false)
    private int budgetMax;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(name = "preferred_area")
    private String preferredArea;

    private Double latitude;
    private Double longitude;

    @Column(name = "move_in_date", nullable = false)
    private LocalDate moveInDate;

    /** How long they want to stay; null means flexible. */
    @Column(name = "stay_months")
    private Integer stayMonths;

    @Column(name = "roommates_wanted", nullable = false)
    private int roommatesWanted = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender_preference", nullable = false)
    private GenderPreference genderPreference = GenderPreference.ANY;

    @Enumerated(EnumType.STRING)
    @Column(name = "household_vibe", nullable = false)
    private HouseholdVibe householdVibe = HouseholdVibe.MIXED;

    @Enumerated(EnumType.STRING)
    @Column(name = "sleep_schedule", nullable = false)
    private SleepSchedule sleepSchedule = SleepSchedule.FLEXIBLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Cleanliness cleanliness = Cleanliness.TIDY;

    @Column(nullable = false)
    private boolean smokes;

    @Column(name = "has_pet", nullable = false)
    private boolean hasPet;

    /** ACTIVE while searching; TAKEN once they found roommates (hidden from search). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingStatus status = ListingStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public String getHeadline() { return headline; }
    public void setHeadline(String headline) { this.headline = headline; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }
    public int getBudgetMin() { return budgetMin; }
    public void setBudgetMin(int budgetMin) { this.budgetMin = budgetMin; }
    public int getBudgetMax() { return budgetMax; }
    public void setBudgetMax(int budgetMax) { this.budgetMax = budgetMax; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPreferredArea() { return preferredArea; }
    public void setPreferredArea(String preferredArea) { this.preferredArea = preferredArea; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public LocalDate getMoveInDate() { return moveInDate; }
    public void setMoveInDate(LocalDate moveInDate) { this.moveInDate = moveInDate; }
    public Integer getStayMonths() { return stayMonths; }
    public void setStayMonths(Integer stayMonths) { this.stayMonths = stayMonths; }
    public int getRoommatesWanted() { return roommatesWanted; }
    public void setRoommatesWanted(int roommatesWanted) { this.roommatesWanted = roommatesWanted; }
    public GenderPreference getGenderPreference() { return genderPreference; }
    public void setGenderPreference(GenderPreference genderPreference) { this.genderPreference = genderPreference; }
    public HouseholdVibe getHouseholdVibe() { return householdVibe; }
    public void setHouseholdVibe(HouseholdVibe householdVibe) { this.householdVibe = householdVibe; }
    public SleepSchedule getSleepSchedule() { return sleepSchedule; }
    public void setSleepSchedule(SleepSchedule sleepSchedule) { this.sleepSchedule = sleepSchedule; }
    public Cleanliness getCleanliness() { return cleanliness; }
    public void setCleanliness(Cleanliness cleanliness) { this.cleanliness = cleanliness; }
    public boolean isSmokes() { return smokes; }
    public void setSmokes(boolean smokes) { this.smokes = smokes; }
    public boolean isHasPet() { return hasPet; }
    public void setHasPet(boolean hasPet) { this.hasPet = hasPet; }
    public ListingStatus getStatus() { return status; }
    public void setStatus(ListingStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}
