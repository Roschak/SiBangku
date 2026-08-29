import { db } from './db.js';
import { tenants, auditLogs, users, settings, menuCategories } from '@sibangku/db';
import {
  generateTenantId,
  generateTemporaryPassword,
  generateTenantSlug,
  generatePackageId,
  generateDatabaseIdentifier,
} from '@sibangku/shared';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const { Client, Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Control Database details to connect and create new databases
const controlDbUrl =
  process.env.CONTROL_DATABASE_URL ||
  'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control';

export interface ProvisionTenantParams {
  tenantName: string;
  restaurantName: string;
  adminEmail: string;
  trialDays?: number;
}

export interface ProvisionResult {
  tenantId: string;
  tenantCode: string;
  adminEmail: string;
  temporaryPassword: string;
  databaseName: string;
  status: string;
}

export async function provisionTenant(params: ProvisionTenantParams): Promise<ProvisionResult> {
  const { tenantName, restaurantName, adminEmail, trialDays = 60 } = params;

  // 1. Generate unique identifiers
  const tenantId = generateTenantId();
  const tenantSlug = generateTenantSlug(tenantName);
  const tenantCode = tenantSlug.toUpperCase();
  const dbName = generateDatabaseIdentifier(tenantSlug);
  const packageId = generatePackageId(tenantSlug);
  const webIdentifier = `${tenantSlug}.sibangku.example`;
  const apkIdentifier = packageId;
  const brandingIdentifier = `branding_${tenantSlug}`;
  const temporaryPassword = generateTemporaryPassword();

  console.info(`[Provisioner] Starting provisioning for ${tenantName} (ID: ${tenantId}, DB: ${dbName})`);

  // 2. Create the physical database in PostgreSQL
  // Connect to postgres default DB to run CREATE DATABASE
  const parsedUrl = new URL(controlDbUrl);
  // Re-build connection URL pointing to 'postgres' system database
  const systemDbUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/postgres`;

  const pgClient = new Client({ connectionString: systemDbUrl });
  await pgClient.connect();

  try {
    // Check if database already exists
    const dbCheck = await pgClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.info(`[Provisioner] Creating database "${dbName}"...`);
      // CREATE DATABASE cannot be executed with parameterized queries, but dbName is sanitized to only allow a-z0-9_
      await pgClient.query(`CREATE DATABASE ${dbName}`);
      console.info(`[Provisioner] Database "${dbName}" created successfully.`);
    } else {
      console.warn(`[Provisioner] Database "${dbName}" already exists.`);
    }
  } finally {
    await pgClient.end();
  }

  // 3. Connect to the newly created database and run migrations
  const tenantDbUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/${dbName}`;
  const tenantPool = new Pool({ connectionString: tenantDbUrl });
  const tenantDb = drizzle(tenantPool);

  try {
    console.info(`[Provisioner] Running migrations on "${dbName}"...`);
    // Resolve absolute path to tenant migrations folder in @sibangku/db
    const migrationsFolder = path.resolve(__dirname, '../../../../db/drizzle/tenant');
    
    await migrate(tenantDb, { migrationsFolder });
    console.info(`[Provisioner] Migrations completed successfully on "${dbName}".`);

    // 4. Seed tenant admin user
    const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    console.info(`[Provisioner] Seeding admin account (${adminEmail})...`);
    await tenantDb.insert(users).values({
      id: `usr-${tenantSlug}-admin`,
      email: adminEmail,
      name: 'Restaurant Owner',
      passwordHash,
      role: 'TENANT_ADMIN',
      mustChangePassword: true,
      isActive: true,
    });

    // 5. Seed default branding and config settings
    console.info(`[Provisioner] Seeding default configs and branding...`);
    await tenantDb.insert(settings).values([
      {
        key: 'branding',
        value: {
          logo: null,
          favicon: null,
          primaryColor: '#e11d48', // rose-600
          secondaryColor: '#4f46e5', // indigo-600
          font: 'Inter',
          heroImage: null,
          gallery: [],
          socialLinks: {},
          contactInfo: {
            restaurantName,
            email: adminEmail,
          },
        },
      },
      {
        key: 'time_slots',
        value: {
          openingTime: '10:00',
          closingTime: '22:00',
          slotDuration: 30, // in minutes
          reservationDuration: 120, // in minutes
          bufferTime: 15, // in minutes
        },
      },
      {
        key: 'restaurant_profile',
        value: {
          name: restaurantName,
          description: `Selamat datang di ${restaurantName}. Silakan pesan meja dan menu favorit Anda.`,
          address: '',
          phone: '',
          whatsapp: '',
        },
      },
    ]);

    // Seed default categories
    await tenantDb.insert(menuCategories).values([
      { id: 'cat-main', name: 'MAIN COURSE', sortOrder: 1, isActive: true },
      { id: 'cat-drinks', name: 'DRINKS', sortOrder: 2, isActive: true },
      { id: 'cat-dessert', name: 'DESSERT', sortOrder: 3, isActive: true },
    ]);

    console.info(`[Provisioner] Seeding completed for tenant "${dbName}".`);

  } catch (error: any) {
    console.error(`[Provisioner] Error during tenant database configuration:`, error.message);
    throw error;
  } finally {
    await tenantPool.end();
  }

  // 6. Save tenant metadata in control plane database
  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  console.info(`[Provisioner] Saving tenant metadata in control plane...`);
  await db.insert(tenants).values({
    tenantId,
    tenantCode,
    tenantName,
    restaurantName,
    status: 'TRIAL',
    subscriptionStatus: 'TRIAL',
    trialStart,
    trialEnd,
    subscriptionStart: null,
    subscriptionEnd: null,
    databaseIdentifier: dbName,
    webIdentifier,
    apkIdentifier,
    brandingIdentifier,
  });

  // 7. Write audit log entry
  console.info(`[Provisioner] Writing audit logs...`);
  await db.insert(auditLogs).values([
    {
      id: `audit-${tenantId}-created`,
      tenantId,
      action: 'tenant created',
      details: { tenantName, restaurantName, tenantCode },
    },
    {
      id: `audit-${tenantId}-db-created`,
      tenantId,
      action: 'database created',
      details: { dbName },
    },
    {
      id: `audit-${tenantId}-admin-created`,
      tenantId,
      action: 'admin created',
      details: { adminEmail },
    },
    {
      id: `audit-${tenantId}-trial-started`,
      tenantId,
      action: 'trial started',
      details: { trialStart, trialEnd, trialDays },
    },
  ]);

  console.info(`[Provisioner] Tenant ${tenantName} provisioned successfully!`);

  return {
    tenantId,
    tenantCode,
    adminEmail,
    temporaryPassword,
    databaseName: dbName,
    status: 'TRIAL',
  };
}
