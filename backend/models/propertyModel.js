import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    // Stored as plain URLs. Admin-panel listings use this directly.
    // User-submitted listings also store URLs here for full compatibility.
    image: {
      type: [String],
      required: true,
    },
    beds: {
      type: Number,
      required: true,
    },
    baths: {
      type: Number,
      required: true,
    },
    sqft: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    availability: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amenities: {
      type: Array,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    googleMapLink: {
      type: String,
      default: "",
    },

    // ── User listing fields ──────────────────────────────────────────────────
    // Listings added via the admin panel leave these at their defaults.
    // Listings submitted by users go through an approval workflow.

    // 'pending'  — awaiting admin review (default for user submissions)
    // 'active'   — approved and visible on the site
    // 'rejected' — not approved; rejectionReason is set
    // 'expired'  — was active but passed expiresAt date
    // Admin-panel listings are saved directly as 'active' (no review needed).
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "expired"],
      default: "active", // admin-added properties go live immediately
    },

    // Reference to the User who submitted this listing (null for admin entries)
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Filled by admin when status is set to 'rejected'
    rejectionReason: {
      type: String,
      default: "",
    },

    // When the listing should automatically expire (null = never, for admin entries)
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Adds createdAt and updatedAt fields automatically
    timestamps: true,
  }
);

// Database indexes for common query patterns
propertySchema.index({ status: 1 }); // Status filtering (active, pending, etc.)
propertySchema.index({ createdAt: -1 }); // Sorting by creation date
propertySchema.index({ postedBy: 1 }); // User's own listings
propertySchema.index({ status: 1, createdAt: -1 }); // Compound: status + sort
propertySchema.index({ postedBy: 1, createdAt: -1 }); // Compound: user listings + sort
propertySchema.index({ expiresAt: 1 }); // Expiry cleanup queries
propertySchema.index({ location: "text", title: "text", description: "text" }); // Text search
propertySchema.index({ price: 1, beds: 1, type: 1, location: 1 }); // Property filters

const Property = mongoose.model("Property", propertySchema);

export default Property;
