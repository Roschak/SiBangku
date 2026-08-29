'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function PlatformSubscriptionsPage() {
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form state
  const [tenantId, setTenantId] = useState('');
  const [plan, setPlan] = useState('PRO_MONTHLY');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [amount, setAmount] = useState('500000'); // Default 500.000 IDR
  const [currency, setCurrency] = useState('IDR');
  const [provider, setProvider] = useState('MANUAL_TRANSFER');
  const [externalSubscriptionId, setExternalSubscriptionId] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('sibangku_platform_token');
        
        // Fetch subscriptions
        const subRes = await fetch('http://localhost:3001/api/v1/subscriptions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const subData = await subRes.json();

        // Fetch tenants
        const tenRes = await fetch('http://localhost:3001/api/v1/tenants', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tenData = await tenRes.json();

        if (subRes.ok && subData.success) {
          setSubscriptionsList(subData.data);
        } else {
          throw new Error('Fallback to Mock');
        }

        if (tenRes.ok && tenData.success) {
          setTenantsList(tenData.data);
        }
      } catch {
        // Fallback Mock Data matching PRD
        setTenantsList([
          { tenantId: 'TEN-2026-8F4K2M', restaurantName: 'Distro Avenue Diner', tenantCode: 'DISTRO-AVENUE' },
          { tenantId: 'TEN-2026-A1B2C3', restaurantName: 'Sunda Kuliner', tenantCode: 'RESTO-BOGOR-001' },
          { tenantId: 'TEN-2026-X9Y8Z7', restaurantName: 'Resto Ex-Trial', tenantCode: 'DUMMY-EXPIRED' },
        ]);
        setSubscriptionsList([
          {
            id: 'sub-A1B2C3D4',
            tenantId: 'TEN-2026-A1B2C3',
            plan: 'PRO_YEARLY',
            status: 'ACTIVE',
            startDate: '2026-08-01T00:00:00Z',
            endDate: '2027-08-01T00:00:00Z',
            billingCycle: 'YEARLY',
            amount: 5000000,
            currency: 'IDR',
            provider: 'MIDTRANS',
            externalSubscriptionId: 'ext-sub-998877',
            createdAt: '2026-08-01T00:00:00Z',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const handleActivateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!tenantId) {
      setErrorMsg('Silakan pilih tenant terlebih dahulu');
      setActionLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('sibangku_platform_token');
      const res = await fetch('http://localhost:3001/api/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          plan,
          billingCycle,
          amount: Number(amount),
          currency,
          provider,
          externalSubscriptionId: externalSubscriptionId || null,
          durationDays: Number(durationDays),
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to activate subscription');

      setSuccessMsg('Subscription berhasil diaktifkan! Status tenant telah diubah menjadi ACTIVE.');
      setTenantId('');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-gray-400 mt-1">Aktivasi paket berbayar platform dan pencatatan penagihan</p>
        </div>
        <button
          onClick={() => setRefreshTrigger((prev) => prev + 1)}
          className="flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 hover:bg-gray-700 text-sm self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activation Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-rose-500" />
            Aktifkan Langganan Baru
          </h2>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-950/20 border border-emerald-500 p-4 text-xs text-emerald-200">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-900/50 border border-red-500 p-4 text-xs text-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleActivateSubscription} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Pilih Restoran (Tenant)
              </label>
              <select
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">-- Pilih Tenant --</option>
                {tenantsList.map((t) => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.restaurantName} ({t.tenantCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Paket Langganan (Plan)
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none font-mono"
                placeholder="Contoh: PRO_MONTHLY"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Billing Cycle
                </label>
                <select
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Durasi (Hari)
                </label>
                <input
                  type="number"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                  placeholder="30"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Harga (Flat IDR)
                </label>
                <input
                  type="number"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                  placeholder="500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Valuta (Currency)
                </label>
                <select
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Metode Pembayaran (Provider)
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="MANUAL_TRANSFER">Manual Transfer</option>
                <option value="MIDTRANS">Midtrans</option>
                <option value="XENDIT">Xendit</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                External Transaction ID (Optional)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none font-mono"
                placeholder="ext-sub-xxxx"
                value={externalSubscriptionId}
                onChange={(e) => setExternalSubscriptionId(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {actionLoading ? 'Memproses...' : 'Aktifkan Langganan'}
            </button>
          </form>
        </div>

        {/* Subscriptions List */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            Riwayat Langganan Platform
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">ID / Tenant</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Mulai s/d Selesai</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3 rounded-r-lg">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Memuat riwayat langganan...
                    </td>
                  </tr>
                ) : subscriptionsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Belum ada langganan berbayar terdaftar.
                    </td>
                  </tr>
                ) : (
                  subscriptionsList.map((sub) => {
                    const matchedTenant = tenantsList.find((t) => t.tenantId === sub.tenantId);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs text-gray-500 block">{sub.id}</span>
                          <span className="text-white text-xs font-semibold">
                            {matchedTenant ? matchedTenant.restaurantName : sub.tenantId}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-rose-400">
                          {sub.plan}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div>Mulai: {new Date(sub.startDate).toLocaleDateString('id-ID')}</div>
                          <div className="text-gray-500 mt-0.5">
                            Selesai: {new Date(sub.endDate).toLocaleDateString('id-ID')}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono font-semibold text-emerald-400">
                          {Number(sub.amount).toLocaleString('id-ID', {
                            style: 'currency',
                            currency: sub.currency || 'IDR',
                          })}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <span className="bg-gray-900 border border-gray-700 px-2 py-0.5 rounded text-gray-300 font-semibold font-mono">
                            {sub.provider}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
