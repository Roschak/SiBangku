import { describe, it, expect } from 'vitest';
import {
  generateTenantId,
  generateTemporaryPassword,
  generateTenantSlug,
  generatePackageId,
  generateDatabaseIdentifier,
  generateReservationNumber,
} from './index.js';

describe('Shared Utilities', () => {
  describe('generateTenantId', () => {
    it('should generate a valid tenant ID format', () => {
      const id = generateTenantId();
      expect(id).toMatch(/^TEN-\d{4}-[A-Z0-9]{6}$/);
      expect(id.length).toBe(15);
    });

    it('should include the current year', () => {
      const currentYear = new Date().getFullYear().toString();
      const id = generateTenantId();
      expect(id).toContain(currentYear);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate a non-empty string', () => {
      const pwd = generateTemporaryPassword();
      expect(typeof pwd).toBe('string');
      expect(pwd.length).toBeGreaterThan(16);
    });
  });

  describe('generateTenantSlug', () => {
    it('should convert input to lowercase and remove spaces & special characters', () => {
      const slug = generateTenantSlug('Distro Avenue! 2026');
      expect(slug).toBe('distroavenue2026');
    });

    it('should truncate the slug to 30 characters maximum', () => {
      const longName = 'A'.repeat(50);
      const slug = generateTenantSlug(longName);
      expect(slug.length).toBe(30);
      expect(slug).toBe('a'.repeat(30));
    });
  });

  describe('generatePackageId', () => {
    it('should prefix the slug with com.sibangku', () => {
      const packageId = generatePackageId('distroavenue');
      expect(packageId).toBe('com.sibangku.distroavenue');
    });

    it('should sanitize the slug inside package ID', () => {
      const packageId = generatePackageId('distro-avenue!');
      expect(packageId).toBe('com.sibangku.distroavenue');
    });
  });

  describe('generateDatabaseIdentifier', () => {
    it('should prefix the slug with tenant_', () => {
      const dbId = generateDatabaseIdentifier('distroavenue');
      expect(dbId).toBe('tenant_distroavenue');
    });
  });

  describe('generateReservationNumber', () => {
    it('should generate a reservation number starting with RSV-', () => {
      const rsv = generateReservationNumber();
      expect(rsv).toMatch(/^RSV-[A-Z0-9]+-[A-Z0-9]{4}$/);
    });
  });
});
