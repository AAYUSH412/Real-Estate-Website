import {
  parseListing,
  PROPERTY_TYPES,
  LISTING_STATUSES,
  type PropertyDTO,
} from "@buildestate/contracts";
import type { CatalogFilters } from "./api";
export const money = (value: number, purpose?: string) =>
  `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)}${purpose === "rent" ? " / month" : ""}`;
export const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "—";
export function readFilters(params: URLSearchParams): CatalogFilters {
  const page = Number(params.get("page") || 1);
  const pick = (key: string, allowed: readonly string[], fallback: string) =>
    allowed.includes(params.get(key) || "") ? params.get(key)! : fallback;
  return {
    page: Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1,
    limit: 15,
    search: (params.get("search") || "").slice(0, 200),
    status: pick(
      "status",
      ["all", ...LISTING_STATUSES],
      "all",
    ) as CatalogFilters["status"],
    type: pick("type", ["all", ...PROPERTY_TYPES], "all"),
    sort: pick(
      "sort",
      ["newest", "price-low", "price-high", "beds"],
      "newest",
    ) as CatalogFilters["sort"],
    availability: pick("availability", ["", "sale", "rent"], ""),
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
  };
}
export type ListingValues = {
  title: string;
  location: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  type: string;
  availability: string;
  marketStatus: string;
  phone: string;
  description: string;
  googleMapLink: string;
  amenities: string;
};
export const listingValues = (record?: PropertyDTO): ListingValues => ({
  title: record?.title || "",
  location: record?.location || "",
  price: record ? String(record.price) : "",
  beds: record ? String(record.beds) : "",
  baths: record ? String(record.baths) : "",
  sqft: record ? String(record.sqft) : "",
  type: record?.type || PROPERTY_TYPES[0],
  availability: record?.purpose || "sale",
  marketStatus: record?.marketStatus || "available",
  phone: record?.phone || "",
  description: record?.description || "",
  googleMapLink: record?.googleMapLink || "",
  amenities: record?.amenities.join(", ") || "",
});
export function buildListingBody(
  values: ListingValues,
  retained: string[],
  files: File[],
  record?: PropertyDTO,
) {
  if (retained.length + files.length < 1 || retained.length + files.length > 4)
    throw new Error("Keep or upload between one and four photos.");
  if (
    files.some(
      (file) =>
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ),
    )
  )
    throw new Error(
      "Use JPG, PNG, WebP or single-frame GIF photos up to 5 MB each.",
    );
  const parsed = parseListing({
    ...values,
    amenities: values.amenities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  });
  if (
    (parsed.marketStatus === "sold" && parsed.purpose !== "sale") ||
    (parsed.marketStatus === "rented" && parsed.purpose !== "rent")
  )
    throw new Error("Market state must match the listing purpose.");
  const body = new FormData();
  for (const [key, value] of Object.entries(parsed))
    body.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  if (record) {
    body.set("id", record._id);
    body.set("expectedVersion", String(record.version));
    body.set("retainedImages", JSON.stringify(retained));
  }
  files.forEach((file, index) => body.append(`image${index + 1}`, file));
  return body;
}
