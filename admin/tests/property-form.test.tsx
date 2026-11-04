import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { PropertyDTO } from "@buildestate/contracts";
import PropertyForm from "../src/features/properties/form";
import { propertiesAPI } from "../src/features/properties/api";
import { ApiError } from "../src/lib/api";
const record: PropertyDTO = {
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
  description: "Garden apartment.",
  phone: "+919999999999",
  image: ["https://example.test/old.jpg"],
  amenities: [],
  googleMapLink: "",
  status: "active",
  version: 7,
  expiresAt: null,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps the original expectedVersion and unsaved fields when background data advances", async () => {
  vi.spyOn(propertiesAPI, "detail").mockResolvedValue({ property: record });
  const save = vi
    .spyOn(propertiesAPI, "save")
    .mockRejectedValue(new ApiError(409, "Listing changed"));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: "/properties/:id/edit", element: <PropertyForm /> }],
    { initialEntries: [`/properties/${record._id}/edit`] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  const title = await screen.findByLabelText("Property title");
  await user.clear(title);
  await user.type(title, "My unsaved revision");
  act(() =>
    client.setQueryData(["properties", "detail", record._id], {
      property: { ...record, version: 8, title: "Another admin revision" },
    }),
  );
  expect(
    (screen.getByLabelText("Property title") as HTMLInputElement).value,
  ).toBe("My unsaved revision");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText(
    "Listing changed Refresh and review the latest version before saving again.",
  );
  const body = save.mock.calls[0][0];
  expect(body.get("expectedVersion")).toBe("7");
  expect(body.get("title")).toBe("My unsaved revision");
  expect(
    (screen.getByLabelText("Property title") as HTMLInputElement).value,
  ).toBe("My unsaved revision");
});
