#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

const CONTROL_API_URL = process.env.SIBANGKU_CONTROL_API_URL || 'http://localhost:3001/api/v1';

// Helper to authenticate and get JWT token from Control Plane API
async function getAuthToken(): Promise<string> {
  if (process.env.SIBANGKU_ADMIN_TOKEN) {
    return process.env.SIBANGKU_ADMIN_TOKEN;
  }

  const email = process.env.SIBANGKU_ADMIN_EMAIL || 'admin';
  const password = process.env.SIBANGKU_ADMIN_PASSWORD || 'admin';

  try {
    const res = await fetch(`${CONTROL_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await res.json() as any;
    if (!res.ok || !result.success) {
      throw new Error(result.error?.message || 'Login failed');
    }
    return result.data.token;
  } catch (err: any) {
    throw new Error(
      `Gagal autentikasi ke Control Plane API (${CONTROL_API_URL}). Pastikan service control-api berjalan dan kredensial SIBANGKU_ADMIN_EMAIL/PASSWORD benar. Error: ${err.message}`
    );
  }
}

program
  .name('sibangku')
  .description('SiBangku - Restaurant Reservation SaaS CLI Tool')
  .version('2.0.0');

// ==========================================
// TENANT COMMANDS
// ==========================================
const tenantCmd = new Command('tenant').description('Manage multi-tenant restaurant nodes');

// 1. sibangku tenant create
tenantCmd
  .command('create')
  .description('Provision a new restaurant tenant node')
  .requiredOption('--name <name>', 'Full tenant identifier name (e.g. "Distro Avenue Bogor")')
  .requiredOption('--restaurant <restaurant>', 'Restaurant branded name (e.g. "Distro Avenue Diner")')
  .requiredOption('--email <email>', 'Owner administrator email')
  .option('--days <days>', 'Trial duration in days', '60')
  .action(async (options) => {
    try {
      console.info('Mengautentikasi dan menyiapkan provisioning...');
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: options.name,
          restaurantName: options.restaurant,
          adminEmail: options.email,
          trialDays: Number(options.days),
        }),
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create tenant');
      }

      console.info('\n✅ TENANT PROVISIONING SUCCESSFUL!');
      console.info('------------------------------------');
      console.info(`Tenant ID:           ${result.data.tenantId}`);
      console.info(`Tenant Code:         ${result.data.tenantCode}`);
      console.info(`Admin Email:         ${result.data.adminEmail}`);
      console.info(`Temporary Password:  ${result.data.temporaryPassword}`);
      console.info(`Database provisioned:${result.data.databaseName}`);
      console.info('------------------------------------');
      console.info('⚠️ Password di atas bersifat sementara dan wajib diubah saat pertama kali login.');
    } catch (err: any) {
      console.error('❌ Gagal membuat tenant:', err.message);
      process.exit(1);
    }
  });

// 2. sibangku tenant list
tenantCmd
  .command('list')
  .description('List all active and suspended tenants')
  .action(async () => {
    try {
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to list tenants');
      }

      const list = result.data;
      if (list.length === 0) {
        console.info('Belum ada tenant yang terdaftar.');
        return;
      }

      console.info('\nDAFTAR TENANT RESTORAN SIBANGKU:');
      console.info('========================================================================');
      console.info(
        `${'CODE'.padEnd(20)} | ${'NAME'.padEnd(25)} | ${'STATUS'.padEnd(10)} | ${'DATABASE'}`
      );
      console.info('------------------------------------------------------------------------');
      for (const t of list) {
        console.info(
          `${t.tenantCode.padEnd(20)} | ${t.restaurantName.padEnd(25)} | ${t.status.padEnd(10)} | ${t.databaseIdentifier}`
        );
      }
      console.info('========================================================================');
    } catch (err: any) {
      console.error('❌ Gagal mengambil daftar tenant:', err.message);
      process.exit(1);
    }
  });

// 3. sibangku tenant inspect
tenantCmd
  .command('inspect <tenant_id>')
  .description('Print detailed JSON configuration metadata of a tenant')
  .action(async (tenantId) => {
    try {
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to retrieve tenant details');
      }

      const tenant = result.data.find(
        (t: any) => t.tenantId === tenantId || t.tenantCode === tenantId.toUpperCase()
      );

      if (!tenant) {
        console.error(`❌ Tenant dengan ID atau Code "${tenantId}" tidak ditemukan.`);
        process.exit(1);
      }

      console.info(JSON.stringify(tenant, null, 2));
    } catch (err: any) {
      console.error('❌ Gagal melakukan inspeksi tenant:', err.message);
      process.exit(1);
    }
  });

// 4. sibangku tenant suspend
tenantCmd
  .command('suspend <tenant_id>')
  .description('Suspend a tenant, blocking active API operations')
  .action(async (tenantId) => {
    try {
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'SUSPENDED' }),
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to suspend tenant');
      }

      console.info(`✅ Tenant ID "${tenantId}" berhasil ditangguhkan (SUSPENDED).`);
    } catch (err: any) {
      console.error('❌ Gagal menangguhkan tenant:', err.message);
      process.exit(1);
    }
  });

// 5. sibangku tenant activate
tenantCmd
  .command('activate <tenant_id>')
  .description('Reactivate a suspended tenant')
  .action(async (tenantId) => {
    try {
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to activate tenant');
      }

      console.info(`✅ Tenant ID "${tenantId}" berhasil diaktifkan kembali (ACTIVE).`);
    } catch (err: any) {
      console.error('❌ Gagal mengaktifkan tenant:', err.message);
      process.exit(1);
    }
  });

// 6. sibangku tenant extend-trial
tenantCmd
  .command('extend-trial <tenant_id>')
  .description('Extend the trial period of a tenant')
  .requiredOption('--days <days>', 'Number of days to extend', '14')
  .action(async (tenantId, options) => {
    try {
      const token = await getAuthToken();

      const res = await fetch(`${CONTROL_API_URL}/tenants/${tenantId}/extend-trial`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days: Number(options.days) }),
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to extend trial');
      }

      console.info(`✅ Masa trial Tenant ID "${tenantId}" diperpanjang sebanyak ${options.days} hari.`);
    } catch (err: any) {
      console.error('❌ Gagal memperpanjang trial:', err.message);
      process.exit(1);
    }
  });

// 7. sibangku tenant destroy
tenantCmd
  .command('destroy <tenant_id>')
  .description('Completely delete a tenant and its isolated database (DANGER)')
  .action(async (tenantId) => {
    try {
      const token = await getAuthToken();

      // For destruction safety, we first query tenant to get the confirmation code
      const listRes = await fetch(`${CONTROL_API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listResult = await listRes.json() as any;
      const tenant = listResult.data?.find((t: any) => t.tenantId === tenantId);

      if (!tenant) {
        throw new Error(`Tenant ID "${tenantId}" tidak ditemukan.`);
      }

      const res = await fetch(`${CONTROL_API_URL}/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmationPhrase: 'DESTROY',
          code: tenant.tenantCode,
        }),
      });

      const result = await res.json() as any;
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to destroy tenant');
      }

      console.info(`✅ Tenant ID "${tenantId}" dan databasenya berhasil dihapus secara permanen.`);
    } catch (err: any) {
      console.error('❌ Gagal menghapus tenant:', err.message);
      process.exit(1);
    }
  });

program.addCommand(tenantCmd);

program.parse();
