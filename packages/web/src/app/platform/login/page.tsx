'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function PlatformLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Login failed');
      }

      // Save token and role info
      localStorage.setItem('sibangku_platform_token', result.data.token);
      localStorage.setItem('sibangku_platform_user', JSON.stringify(result.data.user));

      router.push('/platform/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke Control Plane API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-800 p-8 shadow-xl border border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            SiBangku Control Plane
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            SaaS Restaurant Platform Owner Panel
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/50 border border-red-500 p-4 text-sm text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div className="relative mb-4">
              <label htmlFor="email" className="sr-only">
                Email / Username
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="email"
                name="email"
                type="text"
                required
                className="relative block w-full rounded-lg border border-gray-700 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:ring-rose-500 focus:outline-none sm:text-sm"
                placeholder="Email / Username"
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
                className="relative block w-full rounded-lg border border-gray-700 bg-gray-950 py-3 pl-10 pr-3 text-white placeholder-gray-500 focus:border-rose-500 focus:ring-rose-500 focus:outline-none sm:text-sm"
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
              className="group relative flex w-full justify-center rounded-lg bg-rose-600 py-3 px-4 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Masuk ke Panel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
