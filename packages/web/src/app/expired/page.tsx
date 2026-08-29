'use client';

import React from 'react';
import { AlertCircle, Lock, Phone, Store } from 'lucide-react';
import Link from 'next/link';

export default function TenantExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="h-16 w-16 bg-red-950/30 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mx-auto">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Situs Tidak Tersedia</h2>
          <p className="text-xs text-rose-400 font-semibold tracking-wider uppercase">Trial Expired / Suspended</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed pt-2">
            Masa uji coba gratis (trial) untuk restoran ini telah berakhir atau status layanan sedang ditangguhkan sementara.
          </p>
        </div>

        <div className="bg-gray-950 rounded-lg p-4 text-left border border-gray-800 space-y-2 text-xs">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Store className="h-4.5 w-4.5 text-rose-500" />
            Apakah Anda Pemilik Restoran?
          </p>
          <p className="text-gray-500">
            Silakan masuk ke halaman administrasi tagihan Anda untuk mengaktifkan paket berlangganan berbayar (Paid Subscription).
          </p>
          <div className="pt-2 text-center">
            <Link
              href="/admin/login"
              className="inline-block text-xs font-bold text-rose-400 hover:text-rose-300"
            >
              Masuk ke Portal Admin Restoran &rarr;
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 text-center">
          <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Hubungi dukungan platform SaaS jika ada pertanyaan teknis.
          </p>
        </div>
      </div>
    </div>
  );
}
