# Next.js Web Build & Routing

This document details the Next.js 15 compilation, layout segregation, and tenant resolution routing mechanics.

## 1. Directory Segregation

To maintain separate interfaces for super admins, restaurant managers, and dining customers under a single domain, we divide routing using Next.js App Router directories:

*   **`src/app/platform/*`**: Control Plane dashboard. Restricts access to authenticated Super Admins.
*   **`src/app/admin/*`**: Tenant Plane operations dashboard (tables, schedules, menus). Restricts access to users authenticated with the tenant's individual database.
*   **`src/app/(customer)/*`**: White-label public landing page, booking wizards, and checkout confirmation flows. Resolves theme elements dynamically on load.

## 2. Dynamic Domain Resolution

The client resolves the target tenant dynamically from the browser's URL (subdomain host parsing):

```typescript
// packages/web/src/app/utils/tenant.ts
export function getTenantCode(): string {
  if (typeof window === 'undefined') return 'DISTRO-AVENUE';
  const host = window.location.host;
  const parts = host.split('.');
  if (parts.length > 1) {
    const subdomain = parts[0];
    if (!['www', 'api', 'control', 'localhost'].includes(subdomain.toLowerCase())) {
      return subdomain.toUpperCase();
    }
  }
  return localStorage.getItem('active_customer_tenant_code') || 'DISTRO-AVENUE';
}
```

*   **Custom domains**: If a tenant configures a custom white-label domain (e.g. `www.myresto.com`), the tenant-api verifies the hostname against the control plane database and resolves the corresponding tenant ID.

## 3. Dynamic Styling & Themes

Branding attributes are loaded on demand:

1.  On mounting, the Next.js landing page queries `GET /api/v1/settings/branding`.
2.  The response returns hex codes for primary and secondary colors.
3.  The client page injects these parameters into the document's body element as CSS custom properties (variables):
    ```typescript
    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-secondary', colors.secondary);
    ```
4.  Tailwind colors automatically reference these variables (`var(--color-primary)`), causing the entire website theme to adapt instantly without reloading bundles.
