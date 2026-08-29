import { randomBytes } from 'crypto';

/**
 * Generate a unique tenant ID.
 * Format: TEN-YYYY-XXXXXX (PRD §53)
 */
export function generateTenantId(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  return `TEN-${year}-${random}`;
}

/**
 * Generate a secure temporary password (PRD §55, §111)
 */
export function generateTemporaryPassword(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Generate tenant slug from name for package/database naming.
 * Converts to lowercase, removes special chars, replaces spaces with empty string.
 */
export function generateTenantSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
}

/**
 * Generate Android package ID (PRD §66)
 * Format: com.sibangku.<tenant-slug>
 */
export function generatePackageId(tenantSlug: string): string {
  const sanitized = tenantSlug.replace(/[^a-z0-9]/g, '');
  return `com.sibangku.${sanitized}`;
}

/**
 * Generate database identifier for tenant (PRD §77)
 */
export function generateDatabaseIdentifier(tenantSlug: string): string {
  return `tenant_${tenantSlug}`;
}

/**
 * Generate reservation number
 */
export function generateReservationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `RSV-${timestamp}-${random}`;
}
