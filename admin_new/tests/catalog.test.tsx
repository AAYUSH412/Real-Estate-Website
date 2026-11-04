import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Catalog from "../src/features/properties/catalog";
import { propertiesAPI } from "../src/features/properties/api";
import type { PropertyDTO } from "@buildestate/contracts";
const first: PropertyDTO = {
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
  status: "pending",
  version: 7,
  expiresAt: null,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};
const second = {
  ...first,
  _id: "112345678901234567890123",
  title: "Second apartment",
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/properties"]}>
        <Catalog />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("clears page selection when pagination or submitted filters change", async () => {
  const list = vi
    .spyOn(propertiesAPI, "list")
    .mockImplementation(async (filters) => ({
      success: true,
      properties: filters.page === 2 ? [second] : [first],
      pagination: {
        total: 2,
        totalProperties: 2,
        totalPages: 2,
        currentPage: filters.page || 1,
        limit: 15,
        hasNextPage: filters.page !== 2,
        hasPreviousPage: filters.page === 2,
      },
    }));
  const user = userEvent.setup();
  mount();
  await screen.findByRole("link", { name: "Open Garden apartment" });
  await user.click(
    screen.getByRole("checkbox", { name: "Select Garden apartment" }),
  );
  expect(screen.getByText("1 selected on this page")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("link", { name: "Open Second apartment" });
  expect(screen.queryByText("1 selected on this page")).toBeNull();
  expect(
    screen
      .getByRole("checkbox", { name: "Select Second apartment" })
      .getAttribute("data-state"),
  ).toBe("unchecked");
  await user.click(
    screen.getByRole("checkbox", { name: "Select Second apartment" }),
  );
  await user.type(screen.getByLabelText("Search properties"), "Pune");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await screen.findByRole("link", { name: "Open Garden apartment" });
  expect(screen.queryByText("1 selected on this page")).toBeNull();
  expect(list.mock.lastCall?.[0]).toMatchObject({ page: 1, search: "Pune" });
});
it("does not offer bulk approval for a mixed pending/active selection", async () => {
  vi.spyOn(propertiesAPI, "list").mockResolvedValue({
    success: true,
    properties: [first, { ...second, status: "active" }],
    pagination: {
      total: 2,
      totalProperties: 2,
      totalPages: 1,
      currentPage: 1,
      limit: 15,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  const user = userEvent.setup();
  mount();
  await screen.findByRole("link", { name: "Open Garden apartment" });
  await user.click(
    screen.getByRole("checkbox", {
      name: "Select all actionable listings on this page",
    }),
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Approve",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Reject",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Archive",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
