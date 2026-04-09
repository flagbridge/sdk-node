/** Configuration for the FlagBridge client. */
export interface FlagBridgeConfig {
  /** API key with eval scope (e.g. fb_sk_eval_...) */
  apiKey: string;
  /** API base URL (default: https://api.flagbridge.io) */
  apiUrl?: string;
  /** Project slug */
  project: string;
  /** Environment slug (e.g. "production", "staging") */
  environment: string;
  /** Default evaluation context sent with every request */
  context?: EvalContext;
  /** Enable SSE real-time updates (default: false) */
  enableStreaming?: boolean;
  /** Called on errors — SDK never throws in production */
  onError?: (error: Error) => void;
  /** Request timeout in ms (default: 5000) */
  timeout?: number;
}

/** Evaluation context for targeting rules. */
export interface EvalContext {
  /** Unique user identifier — required for percentage rollouts */
  userId?: string;
  /** User attributes for targeting (e.g. { country: "BR", plan: "pro" }) */
  attributes?: Record<string, string>;
}

/** Result of a flag evaluation. */
export interface EvalResult {
  flagKey: string;
  value: unknown;
  reason: string;
  ruleId?: string;
}

/** API response wrapper. */
export interface ApiResponse<T> {
  data: T;
}

/** API error response. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

/** Batch evaluation response. */
export interface BatchEvalData {
  flags: Record<string, EvalResult>;
}

/** Event emitted when a flag is updated via SSE. */
export interface FlagUpdateEvent {
  flagKey: string;
}
