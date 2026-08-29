'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  FolderMinus,
  Utensils,
  Layers,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string;
  available: boolean;
  stock: number | null;
  preparationTime: number | null;
  sortOrder: number;
}

export default function TenantMenuPage() {
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New Category Form
  const [catName, setCatName] = useState('');
  const [catSort, setCatSort] = useState('0');

  // Item Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Item Form states
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCat, setItemCat] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemStock, setItemStock] = useState('');
  const [itemPrep, setItemPrep] = useState('');

  const fetchMenuData = async () => {
    setLoading(true);
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');
    try {
      const catRes = await fetch('http://localhost:3002/api/v1/categories', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      const catData = await catRes.json();

      const itemRes = await fetch('http://localhost:3002/api/v1/menu', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      const itemData = await itemRes.json();

      if (catRes.ok && catData.success) {
        setCategoriesList(catData.data);
      } else {
        throw new Error();
      }

      if (itemRes.ok && itemData.success) {
        setMenuList(itemData.data);
      }
    } catch {
      // Fallback Mock Data matching PRD constants
      setCategoriesList([
        { id: 'cat-main', name: 'MAIN COURSE', sortOrder: 1 },
        { id: 'cat-drinks', name: 'DRINKS', sortOrder: 2 },
        { id: 'cat-dessert', name: 'DESSERT', sortOrder: 3 },
      ]);
      setMenuList([
        { id: 'm1', name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur dan ayam suwir', price: 25000, image: null, categoryId: 'cat-main', available: true, stock: 50, preparationTime: 15, sortOrder: 1 },
        { id: 'm2', name: 'Es Teh Manis', description: 'Es teh manis segar', price: 6000, image: null, categoryId: 'cat-drinks', available: true, stock: null, preparationTime: 5, sortOrder: 2 },
        { id: 'm3', name: 'Roti Bakar Cokelat', description: 'Roti bakar rasa cokelat keju', price: 15000, image: null, categoryId: 'cat-dessert', available: false, stock: 0, preparationTime: 10, sortOrder: 3 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, [refreshTrigger]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch('http://localhost:3002/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
        body: JSON.stringify({ name: catName.toUpperCase(), sortOrder: Number(catSort) }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setCatName('');
        setCatSort('0');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(result.error?.message || 'Gagal membuat kategori');
      }
    } catch {
      // Mock local update
      setCategoriesList((prev) => [
        ...prev,
        { id: `cat-${Date.now()}`, name: catName.toUpperCase(), sortOrder: Number(catSort) },
      ]);
      setCatName('');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch(`http://localhost:3002/api/v1/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setCategoriesList((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleOpenItemModal = (item: MenuItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDesc(item.description || '');
      setItemPrice(item.price.toString());
      setItemCat(item.categoryId);
      setItemAvailable(item.available);
      setItemStock(item.stock?.toString() || '');
      setItemPrep(item.preparationTime?.toString() || '');
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemCat(categoriesList[0]?.id || '');
      setItemAvailable(true);
      setItemStock('');
      setItemPrep('');
    }
    setModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    const payload = {
      name: itemName,
      description: itemDesc || null,
      price: Number(itemPrice),
      categoryId: itemCat,
      available: itemAvailable,
      stock: itemStock ? Number(itemStock) : null,
      preparationTime: itemPrep ? Number(itemPrep) : null,
    };

    try {
      let res;
      if (editingItem) {
        res = await fetch(`http://localhost:3002/api/v1/menu/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-tenant-code': tenantCode,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('http://localhost:3002/api/v1/menu', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-tenant-code': tenantCode,
          },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setModalOpen(false);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      // Mock local
      if (editingItem) {
        setMenuList((prev) =>
          prev.map((m) => (m.id === editingItem.id ? { ...m, ...payload } : m))
        );
      } else {
        setMenuList((prev) => [
          ...prev,
          {
            id: `item-${Date.now()}`,
            ...payload,
            image: null,
            sortOrder: 0,
          },
        ]);
      }
      setModalOpen(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus menu ini?')) return;
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch(`http://localhost:3002/api/v1/menu/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-code': tenantCode },
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setMenuList((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const filteredItems = menuList.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategoryFilter ? item.categoryId === selectedCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Kelola Menu Makanan</h1>
          <p className="text-gray-400 mt-1">Daftarkan menu andalan restoran, kelola harga, dan stok porsi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 hover:bg-gray-800 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => handleOpenItemModal(null)}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 hover:bg-rose-700 text-sm font-semibold text-white shadow"
          >
            <Plus className="h-4 w-4" />
            Tambah Menu Makanan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Categories CRUD */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Kategori Menu
            </h2>

            {/* Quick add category */}
            <form onSubmit={handleCreateCategory} className="space-y-2">
              <input
                type="text"
                required
                className="w-full rounded-lg border border-gray-850 bg-gray-950 py-2 px-3 text-white text-xs focus:border-rose-500 focus:outline-none"
                placeholder="Nama Kategori (e.g. COFFEE)"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-2 bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <FolderPlus className="h-4.5 w-4.5 text-rose-500" />
                Tambah Kategori
              </button>
            </form>

            <div className="border-t border-gray-800 pt-4 space-y-1.5">
              <button
                onClick={() => setSelectedCategoryFilter('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategoryFilter === ''
                    ? 'bg-rose-950/20 border border-rose-800/50 text-rose-300'
                    : 'text-gray-400 hover:bg-gray-850 hover:text-white'
                }`}
              >
                SEMUA MENU ({menuList.length})
              </button>

              {categoriesList.map((c) => {
                const count = menuList.filter((m) => m.categoryId === c.id).length;
                return (
                  <div key={c.id} className="group flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCategoryFilter(c.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedCategoryFilter === c.id
                          ? 'bg-rose-950/20 border border-rose-800/50 text-rose-300'
                          : 'text-gray-400 hover:bg-gray-850 hover:text-white'
                      }`}
                    >
                      {c.name} ({count})
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-500 transition-opacity ml-1"
                      title="Hapus Kategori"
                    >
                      <FolderMinus className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Menu Items Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search bar */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="relative w-full max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-500" />
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-850 bg-gray-950 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none sm:text-sm"
                placeholder="Cari menu masakan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List Menu Items */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-gray-950 text-gray-300 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Menu Makanan</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Harga</th>
                    <th className="px-6 py-4">Stok</th>
                    <th className="px-6 py-4">Ketersediaan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Memuat daftar menu...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Belum ada menu terdaftar di kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const matchedCat = categoriesList.find((c) => c.id === item.categoryId);
                      return (
                        <tr key={item.id} className="hover:bg-gray-850/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex items-center justify-center rounded bg-rose-950/20 border border-rose-700/20 text-rose-400 shrink-0">
                                <Utensils className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-white">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                            {matchedCat ? matchedCat.name : '-'}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-semibold text-white">
                            {item.price.toLocaleString('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {item.stock !== null ? (
                              <span className={item.stock < 10 ? 'text-amber-500 font-semibold' : 'text-gray-300'}>
                                {item.stock} porsi
                              </span>
                            ) : (
                              <span className="text-gray-500 font-mono">Unlimited</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.available
                                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-955/20 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {item.available ? 'Tersedia' : 'Habis'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="inline-flex items-center p-2 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 text-gray-300 transition-all"
                              title="Edit Menu"
                            >
                              <Edit2 className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="inline-flex items-center p-2 rounded bg-red-950/20 border border-red-800/30 hover:bg-red-900/30 text-red-400 transition-all"
                              title="Hapus Menu"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MENU ITEM CREATION/EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">
              {editingItem ? 'Edit Menu Makanan' : 'Tambah Menu Makanan baru'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Nama Menu
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                  placeholder="e.g. Nasi Goreng Spesial"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none text-sm"
                  rows={2}
                  placeholder="e.g. Nasi goreng pedas dengan telur dan kerupuk"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                    Harga (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                    placeholder="25000"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                    Kategori
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-800 bg-gray-955 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value)}
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                    Stok Awal (Optional)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-800 bg-gray-955 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                    placeholder="Unlimited jika kosong"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                    Prep Time (Menit)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-800 bg-gray-955 py-2.5 px-4 text-white focus:border-rose-500 focus:outline-none"
                    placeholder="e.g. 15"
                    value={itemPrep}
                    onChange={(e) => setItemPrep(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="itemAvailable"
                  className="rounded border-gray-800 bg-gray-950 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                />
                <label htmlFor="itemAvailable" className="text-xs font-semibold text-gray-300">
                  Menu ini tersedia untuk dipesan (Available)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
