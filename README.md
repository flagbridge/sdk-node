# @flagbridge/sdk-node

Official Node.js / TypeScript SDK for [FlagBridge](https://github.com/flagbridge/flagbridge).

> **Note:** Active development happens in the [monorepo](https://github.com/flagbridge/flagbridge/tree/main/packages/sdk-node). This repo is used for distribution and issue tracking.

## Installation

```bash
npm install @flagbridge/sdk-node
# or
pnpm add @flagbridge/sdk-node
```

## Quick Start

```typescript
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({ apiKey: 'your-api-key' });

const enabled = await fb.getBooleanValue('new-feature', false);
```

## Features

- Boolean, string, and number flag evaluation
- SSE real-time updates (planned)
- TypeScript-first with full type safety
- OpenFeature compatible via `@flagbridge/openfeature-provider`

## Documentation

Full docs at [flagbridge.io/docs/sdk/node](https://flagbridge.io/docs/sdk/node)

## License

Apache 2.0
