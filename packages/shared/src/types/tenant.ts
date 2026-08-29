// PRD §11-16: Tenant Model

export type TenantStatus =
  | 'PROVISIONING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'TRIAL_EXPIRED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type DatabaseState =
  | 'PROVISIONING'
  | 'READY'
  | 'MIGRATION_FAILED'
  | 'UNAVAILABLE'
  | 'ARCHIVED';

export type ProvisioningStepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface Tenant {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  restaurantName: string;
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  trialStart: Date | null;
  trialEnd: Date | null;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  databaseIdentifier: string;
  webIdentifier: string;
  apkIdentifier: string;
  brandingIdentifier: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  provider: string;
  externalSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantBranding {
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  heroImage: string | null;
  gallery: string[];
  socialLinks: Record<string, string>;
  contactInfo: Record<string, string>;
}

export interface ProvisioningStatus {
  database: ProvisioningStepStatus;
  web: ProvisioningStepStatus;
  apk: ProvisioningStepStatus;
  storage: ProvisioningStepStatus;
  auth: ProvisioningStepStatus;
  configuration: ProvisioningStepStatus;
}
