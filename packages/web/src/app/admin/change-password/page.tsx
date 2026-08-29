'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function TenantChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sibangku_tenant_token');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Password baru tidak cocok');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('sibangku_tenant_token');
      const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';

      const res = await fetch('http://localhost:3002/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Password update failed');
      }

      // Update user details in localStorage
      const userJson = localStorage.getItem('sibangku_tenant_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        user.mustChangePassword = false;
        localStorage.setItem('sibangku_tenant_user', JSON.stringify(user));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-900 p-8 shadow-xl border border-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Ganti Password
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Demi alasan keamanan, Anda wajib mengganti password sementara Anda sebelum melanjutkan.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-emerald-950/20 border border-emerald-500/50 p-6 text-center text-emerald-200">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold">Password Berhasil Diperbarui!</p>
            <p className="text-xs text-gray-500">Mengarahkan Anda ke dashboard...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-955/40 border border-red-500/50 p-4 text-sm text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyRound className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                    placeholder="Password Saat Ini"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyRound className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                    placeholder="Password Baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyRound className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                    placeholder="Konfirmasi Password Baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-lg bg-rose-600 py-3 px-4 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Perbarui Password'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
