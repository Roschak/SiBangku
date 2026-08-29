// PRD §17-19, §56-57, §78, §104-105: Auth Types

export type PlatformRole = 'SUPER_ADMIN';

export type TenantRole = 'TENANT_ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'WAITER' | 'HOST';

export type CustomerAuthMode = 'GUEST' | 'EMAIL' | 'PHONE' | 'OTP' | 'ACCOUNT';

export interface PlatformUser {
  id: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: TenantRole;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: PlatformRole | TenantRole | 'CUSTOMER';
  tenantId?: string;
  iat: number;
  exp: number;
}
