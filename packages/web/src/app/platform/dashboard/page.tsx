'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Hourglass,
  AlertTriangle,
  FileClock,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function PlatformDashboardPage() {
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('sibangku_platform_token');
        const res = await fetch('http://localhost:3001/api/v1/tenants', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();
        if (res.ok && result.success) {
          setTenantsList(result.data);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch data');
        }
      } catch (err: any) {
        console.warn('Control API not running, fallback to demo mode');
        // Fallback demo data matching PRD §152/§189
        setTenantsList([
          {
            tenantId: 'TEN-2026-8F4K2M',
            tenantCode: 'DISTRO-AVENUE',
            tenantName: 'Distro Avenue Bogor',
            restaurantName: 'Distro Avenue Diner',
            status: 'TRIAL',
            subscriptionStatus: 'TRIAL',
            trialEnd: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            databaseIdentifier: 'tenant_distroavenue',
          },
          {
            tenantId: 'TEN-2026-A1B2C3',
            tenantCode: 'RESTO-BOGOR-001',
            tenantName: 'Sunda Kuliner Bogor',
            restaurantName: 'Sunda Kuliner',
            status: 'ACTIVE',
            subscriptionStatus: 'ACTIVE',
            trialEnd: null,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            databaseIdentifier: 'tenant_sundakuliner',
          },
          {
            tenantId: 'TEN-2026-X9Y8Z7',
            tenantCode: 'DUMMY-EXPIRED',
            tenantName: 'Restoran Lama',
            restaurantName: 'Resto Ex-Trial',
            status: 'TRIAL_EXPIRED',
            subscriptionStatus: 'EXPIRED',
            trialEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString(),
            databaseIdentifier: 'tenant_restolama',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  // Compute metrics
  const totalCount = tenantsList.length;
  const activeCount = tenantsList.filter((t) => t.status === 'ACTIVE').length;
  const trialCount = tenantsList.filter((t) => t.status === 'TRIAL').length;
  const suspendedCount = tenantsList.filter((t) => t.status === 'SUSPENDED').length;
  const expiredCount = tenantsList.filter(
    (t) => t.status === 'TRIAL_EXPIRED' || t.status === 'SUBSCRIPTION_EXPIRED'
  ).length;
  const provisioningFailures = tenantsList.filter((t) => t.status === 'PROVISIONING').length;

  const statsCards = [
    {
      name: 'Total Tenants',
      value: totalCount,
      icon: Users,
      color: 'bg-blue-600',
      description: 'Jumlah total penyewa terdaftar',
    },
    {
      name: 'Tenant Aktif (Paid)',
      value: activeCount,
      icon: ShieldCheck,
      color: 'bg-emerald-600',
      description: 'Berlangganan berbayar aktif',
    },
    {
      name: 'Tenant Trial',
      value: trialCount,
      icon: Hourglass,
      color: 'bg-amber-600',
      description: 'Dalam masa uji coba sistem',
    },
    {
      name: 'Masa Trial Habis',
      value: expiredCount,
      icon: FileClock,
      color: 'bg-rose-600',
      description: 'Uji coba / berlangganan habis',
    },
    {
      name: 'Ditangguhkan',
      value: suspendedCount,
      icon: AlertTriangle,
      color: 'bg-gray-600',
      description: 'Akses diblokir sementara',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Dashboard</h1>
          <p className="text-gray-400 mt-1">SaaS Control Plane Overview & Tenant Metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 hover:bg-gray-700 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Perbarui
          </button>
          <Link
            href="/platform/provisioning"
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 hover:bg-rose-700 text-sm font-semibold text-white"
          >
            <PlusCircle className="h-4 w-4" />
            Provision Tenant Baru
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-400 font-medium">{card.name}</p>
                  <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent tenants list */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Tenant Terbaru</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Tenant Code</th>
                  <th className="px-4 py-3">Nama Restoran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg">Database</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {tenantsList.slice(0, 5).map((tenant) => (
                  <tr key={tenant.tenantId} className="hover:bg-gray-700/30">
                    <td className="px-4 py-4 font-mono font-semibold text-rose-400">
                      {tenant.tenantCode}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{tenant.restaurantName}</div>
                      <div className="text-xs text-gray-500">{tenant.tenantName}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tenant.status === 'ACTIVE'
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/50'
                            : tenant.status === 'TRIAL'
                            ? 'bg-amber-900/50 text-amber-300 border border-amber-500/50'
                            : 'bg-red-900/50 text-red-300 border border-red-500/50'
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500">
                      {tenant.databaseIdentifier}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/platform/tenants"
              className="text-sm font-semibold text-rose-400 hover:text-rose-300"
            >
              Lihat Seluruh Restoran &rarr;
            </Link>
          </div>
        </div>

        {/* SaaS Quick Actions / Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">SaaS Info & Policy</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-500 uppercase font-semibold">TRIAL POLICY</p>
              <p className="text-sm text-gray-300 mt-1">Masa uji coba default adalah 60 Hari. Platform Owner dapat memperpanjang masa trial secara manual melalui menu Tenant.</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-500 uppercase font-semibold">DATABASE POLICY</p>
              <p className="text-sm text-gray-300 mt-1">Setiap penyewa (tenant) dialokasikan database PostgreSQL terisolasi (Database-per-Tenant) untuk menjamin privasi data restoran.</p>
            </div>

            {provisioningFailures > 0 && (
              <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-200">Gagal Provisioning detected</p>
                  <p className="text-xs text-red-400 mt-0.5">Ada proses provisioning yang macet atau tidak selesai. Silakan periksa daftar tenant.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
