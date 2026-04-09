import type { ApiError, ApiResponse } from "./types.js";
import { ApiResponseError, NetworkError } from "./errors.js";

export interface HttpOptions {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

export async function post<T>(
  opts: HttpOptions,
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${opts.baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const err = (await res.json()) as ApiError;
        message = err.error?.message ?? message;
      } catch {
        // ignore parse failures
      }
      throw new ApiResponseError(message, res.status);
    }

    const json = (await res.json()) as ApiResponse<T>;
    return json.data;
  } catch (err) {
    if (err instanceof ApiResponseError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new NetworkError(`request to ${path} timed out after ${opts.timeout}ms`);
    }
    throw new NetworkError(
      err instanceof Error ? err.message : "unknown network error",
    );
  } finally {
    clearTimeout(timer);
  }
}
