import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  UserDTO,
  AppointmentDTO,
  AIModelDTO,
} from "@buildestate/contracts";
import { api, createApi } from "../src/lib/api";
import {
  moderateUsers,
  bookingActions,
  setBookingStatus,
  modelEligible,
  changeModel,
  reorderModels,
} from "../src/features/management/commands";
import { exportSummary } from "../src/features/activity/export";
const user = {
  _id: "012345678901234567890123",
  version: 4,
  status: "active",
} as UserDTO;
const booking = {
  _id: "112345678901234567890123",
  version: 8,
  status: "confirmed",
  endsAt: "2026-11-04T10:00:00Z",
} as AppointmentDTO;
const model = {
  _id: "212345678901234567890123",
  version: 3,
  isActive: true,
  configuration: "config-a",
  lastTest: { passed: true, mode: "application", configuration: "config-a" },
} as AIModelDTO;
afterEach(() => vi.restoreAllMocks());
describe("management commands", () => {
  it("sends atomic selected-page user IDs and displayed versions for bulk moderation", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    const second = { ...user, _id: "312345678901234567890123", version: 9 };
    await moderateUsers("suspend", [user, second], "Test reason", 7);
    expect(request.mock.calls[0][0]).toBe("/api/admin/users/bulk-suspend");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      userIds: [user._id, second._id],
      expectedVersions: { [user._id]: 4, [second._id]: 9 },
      reason: "Test reason",
      days: 7,
    });
  });
  it("archives accounts with a version guard rather than purging history", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    await moderateUsers("archive", [user], "", 7);
    expect(request.mock.calls[0][1]?.method).toBe("DELETE");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      expectedVersion: 4,
    });
  });
  it("does not turn version conflicts into retries or partial-success results", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockRejectedValue(Object.assign(new Error("Changed"), { status: 409 }));
    await expect(moderateUsers("ban", [user], "Test", 7)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(request).toHaveBeenCalledOnce();
  });
  it("offers only legal booking transitions and disables completion before a known end", () => {
    expect(
      bookingActions(booking, Date.parse("2026-11-04T09:00:00Z")),
    ).toContainEqual({ status: "completed", disabled: true });
    expect(
      bookingActions(booking, Date.parse("2026-11-04T11:00:00Z")),
    ).toContainEqual({ status: "completed", disabled: false });
    expect(
      bookingActions(
        { ...booking, endsAt: undefined },
        Date.parse("2026-11-04T11:00:00Z"),
      ),
    ).toContainEqual({ status: "completed", disabled: true });
    expect(bookingActions({ ...booking, status: "completed" }, 0)).toEqual([]);
    expect(
      bookingActions(booking, 0).some((row) => row.status === "confirmed"),
    ).toBe(false);
  });
  it("booking updates carry the displayed version and cancellation reason", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    await setBookingStatus(booking, "cancelled", "Client requested");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      appointmentId: booking._id,
      expectedVersion: 8,
      status: "cancelled",
      reason: "Client requested",
    });
  });
  it("connection tests and old fingerprints never grant model eligibility", () => {
    expect(modelEligible(model)).toBe(true);
    expect(
      modelEligible({
        ...model,
        lastTest: { ...model.lastTest!, mode: "connection" },
      }),
    ).toBe(false);
    expect(modelEligible({ ...model, configuration: "new-config" })).toBe(
      false,
    );
    expect(
      modelEligible({
        ...model,
        lastTest: { ...model.lastTest!, passed: false },
      }),
    ).toBe(false);
  });
  it("model replacement/removal and reorder preserve full version guards", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ success: true });
    const second = { ...model, _id: "412345678901234567890123", version: 6 };
    await changeModel(
      model,
      { replacementId: second._id, replacementVersion: 6 },
      true,
    );
    expect(request.mock.calls[0][1]?.method).toBe("DELETE");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      expectedVersion: 3,
      replacementVersion: 6,
    });
    await reorderModels([second, model]);
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toEqual({
      modelIds: [second._id, model._id],
      expectedVersions: { [second._id]: 6, [model._id]: 3 },
    });
  });
});
describe("bounded CSV delivery", () => {
  it("reports truncation and never assumes a complete export when metadata is missing", () => {
    expect(
      exportSummary(
        new Headers({
          "X-Export-Truncated": "true",
          "X-Export-Limit": "10000",
          "X-Export-Total": "15000",
        }),
      ),
    ).toMatchObject({ truncated: true });
    expect(exportSummary(new Headers()).text).toMatch(
      /did not supply truncation/,
    );
  });
  it("refreshes expired credentials before downloading CSV without treating it as JSON", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, token: "first" })),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, token: "second" })),
      )
      .mockResolvedValueOnce(
        new Response("Date,Action\n2026-11-04,Test", {
          headers: { "content-type": "text/csv", "X-Export-Truncated": "true" },
        }),
      );
    const client = createApi("", transport);
    const data = await client.request<{ blob: Blob; headers: Headers }>(
      "/api/admin/activity-logs/export",
      { responseType: "blob" },
    );
    expect(await data.blob.text()).toContain("Date,Action");
    expect(data.headers.get("X-Export-Truncated")).toBe("true");
    expect(transport).toHaveBeenCalledTimes(4);
  });
});
