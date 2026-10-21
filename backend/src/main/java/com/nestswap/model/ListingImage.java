package com.nestswap.model;

import jakarta.persistence.*;

@Entity
@Table(name = "listing_images")
public class ListingImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    /** Short description of the photo, read aloud by screen readers. */
    @Column(name = "alt_text")
    private String altText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected ListingImage() {}

    public ListingImage(Listing listing, String fileName, String altText, int sortOrder) {
        this.listing = listing;
        this.fileName = fileName;
        this.altText = altText;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Listing getListing() { return listing; }
    public String getFileName() { return fileName; }
    public String getAltText() { return altText; }
    public void setAltText(String altText) { this.altText = altText; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
