import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FlagBridge } from "./client.js";
import { FlagBridgeError } from "./errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => ({ data }),
  } as Response;
}

function makeApiErrorResponse(status: number, message = `HTTP ${status}`): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: { code: "api_error", message } }),
  } as Response;
}

const BASE_CONFIG = {
  apiKey: "fb_sk_eval_test",
  project: "acme",
  environment: "test",
  // Point to a local URL to make intent clear — fetch is always mocked
  apiUrl: "https://api.flagbridge.io",
};

beforeEach(() => {
  // Default: fetch never gets called (tests override as needed)
  globalThis.fetch = vi.fn().mockResolvedValue(makeApiResponse(null));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constructor validation
// ---------------------------------------------------------------------------

describe("FlagBridge constructor", () => {
  it("constructs without throwing when all required fields are present", () => {
    expect(() => new FlagBridge(BASE_CONFIG)).not.toThrow();
  });

  it("throws FlagBridgeError when apiKey is missing", () => {
    expect(() => new FlagBridge({ ...BASE_CONFIG, apiKey: "" })).toThrowError(FlagBridgeError);
  });

  it("throws with code config_error when apiKey is missing", () => {
    try {
      new FlagBridge({ ...BASE_CONFIG, apiKey: "" });
    } catch (e) {
      expect((e as FlagBridgeError).code).toBe("config_error");
    }
  });

  it("throws FlagBridgeError when project is missing", () => {
    expect(() => new FlagBridge({ ...BASE_CONFIG, project: "" })).toThrowError(FlagBridgeError);
  });

  it("throws FlagBridgeError when environment is missing", () => {
    expect(() => new FlagBridge({ ...BASE_CONFIG, environment: "" })).toThrowError(FlagBridgeError);
  });
});

// ---------------------------------------------------------------------------
// getBooleanValue
// ---------------------------------------------------------------------------

describe("getBooleanValue", () => {
  it("returns the boolean value from the API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "my-flag", value: true, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBooleanValue("my-flag", false);
    expect(result).toBe(true);
  });

  it("returns false when the API returns false", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "my-flag", value: false, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBooleanValue("my-flag", true);
    expect(result).toBe(false);
  });

  it("returns defaultValue when the API returns a non-boolean value", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "my-flag", value: "string-instead-of-bool", reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBooleanValue("my-flag", true);
    expect(result).toBe(true);
  });

  it("returns defaultValue when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBooleanValue("my-flag", true);
    expect(result).toBe(true);
  });

  it("calls onError when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const onError = vi.fn();
    const fb = new FlagBridge({ ...BASE_CONFIG, onError });
    await fb.getBooleanValue("my-flag", false);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("returns defaultValue when the API returns an error status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeApiErrorResponse(404, "flag not found"));
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBooleanValue("my-flag", false);
    expect(result).toBe(false);
  });

  it("does not call fetch a second time for the same flag (cache hit)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "cached-flag", value: true, reason: "rule" }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    await fb.getBooleanValue("cached-flag", false);
    await fb.getBooleanValue("cached-flag", false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getStringValue
// ---------------------------------------------------------------------------

describe("getStringValue", () => {
  it("returns the string value from the API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "color", value: "blue", reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getStringValue("color", "red")).toBe("blue");
  });

  it("returns defaultValue when the API returns a non-string value", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "color", value: 42, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getStringValue("color", "red")).toBe("red");
  });

  it("returns defaultValue on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getStringValue("color", "green")).toBe("green");
  });
});

// ---------------------------------------------------------------------------
// getNumberValue
// ---------------------------------------------------------------------------

describe("getNumberValue", () => {
  it("returns the number value from the API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "limit", value: 100, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getNumberValue("limit", 0)).toBe(100);
  });

  it("returns defaultValue when the API returns a non-number value", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "limit", value: "not-a-number", reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getNumberValue("limit", 99)).toBe(99);
  });

  it("returns 0 correctly (not treated as falsy default)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "limit", value: 0, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getNumberValue("limit", 99)).toBe(0);
  });

  it("returns defaultValue on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getNumberValue("limit", 42)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// getValue
// ---------------------------------------------------------------------------

describe("getValue", () => {
  it("returns the raw value from the API", async () => {
    const obj = { variant: "control", weight: 0.5 };
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "complex-flag", value: obj, reason: "rule" }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getValue("complex-flag")).toEqual(obj);
  });

  it("returns undefined on error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const fb = new FlagBridge(BASE_CONFIG);
    expect(await fb.getValue("any-flag")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getBatchValues
// ---------------------------------------------------------------------------

describe("getBatchValues", () => {
  it("returns a map of flag keys to their values", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeApiResponse({
        flags: {
          "flag-a": { flagKey: "flag-a", value: true, reason: "rule" },
          "flag-b": { flagKey: "flag-b", value: "blue", reason: "rule" },
        },
      }),
    );
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBatchValues(["flag-a", "flag-b"]);
    expect(result).toEqual({ "flag-a": true, "flag-b": "blue" });
  });

  it("returns an empty object on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const fb = new FlagBridge(BASE_CONFIG);
    const result = await fb.getBatchValues(["flag-a", "flag-b"]);
    expect(result).toEqual({});
  });

  it("calls onError on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const onError = vi.fn();
    const fb = new FlagBridge({ ...BASE_CONFIG, onError });
    await fb.getBatchValues(["flag-a"]);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("caches each flag returned from the batch so individual calls do not re-fetch", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        makeApiResponse({
          flags: {
            "flag-a": { flagKey: "flag-a", value: true, reason: "rule" },
          },
        }),
      )
      .mockResolvedValue(
        makeApiResponse({ flagKey: "flag-a", value: false, reason: "rule" }),
      );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    await fb.getBatchValues(["flag-a"]);
    // Second call uses the individual evaluate endpoint — but cache should prevent it
    const result = await fb.getBooleanValue("flag-a", false);
    expect(result).toBe(true); // cached value
    expect(fetchMock).toHaveBeenCalledOnce(); // no second fetch
  });

  it("sends the correct path for batch evaluation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flags: {} }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    await fb.getBatchValues(["x"]);
    const url = (fetchMock.mock.calls[0] as [string])[0];
    expect(url).toContain("/v1/evaluate/batch");
  });
});

