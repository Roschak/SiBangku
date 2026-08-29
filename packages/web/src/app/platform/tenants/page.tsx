'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Trash2,
  Calendar,
  AlertTriangle,
  Ban,
  CheckCircle,
  Eye,
  X,
  Clock,
} from 'lucide-react';

export default function PlatformTenantsPage() {
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'extend' | 'delete' | 'inspect' | null>(null);
  const [extendDays, setExtendDays] = useState('14');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
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
          throw new Error('Fallback to Mock');
        }
      } catch {
        // Fallback Mock Data matching PRD
        setTenantsList([
          {
            tenantId: 'TEN-2026-8F4K2M',
            tenantCode: 'DISTRO-AVENUE',
            tenantName: 'Distro Avenue Bogor',
            restaurantName: 'Distro Avenue Diner',
            status: 'TRIAL',
            subscriptionStatus: 'TRIAL',
            trialStart: '2026-08-28T00:00:00Z',
            trialEnd: '2026-10-27T00:00:00Z',
            subscriptionStart: null,
            subscriptionEnd: null,
            databaseIdentifier: 'tenant_distroavenue',
            webIdentifier: 'distroavenue.sibangku.example',
            apkIdentifier: 'com.sibangku.distroavenue',
            brandingIdentifier: 'branding_distroavenue',
            createdAt: '2026-08-28T16:00:00Z',
          },
          {
            tenantId: 'TEN-2026-A1B2C3',
            tenantCode: 'RESTO-BOGOR-001',
            tenantName: 'Sunda Kuliner Bogor',
            restaurantName: 'Sunda Kuliner',
            status: 'ACTIVE',
            subscriptionStatus: 'ACTIVE',
            trialStart: '2026-06-01T00:00:00Z',
            trialEnd: '2026-07-31T00:00:00Z',
            subscriptionStart: '2026-08-01T00:00:00Z',
            subscriptionEnd: '2027-08-01T00:00:00Z',
            databaseIdentifier: 'tenant_sundakuliner',
            webIdentifier: 'sundakuliner.sibangku.example',
            apkIdentifier: 'com.sibangku.sundakuliner',
            brandingIdentifier: 'branding_sundakuliner',
            createdAt: '2026-06-01T10:00:00Z',
          },
          {
            tenantId: 'TEN-2026-X9Y8Z7',
            tenantCode: 'DUMMY-EXPIRED',
            tenantName: 'Restoran Lama',
            restaurantName: 'Resto Ex-Trial',
            status: 'TRIAL_EXPIRED',
            subscriptionStatus: 'EXPIRED',
            trialStart: '2026-06-01T00:00:00Z',
            trialEnd: '2026-07-31T00:00:00Z',
            subscriptionStart: null,
            subscriptionEnd: null,
            databaseIdentifier: 'tenant_restolama',
            webIdentifier: 'restolama.sibangku.example',
            apkIdentifier: 'com.sibangku.restolama',
            brandingIdentifier: 'branding_restolama',
            createdAt: '2026-06-01T12:00:00Z',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, [refreshTrigger]);

  const handleUpdateStatus = async (tenantId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('sibangku_platform_token');
      const res = await fetch(`http://localhost:3001/api/v1/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to update status');

      // Success, refresh list
      setRefreshTrigger((prev) => prev + 1);
      closeModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedTenant) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('sibangku_platform_token');
      const res = await fetch(`http://localhost:3001/api/v1/tenants/${selectedTenant.tenantId}/extend-trial`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days: Number(extendDays) }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to extend trial');

      setRefreshTrigger((prev) => prev + 1);
      closeModal();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDestroyTenant = async () => {
    if (!selectedTenant) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('sibangku_platform_token');
      const res = await fetch(`http://localhost:3001/api/v1/tenants/${selectedTenant.tenantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: confirmCode,
          confirmationPhrase: confirmPhrase,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to destroy tenant');

      setRefreshTrigger((prev) => prev + 1);
      closeModal();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (tenant: any, type: 'extend' | 'delete' | 'inspect') => {
    setSelectedTenant(tenant);
    setModalType(type);
    setConfirmPhrase('');
    setConfirmCode('');
    setErrorMsg('');
  };

  const closeModal = () => {
    setSelectedTenant(null);
    setModalType(null);
  };

  const filteredTenants = tenantsList.filter(
    (t) =>
      t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      t.tenantCode.toLowerCase().includes(search.toLowerCase()) ||
      t.restaurantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Daftar Restoran (Tenants)</h1>
          <p className="text-gray-400 mt-1">Kelola lisensi, status trial, dan database penyewa</p>
        </div>
        <button
          onClick={() => setRefreshTrigger((prev) => prev + 1)}
          className="flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 hover:bg-gray-700 text-sm self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-500" />
          </span>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 sm:text-sm"
            placeholder="Cari berdasarkan nama, kode atau restoran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900 text-gray-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tenant / Restoran</th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Masa Trial</th>
                <th className="px-6 py-4">Database</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Memuat data penyewa...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada tenant yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{t.restaurantName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.tenantName}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-1">{t.tenantId}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-rose-400">
                      {t.tenantCode}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/50'
                            : t.status === 'TRIAL'
                            ? 'bg-amber-900/50 text-amber-300 border border-amber-500/50'
                            : t.status === 'SUSPENDED'
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50'
                            : 'bg-red-900/50 text-red-300 border border-red-500/50'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {t.trialEnd ? (
                        <div className="flex flex-col">
                          <span className="text-gray-300">
                            {new Date(t.trialEnd).toLocaleDateString('id-ID')}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(t.trialEnd) > new Date()
                              ? `${Math.ceil(
                                  (new Date(t.trialEnd).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )} hari tersisa`
                              : 'Habis'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {t.databaseIdentifier}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 shrink-0">
                      <button
                        onClick={() => openModal(t, 'inspect')}
                        className="inline-flex items-center p-2 rounded-lg bg-gray-900 border border-gray-700 hover:bg-gray-700 hover:text-white transition-all"
                        title="Detail Tenant"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {t.status === 'TRIAL_EXPIRED' || t.status === 'TRIAL' ? (
                        <button
                          onClick={() => openModal(t, 'extend')}
                          className="inline-flex items-center p-2 rounded-lg bg-amber-950/20 border border-amber-700/50 hover:bg-amber-900/50 text-amber-300 transition-all"
                          title="Perpanjang Trial"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      ) : null}

                      {t.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(t.tenantId, 'SUSPENDED')}
                          className="inline-flex items-center p-2 rounded-lg bg-purple-950/20 border border-purple-700/50 hover:bg-purple-900/50 text-purple-300 transition-all"
                          title="Tangguhkan"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : t.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUpdateStatus(t.tenantId, 'ACTIVE')}
                          className="inline-flex items-center p-2 rounded-lg bg-emerald-950/20 border border-emerald-700/50 hover:bg-emerald-900/50 text-emerald-300 transition-all"
                          title="Aktifkan"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      ) : null}

                      <button
                        onClick={() => openModal(t, 'delete')}
                        className="inline-flex items-center p-2 rounded-lg bg-red-950/20 border border-red-700/50 hover:bg-red-900/50 text-red-400 transition-all"
                        title="Hapus / Hancurkan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXTEND TRIAL MODAL */}
      {modalType === 'extend' && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">Perpanjang Uji Coba (Trial)</h3>
                <p className="text-gray-400 text-sm mt-1">{selectedTenant.restaurantName}</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/50 border border-red-500 p-4 text-xs text-red-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Jumlah Hari Perpanjangan
                </label>
                <select
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-rose-500 focus:outline-none"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                >
                  <option value="7">7 Hari</option>
                  <option value="14">14 Hari</option>
                  <option value="30">30 Hari</option>
                  <option value="60">60 Hari</option>
                  <option value="90">90 Hari</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
              >
                Batal
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
              >
                {actionLoading ? 'Memproses...' : 'Simpan Perpanjangan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESTROY TENANT MODAL (PRD §96) */}
      {modalType === 'delete' && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-gray-800 border border-red-500/50 border rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  Hancurkan Tenant Restoran
                </h3>
                <p className="text-gray-400 text-sm mt-1">{selectedTenant.restaurantName}</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-4 text-xs text-red-200">
              Tindakan ini sangat destruktif! Database penyewa, seluruh riwayat reservasi, pre-order, menu, dan aset branding akan DILIKUIDASI secara permanen dari server database PostgreSQL.
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/50 border border-red-500 p-4 text-xs text-red-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Tulis kode tenant untuk konfirmasi: <span className="font-mono text-rose-400">{selectedTenant.tenantCode}</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-red-500 focus:outline-none font-mono"
                  placeholder="KODE-TENANT"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Tulis frasa konfirmasi: <span className="font-mono text-rose-400">DESTROY</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-red-500 focus:outline-none font-mono"
                  placeholder="DESTROY"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
              >
                Batal
              </button>
              <button
                onClick={handleDestroyTenant}
                disabled={actionLoading || confirmPhrase !== 'DESTROY' || confirmCode !== selectedTenant.tenantCode}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Menghancurkan...' : 'HANCURKAN PERMANEN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {modalType === 'inspect' && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">Inspeksi Detail Tenant</h3>
                <p className="text-gray-400 text-sm mt-1">{selectedTenant.restaurantName}</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm divide-y divide-gray-700/50 [&>div]:pt-2 [&>div:first-child]:pt-0 [&>div:nth-child(2)]:pt-0">
              <div>
                <span className="block text-xs text-gray-500">Tenant ID</span>
                <span className="text-white font-mono">{selectedTenant.tenantId}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Tenant Code</span>
                <span className="text-rose-400 font-mono font-semibold">{selectedTenant.tenantCode}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Database Name</span>
                <span className="text-white font-mono">{selectedTenant.databaseIdentifier}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Subdomain/Domain</span>
                <span className="text-white font-mono">{selectedTenant.webIdentifier}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">APK Package ID</span>
                <span className="text-white font-mono">{selectedTenant.apkIdentifier}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Branding ID</span>
                <span className="text-white font-mono">{selectedTenant.brandingIdentifier}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Masa Trial</span>
                <span className="text-white">
                  {selectedTenant.trialStart ? new Date(selectedTenant.trialStart).toLocaleDateString('id-ID') : '-'} s/d{' '}
                  {selectedTenant.trialEnd ? new Date(selectedTenant.trialEnd).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Status Langganan</span>
                <span className="text-white">{selectedTenant.subscriptionStatus}</span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
