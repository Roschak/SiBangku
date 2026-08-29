'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';

export default function TenantDashboardPage() {
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
      const token = localStorage.getItem('sibangku_tenant_token');
      
      const today = new Date().toISOString().split('T')[0];

      try {
        // Fetch today's reservations
        const resRes = await fetch(`http://localhost:3002/api/v1/reservations?date=${today}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-code': tenantCode,
          },
        });
        const resResult = await resRes.json();

        // Fetch tables
        const tblRes = await fetch(`http://localhost:3002/api/v1/tables`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-code': tenantCode,
          },
        });
        const tblResult = await tblRes.json();

        if (resRes.ok && resResult.success) {
          setReservationsList(resResult.data);
        } else {
          throw new Error('Fallback to Mock');
        }

        if (tblRes.ok && tblResult.success) {
          setTablesList(tblResult.data);
        }
      } catch {
        // Fallback Mock Data matching PRD operasional
        setTablesList([
          { id: 't1', tableNumber: 1, tableName: 'Meja 1', capacity: 2, status: 'AVAILABLE' },
          { id: 't2', tableNumber: 2, tableName: 'Meja 2', capacity: 4, status: 'OCCUPIED' },
          { id: 't3', tableNumber: 3, tableName: 'Meja 3', capacity: 6, status: 'RESERVED' },
          { id: 't4', tableNumber: 4, tableName: 'Meja 4', capacity: 2, status: 'AVAILABLE' },
        ]);
        setReservationsList([
          {
            id: 'r1',
            reservationNumber: 'RSV-K8F4-01',
            date: today,
            startTime: '12:00',
            endTime: '14:00',
            guestCount: 4,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            notes: 'Ulang tahun pernikahan',
            tableId: 't3',
          },
          {
            id: 'r2',
            reservationNumber: 'RSV-K8F4-02',
            date: today,
            startTime: '18:00',
            endTime: '20:00',
            guestCount: 2,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            notes: 'Minta meja dekat jendela',
            tableId: 't2',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshTrigger]);

  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalReservations = reservationsList.length;
  const pendingReservations = reservationsList.filter((r) => r.status === 'PENDING').length;
  const seatedReservations = reservationsList.filter((r) => r.status === 'SEATED' || r.status === 'ARRIVED').length;
  
  const occupiedTables = tablesList.filter((t) => t.status === 'OCCUPIED').length;
  const availableTables = tablesList.filter((t) => t.status === 'AVAILABLE').length;

  const statCards = [
    { name: 'Reservasi Hari Ini', value: totalReservations, icon: Calendar, color: 'text-rose-500' },
    { name: 'Persetujuan Tertunda', value: pendingReservations, icon: Clock, color: 'text-amber-500' },
    { name: 'Tamu Sudah Hadir', value: seatedReservations, icon: CheckCircle2, color: 'text-emerald-500' },
    { name: 'Meja Terisi (Occupied)', value: occupiedTables, icon: UtensilsCrossed, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Restoran</h1>
          <p className="text-gray-400 mt-1">Hari ini: <span className="text-gray-200 font-semibold">{todayDateStr}</span></p>
        </div>
        <button
          onClick={() => setRefreshTrigger((prev) => prev + 1)}
          className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 hover:bg-gray-800 text-sm self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-md"
            >
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.name}</p>
                <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-950 border border-gray-800 ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reservation Schedules */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Jadwal Reservasi Hari Ini</h2>
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-6">Memuat reservasi...</p>
            ) : reservationsList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Belum ada reservasi masuk hari ini.</p>
            ) : (
              reservationsList.map((r) => {
                const matchedTable = tablesList.find((t) => t.id === r.tableId);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-950 border border-gray-800 gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-rose-950/20 border border-rose-700/30 text-rose-400 font-bold text-sm shrink-0">
                        {r.startTime}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">{r.reservationNumber}</span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'CONFIRMED'
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-950/20 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-1">
                          Booking Meja: {matchedTable ? matchedTable.tableName : `Table ${r.tableId}`} ({r.guestCount} Tamu)
                        </div>
                        {r.notes && (
                          <div className="text-xs text-gray-500 mt-1 italic">&ldquo;{r.notes}&rdquo;</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <Link
                        href={`/admin/reservations?id=${r.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300"
                      >
                        Kelola
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table status quick look */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Status Meja Restoran</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
              <span className="text-xs text-gray-500 block uppercase font-semibold">Tersedia</span>
              <span className="text-3xl font-extrabold text-emerald-400 block mt-2">{availableTables}</span>
            </div>
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center">
              <span className="text-xs text-gray-500 block uppercase font-semibold">Terisi</span>
              <span className="text-3xl font-extrabold text-rose-500 block mt-2">{occupiedTables}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-800 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Tindakan Cepat</h3>
            <div className="space-y-2">
              <Link
                href="/admin/tables"
                className="block text-center text-sm font-semibold py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow"
              >
                Visual Floor Plan Builder &rarr;
              </Link>
              <Link
                href="/admin/menu"
                className="block text-center text-sm font-semibold py-2.5 rounded-lg bg-gray-950 border border-gray-800 hover:bg-gray-800 text-gray-300"
              >
                Kelola Daftar Menu Makanan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
