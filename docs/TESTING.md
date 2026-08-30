# Testing Guide

This document describes how to run and write tests for the **SiBangku** platform.

## Test Runner Setup

We use `vitest` as the primary test runner across the monorepo workspace. It runs tests in ESM mode and supports TypeScript compiling natively out of the box.

## Run Tests

### 1. Run All Tests
To trigger all tests across all packages concurrently, run the following command in the monorepo root:

```bash
pnpm test
```

### 2. Run Package-Specific Tests
To run tests only within a single package:

*   **Shared Utils Unit Tests**:
    ```bash
    pnpm --filter @sibangku/shared test
    ```
*   **Control API Integration Tests**:
    ```bash
    pnpm --filter @sibangku/control-api test
    ```

## Writing Tests

Test files should be placed alongside the code files they test, using the `.test.ts` or `.spec.ts` naming convention.

### 1. Writing Unit Tests
For pure utility functions, import test hooks from `vitest` and execute assertions.

Example:
```ts
import { describe, it, expect } from 'vitest';
import { generateTenantSlug } from './index.js';

describe('Slug Generator', () => {
  it('should sanitize spaces', () => {
    expect(generateTenantSlug('My Resto')).toBe('myresto');
  });
});
```

### 2. Writing API Integration Tests
To test Hono API endpoints without launching a live HTTP listener, use `app.request()`. This mocks HTTP requests in memory, making execution extremely fast.

Example:
```ts
import { describe, it, expect } from 'vitest';
import { app } from './app.js';

describe('API Route Assertion', () => {
  it('GET /api/v1/health should respond with json', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
  });
});
```

## Troubleshooting native binding compilation (bcrypt)

If you encounter native binary compilation issues (e.g. node-gyp build failures on `bcrypt` packages), the platform utilizes **`bcryptjs`** as a pure JavaScript drop-in replacement. Ensure that:
1.  All imports reference `'bcryptjs'` instead of `'bcrypt'`.
2.  Your target package dependencies map to `"bcryptjs"` in `package.json`.
3.  Native building of C++ modules is bypassed, keeping CI/CD pipelines light and compatible with Alpine environments.
