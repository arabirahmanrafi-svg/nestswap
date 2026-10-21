package com.nestswap.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "listings")
public class Listing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type", nullable = false)
    private ListingType listingType;

    @Column(name = "monthly_rent", nullable = false)
    private int monthlyRent;

    @Column(nullable = false)
    private int bedrooms;

    @Column(nullable = false)
    private BigDecimal bathrooms;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(name = "zip_code")
    private String zipCode;

    private Double latitude;

    private Double longitude;

    @Column(name = "available_from", nullable = false)
    private LocalDate availableFrom;

    @Column(name = "available_to")
    private LocalDate availableTo;

    @Column(nullable = false)
    private boolean furnished;

    @Column(name = "pets_allowed", nullable = false)
    private boolean petsAllowed;

    @Column(name = "utilities_included", nullable = false)
    private boolean utilitiesIncluded;

    @Column(name = "current_roommates", nullable = false)
    private int currentRoommates;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender_preference", nullable = false)
    private GenderPreference genderPreference = GenderPreference.ANY;

    @Enumerated(EnumType.STRING)
    @Column(name = "household_vibe", nullable = false)
    private HouseholdVibe householdVibe = HouseholdVibe.MIXED;

    /** Poster ticked "my lease / landlord allows subletting or a lease transfer". */
    @Column(name = "sublet_permission_confirmed", nullable = false)
    private boolean subletPermissionConfirmed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingStatus status = ListingStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ListingImage> images = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ListingType getListingType() { return listingType; }
    public void setListingType(ListingType listingType) { this.listingType = listingType; }
    public int getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(int monthlyRent) { this.monthlyRent = monthlyRent; }
    public int getBedrooms() { return bedrooms; }
    public void setBedrooms(int bedrooms) { this.bedrooms = bedrooms; }
    public BigDecimal getBathrooms() { return bathrooms; }
    public void setBathrooms(BigDecimal bathrooms) { this.bathrooms = bathrooms; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public int getCurrentRoommates() { return currentRoommates; }
    public void setCurrentRoommates(int currentRoommates) { this.currentRoommates = currentRoommates; }
    public GenderPreference getGenderPreference() { return genderPreference; }
    public void setGenderPreference(GenderPreference genderPreference) { this.genderPreference = genderPreference; }
    public HouseholdVibe getHouseholdVibe() { return householdVibe; }
    public void setHouseholdVibe(HouseholdVibe householdVibe) { this.householdVibe = householdVibe; }
    public boolean isSubletPermissionConfirmed() { return subletPermissionConfirmed; }
    public void setSubletPermissionConfirmed(boolean v) { this.subletPermissionConfirmed = v; }
    public LocalDate getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(LocalDate availableFrom) { this.availableFrom = availableFrom; }
    public LocalDate getAvailableTo() { return availableTo; }
    public void setAvailableTo(LocalDate availableTo) { this.availableTo = availableTo; }
    public boolean isFurnished() { return furnished; }
    public void setFurnished(boolean furnished) { this.furnished = furnished; }
    public boolean isPetsAllowed() { return petsAllowed; }
    public void setPetsAllowed(boolean petsAllowed) { this.petsAllowed = petsAllowed; }
    public boolean isUtilitiesIncluded() { return utilitiesIncluded; }
    public void setUtilitiesIncluded(boolean utilitiesIncluded) { this.utilitiesIncluded = utilitiesIncluded; }
    public ListingStatus getStatus() { return status; }
    public void setStatus(ListingStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public List<ListingImage> getImages() { return images; }
}
