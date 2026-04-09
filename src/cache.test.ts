import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Cache } from "./cache.js";

describe("Cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get / set", () => {
    it("returns undefined for a key that was never set", () => {
      const cache = new Cache();
      expect(cache.get("missing")).toBeUndefined();
    });

    it("returns the value that was set", () => {
      const cache = new Cache();
      cache.set("flag-a", true);
      expect(cache.get("flag-a")).toBe(true);
    });

    it("stores and retrieves string values", () => {
      const cache = new Cache();
      cache.set("flag-b", "blue");
      expect(cache.get("flag-b")).toBe("blue");
    });

    it("stores and retrieves number values", () => {
      const cache = new Cache();
      cache.set("flag-c", 42);
      expect(cache.get("flag-c")).toBe(42);
    });

    it("stores and retrieves object values", () => {
      const cache = new Cache();
      const obj = { variant: "control", weight: 0.5 };
      cache.set("flag-d", obj);
      expect(cache.get("flag-d")).toEqual(obj);
    });

    it("stores false correctly (not confused with undefined)", () => {
      const cache = new Cache();
      cache.set("disabled-flag", false);
      expect(cache.get("disabled-flag")).toBe(false);
    });

    it("stores 0 correctly", () => {
      const cache = new Cache();
      cache.set("zero-flag", 0);
      expect(cache.get("zero-flag")).toBe(0);
    });

    it("stores empty string correctly", () => {
      const cache = new Cache();
      cache.set("empty-flag", "");
      expect(cache.get("empty-flag")).toBe("");
    });

    it("overwrites an existing key with a new value", () => {
      const cache = new Cache();
      cache.set("flag-x", "v1");
      cache.set("flag-x", "v2");
      expect(cache.get("flag-x")).toBe("v2");
    });
  });

  describe("TTL expiry", () => {
    it("returns undefined after TTL has elapsed", () => {
      const cache = new Cache(1_000);
      cache.set("flag-ttl", "alive");

      vi.advanceTimersByTime(1_001);

      expect(cache.get("flag-ttl")).toBeUndefined();
    });

    it("returns the value just before TTL expires", () => {
      const cache = new Cache(1_000);
      cache.set("flag-ttl", "alive");

      vi.advanceTimersByTime(999);

      expect(cache.get("flag-ttl")).toBe("alive");
    });

    it("uses the default TTL of 10 000 ms when none is provided", () => {
      const cache = new Cache();
      cache.set("flag-default-ttl", true);

      vi.advanceTimersByTime(9_999);
      expect(cache.get("flag-default-ttl")).toBe(true);

      vi.advanceTimersByTime(2);
      expect(cache.get("flag-default-ttl")).toBeUndefined();
    });

    it("deletes the entry from the store on expiry (no memory leak)", () => {
      const cache = new Cache(500);
      cache.set("temp", "value");

      vi.advanceTimersByTime(600);
      cache.get("temp"); // triggers deletion

      // Setting same key again should work fresh
      cache.set("temp", "fresh");
      expect(cache.get("temp")).toBe("fresh");
    });
  });

  describe("invalidate", () => {
    it("removes the specified key", () => {
      const cache = new Cache();
      cache.set("flag-inv", "present");
      cache.invalidate("flag-inv");
      expect(cache.get("flag-inv")).toBeUndefined();
    });

    it("does not throw when invalidating a key that does not exist", () => {
      const cache = new Cache();
      expect(() => cache.invalidate("nonexistent")).not.toThrow();
    });

    it("does not affect other keys", () => {
      const cache = new Cache();
      cache.set("keep", "value");
      cache.set("remove", "value");
      cache.invalidate("remove");
      expect(cache.get("keep")).toBe("value");
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      const cache = new Cache();
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      cache.clear();
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBeUndefined();
      expect(cache.get("c")).toBeUndefined();
    });

    it("allows entries to be set again after clearing", () => {
      const cache = new Cache();
      cache.set("flag", "old");
      cache.clear();
      cache.set("flag", "new");
      expect(cache.get("flag")).toBe("new");
    });

    it("does not throw when called on an empty cache", () => {
      const cache = new Cache();
      expect(() => cache.clear()).not.toThrow();
    });
  });
});
