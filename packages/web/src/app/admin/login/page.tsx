'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, AlertCircle, Loader2, Store } from 'lucide-react';

export default function TenantLoginPage() {
  const [tenantCode, setTenantCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Attempt to auto-detect tenant code from subdomain
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        if (!['www', 'api', 'control', 'localhost'].includes(subdomain.toLowerCase())) {
          setTenantCode(subdomain.toUpperCase());
        }
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3002/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-code': tenantCode.toUpperCase(),
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Login failed');
      }

      // Save token, user details, and active tenant code
      localStorage.setItem('sibangku_tenant_token', result.data.token);
      localStorage.setItem('sibangku_tenant_user', JSON.stringify(result.data.user));
      localStorage.setItem('sibangku_tenant_code', tenantCode.toUpperCase());

      // PRD §56, §201: Redirect to password change if mustChangePassword is true
      if (result.data.user.mustChangePassword) {
        router.push('/admin/change-password');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke Tenant API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-900 p-8 shadow-xl border border-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            SiBangku Admin Restoran
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Restaurant Admin & Staff Portal
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-500/50 p-4 text-sm text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="tenantCode" className="sr-only">
                Kode Restoran (Tenant Code)
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Store className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="tenantCode"
                name="tenantCode"
                type="text"
                required
                className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm font-mono uppercase"
                placeholder="KODE RESTORAN (e.g. DISTRO-AVENUE)"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <KeyRound className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-lg border border-gray-800 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                'Masuk Admin'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
