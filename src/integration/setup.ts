/**
 * Integration test setup — creates test fixtures via the FlagBridge API.
 *
 * Required env vars:
 *   FLAGBRIDGE_API_URL  — e.g. http://localhost:8080
 *   FLAGBRIDGE_EMAIL    — admin email (default: admin@flagbridge.io)
 *   FLAGBRIDGE_PASSWORD — admin password (default: flagbridge-admin-2026)
 */

export interface TestFixture {
  apiUrl: string;
  evalApiKey: string;
  projectSlug: string;
  environment: string;
}

const API_URL = process.env.FLAGBRIDGE_API_URL;
const EMAIL = process.env.FLAGBRIDGE_EMAIL ?? "admin@flagbridge.io";
const PASSWORD = process.env.FLAGBRIDGE_PASSWORD ?? "flagbridge-admin-2026";

export function skipIfNoAPI(): boolean {
  if (!API_URL) {
    console.log("FLAGBRIDGE_API_URL not set — skipping integration tests");
    return true;
  }
  return false;
}

async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string },
): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

export async function createFixture(): Promise<TestFixture> {
  if (!API_URL) throw new Error("FLAGBRIDGE_API_URL is required");

  // Login
  const { token } = await api<{ token: string }>("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });

  // Create project
  const slug = `sdk-test-${Date.now()}`;
  await api("/projects", {
    method: "POST",
    token,
    body: { name: "SDK Integration Test", slug },
  });

  // Get environments (auto-created with project)
  const envs = await api<Array<{ slug: string }>>(`/projects/${slug}/environments`, {
    token,
  });
  const environment = envs[0]?.slug ?? "production";

  // Create test flags
  await api(`/projects/${slug}/flags`, {
    method: "POST",
    token,
    body: { key: "bool-flag", name: "Boolean Flag", type: "boolean", default_value: true },
  });

  await api(`/projects/${slug}/flags`, {
    method: "POST",
    token,
    body: { key: "string-flag", name: "String Flag", type: "string", default_value: "hello" },
  });

  await api(`/projects/${slug}/flags`, {
    method: "POST",
    token,
    body: { key: "number-flag", name: "Number Flag", type: "number", default_value: 42 },
  });

  // Create eval-scoped API key
  const { key: evalApiKey } = await api<{ key: string }>("/api-keys", {
    method: "POST",
    token,
    body: { name: "SDK Test Eval Key", scope: "eval", project_id: slug },
  });

  return {
    apiUrl: API_URL,
    evalApiKey,
    projectSlug: slug,
    environment,
  };
}

export async function cleanupFixture(
  fixture: TestFixture,
): Promise<void> {
  if (!API_URL) return;

  try {
    const { token } = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: PASSWORD },
    });

    await api(`/projects/${fixture.projectSlug}`, {
      method: "DELETE",
      token,
    });
  } catch {
    // Best-effort cleanup
  }
}
