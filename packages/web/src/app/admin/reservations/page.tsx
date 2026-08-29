'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Eye,
  RefreshCw,
  X,
  CreditCard,
  Utensils,
  ChevronDown,
} from 'lucide-react';
import type { ReservationStatus } from '@sibangku/shared';

export default function TenantReservationsPage() {
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Inspection modal
  const [inspectRsv, setInspectRsv] = useState<any | null>(null);
  const [preOrderDetails, setPreOrderDetails] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');
    
    try {
      const res = await fetch(`http://localhost:3002/api/v1/reservations`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      const result = await res.json();

      const tblRes = await fetch(`http://localhost:3002/api/v1/tables`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      const tblResult = await tblRes.json();

      if (res.ok && result.success) {
        setReservationsList(result.data);
      } else {
        throw new Error();
      }

      if (tblRes.ok && tblResult.success) {
        setTablesList(tblResult.data);
      }
    } catch {
      // Fallback Mock Data
      setTablesList([
        { id: 't1', tableName: 'Meja 1', tableNumber: 1, capacity: 2 },
        { id: 't2', tableName: 'Meja 2', tableNumber: 2, capacity: 4 },
        { id: 't3', tableName: 'Meja 3', tableNumber: 3, capacity: 6 },
        { id: 't4', tableName: 'Meja 4', tableNumber: 4, capacity: 4 },
      ]);
      setReservationsList([
        {
          id: 'r1',
          reservationNumber: 'RSV-K8F4-01',
          customerId: 'cust-1',
          tableId: 't3',
          date: new Date().toISOString().split('T')[0],
          startTime: '12:00',
          endTime: '14:00',
          guestCount: 4,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          preOrderEnabled: true,
          totalAmount: 95000,
          notes: 'Minta dipojokan',
          createdAt: new Date().toISOString(),
          customerName: 'Budi Santoso',
          customerPhone: '08123456789',
        },
        {
          id: 'r2',
          reservationNumber: 'RSV-K8F4-02',
          customerId: 'cust-2',
          tableId: 't2',
          date: new Date(Date.now() + 24*3600000).toISOString().split('T')[0],
          startTime: '19:00',
          endTime: '21:00',
          guestCount: 2,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          preOrderEnabled: false,
          totalAmount: 0,
          notes: 'Dekat jendela',
          createdAt: new Date().toISOString(),
          customerName: 'Siti Rahma',
          customerPhone: '08987654321',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [refreshTrigger]);

  const handleUpdateStatus = async (id: string, status: ReservationStatus) => {
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch(`http://localhost:3002/api/v1/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
        if (inspectRsv && inspectRsv.id === id) {
          setInspectRsv((prev: any) => ({ ...prev, status }));
        }
      }
    } catch {
      // Mock local
      setReservationsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      if (inspectRsv && inspectRsv.id === id) {
        setInspectRsv((prev: any) => ({ ...prev, status }));
      }
    }
  };

  const handleInspectReservation = async (rsv: any) => {
    setInspectRsv(rsv);
    setPreOrderDetails(null);
    if (!rsv.preOrderEnabled) return;

    setInspectLoading(true);
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch(`http://localhost:3002/api/v1/reservations/${rsv.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      const result = await res.json();
      if (res.ok && result.success && result.data.preOrder) {
        setPreOrderDetails(result.data.preOrder);
      }
    } catch {
      // Mock local pre-order items if offline
      setPreOrderDetails({
        id: 'ord-mock',
        status: 'PENDING',
        totalAmount: rsv.totalAmount,
        items: [
          { id: 'oi1', menuItemId: 'm1', quantity: 2, price: 25000, subtotal: 50000, notes: 'Pedas' },
          { id: 'oi2', menuItemId: 'm2', quantity: 2, price: 6000, subtotal: 12000, notes: 'Es sedikit' },
        ],
      });
    } finally {
      setInspectLoading(false);
    }
  };

  const filteredReservations = reservationsList.filter((r) => {
    const matchedTable = tablesList.find((t) => t.id === r.tableId);
    const tableName = matchedTable ? matchedTable.tableName.toLowerCase() : '';
    const customerName = r.customerName ? r.customerName.toLowerCase() : 'tamu guest';
    const matchesSearch =
      r.reservationNumber.toLowerCase().includes(search.toLowerCase()) ||
      customerName.includes(search.toLowerCase()) ||
      tableName.includes(search.toLowerCase());

    const matchesDate = dateFilter ? r.date === dateFilter : true;
    const matchesStatus = statusFilter ? r.status === statusFilter : true;

    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Daftar Reservasi</h1>
          <p className="text-gray-400 mt-1">
            Konfirmasi kehadiran tamu, kelola prapemesanan menu, dan atur status duduk meja
          </p>
        </div>
        <button
          onClick={() => setRefreshTrigger((prev) => prev + 1)}
          className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 hover:bg-gray-850 text-sm self-start"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-500" />
          </span>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none text-xs"
            placeholder="Cari Kode booking, tamu, meja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-xs focus:border-rose-500 focus:outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-xs focus:border-rose-500 focus:outline-none uppercase"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">-- Semua Status --</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="SEATED">SEATED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-xs text-gray-500">
          Total filter: {filteredReservations.length} data
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-950 text-gray-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Kode Booking</th>
                <th className="px-6 py-4">Tamu</th>
                <th className="px-6 py-4">Jadwal & Meja</th>
                <th className="px-6 py-4">Pra-pesan (Pre-order)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada reservasi yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((r) => {
                  const matchedTable = tablesList.find((t) => t.id === r.tableId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-850/40">
                      <td className="px-6 py-4 font-mono font-semibold text-rose-400">
                        {r.reservationNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {r.customerName || 'Tamu Guest'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {r.customerPhone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white text-xs font-semibold">
                          {matchedTable ? matchedTable.tableName : `Meja ID: ${r.tableId}`}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {new Date(r.date).toLocaleDateString('id-ID')} | {r.startTime} - {r.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {r.preOrderEnabled ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-400 font-semibold">Aktif</span>
                            <span className="text-gray-500 font-mono mt-0.5">
                              {r.totalAmount.toLocaleString('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'CONFIRMED'
                              ? 'bg-blue-950/20 text-blue-400 border border-blue-500/20'
                              : r.status === 'ARRIVED' || r.status === 'SEATED'
                              ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                              : r.status === 'PENDING'
                              ? 'bg-amber-955/20 text-amber-400 border border-amber-500/20'
                              : 'bg-red-955/20 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleInspectReservation(r)}
                          className="inline-flex items-center p-2 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 text-gray-300"
                          title="Inspeksi & Update Status"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL */}
      {inspectRsv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">Inspeksi Reservasi</h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">{inspectRsv.reservationNumber}</p>
              </div>
              <button onClick={() => setInspectRsv(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-950 border border-gray-800 rounded-xl p-4">
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Tamu</span>
                <span className="text-white text-sm font-semibold">{inspectRsv.customerName || 'Tamu Guest'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">No. Whatsapp / Telp</span>
                <span className="text-white font-mono">{inspectRsv.customerPhone || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Waktu Duduk</span>
                <span className="text-white">
                  {inspectRsv.startTime} - {inspectRsv.endTime}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Jumlah Tamu</span>
                <span className="text-white">{inspectRsv.guestCount} Pax</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Status Pembayaran</span>
                <span className="text-white font-mono flex items-center gap-1">
                  <CreditCard className="h-4.5 w-4.5 text-gray-600" />
                  {inspectRsv.paymentStatus}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Status Reservasi</span>
                <span className="text-rose-400 font-semibold">{inspectRsv.status}</span>
              </div>
            </div>

            {/* Pre Order Details list (Mode 2) */}
            {inspectRsv.preOrderEnabled && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="h-4.5 w-4.5 text-rose-500" />
                  Prapemesanan Menu Makanan
                </h4>
                {inspectLoading ? (
                  <p className="text-xs text-gray-500 italic">Memuat rincian pesanan...</p>
                ) : preOrderDetails ? (
                  <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-850 p-4 space-y-3">
                      {preOrderDetails.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                          <div>
                            <span className="text-white font-semibold">{item.menuItemId}</span>
                            <span className="text-gray-500 ml-1">x{item.quantity}</span>
                            {item.notes && (
                              <span className="block text-[10px] text-gray-500 italic mt-0.5">Catatan: {item.notes}</span>
                            )}
                          </div>
                          <span className="font-mono text-gray-300">
                            {item.subtotal.toLocaleString('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-850 px-4 py-3 flex justify-between items-center text-xs font-semibold text-white">
                      <span>Total Pra-pesan</span>
                      <span className="font-mono text-rose-400">
                        {preOrderDetails.totalAmount.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Change Status Action Control buttons (PRD §33) */}
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Ubah Status Tamu</h4>
              <div className="flex flex-wrap gap-2">
                {inspectRsv.status === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateStatus(inspectRsv.id, 'CONFIRMED')}
                    className="px-3 py-2 bg-blue-950/20 border border-blue-700/50 hover:bg-blue-900/50 text-blue-300 rounded-lg text-xs font-semibold"
                  >
                    Konfirmasi Booking
                  </button>
                )}

                {inspectRsv.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(inspectRsv.id, 'ARRIVED')}
                    className="px-3 py-2 bg-emerald-950/20 border border-emerald-700/50 hover:bg-emerald-900/50 text-emerald-300 rounded-lg text-xs font-semibold"
                  >
                    Tamu Tiba (Arrived)
                  </button>
                )}

                {inspectRsv.status === 'ARRIVED' && (
                  <button
                    onClick={() => handleUpdateStatus(inspectRsv.id, 'SEATED')}
                    className="px-3 py-2 bg-emerald-950/20 border border-emerald-700/50 hover:bg-emerald-900/50 text-emerald-300 rounded-lg text-xs font-semibold"
                  >
                    Dudukkan Meja (Seated)
                  </button>
                )}

                {inspectRsv.status === 'SEATED' && (
                  <button
                    onClick={() => handleUpdateStatus(inspectRsv.id, 'COMPLETED')}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Selesai Makan (Completed)
                  </button>
                )}

                {['PENDING', 'CONFIRMED'].includes(inspectRsv.status) && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(inspectRsv.id, 'NO_SHOW')}
                      className="px-3 py-2 bg-red-955/20 border border-red-800/30 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-semibold"
                    >
                      Tidak Hadir (No Show)
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(inspectRsv.id, 'CANCELLED')}
                      className="px-3 py-2 bg-red-955/20 border border-red-800/30 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-semibold"
                    >
                      Batalkan Reservasi
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                onClick={() => setInspectRsv(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
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
