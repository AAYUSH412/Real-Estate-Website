import type {
  PropertyDTO,
  PropertyPage,
  PropertyQuery,
  UserDTO,
} from "@buildestate/contracts";
import { api } from "@/lib/api";
import { queryClient } from "@/app/query-client";
export type CatalogFilters = PropertyQuery & {
  availability?: string;
  minPrice?: string;
  maxPrice?: string;
};
export function queryString(values: object) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null)
      params.set(key, String(value));
  });
  return params.toString();
}
export const propertiesAPI = {
  list: (filters: CatalogFilters, signal?: AbortSignal) =>
    api.request<PropertyPage>(`/api/admin/properties?${queryString(filters)}`, {
      signal,
    }),
  pending: (
    filters: { page: number; limit: number; search?: string },
    signal?: AbortSignal,
  ) =>
    api.request<PropertyPage>(
      `/api/admin/properties/pending?${queryString(filters)}`,
      { signal },
    ),
  detail: (id: string, signal?: AbortSignal) =>
    api.request<{ property: PropertyDTO }>(`/api/admin/properties/${id}`, {
      signal,
    }),
  owner: (id: string, signal?: AbortSignal) =>
    api.request<{ user: UserDTO }>(`/api/admin/users/${id}`, { signal }),
  save: (body: FormData, editing: boolean) =>
    api.request<{ property: PropertyDTO }>(
      `/api/products/${editing ? "update" : "add"}`,
      { method: "POST", body, signal: AbortSignal.timeout(120000) },
    ),
  command: (
    action: "approve" | "reject" | "archive",
    records: PropertyDTO[],
    reason?: string,
  ) => {
    if (!records.length) throw new Error("Select at least one listing.");
    const expectedVersions = Object.fromEntries(
      records.map((row) => [row._id, row.version]),
    );
    if (records.length === 1)
      return action === "archive"
        ? api.request("/api/products/remove", {
            method: "POST",
            body: JSON.stringify({
              id: records[0]._id,
              expectedVersion: records[0].version,
            }),
          })
        : api.request(`/api/admin/properties/${records[0]._id}/${action}`, {
            method: "PUT",
            body: JSON.stringify({
              expectedVersion: records[0].version,
              ...(action === "reject" ? { reason } : {}),
            }),
          });
    return api.request(
      `/api/admin/properties/bulk-${action === "approve" ? "approve" : action === "reject" ? "reject" : "delete"}`,
      {
        method: "POST",
        body: JSON.stringify({
          propertyIds: records.map((row) => row._id),
          expectedVersions,
          ...(action === "reject" ? { reason } : {}),
        }),
      },
    );
  },
};
export async function invalidateProperties() {
  await Promise.all(
    ["properties", "reviews", "dashboard", "appointments"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
