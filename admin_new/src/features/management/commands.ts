import type {
  UserDTO,
  AppointmentDTO,
  AIModelDTO,
} from "@buildestate/contracts";
import { BOOKING_TRANSITIONS } from "@buildestate/contracts";
import { api } from "@/lib/api";
export function moderateUsers(
  action: "suspend" | "ban" | "unban" | "archive",
  records: UserDTO[],
  reason: string,
  days: number,
) {
  if (!records.length) throw new Error("Select at least one account.");
  const selected = records.map((row) => row._id);
  const expectedVersions = Object.fromEntries(
    records.map((row) => [row._id, row.version]),
  );
  const body = { reason, ...(action === "suspend" ? { days } : {}) };
  if (records.length > 1) {
    if (action !== "suspend" && action !== "ban")
      throw new Error("This action requires one account.");
    return api.request(`/api/admin/users/bulk-${action}`, {
      method: "POST",
      body: JSON.stringify({ userIds: selected, expectedVersions, ...body }),
    });
  }
  return api.request(
    `/api/admin/users/${selected[0]}${action === "archive" ? "" : `/${action}`}`,
    {
      method: action === "archive" ? "DELETE" : "PUT",
      body: JSON.stringify({
        expectedVersion: records[0].version,
        ...(action === "archive" ? {} : body),
      }),
    },
  );
}
export function bookingActions(record: AppointmentDTO, now: number) {
  return (BOOKING_TRANSITIONS[record.status] || []).map((status) => ({
    status,
    disabled:
      status === "completed" &&
      (!record.endsAt ||
        !Number.isFinite(Date.parse(record.endsAt)) ||
        Date.parse(record.endsAt) > now),
  }));
}
export function setBookingStatus(
  record: AppointmentDTO,
  status: string,
  reason: string,
) {
  return api.request("/api/admin/appointments/status", {
    method: "PUT",
    body: JSON.stringify({
      appointmentId: record._id,
      expectedVersion: record.version,
      status,
      ...(status === "cancelled"
        ? { reason: reason || "Cancelled by administrator" }
        : {}),
    }),
  });
}
export function changeModel(
  record: AIModelDTO,
  values: object,
  remove = false,
) {
  return api.request(`/api/admin/ai-models/${record._id}`, {
    method: remove ? "DELETE" : "PUT",
    body: JSON.stringify({ ...values, expectedVersion: record.version }),
  });
}
export function reorderModels(models: AIModelDTO[]) {
  return api.request("/api/admin/ai-models/reorder", {
    method: "POST",
    body: JSON.stringify({
      modelIds: models.map((row) => row._id),
      expectedVersions: Object.fromEntries(
        models.map((row) => [row._id, row.version]),
      ),
    }),
  });
}
export function modelEligible(model: AIModelDTO) {
  return (
    !!model.lastTest?.passed &&
    model.lastTest.mode === "application" &&
    model.lastTest.configuration === model.configuration
  );
}
