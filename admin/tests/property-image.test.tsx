import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PropertyImage } from "../src/components/media/property-image";
import { dateLabel } from "../src/features/properties/helpers";
afterEach(cleanup);
it("handles a failed photo without changing its stored URL and resets for a new source", () => {
  const view = render(
    <PropertyImage
      src="https://example.test/missing.jpg"
      alt="Property front"
      compact={false}
    />,
  );
  fireEvent.error(screen.getByAltText("Property front"));
  expect(
    screen.getByRole("img", { name: "Property front: Photo unavailable" }),
  ).toBeTruthy();
  expect(screen.getByText("Photo unavailable")).toBeTruthy();
  view.rerender(
    <PropertyImage
      src="https://example.test/replacement.jpg"
      alt="Property front"
    />,
  );
  expect(screen.getByAltText("Property front").getAttribute("src")).toBe(
    "https://example.test/replacement.jpg",
  );
  expect(screen.queryByText("Photo unavailable")).toBeNull();
});
it("keeps missing/invalid historical dates explicit rather than fabricating them", () => {
  expect(dateLabel(undefined)).toBe("Not recorded");
  expect(dateLabel("invalid-date")).toBe("Not recorded");
  expect(dateLabel(null, "No scheduled expiry")).toBe("No scheduled expiry");
  expect(dateLabel("2026-11-04T00:00:00Z")).toBe("4 Nov 2026");
});
