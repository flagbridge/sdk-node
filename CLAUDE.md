# CLAUDE.md — FlagBridge SDK Node.js/TypeScript

> Copiar pra: flagbridge/sdk-node/CLAUDE.md

## O que é

SDK oficial Node.js/TypeScript: `@flagbridge/sdk-node`. Avaliação de flags + testing helpers.

## Stack

TypeScript strict, zero runtime deps (native fetch), ESM + CJS dual publish, Vitest, Biome.js.

## Arquitetura

```
src/
├── client.ts      # FlagBridge main class (3 modos: API, Local, Hybrid)
├── evaluator.ts   # Local evaluation engine
├── testing.ts     # Testing helpers (sessions, overrides)
├── types.ts       # Interfaces & types
├── errors.ts      # Custom errors (actionable messages)
├── http.ts        # HTTP client (native fetch)
├── cache.ts       # In-memory cache com TTL
├── sse-client.ts  # SSE streaming + reconnect
└── index.ts       # Public exports
```

## Princípios

- Zero deps. Native fetch, native crypto
- Sensible defaults: `new FlagBridge({ apiKey })` funciona
- Type-safe: generics que inferem tipo do flag value
- Graceful degradation: NUNCA throw em produção, retorna default
- Idempotente: mesma input = mesmo resultado (cache)
- JSDoc em todo método público

## NÃO faça

- Não adicione runtime dependencies
- Não quebre a public API sem major version bump
- Não throw em network errors (production) — retorne defaults
- Não misture evaluation com management concerns