// ---------------------------------------------------------------------------
// Context merging
// ---------------------------------------------------------------------------

describe("context merging", () => {
  it("sends the defaultContext when no per-call context is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "f", value: true, reason: "rule" }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge({
      ...BASE_CONFIG,
      context: { userId: "user-1", attributes: { plan: "pro" } },
    });
    await fb.getBooleanValue("f", false);
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body["context"]).toEqual({ userId: "user-1", attributes: { plan: "pro" } });
  });

  it("overrides userId with the per-call context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "f", value: true, reason: "rule" }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge({
      ...BASE_CONFIG,
      context: { userId: "default-user", attributes: { plan: "free" } },
    });
    await fb.getBooleanValue("f", false, { userId: "override-user" });
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect((body["context"] as Record<string, unknown>)["userId"]).toBe("override-user");
  });

  it("merges attributes — per-call attributes override default attributes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "f", value: true, reason: "rule" }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge({
      ...BASE_CONFIG,
      context: { attributes: { plan: "free", country: "BR" } },
    });
    await fb.getBooleanValue("f", false, { attributes: { plan: "pro" } });
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    const attrs = (body["context"] as Record<string, unknown>)["attributes"] as Record<string, string>;
    expect(attrs["plan"]).toBe("pro");     // overridden
    expect(attrs["country"]).toBe("BR");  // kept from default
  });
});

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

describe("streaming", () => {
  it("startStreaming does not throw when SSE is unavailable (fetch rejects)", () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("no sse"));
    const onError = vi.fn();
    const fb = new FlagBridge({ ...BASE_CONFIG, onError });
    expect(() => fb.startStreaming()).not.toThrow();
    fb.stopStreaming();
  });

  it("startStreaming is idempotent — calling it twice does not double-connect", () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("no sse"));
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    fb.startStreaming();
    const callsBefore = fetchMock.mock.calls.length;
    fb.startStreaming(); // second call should be a no-op
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    fb.stopStreaming();
  });

  it("stopStreaming does not throw when streaming was never started", () => {
    const fb = new FlagBridge(BASE_CONFIG);
    expect(() => fb.stopStreaming()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

describe("destroy", () => {
  it("does not throw", () => {
    const fb = new FlagBridge(BASE_CONFIG);
    expect(() => fb.destroy()).not.toThrow();
  });

  it("clears the cache so the next call re-fetches from the API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        makeApiResponse({ flagKey: "flag", value: "first", reason: "rule" }),
      )
      .mockResolvedValueOnce(
        makeApiResponse({ flagKey: "flag", value: "second", reason: "rule" }),
      );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    await fb.getStringValue("flag", "default");
    fb.destroy();
    const result = await fb.getStringValue("flag", "default");
    expect(result).toBe("second");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Request payload shape
// ---------------------------------------------------------------------------

describe("request payload", () => {
  it("sends project, environment and flag_key in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flagKey: "hero-cta", value: "Sign up", reason: "rule" }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge({ ...BASE_CONFIG, project: "my-project", environment: "staging" });
    await fb.getValue("hero-cta");
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body["project"]).toBe("my-project");
    expect(body["environment"]).toBe("staging");
    expect(body["flag_key"]).toBe("hero-cta");
  });

  it("sends flag_keys array for batch evaluation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeApiResponse({ flags: {} }),
    );
    globalThis.fetch = fetchMock;
    const fb = new FlagBridge(BASE_CONFIG);
    await fb.getBatchValues(["flag-x", "flag-y"]);
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body["flag_keys"]).toEqual(["flag-x", "flag-y"]);
  });
});
