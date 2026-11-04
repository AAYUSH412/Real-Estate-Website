import { describe, expect, it, vi } from "vitest";
import { createApi, ApiError } from "../src/lib/api";
const ok = (data: object) =>
  new Response(JSON.stringify({ success: true, ...data }), { status: 200 });
const failed = (status: number) =>
  new Response(JSON.stringify({ success: false, message: "Please retry" }), {
    status,
  });
describe("admin session transport", () => {
  it("deduplicates parallel refresh and sends credentials with validated session requests", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ok({ token: "access" }))
      .mockImplementation(async () =>
        ok({ user: { id: "a", role: "admin", email: "a@example.com" } }),
      );
    const api = createApi("", transport);
    await Promise.all([api.session(), api.session()]);
    expect(
      transport.mock.calls.filter(
        ([path]) => path === "/api/users/admin/refresh",
      ),
    ).toHaveLength(1);
    expect(transport.mock.calls[1][1]).toMatchObject({
      credentials: "include",
    });
    expect(
      new Headers(transport.mock.calls[1][1]?.headers).get("Authorization"),
    ).toBe("Bearer access");
  });
  it("preserves the session after temporary refresh failure and permits recovery", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failed(503))
      .mockResolvedValueOnce(ok({ token: "recovered" }))
      .mockResolvedValueOnce(ok({ user: { id: "a" } }));
    const api = createApi("", transport);
    const clear = vi.fn();
    api.subscribe(clear);
    await expect(api.session()).rejects.toMatchObject({ status: 503 });
    expect(clear).not.toHaveBeenCalled();
    await expect(api.session()).resolves.toMatchObject({ user: { id: "a" } });
  });
  it("clears invalid sessions and private-cache subscribers", async () => {
    const api = createApi(
      "",
      vi.fn<typeof fetch>().mockResolvedValue(failed(401)),
    );
    const clear = vi.fn();
    api.subscribe(clear);
    await expect(api.session()).rejects.toBeInstanceOf(ApiError);
    expect(clear).toHaveBeenCalledOnce();
  });
  it("retries an expired access token once and never retries a conflict", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ok({ token: "first" }))
      .mockResolvedValueOnce(ok({ user: {} }))
      .mockResolvedValueOnce(failed(401))
      .mockResolvedValueOnce(ok({ token: "second" }))
      .mockResolvedValueOnce(ok({ value: 1 }))
      .mockResolvedValueOnce(failed(409));
    const api = createApi("", transport);
    await api.session();
    await expect(api.request("/read")).resolves.toMatchObject({ value: 1 });
    await expect(
      api.request("/edit", { method: "PUT", body: "{}" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(transport).toHaveBeenCalledTimes(6);
  });
  it("does not claim logout succeeded when revocation fails", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failed(503))
      .mockResolvedValueOnce(ok({}));
    const api = createApi("", transport);
    const clear = vi.fn();
    api.subscribe(clear);
    await expect(api.logout()).rejects.toMatchObject({ status: 503 });
    expect(clear).not.toHaveBeenCalled();
    await api.logout();
    expect(clear).toHaveBeenCalledOnce();
  });
  it("ignores a refresh response that arrives after the local session changes", async () => {
    let complete!: (value: Response) => void;
    const api = createApi(
      "",
      vi.fn<typeof fetch>().mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      ),
    );
    const read = api.session();
    api.clear();
    complete(ok({ token: "stale" }));
    await expect(read).rejects.toMatchObject({ status: 401 });
  });
  it("aborts private query requests when the caller cancels", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ok({ token: "access" }))
      .mockResolvedValueOnce(ok({ user: {} }))
      .mockImplementation(async (_url, options) => {
        if (options?.signal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        return ok({});
      });
    const api = createApi("", transport);
    await api.session();
    const controller = new AbortController();
    controller.abort();
    await expect(
      api.request("/query", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
