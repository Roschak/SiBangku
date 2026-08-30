import { createControlPlaneDb } from './connection.js';
import { platformUsers } from './schema/control/platform-users.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const connectionString =
  process.env.CONTROL_DATABASE_URL ||
  'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control';

async function seed() {
  console.info('Starting control plane database seeding...');

  // Only allow admin/admin seeding in development mode (PRD §4, §113, §185)
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Seeding default credentials (admin/admin) is FORBIDDEN in production mode!');
    process.exit(1);
  }

  const db = createControlPlaneDb(connectionString);

  const adminEmail = 'admin'; // Or admin@sibangku.example, let's use 'admin' as required by PRD §4
  const adminPassword = 'admin';

  // Check if admin already exists
  const existing = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.email, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    console.info('Development admin user already exists. Skipping...');
    return;
  }

  console.info('Creating development admin user...');
  const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  await db.insert(platformUsers).values({
    id: 'plat-usr-admin',
    email: adminEmail,
    passwordHash,
    role: 'SUPER_ADMIN',
    mustChangePassword: false,
  });

  console.info('Database seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
