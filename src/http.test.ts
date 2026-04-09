import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { post } from "./http.js";
import { ApiResponseError, NetworkError } from "./errors.js";
import type { HttpOptions } from "./http.js";

const baseOpts: HttpOptions = {
  apiKey: "fb_sk_eval_test",
  baseUrl: "https://api.flagbridge.io",
  timeout: 5_000,
};

function mockFetchOk(data: unknown): void {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data }),
  } as Response);
}

function mockFetchError(status: number, errorBody?: unknown): void {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => errorBody ?? { error: { code: "err", message: `HTTP ${status}` } },
  } as Response);
}

describe("post", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful responses", () => {
    it("returns the data field from the response envelope", async () => {
      mockFetchOk({ flagKey: "my-flag", value: true, reason: "default" });
      const result = await post(baseOpts, "/v1/evaluate", { flag_key: "my-flag" });
      expect(result).toEqual({ flagKey: "my-flag", value: true, reason: "default" });
    });

    it("sends a POST request to the correct URL", async () => {
      mockFetchOk({});
      await post(baseOpts, "/v1/evaluate", {});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.flagbridge.io/v1/evaluate",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("sends the Authorization header with the API key", async () => {
      mockFetchOk({});
      await post(baseOpts, "/v1/evaluate", {});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer fb_sk_eval_test",
          }),
        }),
      );
    });

    it("sends Content-Type: application/json", async () => {
      mockFetchOk({});
      await post(baseOpts, "/v1/evaluate", {});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("serializes the body as JSON", async () => {
      mockFetchOk({});
      await post(baseOpts, "/v1/evaluate", { project: "acme", flag_key: "beta" });
      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
      expect(JSON.parse(callArgs.body as string)).toEqual({
        project: "acme",
        flag_key: "beta",
      });
    });

    it("uses a custom baseUrl when provided", async () => {
      mockFetchOk({});
      const opts: HttpOptions = { ...baseOpts, baseUrl: "https://self-hosted.example.com" };
      await post(opts, "/v1/evaluate", {});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://self-hosted.example.com/v1/evaluate",
        expect.any(Object),
      );
    });
  });

  describe("API error responses", () => {
    it("throws ApiResponseError on non-ok status", async () => {
      mockFetchError(404, { error: { code: "not_found", message: "flag not found" } });
      await expect(post(baseOpts, "/v1/evaluate", {})).rejects.toBeInstanceOf(ApiResponseError);
    });

    it("sets the status on ApiResponseError", async () => {
      mockFetchError(403, { error: { code: "forbidden", message: "no access" } });
      const err = await post(baseOpts, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect((err as ApiResponseError).status).toBe(403);
    });

    it("uses the API error message when available", async () => {
      mockFetchError(422, { error: { code: "invalid", message: "context is malformed" } });
      const err = await post(baseOpts, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect((err as ApiResponseError).message).toContain("context is malformed");
    });

    it("falls back to HTTP status message when body is not parseable", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error("bad json"); },
      } as unknown as Response);
      const err = await post(baseOpts, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect((err as ApiResponseError).message).toContain("500");
    });
  });

  describe("network errors", () => {
    it("throws NetworkError when fetch rejects", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      await expect(post(baseOpts, "/v1/evaluate", {})).rejects.toBeInstanceOf(NetworkError);
    });

    it("includes the original error message in the NetworkError", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      const err = await post(baseOpts, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect((err as NetworkError).message).toContain("ECONNREFUSED");
    });

    it("throws NetworkError with timeout message on AbortError", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        return Promise.reject(abortErr);
      });
      const err = await post({ ...baseOpts, timeout: 3_000 }, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect((err as NetworkError).message).toContain("timed out");
      expect((err as NetworkError).message).toContain("3000ms");
    });

    it("handles non-Error rejection values", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue("some string error");
      const err = await post(baseOpts, "/v1/evaluate", {}).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NetworkError);
    });
  });
});
