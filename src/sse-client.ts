const MAX_BACKOFF_MS = 30_000;

export interface SSECallbacks {
  onFlagUpdated: (flagKey: string) => void;
  onError: (error: Error) => void;
  onConnected?: () => void;
}

/**
 * Connects to the FlagBridge SSE endpoint for real-time flag updates.
 * Uses native fetch streaming — no EventSource dependency.
 * Auto-reconnects with exponential backoff (1s to 30s).
 * Returns a cleanup function to disconnect.
 */
export function connectSSE(
  apiUrl: string,
  apiKey: string,
  environment: string,
  callbacks: SSECallbacks,
): () => void {
  let attempt = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;
  let controller: AbortController | null = null;

  function connect(): void {
    if (aborted) return;

    controller = new AbortController();
    const url = `${apiUrl}/v1/sse/${environment}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`SSE connection failed (${res.status})`);
        }
        if (!res.body) {
          throw new Error("SSE: no response body");
        }

        attempt = 0;
        callbacks.onConnected?.();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function read(): void {
          if (aborted) return;
          reader
            .read()
            .then(({ done, value }) => {
              if (done || aborted) {
                if (!aborted) reconnect();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              let currentEvent = "";
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  currentEvent = line.slice(6).trim();
                } else if (
                  line.startsWith("data:") &&
                  currentEvent === "flag.updated"
                ) {
                  try {
                    const data = JSON.parse(line.slice(5).trim()) as {
                      flag_key: string;
                    };
                    callbacks.onFlagUpdated(data.flag_key);
                  } catch {
                    // skip malformed data
                  }
                  currentEvent = "";
                } else if (line === "") {
                  currentEvent = "";
                }
              }

              read();
            })
            .catch((err: unknown) => {
              if (!aborted) {
                callbacks.onError(
                  err instanceof Error ? err : new Error(String(err)),
                );
                reconnect();
              }
            });
        }

        read();
      })
      .catch((err: unknown) => {
        if (!aborted) {
          callbacks.onError(
            err instanceof Error ? err : new Error(String(err)),
          );
          reconnect();
        }
      });
  }

  function reconnect(): void {
    if (aborted) return;
    const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
    attempt++;
    timeout = setTimeout(connect, delay);
  }

  connect();

  return () => {
    aborted = true;
    controller?.abort();
    if (timeout) clearTimeout(timeout);
  };
}
