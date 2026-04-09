import type {
  FlagBridgeConfig,
  EvalContext,
  EvalResult,
  BatchEvalData,
} from "./types.js";
import { post, type HttpOptions } from "./http.js";
import { Cache } from "./cache.js";
import { connectSSE } from "./sse-client.js";
import { FlagBridgeError } from "./errors.js";

const DEFAULT_API_URL = "https://api.flagbridge.io";
const DEFAULT_TIMEOUT = 5_000;

/**
 * FlagBridge Node.js client.
 *
 * ```ts
 * const fb = new FlagBridge({
 *   apiKey: "fb_sk_eval_...",
 *   project: "my-app",
 *   environment: "production",
 * });
 *
 * const enabled = await fb.getBooleanValue("new-feature", false);
 * ```
 */
export class FlagBridge {
  private readonly http: HttpOptions;
  private readonly project: string;
  private readonly environment: string;
  private readonly defaultContext: EvalContext;
  private readonly cache: Cache;
  private readonly onError: (error: Error) => void;
  private disconnectSSE: (() => void) | null = null;

  constructor(config: FlagBridgeConfig) {
    if (!config.apiKey) throw new FlagBridgeError("apiKey is required", "config_error");
    if (!config.project) throw new FlagBridgeError("project is required", "config_error");
    if (!config.environment) throw new FlagBridgeError("environment is required", "config_error");

    this.http = {
      apiKey: config.apiKey,
      baseUrl: config.apiUrl ?? DEFAULT_API_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
    this.project = config.project;
    this.environment = config.environment;
    this.defaultContext = config.context ?? {};
    this.cache = new Cache();
    this.onError = config.onError ?? (() => {});

    if (config.enableStreaming) {
      this.startStreaming();
    }
  }

  /** Evaluate a boolean flag. Returns `defaultValue` on error. */
  async getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: EvalContext,
  ): Promise<boolean> {
    const result = await this.evaluate(flagKey, context);
    if (result === undefined) return defaultValue;
    return typeof result === "boolean" ? result : defaultValue;
  }

  /** Evaluate a string flag. Returns `defaultValue` on error. */
  async getStringValue(
    flagKey: string,
    defaultValue: string,
    context?: EvalContext,
  ): Promise<string> {
    const result = await this.evaluate(flagKey, context);
    if (result === undefined) return defaultValue;
    return typeof result === "string" ? result : defaultValue;
  }

  /** Evaluate a number flag. Returns `defaultValue` on error. */
  async getNumberValue(
    flagKey: string,
    defaultValue: number,
    context?: EvalContext,
  ): Promise<number> {
    const result = await this.evaluate(flagKey, context);
    if (result === undefined) return defaultValue;
    return typeof result === "number" ? result : defaultValue;
  }

  /** Evaluate a flag and return the raw value. Returns `undefined` on error. */
  async getValue<T = unknown>(
    flagKey: string,
    context?: EvalContext,
  ): Promise<T | undefined> {
    return this.evaluate(flagKey, context) as Promise<T | undefined>;
  }

  /**
   * Evaluate multiple flags at once.
   * Returns a map of flag key -> value. Flags not found are omitted.
   */
  async getBatchValues(
    flagKeys: string[],
    context?: EvalContext,
  ): Promise<Record<string, unknown>> {
    try {
      const ctx = this.mergeContext(context);
      const data = await post<BatchEvalData>(this.http, "/v1/evaluate/batch", {
        project: this.project,
        environment: this.environment,
        flag_keys: flagKeys,
        context: ctx,
      });

      const result: Record<string, unknown> = {};
      for (const [key, evalResult] of Object.entries(data.flags)) {
        result[key] = evalResult.value;
        this.cache.set(this.cacheKey(key), evalResult.value);
      }
      return result;
    } catch (err) {
      this.handleError(err);
      return {};
    }
  }

  /** Start SSE streaming for real-time flag updates. */
  startStreaming(): void {
    if (this.disconnectSSE) return;

    this.disconnectSSE = connectSSE(
      this.http.baseUrl,
      this.http.apiKey,
      this.environment,
      {
        onFlagUpdated: (flagKey) => {
          this.cache.invalidate(this.cacheKey(flagKey));
        },
        onError: (err) => this.onError(err),
      },
    );
  }

  /** Stop SSE streaming. */
  stopStreaming(): void {
    this.disconnectSSE?.();
    this.disconnectSSE = null;
  }

  /** Disconnect and clean up all resources. */
  destroy(): void {
    this.stopStreaming();
    this.cache.clear();
  }

  private async evaluate(
    flagKey: string,
    context?: EvalContext,
  ): Promise<unknown | undefined> {
    const key = this.cacheKey(flagKey);
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    try {
      const ctx = this.mergeContext(context);
      const data = await post<EvalResult>(this.http, "/v1/evaluate", {
        project: this.project,
        environment: this.environment,
        flag_key: flagKey,
        context: ctx,
      });

      this.cache.set(key, data.value);
      return data.value;
    } catch (err) {
      this.handleError(err);
      return undefined;
    }
  }

  private mergeContext(override?: EvalContext): EvalContext {
    if (!override) return this.defaultContext;
    return {
      userId: override.userId ?? this.defaultContext.userId,
      attributes: {
        ...this.defaultContext.attributes,
        ...override.attributes,
      },
    };
  }

  private cacheKey(flagKey: string): string {
    return `${this.project}:${this.environment}:${flagKey}`;
  }

  private handleError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.onError(error);
  }
}
