'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Utensils, Calendar, Phone, ArrowRight, Layers, Clock } from 'lucide-react';
import { getTenantCode, getTenantApiUrl } from './utils/tenant';

interface Branding {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string;
  title: string;
  description: string;
  whatsapp: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  available: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function CustomerLandingPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenantLanding = async () => {
      const code = getTenantCode();
      const api = getTenantApiUrl();

      try {
        // Fetch branding
        const brandRes = await fetch(`${api}/settings/branding`, {
          headers: { 'x-tenant-code': code },
        });
        const brandData = await brandRes.json();

        // Fetch categories
        const catRes = await fetch(`${api}/categories`, {
          headers: { 'x-tenant-code': code },
        });
        const catData = await catRes.json();

        // Fetch menu
        const menuRes = await fetch(`${api}/menu`, {
          headers: { 'x-tenant-code': code },
        });
        const menuData = await menuRes.json();

        if (brandRes.ok && brandData.success) {
          setBranding(brandData.data);
        }
        if (catRes.ok && catData.success) {
          setCategories(catData.data);
        }
        if (menuRes.ok && menuData.success) {
          setMenuItems(menuData.data);
        }
      } catch {
        // Fallback Sunda Restaurant branding
        setBranding({
          primaryColor: '#F43F5E', // Rose 500
          secondaryColor: '#0F172A', // Slate 900
          fontFamily: 'Inter',
          logoUrl: '',
          title: 'Sunda Kuliner Nusantara',
          description: 'Nikmati hidangan khas masakan Jawa Barat pilihan terbaik langsung dari chef profesional. Kami menyediakan suasana santap saji nyaman dengan tata letak meja pilihan Anda.',
          whatsapp: '6281234567890',
        });
        setCategories([
          { id: 'cat-main', name: 'MAIN COURSE' },
          { id: 'cat-drinks', name: 'DRINKS' },
        ]);
        setMenuItems([
          { id: 'm1', name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur dan ayam suwir', price: 25000, categoryId: 'cat-main', available: true },
          { id: 'm2', name: 'Es Teh Manis', description: 'Es teh manis segar', price: 6000, categoryId: 'cat-drinks', available: true },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadTenantLanding();
  }, []);

  if (loading || !branding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-sm">Memuat profil restoran...</p>
      </div>
    );
  }

  const primaryStyle = { backgroundColor: branding.primaryColor };
  const textPrimaryStyle = { color: branding.primaryColor };
  const borderPrimaryStyle = { borderColor: branding.primaryColor };

  return (
    <div
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col"
      style={{ fontFamily: branding.fontFamily }}
    >
      {/* Top Navigation */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white" style={primaryStyle}>
              <Utensils className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold text-lg text-white">{branding.title}</span>
          </div>
          <Link
            href="/booking"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow"
            style={primaryStyle}
          >
            <Calendar className="h-4 w-4" />
            Reservasi Meja
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 border-b border-gray-900 bg-gradient-to-b from-gray-900/50 to-gray-950">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            {branding.title}
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {branding.description}
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              href="/booking"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white shadow-lg transition-all"
              style={primaryStyle}
            >
              Pesan Meja Anda Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      <section className="max-w-5xl mx-auto px-4 py-16 flex-1 w-full space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Daftar Menu</h2>
          <p className="text-gray-500 text-xs">Pilihan makanan dan minuman andalan kami</p>
        </div>

        {categories.map((cat) => {
          const items = menuItems.filter((m) => m.categoryId === cat.id && m.available);
          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-6">
              <h3 className="text-sm font-bold text-rose-450 uppercase tracking-widest flex items-center gap-2 border-b border-gray-900 pb-2">
                <Layers className="h-4 w-4" style={textPrimaryStyle} />
                {cat.name}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-gray-900 border border-gray-850 rounded-xl flex justify-between gap-4 hover:border-gray-700 transition"
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-mono font-bold text-white shrink-0">
                      {item.price.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 bg-gray-950 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>&copy; {new Date().getFullYear()} {branding.title}. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${branding.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <Phone className="h-4 w-4 text-emerald-500" />
              Hubungi Kami via WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
