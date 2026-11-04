import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { api, ApiError } from "../src/lib/api";
import Models from "../src/features/ai-models/models";
import { LeadDetail } from "../src/features/leads/leads";
import Subscribers from "../src/features/subscribers/subscribers";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount(element: React.ReactNode, path: string, entry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path, element }], {
    initialEntries: [entry],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return client;
}
it("does not enable or report success for a model application test that returns passed:false", async () => {
  const request = vi.spyOn(api, "request").mockImplementation(async (path) =>
    path.endsWith("/test")
      ? { result: { passed: false, code: "INVALID_JSON", latencyMs: 30 } }
      : {
          models: [
            {
              _id: "012345678901234567890123",
              name: "Demo model",
              slug: "demo",
              modelId: "vendor/model",
              profile: "text-basic",
              config: { maxTokens: 1024, timeoutMs: 30000 },
              version: 4,
              configuration: "fingerprint",
              isActive: false,
              isDefault: false,
            },
          ],
          profiles: {
            "text-basic": { label: "Basic", options: [], maxTokens: 32768 },
          },
          migrationRequired: false,
          unsupported: [],
        },
  );
  const user = userEvent.setup();
  mount(<Models />, "/ai-models", "/ai-models");
  await screen.findByText("1. Demo model");
  expect(
    (screen.getByRole("button", { name: "Enable" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Test application JSON" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Run exact-model test" }),
  );
  await screen.findByText(/Model test failed: INVALID_JSON/);
  const call = request.mock.calls.find(([path]) => path.endsWith("/test"))!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({
    expectedVersion: 4,
    mode: "application",
  });
  expect(
    request.mock.calls.some(
      ([path, options]) =>
        path.includes("/ai-models/") && options?.method === "PUT",
    ),
  ).toBe(false);
});
it("preserves an inquiry draft and its original version across background refresh and 409", async () => {
  const lead = {
    _id: "112345678901234567890123",
    name: "Demo contact",
    email: "demo@example.test",
    message: "Demo inquiry",
    status: "new",
    adminNote: "Original",
    version: 2,
    createdAt: "2026-11-04T00:00:00Z",
  };
  const request = vi
    .spyOn(api, "request")
    .mockImplementation(async (_path, options) => {
      if (options?.method === "PUT") throw new ApiError(409, "Inquiry changed");
      return { lead };
    });
  const user = userEvent.setup();
  const client = mount(<LeadDetail />, "/leads/:id", `/leads/${lead._id}`);
  const note = await screen.findByLabelText("Internal note");
  await user.clear(note);
  await user.type(note, "My draft");
  act(() =>
    client.setQueryData(["leads", "detail", lead._id], {
      lead: { ...lead, version: 3, adminNote: "Other change" },
    }),
  );
  await user.click(screen.getByRole("button", { name: "Save resolution" }));
  await screen.findByText(/Inquiry changed Refresh and review/);
  const call = request.mock.calls.find(
    ([, options]) => options?.method === "PUT",
  )!;
  expect(JSON.parse(String(call[1]?.body))).toMatchObject({
    expectedVersion: 2,
    adminNote: "My draft",
  });
  expect(
    (screen.getByLabelText("Internal note") as HTMLTextAreaElement).value,
  ).toBe("My draft");
});
it("offers suppression only, with no grant-consent action and no repeated suppression of opted-out records", async () => {
  vi.spyOn(api, "request").mockResolvedValue({
    subscribers: [
      {
        _id: "a",
        email: "confirmed@example.test",
        status: "confirmed",
        createdAt: null,
      },
      {
        _id: "b",
        email: "optedout@example.test",
        status: "unsubscribed",
        createdAt: null,
      },
    ],
    pagination: {
      total: 2,
      currentPage: 1,
      limit: 15,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  mount(<Subscribers />, "/subscribers", "/subscribers");
  await screen.findByText("confirmed@example.test");
  const buttons = screen.getAllByRole("button", {
    name: "Suppress",
  }) as HTMLButtonElement[];
  expect(buttons.map((button) => button.disabled)).toEqual([false, true]);
  expect(
    screen.queryByRole("button", {
      name: /grant|confirm consent|send campaign/i,
    }),
  ).toBeNull();
});
