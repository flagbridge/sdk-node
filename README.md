# @flagbridge/sdk-node

Official Node.js SDK for [FlagBridge](https://github.com/flagbridge/flagbridge) — evaluate feature flags server-side with zero dependencies.

Full documentation at [docs.flagbridge.io](https://docs.flagbridge.io).

---

## Requirements

- Node.js 18 or later
- A FlagBridge account and server-side API key (`fb_sk_eval_...`)

## Install

```bash
# pnpm
pnpm add @flagbridge/sdk-node

# npm
npm install @flagbridge/sdk-node

# yarn
yarn add @flagbridge/sdk-node
```

## Quick Start

```ts
import { FlagBridge } from '@flagbridge/sdk-node';

const client = new FlagBridge({ apiKey: 'fb_sk_eval_...' });

// Boolean flag — most common use case
const showNewCheckout = await client.getBooleanValue('new-checkout', false);

// String variant — A/B testing, content experiments
const heroVariant = await client.getStringValue('hero-variant', 'default');

// Numeric value — limits, thresholds, config
const maxItems = await client.getNumberValue('max-items', 10);
```

The second argument to each method is the **default value**, returned when the flag is off, the key does not exist, or the API is unreachable.

## API Reference

### `new FlagBridge(options)`

Creates a new SDK client.

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Server-side evaluation key from your FlagBridge project settings. |

### `client.getBooleanValue(key, defaultValue)`

Evaluates a boolean flag.

```ts
const enabled: boolean = await client.getBooleanValue('my-flag', false);
```

### `client.getStringValue(key, defaultValue)`

Evaluates a string flag or variant.

```ts
const variant: string = await client.getStringValue('hero-variant', 'control');
```

### `client.getNumberValue(key, defaultValue)`

Evaluates a numeric flag value.

```ts
const limit: number = await client.getNumberValue('rate-limit', 100);
```

## Notes

- **Zero dependencies** — uses native `fetch` (available in Node 18+).
- **ESM + CJS** — works in both module systems without configuration.
- **TypeScript** — fully typed, strict mode compatible.
- **Real-time updates via SSE** — planned for a future release.

## License

Apache 2.0 — see [LICENSE](https://github.com/flagbridge/flagbridge/blob/main/LICENSE) in the main repository.
