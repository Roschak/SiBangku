export function getTenantCode(): string {
  if (typeof window === 'undefined') {
    return 'DISTRO-AVENUE';
  }
  const host = window.location.host;
  const parts = host.split('.');
  if (parts.length > 1) {
    const subdomain = parts[0];
    if (!['www', 'api', 'control', 'localhost'].includes(subdomain.toLowerCase())) {
      return subdomain.toUpperCase();
    }
  }
  // Try fallback stored tenant code, or default to DISTRO-AVENUE for development
  return localStorage.getItem('active_customer_tenant_code') || 'DISTRO-AVENUE';
}

export function getTenantApiUrl(): string {
  return process.env.NEXT_PUBLIC_TENANT_API_URL || 'http://localhost:3002/api/v1';
}

export function getControlApiUrl(): string {
  return process.env.NEXT_PUBLIC_CONTROL_API_URL || 'http://localhost:3001/api/v1';
}

