import { describe, it, expect, vi, afterEach } from "vitest";
import type { PropertyDTO } from "@buildestate/contracts";
import {
  buildListingBody,
  listingValues,
  readFilters,
} from "../src/features/properties/helpers";
import { propertiesAPI } from "../src/features/properties/api";
import { api } from "../src/lib/api";
const property: PropertyDTO = {
  _id: "012345678901234567890123",
  title: "Garden apartment",
  location: "Pune",
  price: 5000000,
  beds: 2,
  baths: 2,
  sqft: 1100,
  type: "Flat",
  purpose: "sale",
  availability: "sale",
  marketStatus: "available",
  description: "A bright apartment overlooking the garden.",
  phone: "+919999999999",
  image: ["https://example.test/old.jpg", "https://example.test/second.jpg"],
  amenities: ["Parking"],
  googleMapLink: "",
  status: "pending",
  version: 7,
  expiresAt: null,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};
afterEach(() => vi.restoreAllMocks());
describe("listing edit safety", () => {
  it("text-only edits explicitly retain existing media and displayed version", () => {
    const body = buildListingBody(
      { ...listingValues(property), title: "Updated apartment" },
      property.image,
      [],
      property,
    );
    expect(body.get("retainedImages")).toBe(JSON.stringify(property.image));
    expect(body.get("expectedVersion")).toBe("7");
    expect(body.get("title")).toBe("Updated apartment");
    expect(body.has("image1")).toBe(false);
  });
  it("mixed retention and uploads preserve the chosen subset and canonical multipart names", () => {
    const image = new File(["test bytes"], "new.png", { type: "image/png" });
    const body = buildListingBody(
      listingValues(property),
      [property.image[1]],
      [image],
      property,
    );
    expect(body.get("retainedImages")).toBe(
      JSON.stringify([property.image[1]]),
    );
    expect((body.get("image1") as File).name).toBe("new.png");
    expect(body.get("availability")).toBe("sale");
    expect(body.get("amenities")).toBe('["Parking"]');
  });
  it("blocks empty, over-limit and oversized image selections before a write", () => {
    const values = listingValues(property);
    expect(() => buildListingBody(values, [], [], property)).toThrow(
      /one and four/,
    );
    expect(() =>
      buildListingBody(values, Array(5).fill(property.image[0]), [], property),
    ).toThrow(/one and four/);
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    expect(() => buildListingBody(values, [], [large], property)).toThrow(
      /5 MB/,
    );
  });
  it("uses shared validation and rejects invalid purpose/market combinations", () => {
    expect(() =>
      buildListingBody(
        { ...listingValues(property), marketStatus: "rented" },
        property.image,
        [],
        property,
      ),
    ).toThrow(/purpose/);
    expect(() =>
      buildListingBody(
        { ...listingValues(property), googleMapLink: "javascript:alert(1)" },
        property.image,
        [],
        property,
      ),
    ).toThrow();
  });
  it("normalizes malformed URL paging and unsupported filters", () => {
    const filters = readFilters(
      new URLSearchParams(
        "page=-2&status=ban&type=fake&sort=magic&availability=sold",
      ),
    );
    expect(filters).toMatchObject({
      page: 1,
      status: "all",
      type: "all",
      sort: "newest",
      availability: "",
    });
  });
});
describe("versioned property commands", () => {
  it("single archive sends the displayed version and never uses a hard-delete endpoint", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    await propertiesAPI.command("archive", [property]);
    expect(request.mock.calls[0][0]).toBe("/api/products/remove");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      id: property._id,
      expectedVersion: 7,
    });
  });
  it("bulk review sends exactly the supplied current-page rows and their versions", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    const second = {
      ...property,
      _id: "112345678901234567890123",
      version: 12,
    };
    await propertiesAPI.command(
      "reject",
      [property, second],
      "Photo details need correction",
    );
    expect(request.mock.calls[0][0]).toBe("/api/admin/properties/bulk-reject");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      propertyIds: [property._id, second._id],
      expectedVersions: { [property._id]: 7, [second._id]: 12 },
      reason: "Photo details need correction",
    });
  });
  it("never converts a stale conflict into a successful or partial bulk action", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockRejectedValue(Object.assign(new Error("Changed"), { status: 409 }));
    await expect(
      propertiesAPI.command("approve", [
        property,
        { ...property, _id: "112345678901234567890123" },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledOnce();
  });
});
