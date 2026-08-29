'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Grid,
  MenuSquare,
  Settings,
  BarChart,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setAuthorized(true);
      return;
    }

    const token = localStorage.getItem('sibangku_tenant_token');
    const userJson = localStorage.getItem('sibangku_tenant_user');
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';

    if (!token || !userJson) {
      router.push('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(userJson);
      
      // Force change password policy (PRD §56, §201)
      if (user.mustChangePassword && pathname !== '/admin/change-password') {
        router.push('/admin/change-password');
        return;
      }

      setUserName(user.name);
      setUserRole(user.role);
      setRestaurantName(tenantCode); // display tenant code as workspace indicator
      setAuthorized(true);
    } catch {
      router.push('/admin/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('sibangku_tenant_token');
    localStorage.removeItem('sibangku_tenant_user');
    localStorage.removeItem('sibangku_tenant_code');
    router.push('/admin/login');
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p>Memuat sesi admin restoran...</p>
      </div>
    );
  }

  // Skip layout wrap for login and change-password pages
  if (pathname === '/admin/login' || pathname === '/admin/change-password') {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Reservasi', href: '/admin/reservations', icon: Calendar },
    { name: 'Tata Letak Meja', href: '/admin/tables', icon: Grid },
    { name: 'Menu Makanan', href: '/admin/menu', icon: MenuSquare },
    { name: 'Branding & Settings', href: '/admin/settings', icon: Settings },
    { name: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart },
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-gray-900 border-r border-gray-800">
        <div className="flex h-16 items-center px-6 border-b border-gray-800">
          <Link href="/admin/dashboard" className="text-xl font-bold text-white tracking-wide">
            {restaurantName || 'SiBangku Admin'}
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
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 border border-gray-700">
              <User className="h-5 w-5 text-gray-300" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-gray-500 font-mono">{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-gray-950/90">
          <aside className="w-64 flex flex-col bg-gray-900 border-r border-gray-850 h-full p-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-850">
              <span className="text-lg font-bold text-white">{restaurantName}</span>
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
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-gray-850 space-y-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-gray-800 md:hidden bg-gray-900/50">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-white" />
          </button>
          <span className="text-lg font-bold text-white">{restaurantName}</span>
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
