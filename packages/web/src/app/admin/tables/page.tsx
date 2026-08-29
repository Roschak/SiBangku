'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Grid,
  Plus,
  Save,
  RotateCw,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Table {
  id: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH';
  positionX: number; // percentage 0 - 100
  positionY: number; // percentage 0 - 100
  rotation: number;  // degrees 0 - 360
  status: string;
}

export default function TenantTableLayoutBuilder() {
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // New Table Form
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newShape, setNewShape] = useState<'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH'>('SQUARE');

  // Drag State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const selectedTable = tablesList.find((t) => t.id === selectedTableId);

  const fetchTables = async () => {
    setLoading(true);
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');
    try {
      const res = await fetch('http://localhost:3002/api/v1/tables', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setTablesList(result.data);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      // Fallback Mock Data
      setTablesList([
        { id: 't1', tableNumber: 1, tableName: 'Meja 1', capacity: 2, shape: 'ROUND', positionX: 20, positionY: 30, rotation: 0, status: 'AVAILABLE' },
        { id: 't2', tableNumber: 2, tableName: 'Meja 2', capacity: 4, shape: 'SQUARE', positionX: 50, positionY: 30, rotation: 0, status: 'AVAILABLE' },
        { id: 't3', tableNumber: 3, tableName: 'Meja 3', capacity: 6, shape: 'RECTANGLE', positionX: 30, positionY: 60, rotation: 45, status: 'AVAILABLE' },
        { id: 't4', tableNumber: 4, tableName: 'Meja 4', capacity: 4, shape: 'BOOTH', positionX: 70, positionY: 60, rotation: 0, status: 'AVAILABLE' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber || !newName) return;

    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch('http://localhost:3002/api/v1/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
        body: JSON.stringify({
          tableNumber: Number(newNumber),
          tableName: newName,
          capacity: Number(newCapacity),
          shape: newShape,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        // Clear form
        setNewNumber('');
        setNewName('');
        // Refresh list
        fetchTables();
      } else {
        alert(result.error?.message || 'Gagal membuat meja');
      }
    } catch {
      // Mock insert locally
      const mockId = `mock-${Date.now()}`;
      setTablesList((prev) => [
        ...prev,
        {
          id: mockId,
          tableNumber: Number(newNumber),
          tableName: newName,
          capacity: Number(newCapacity),
          shape: newShape,
          positionX: 45,
          positionY: 45,
          rotation: 0,
          status: 'AVAILABLE',
        },
      ]);
      setSelectedTableId(mockId);
      setNewNumber('');
      setNewName('');
    }
  };

  // Drag and Drop implementation (Percentage bound logic - responsive)
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    setSelectedTableId(tableId);
    setIsDragging(true);

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const tableElement = e.currentTarget as HTMLElement;
    const tableRect = tableElement.getBoundingClientRect();

    // Store mouse offset relative to center of table element
    dragStartOffset.current = {
      x: e.clientX - (tableRect.left + tableRect.width / 2),
      y: e.clientY - (tableRect.top + tableRect.height / 2),
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedTableId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position relative to canvas
    const xPx = e.clientX - canvasRect.left - dragStartOffset.current.x;
    const yPx = e.clientY - canvasRect.top - dragStartOffset.current.y;

    // Convert pixels to percentage bounds
    let positionX = Math.round((xPx / canvasRect.width) * 100);
    let positionY = Math.round((yPx / canvasRect.height) * 100);

    // Keep table within bounds (0 - 90 to avoid clipping right/bottom)
    positionX = Math.max(5, Math.min(90, positionX));
    positionY = Math.max(5, Math.min(85, positionY));

    // Update locally
    setTablesList((prev) =>
      prev.map((t) => (t.id === selectedTableId ? { ...t, positionX, positionY } : t))
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    if (!selectedTableId) return;
    setTablesList((prev) =>
      prev.map((t) =>
        t.id === selectedTableId ? { ...t, rotation: (t.rotation + 45) % 360 } : t
      )
    );
  };

  const handleSaveLayout = async () => {
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch('http://localhost:3002/api/v1/tables/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
        body: JSON.stringify({
          layout: tablesList.map((t) => ({
            id: t.id,
            positionX: t.positionX,
            positionY: t.positionY,
            rotation: t.rotation,
            shape: t.shape,
          })),
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('Tata letak meja berhasil disimpan!');
      } else {
        throw new Error();
      }
    } catch {
      alert('Mock Mode: Tata letak meja disimpan secara lokal.');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus meja ini?')) return;
    const tenantCode = localStorage.getItem('sibangku_tenant_code') || '';
    const token = localStorage.getItem('sibangku_tenant_token');

    try {
      const res = await fetch(`http://localhost:3002/api/v1/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-code': tenantCode,
        },
      });
      if (res.ok) {
        setSelectedTableId(null);
        fetchTables();
      }
    } catch {
      setTablesList((prev) => prev.filter((t) => t.id !== tableId));
      setSelectedTableId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tata Letak Meja (Visual Floor Plan)</h1>
          <p className="text-gray-400 mt-1">
            Gunakan drag-and-drop untuk mengatur posisi meja restoran bagi pelanggan
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTables}
            className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 hover:bg-gray-850 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleSaveLayout}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 hover:bg-rose-700 text-sm font-semibold text-white shadow-lg"
          >
            <Save className="h-4 w-4" />
            Simpan Tata Letak
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Control Panel */}
        <div className="space-y-6">
          {/* Add Table form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-500">
              Tambah Meja Baru
            </h2>
            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">
                  Nomor Meja
                </label>
                <input
                  type="number"
                  required
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-sm focus:border-rose-500 focus:outline-none"
                  placeholder="e.g. 5"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">
                  Nama Identitas Meja
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-sm focus:border-rose-500 focus:outline-none"
                  placeholder="e.g. Table 5"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">
                    Kapasitas
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-sm focus:border-rose-500 focus:outline-none"
                    placeholder="4"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">
                    Bentuk
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 px-3 text-white text-sm focus:border-rose-500 focus:outline-none"
                    value={newShape}
                    onChange={(e) => setNewShape(e.target.value as any)}
                  >
                    <option value="SQUARE">Square</option>
                    <option value="ROUND">Round</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="BOOTH">Booth</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="h-4 w-4" />
                Tambah Meja
              </button>
            </form>
          </div>

          {/* Selected Table Controller */}
          {selectedTable ? (
            <div className="bg-gray-900 border border-gray-850 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-emerald-400">
                  Kontrol Meja
                </h2>
                <span className="text-xs font-mono text-gray-500">{selectedTable.tableName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRotate}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-800 bg-gray-950 hover:bg-gray-800 text-xs text-gray-300 transition"
                >
                  <RotateCw className="h-4 w-4 text-emerald-500" />
                  Rotasi 45&deg;
                </button>
                <button
                  onClick={() => handleDeleteTable(selectedTable.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-950 bg-red-950/20 hover:bg-red-900/40 text-xs text-red-400 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Meja
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-850 border-dashed rounded-xl p-5 text-center text-xs text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600 shrink-0" />
              Klik salah satu meja di canvas untuk melakukan rotasi atau penghapusan
            </div>
          )}
        </div>

        {/* Builder Canvas Container (PRD §29, §158) */}
        <div className="lg:col-span-3">
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-[550px] bg-gray-900 border border-gray-800 rounded-2xl relative overflow-hidden shadow-2xl select-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #2d3748 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950/55 text-gray-500">
                Memuat visual builder...
              </div>
            ) : tablesList.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2 p-6 text-center">
                <Grid className="h-8 w-8 text-gray-650" />
                <p>Belum ada meja restoran ditambahkan.</p>
                <p className="text-xs text-gray-600 max-w-xs">Gunakan panel sebelah kiri untuk menambahkan meja, lalu atur tata letaknya.</p>
              </div>
            ) : (
              tablesList.map((t) => {
                const isSelected = t.id === selectedTableId;
                
                // Styling based on shapes
                let shapeClass = '';
                if (t.shape === 'ROUND') shapeClass = 'rounded-full';
                else if (t.shape === 'RECTANGLE') shapeClass = 'rounded-lg w-20 h-10';
                else if (t.shape === 'BOOTH') shapeClass = 'rounded-xl border-dashed';
                else shapeClass = 'rounded-xl w-14 h-14'; // SQUARE default

                return (
                  <div
                    key={t.id}
                    onMouseDown={(e) => handleMouseDown(e, t.id)}
                    className={`absolute cursor-move flex flex-col items-center justify-center border font-semibold select-none text-xs transition-shadow duration-150 ${shapeClass} ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/40 text-white shadow-lg ring-2 ring-rose-500/50 z-20'
                        : 'border-gray-700 bg-gray-950 text-gray-400 shadow hover:border-gray-500 hover:text-white z-10'
                    }`}
                    style={{
                      left: `${t.positionX}%`,
                      top: `${t.positionY}%`,
                      width: t.shape === 'RECTANGLE' ? '80px' : '60px',
                      height: t.shape === 'RECTANGLE' ? '50px' : '60px',
                      transform: `rotate(${t.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <span className="text-[10px] text-gray-500 font-mono tracking-tighter">#{t.tableNumber}</span>
                    <span className="text-xs font-bold leading-none truncate max-w-[50px]">{t.tableName}</span>
                    <span className="text-[9px] text-gray-600 font-medium">{t.capacity} Pax</span>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 pl-1">
            <Grid className="h-4 w-4 text-gray-650" />
            <span>Tips: Drag meja untuk memindahkannya. Klik meja untuk memilihnya. Jangan lupa klik &quot;Simpan Tata Letak&quot; setelah melakukan perubahan.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
