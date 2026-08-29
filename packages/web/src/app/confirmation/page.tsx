'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Utensils,
  CreditCard,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getTenantCode, getTenantApiUrl } from '../utils/tenant';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get('reservationId');

  const [reservation, setReservation] = useState<any | null>(null);
  const [preOrder, setPreOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchDetails = async () => {
    if (!reservationId) {
      setLoading(false);
      return;
    }
    const code = getTenantCode();
    const api = getTenantApiUrl();

    try {
      const res = await fetch(`${api}/reservations/${reservationId}`, {
        headers: { 'x-tenant-code': code },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setReservation(result.data.reservation);
        setPreOrder(result.data.preOrder);
      }
    } catch {
      // Mock Fallback
      setReservation({
        id: reservationId,
        reservationNumber: 'RSV-MOCK-7788',
        date: new Date().toISOString().split('T')[0],
        startTime: '12:00',
        endTime: '14:00',
        guestCount: 2,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        notes: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [reservationId]);

  const handleCancelBooking = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan reservasi ini?')) return;
    setCancelLoading(true);
    setMsg('');

    const code = getTenantCode();
    const api = getTenantApiUrl();

    try {
      const res = await fetch(`${api}/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: { 'x-tenant-code': code },
      });
      if (res.ok) {
        setMsg('Reservasi Anda berhasil dibatalkan.');
        fetchDetails();
      } else {
        throw new Error();
      }
    } catch {
      setMsg('Mock: Batalkan reservasi lokal.');
      setReservation((prev: any) => prev ? { ...prev, status: 'CANCELLED' } : null);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span>Memuat rincian konfirmasi...</span>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Rincian Reservasi Tidak Ditemukan</h2>
        <p className="text-xs max-w-sm mx-auto">Silakan periksa kembali link konfirmasi Anda atau hubungi admin restoran.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-850 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Reservasi Berhasil Diajukan!</h2>
        <p className="text-gray-400 text-xs">Simpan kode booking Anda untuk ditunjukkan kepada penerima tamu.</p>
      </div>

      {msg && (
        <div className="bg-amber-955/25 border border-amber-500/25 rounded-lg p-4 text-xs text-amber-200">
          {msg}
        </div>
      )}

      {/* Booking Details Box */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Kode Booking</span>
          <span className="text-sm font-bold font-mono text-rose-400">{reservation.reservationNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <span className="block text-[9px] text-gray-550 uppercase">Tanggal</span>
              <span className="text-white">{new Date(reservation.date).toLocaleDateString('id-ID')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <span className="block text-[9px] text-gray-550 uppercase">Slot Waktu</span>
              <span className="text-white">{reservation.startTime} - {reservation.endTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <span className="block text-[9px] text-gray-550 uppercase">Meja Pilihan</span>
              <span className="text-white">{reservation.tableName || `Table ID: ${reservation.tableId}`}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <span className="block text-[9px] text-gray-550 uppercase">Pembayaran</span>
              <span className={`font-mono text-[10px] font-bold ${reservation.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {reservation.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pre Order details if Mode 2 */}
      {preOrder && preOrder.items && preOrder.items.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Utensils className="h-4.5 w-4.5 text-rose-500" />
            Pra-pesanan Makanan
          </h3>
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-850 p-4">
            {preOrder.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-xs py-2 first:pt-0">
                <div>
                  <span className="text-white font-medium">{item.menuItemId}</span>
                  <span className="text-gray-500 ml-1">x{item.quantity}</span>
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
            <div className="pt-3 mt-1 flex justify-between font-semibold text-white">
              <span>Total Tagihan</span>
              <span className="font-mono text-rose-400">
                {preOrder.totalAmount.toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cancel policies */}
      {reservation.status !== 'CANCELLED' && reservation.status !== 'COMPLETED' && (
        <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
          <p className="text-[10px] text-gray-500 max-w-xs">
            Kebijakan pembatalan berlaku. Apabila Anda tidak dapat hadir, harap batalkan reservasi minimal 2 jam sebelumnya.
          </p>
          <button
            onClick={handleCancelBooking}
            disabled={cancelLoading}
            className="flex items-center gap-1 px-3 py-2 bg-red-955/20 border border-red-800/30 hover:bg-red-900/30 text-red-400 text-xs font-semibold rounded-lg disabled:opacity-50"
          >
            <XCircle className="h-4.5 w-4.5" />
            {cancelLoading ? 'Membatalkan...' : 'Batalkan Booking'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomerConfirmationPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-4 flex justify-center items-center">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        }>
          <ConfirmationContent />
        </Suspense>
      </div>
    </div>
  );
}
