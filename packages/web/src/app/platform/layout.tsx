'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  CreditCard,
  History,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/platform/login') {
      setAuthorized(true);
      return;
    }

    const token = localStorage.getItem('sibangku_platform_token');
    const userJson = localStorage.getItem('sibangku_platform_user');

    if (!token || !userJson) {
      router.push('/platform/login');
      return;
    }

    try {
      const user = JSON.parse(userJson);
      setAdminEmail(user.email);
      setAuthorized(true);
    } catch {
      router.push('/platform/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('sibangku_platform_token');
    localStorage.removeItem('sibangku_platform_user');
    router.push('/platform/login');
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <p>Memuat sesi admin...</p>
      </div>
    );
  }

  // If path is login, don't wrap in layout
  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
    { name: 'Daftar Restoran', href: '/platform/tenants', icon: Users },
    { name: 'Provisioning Wizard', href: '/platform/provisioning', icon: PlusCircle },
    { name: 'Subscriptions', href: '/platform/subscriptions', icon: CreditCard },
    { name: 'Audit Logs', href: '/platform/audit', icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-gray-800 border-r border-gray-700">
        <div className="flex h-16 items-center px-6 border-b border-gray-700">
          <Link href="/platform/dashboard" className="text-xl font-bold text-white tracking-wide">
            SiBangku SaaS
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700">
              <User className="h-5 w-5 text-gray-300" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">{adminEmail}</p>
              <p className="text-xs text-gray-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Keluar Panel
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-gray-950/80">
          <aside className="w-64 flex flex-col bg-gray-800 border-r border-gray-700 h-full p-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-700">
              <span className="text-lg font-bold text-white">SiBangku SaaS</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-rose-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-gray-700 space-y-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Keluar Panel
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-gray-800 md:hidden bg-gray-800/50">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-white" />
          </button>
          <span className="text-lg font-bold text-white">SiBangku SaaS</span>
          <div className="h-6 w-6"></div> {/* spacer */}
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
