# ADR-0013 — Test-friendly import.meta handling for Jest/ts-jest and ESM interop

Status: Accepted
Date: 2025-08-09
Related Issue: #28

## Context

Running the Jest test suite surfaced TypeScript TS1343 errors where `import.meta` was referenced inside TypeScript modules compiled via ts-jest. Although tsconfig for Jest targets ES2020, ts-jest transpilation in our environment still flagged direct `import.meta` usage.

We rely on dev-only behavior (e.g., initializing ConductorLogger in development, preferring source paths in the PluginLoader during development) that traditionally checks `import.meta.env.DEV` in Vite-based builds. We need a pattern that preserves dev behavior in browsers while not breaking Jest.

## Decision

Adopt a safe detection pattern that avoids directly referencing `import.meta` at TypeScript compile time under Jest, while still supporting Vite-style dev detection:

- Probe for Vite dev using an indirect eval that prevents the TS parser from seeing `import.meta` in CJS/Jest:

  ```ts
  let isDev = false;
  try {
    // eslint-disable-next-line no-new-func
    const checkImportMeta = (0, eval)(
      "typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV"
    );
    isDev = checkImportMeta === true;
  } catch {}
  if (!isDev) {
    isDev = typeof process !== 'undefined' && !!process.env && process.env.NODE_ENV !== 'production';
  }
  ```

- Gate dev-only code (logger init, plugin dev path preference) behind `isDev`.

## Consequences

- Pros:
  - Jest/ts-jest runs without TS1343; unit/integration tests are green.
  - Dev behavior remains intact under Vite/SPA (import.meta.env.DEV).
  - Minimal, localized changes with no Jest/TypeScript config churn.

- Cons:
  - The eval-based probe is slightly unconventional; needs documentation to avoid confusion.
  - Environment detection is duplicated where needed unless centralized.

## Alternatives considered

1) Switch ts-jest to `module: node16|nodenext`:
   - Ripple effects across imports and ESM/CJS interop; higher risk.

2) `// @ts-ignore` around `import.meta`:
   - Hides type errors but ts-jest may still choke; not robust.

3) Inject build-time defines into Jest (Vite-style):
   - Adds config complexity and reduces portability.

## Implementation

- Updated files:
  - modules/communication/sequences/core/ConductorCore.ts — dev detection for ConductorLogger init
  - modules/communication/sequences/plugins/PluginLoader.ts — dev detection for plugin path preference

- Follow-up tasks:
  - Audit repository for any remaining direct `import.meta` references
  - Consider a small shared utility (e.g., `env/isDev.ts`) to centralize detection and eliminate duplication

## References

- TypeScript TS1343 — `import.meta` restriction to specific module targets
- Jest + ts-jest ESM considerations
- Vite environment variables (`import.meta.env`)

