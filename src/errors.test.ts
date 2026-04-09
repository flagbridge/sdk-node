import { describe, it, expect } from "vitest";
import { FlagBridgeError, NetworkError, ApiResponseError } from "./errors.js";

describe("FlagBridgeError", () => {
  it("sets the message with the FlagBridge prefix", () => {
    const err = new FlagBridgeError("something went wrong", "some_code");
    expect(err.message).toBe("FlagBridge: something went wrong");
  });

  it("sets the code property", () => {
    const err = new FlagBridgeError("oops", "config_error");
    expect(err.code).toBe("config_error");
  });

  it("sets the name to FlagBridgeError", () => {
    const err = new FlagBridgeError("oops", "config_error");
    expect(err.name).toBe("FlagBridgeError");
  });

  it("is an instance of Error", () => {
    const err = new FlagBridgeError("oops", "some_code");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("NetworkError", () => {
  it("sets the message with the FlagBridge prefix", () => {
    const err = new NetworkError("connection refused");
    expect(err.message).toBe("FlagBridge: connection refused");
  });

  it("has code network_error", () => {
    const err = new NetworkError("timeout");
    expect(err.code).toBe("network_error");
  });

  it("sets the name to NetworkError", () => {
    const err = new NetworkError("timeout");
    expect(err.name).toBe("NetworkError");
  });

  it("is an instance of FlagBridgeError", () => {
    const err = new NetworkError("timeout");
    expect(err).toBeInstanceOf(FlagBridgeError);
  });

  it("is an instance of Error", () => {
    const err = new NetworkError("timeout");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ApiResponseError", () => {
  it("sets the message with the FlagBridge prefix", () => {
    const err = new ApiResponseError("not found", 404);
    expect(err.message).toBe("FlagBridge: not found");
  });

  it("has code api_error", () => {
    const err = new ApiResponseError("forbidden", 403);
    expect(err.code).toBe("api_error");
  });

  it("stores the HTTP status", () => {
    const err = new ApiResponseError("server error", 500);
    expect(err.status).toBe(500);
  });

  it("sets the name to ApiResponseError", () => {
    const err = new ApiResponseError("bad request", 400);
    expect(err.name).toBe("ApiResponseError");
  });

  it("is an instance of FlagBridgeError", () => {
    const err = new ApiResponseError("bad request", 400);
    expect(err).toBeInstanceOf(FlagBridgeError);
  });

  it("is an instance of Error", () => {
    const err = new ApiResponseError("bad request", 400);
    expect(err).toBeInstanceOf(Error);
  });

  it("preserves different status codes", () => {
    expect(new ApiResponseError("x", 401).status).toBe(401);
    expect(new ApiResponseError("x", 422).status).toBe(422);
    expect(new ApiResponseError("x", 503).status).toBe(503);
  });
});
