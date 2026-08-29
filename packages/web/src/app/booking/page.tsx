'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  Grid,
  Utensils,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { getTenantCode, getTenantApiUrl } from '../utils/tenant';

interface Table {
  id: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH';
  positionX: number;
  positionY: number;
  rotation: number;
  status: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  available: boolean;
}

export default function CustomerBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  // Tenant Config
  const [branding, setBranding] = useState<any | null>(null);
  const [timeSlots, setTimeSlots] = useState<any | null>(null);

  // Form selections
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(''); // "12:00-14:00"
  const [guestCount, setGuestCount] = useState('2');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Pre-order cart: Record<menuItemId, quantity>
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});

  // Customer credentials
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Loaded DB data
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  
  // Loading & error
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial configuration load
  useEffect(() => {
    const initBookingPage = async () => {
      setLoading(true);
      const code = getTenantCode();
      const api = getTenantApiUrl();

      try {
        const brandRes = await fetch(`${api}/settings/branding`, { headers: { 'x-tenant-code': code } });
        const brandData = await brandRes.json();
        
        const slotRes = await fetch(`${api}/settings/time_slots`, { headers: { 'x-tenant-code': code } });
        const slotData = await slotRes.json();

        const tblRes = await fetch(`${api}/tables`, { headers: { 'x-tenant-code': code } });
        const tblData = await tblRes.json();

        const menuRes = await fetch(`${api}/menu`, { headers: { 'x-tenant-code': code } });
        const menuData = await menuRes.json();

        if (brandRes.ok && brandData.success) setBranding(brandData.data);
        if (slotRes.ok && slotData.success) setTimeSlots(slotData.data);
        if (tblRes.ok && tblData.success) setTables(tblData.data);
        if (menuRes.ok && menuData.success) setMenuItems(menuData.data);
      } catch {
        // Fallback Mock Defaults
        setBranding({ primaryColor: '#F43F5E', title: 'Sunda Resto' });
        setTimeSlots({ openTime: '09:00', closeTime: '22:00', slotDuration: 120 });
        setTables([
          { id: 't1', tableNumber: 1, tableName: 'Meja 1', capacity: 2, shape: 'ROUND', positionX: 20, positionY: 30, rotation: 0, status: 'AVAILABLE' },
          { id: 't2', tableNumber: 2, tableName: 'Meja 2', capacity: 4, shape: 'SQUARE', positionX: 50, positionY: 30, rotation: 0, status: 'AVAILABLE' },
          { id: 't3', tableNumber: 3, tableName: 'Meja 3', capacity: 6, shape: 'RECTANGLE', positionX: 30, positionY: 60, rotation: 0, status: 'AVAILABLE' },
          { id: 't4', tableNumber: 4, tableName: 'Meja 4', capacity: 4, shape: 'BOOTH', positionX: 70, positionY: 60, rotation: 0, status: 'AVAILABLE' },
        ]);
        setMenuItems([
          { id: 'm1', name: 'Nasi Goreng Spesial', description: 'Pedas sedang', price: 25000, categoryId: 'cat-1', available: true },
          { id: 'm2', name: 'Es Teh Manis', description: 'Segar dingin', price: 6000, categoryId: 'cat-2', available: true },
        ]);
      } finally {
        setLoading(false);
      }
    };
    initBookingPage();
  }, []);

  // 2. Fetch existing reservations for the selected date to filter overlapping bookings
  useEffect(() => {
    if (!selectedDate) return;

    const fetchReserved = async () => {
      const code = getTenantCode();
      const api = getTenantApiUrl();
      try {
        const res = await fetch(`${api}/reservations?date=${selectedDate}`, {
          headers: { 'x-tenant-code': code },
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setExistingReservations(result.data);
        }
      } catch {
        setExistingReservations([]);
      }
    };
    fetchReserved();
  }, [selectedDate]);

  // Generate operasional time slots dynamically
  const generatedSlots = [];
  if (timeSlots) {
    const [startHour, startMin] = timeSlots.openTime.split(':').map(Number);
    const [endHour, endMin] = timeSlots.closeTime.split(':').map(Number);
    const duration = timeSlots.slotDuration || 120; // default 2 hours

    let currentMin = startHour * 60 + startMin;
    const finalMin = endHour * 60 + endMin;

    while (currentMin + duration <= finalMin) {
      const formatTime = (totalMin: number) => {
        const hr = Math.floor(totalMin / 60).toString().padStart(2, '0');
        const mn = (totalMin % 60).toString().padStart(2, '0');
        return `${hr}:${mn}`;
      };

      const startStr = formatTime(currentMin);
      const endStr = formatTime(currentMin + duration);
      generatedSlots.push(`${startStr}-${endStr}`);
      currentMin += duration;
    }
  } else {
    generatedSlots.push('10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00');
  }

  // Visual Table Overlap Check (PRD §28, §82)
  // If table is occupied in chosen slot -> return true (mark occupied)
  const isTableOccupied = (tableId: string) => {
    if (!selectedTimeSlot) return false;
    const [selStart, selEnd] = selectedTimeSlot.split('-');

    return existingReservations.some((r) => {
      if (r.tableId !== tableId) return false;
      // Skip cancelled
      if (r.status === 'CANCELLED') return false;
      // Overlap calculation: (existing.startTime < new.endTime) AND (existing.endTime > new.startTime)
      return r.startTime < selEnd && r.endTime > selStart;
    });
  };

  const handleCartAdd = (itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const handleCartRemove = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] <= 1) delete next[itemId];
      else next[itemId]--;
      return next;
    });
  };

  // Submit flow
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    if (!selectedTableId) {
      setErrorMsg('Harap pilih meja terlebih dahulu');
      setSubmitting(false);
      return;
    }

    const code = getTenantCode();
    const api = getTenantApiUrl();
    const [startTime, endTime] = selectedTimeSlot.split('-');

    // Build pre-order payload
    const preOrderItems = Object.entries(cart).map(([itemId, qty]) => ({
      menuItemId: itemId,
      quantity: qty,
      notes: cartNotes[itemId] || null,
    }));

    const payload = {
      guestName: custName,
      guestEmail: custEmail || null,
      guestPhone: custPhone,
      tableId: selectedTableId,
      date: selectedDate,
      startTime,
      endTime,
      guestCount: Number(guestCount),
      notes: notes || null,
      preOrderItems: preOrderItems.length > 0 ? preOrderItems : null,
    };

    try {
      const res = await fetch(`${api}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-code': code,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Gagal menyimpan booking');

      const rsvData = result.data;

      // Mode 2 pre-ordered payment redirection (PRD §39, §42)
      if (rsvData.preOrderEnabled && rsvData.totalAmount > 0) {
        // Request checkout redirection link
        const checkRes = await fetch(`${api}/payments/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-code': code,
          },
          body: JSON.stringify({ reservationId: rsvData.reservationId, provider: 'MIDTRANS' }),
        });
        const checkData = await checkRes.json();
        
        if (checkRes.ok && checkData.success && checkData.data.redirectUrl) {
          // Redirect customer directly to gateway mock page
          window.location.href = checkData.data.redirectUrl;
        } else {
          router.push(`/confirmation?reservationId=${rsvData.reservationId}`);
        }
      } else {
        // Mode 1: direct confirmation
        router.push(`/confirmation?reservationId=${rsvData.reservationId}`);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim formulir booking. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !branding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p>Memuat formulir reservasi...</p>
      </div>
    );
  }

  const primaryColor = branding.primaryColor || '#F43F5E';
  const primaryBg = { backgroundColor: primaryColor };
  const primaryText = { color: primaryColor };
  const primaryBorder = { borderColor: primaryColor };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Top Header info */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">{branding.title}</h1>
          <p className="text-gray-400 text-sm">Sistem Booking Reservasi Meja & Makanan</p>
        </div>

        {/* Wizard Headers */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs font-semibold uppercase text-gray-500">
          <span className={step >= 1 ? 'text-rose-500' : ''}>1. Jadwal</span>
          <ChevronRight className="h-4 w-4 text-gray-700" />
          <span className={step >= 2 ? 'text-rose-500' : ''}>2. Pilih Meja</span>
          <ChevronRight className="h-4 w-4 text-gray-700" />
          <span className={step >= 3 ? 'text-rose-500' : ''}>3. Menu Pre-Order</span>
          <ChevronRight className="h-4 w-4 text-gray-700" />
          <span className={step >= 4 ? 'text-rose-500' : ''}>4. Identitas</span>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-955/20 border border-red-500/35 p-4 text-xs text-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: DATE AND TIME SLOTS */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" style={primaryText} />
              Langkah 1: Tentukan Waktu Kunjungan
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-450 mb-2">Tanggal Kunjungan</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-3 px-4 text-white focus:outline-none"
                  style={selectedDate ? primaryBorder : {}}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTableId(null); // reset table choice on date change
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-450 mb-2">Jumlah Tamu (Pax)</label>
                <select
                  className="w-full rounded-lg border border-gray-800 bg-gray-955 py-3 px-4 text-white focus:outline-none"
                  value={guestCount}
                  onChange={(e) => {
                    setGuestCount(e.target.value);
                    setSelectedTableId(null); // reset table choice on capacity change
                  }}
                >
                  <option value="1">1 Pax</option>
                  <option value="2">2 Pax</option>
                  <option value="4">4 Pax</option>
                  <option value="6">6 Pax</option>
                  <option value="8">8 Pax</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-450 mb-2">Pilih Slot Waktu</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {generatedSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setSelectedTableId(null);
                      }}
                      className={`py-3 rounded-lg text-xs font-semibold border text-center transition ${
                        selectedTimeSlot === slot
                          ? 'text-white border-rose-500 bg-rose-950/20'
                          : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                      }`}
                      style={selectedTimeSlot === slot ? primaryBorder : {}}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={!selectedDate || !selectedTimeSlot}
                onClick={nextStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1"
                style={primaryBg}
              >
                Lanjut ke Pilih Meja
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VISUAL FLOOR PLAN BUILDER TABLE SELECT */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Grid className="h-5 w-5" style={primaryText} />
                Langkah 2: Pilih Meja Pilihan Anda
              </h2>
              <span className="text-xs text-gray-500 font-mono">
                {selectedDate} | {selectedTimeSlot}
              </span>
            </div>

            {/* Canvas plan layout */}
            <div
              className="w-full h-[400px] bg-gray-950 border border-gray-800 rounded-xl relative overflow-hidden select-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #1f2937 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {tables.map((t) => {
                const isOccupied = isTableOccupied(t.id);
                const isSelected = selectedTableId === t.id;
                const capacityTooSmall = Number(guestCount) > t.capacity;

                let shapeClass = '';
                if (t.shape === 'ROUND') shapeClass = 'rounded-full';
                else if (t.shape === 'RECTANGLE') shapeClass = 'rounded-lg';
                else shapeClass = 'rounded-xl';

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isOccupied || capacityTooSmall}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`absolute flex flex-col items-center justify-center border font-semibold text-[10px] tracking-tighter ${shapeClass} transition ${
                      isOccupied
                        ? 'border-gray-850 bg-gray-900 text-gray-600 cursor-not-allowed opacity-45'
                        : capacityTooSmall
                        ? 'border-yellow-950 bg-yellow-950/10 text-yellow-600/40 cursor-not-allowed'
                        : isSelected
                        ? 'border-rose-500 bg-rose-950/40 text-white ring-2 ring-rose-500/40 z-20'
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white z-10'
                    }`}
                    style={{
                      left: `${t.positionX}%`,
                      top: `${t.positionY}%`,
                      width: t.shape === 'RECTANGLE' ? '65px' : '55px',
                      height: t.shape === 'RECTANGLE' ? '45px' : '55px',
                      transform: `rotate(${t.rotation}deg)`,
                      ...(isSelected ? primaryBorder : {}),
                    }}
                  >
                    <span>#{t.tableNumber}</span>
                    <span className="font-bold">{t.tableName}</span>
                    <span className="text-[8px] text-gray-500">{t.capacity} Pax</span>
                  </button>
                );
              })}
            </div>

            {/* Legends */}
            <div className="flex justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 bg-gray-900 border border-gray-800 rounded"></span>
                <span>Tersedia (Available)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 bg-gray-900 border border-gray-850 rounded opacity-45"></span>
                <span>Sudah Dipesan (Reserved)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 bg-yellow-950/10 border border-yellow-955/20 rounded"></span>
                <span>Kapasitas Kurang</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-800">
              <button
                onClick={prevStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-800 bg-gray-950 hover:bg-gray-850 flex items-center gap-1"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
                Kembali
              </button>
              <button
                disabled={!selectedTableId}
                onClick={nextStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1"
                style={primaryBg}
              >
                Lanjut ke Pre-Order
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PRE-ORDERS SELECTION (MODE 2 - OPTIONAL) */}
        {step === 3 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="h-5 w-5" style={primaryText} />
                Langkah 3: Tambahkan Pra-pemesanan Makanan (Opsional)
              </h2>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Mode 2</span>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-auto pr-2 divide-y divide-gray-850">
              {menuItems.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div key={item.id} className="flex justify-between items-center py-3 first:pt-0">
                    <div className="flex-1 pr-4">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.description}</p>
                      )}
                      <p className="text-xs font-mono font-bold text-rose-400 mt-1">
                        {item.price.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        })}
                      </p>
                    </div>

                    {qty > 0 ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCartRemove(item.id)}
                          className="h-8 w-8 rounded-lg bg-gray-850 hover:bg-gray-800 flex items-center justify-center font-bold text-gray-300"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold font-mono text-white">{qty}</span>
                        <button
                          onClick={() => handleCartAdd(item.id)}
                          className="h-8 w-8 rounded-lg bg-gray-850 hover:bg-gray-800 flex items-center justify-center font-bold text-gray-300"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCartAdd(item.id)}
                        className="px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-950 hover:bg-gray-850 text-xs font-semibold text-gray-300"
                      >
                        Pilih
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cart summary box */}
            {Object.keys(cart).length > 0 && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-400">Total Pre-Order:</span>
                <span className="text-rose-400 font-mono text-sm">
                  {Object.entries(cart)
                    .reduce((total, [itemId, qty]) => {
                      const item = menuItems.find((m) => m.id === itemId);
                      return total + (item ? item.price * qty : 0);
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    })}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-800">
              <button
                onClick={prevStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-800 bg-gray-950 hover:bg-gray-850 flex items-center gap-1"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
                Kembali
              </button>
              <button
                onClick={nextStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-1"
                style={primaryBg}
              >
                {Object.keys(cart).length > 0 ? 'Lanjut ke Identitas' : 'Lewati Pre-Order & Lanjut'}
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CUSTOMER IDENTITAS FORM */}
        {step === 4 && (
          <form onSubmit={handleSubmitBooking} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5" style={primaryText} />
              Langkah 4: Formulir Kontak Pemesan
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Nama Lengkap Pemesan</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-850 bg-gray-950 py-3 px-4 text-white focus:outline-none"
                  placeholder="e.g. Budi Santoso"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Nomor WhatsApp Aktif</label>
                  <input
                    type="tel"
                    required
                    className="w-full rounded-lg border border-gray-850 bg-gray-955 py-3 px-4 text-white focus:outline-none font-mono"
                    placeholder="e.g. 08123456789"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Digunakan untuk mengirim link kode booking Anda.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Alamat Email (Opsional)</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-gray-850 bg-gray-955 py-3 px-4 text-white focus:outline-none"
                    placeholder="e.g. budi@gmail.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Catatan Khusus (Khusus Alergi / Posisi)</label>
                <textarea
                  className="w-full rounded-lg border border-gray-850 bg-gray-950 py-2.5 px-4 text-white focus:outline-none"
                  rows={2}
                  placeholder="e.g. Tidak pedas / butuh kursi bayi"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-800 bg-gray-955 hover:bg-gray-800 flex items-center gap-1"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
                Kembali
              </button>
              
              <button
                type="submit"
                disabled={submitting || !custName || !custPhone}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                style={primaryBg}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Kirim Booking Sekarang &rarr;'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
