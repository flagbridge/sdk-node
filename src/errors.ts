export class FlagBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(`FlagBridge: ${message}`);
    this.name = "FlagBridgeError";
  }
}

export class NetworkError extends FlagBridgeError {
  constructor(message: string) {
    super(message, "network_error");
    this.name = "NetworkError";
  }
}

export class ApiResponseError extends FlagBridgeError {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message, "api_error");
    this.name = "ApiResponseError";
  }
}
