import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FlagBridge } from "../client.js";
import {
  skipIfNoAPI,
  createFixture,
  cleanupFixture,
  type TestFixture,
} from "./setup.js";

describe.skipIf(skipIfNoAPI())("SDK Integration — Evaluate", () => {
  let fixture: TestFixture;
  let client: FlagBridge;

  beforeAll(async () => {
    fixture = await createFixture();
    client = new FlagBridge({
      apiKey: fixture.evalApiKey,
      apiUrl: fixture.apiUrl,
      project: fixture.projectSlug,
      environment: fixture.environment,
    });
  });

  afterAll(async () => {
    client?.destroy();
    if (fixture) await cleanupFixture(fixture);
  });

  it("evaluates a boolean flag", async () => {
    const value = await client.getBooleanValue("bool-flag", false);
    expect(value).toBe(true);
  });

  it("evaluates a string flag", async () => {
    const value = await client.getStringValue("string-flag", "fallback");
    expect(value).toBe("hello");
  });

  it("evaluates a number flag", async () => {
    const value = await client.getNumberValue("number-flag", 0);
    expect(value).toBe(42);
  });

  it("returns default for non-existent flag", async () => {
    const value = await client.getBooleanValue("does-not-exist", false);
    expect(value).toBe(false);
  });

  it("evaluates with custom context", async () => {
    const value = await client.getBooleanValue("bool-flag", false, {
      userId: "user-123",
      attributes: { country: "BR" },
    });
    expect(value).toBe(true);
  });

  it("batch evaluates multiple flags", async () => {
    const values = await client.getBatchValues([
      "bool-flag",
      "string-flag",
      "number-flag",
    ]);
    expect(values["bool-flag"]).toBe(true);
    expect(values["string-flag"]).toBe("hello");
    expect(values["number-flag"]).toBe(42);
  });

  it("batch evaluate returns empty for non-existent flags", async () => {
    const values = await client.getBatchValues(["ghost-flag"]);
    expect(values["ghost-flag"]).toBeUndefined();
  });

  it("getValue returns raw value", async () => {
    const value = await client.getValue<boolean>("bool-flag");
    expect(value).toBe(true);
  });
});
