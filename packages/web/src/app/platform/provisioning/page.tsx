'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Store,
  Mail,
  Calendar,
  Settings,
  Database,
  Globe,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function PlatformProvisioningPage() {
  const [step, setStep] = useState(1);
  
  // Form state
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [trialDays, setTrialDays] = useState('60');

  // Processing state
  const [provisioning, setProvisioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any | null>(null);

  // Dynamic progress mock matching PRD §93/§154
  const [stepStatus, setStepStatus] = useState({
    database: 'PENDING',
    auth: 'PENDING',
    config: 'PENDING',
    web: 'PENDING',
    apk: 'PENDING',
  });

  const nextStep = () => {
    if (step === 1 && (!name || !restaurantName)) return;
    if (step === 2 && !adminEmail) return;
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const startProvisioning = async () => {
    setProvisioning(true);
    setErrorMsg('');
    setStepStatus({
      database: 'PENDING',
      auth: 'PENDING',
      config: 'PENDING',
      web: 'PENDING',
      apk: 'PENDING',
    });

    try {
      // Step 1: Database Creation (starts running)
      setStepStatus((s) => ({ ...s, database: 'RUNNING' }));
      
      const token = localStorage.getItem('sibangku_platform_token');
      const res = await fetch('http://localhost:3001/api/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          restaurantName,
          adminEmail,
          trialDays: Number(trialDays),
        }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        setStepStatus((s) => ({ ...s, database: 'FAILED' }));
        throw new Error(responseData.error?.message || 'Provisioning failed');
      }

      const tenantData = responseData.data;

      // Simulate steps with standard loading delays
      setStepStatus((s) => ({ ...s, database: 'SUCCESS', auth: 'RUNNING' }));
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setStepStatus((s) => ({ ...s, auth: 'SUCCESS', config: 'RUNNING' }));
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStepStatus((s) => ({ ...s, config: 'SUCCESS', web: 'RUNNING' }));
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Web takes longer

      setStepStatus((s) => ({ ...s, web: 'SUCCESS', apk: 'RUNNING' }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // APK takes longer

      setStepStatus((s) => ({ ...s, apk: 'SUCCESS' }));
      setResult(tenantData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan provisioning tenant.');
    } finally {
      setProvisioning(false);
    }
  };

  const resetWizard = () => {
    setName('');
    setRestaurantName('');
    setAdminEmail('');
    setTrialDays('60');
    setResult(null);
    setStep(1);
    setErrorMsg('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Provisioning Wizard</h1>
        <p className="text-gray-400 mt-1">
          Lakukan alokasi database, setup administrator, dan build sistem tenant baru
        </p>
      </div>

      {/* Progress Wizard Steps header */}
      {!result && !provisioning && (
        <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-rose-500' : 'text-gray-500'}`}>
            <Store className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase">Restoran</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-rose-500' : 'text-gray-500'}`}>
            <Mail className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase">Admin Owner</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-rose-500' : 'text-gray-500'}`}>
            <Calendar className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase">Trial</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600" />
          <div className={`flex items-center gap-2 ${step >= 4 ? 'text-rose-500' : 'text-gray-500'}`}>
            <Settings className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase">Review</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/50 border border-red-500 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Restaurant Info */}
      {!result && !provisioning && step === 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Langkah 1: Profil Restoran</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Nama Penyewa (Tenant Name)
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-rose-500 focus:outline-none"
                placeholder="Contoh: Distro Avenue Bogor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Nama Restoran Branded
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-rose-500 focus:outline-none"
                placeholder="Contoh: Distro Avenue Diner"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={nextStep}
              disabled={!name || !restaurantName}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              Lanjut
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Owner Info */}
      {!result && !provisioning && step === 2 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Langkah 2: Administrator Owner</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Email Administrator
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-rose-500 focus:outline-none"
                placeholder="Contoh: owner@distroavenue.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              onClick={prevStep}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              onClick={nextStep}
              disabled={!adminEmail}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              Lanjut
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Trial configuration */}
      {!result && !provisioning && step === 3 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Langkah 3: Konfigurasi Trial</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">
                Durasi Uji Coba (Trial Duration)
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-rose-500 focus:outline-none"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              >
                <option value="7">7 Hari</option>
                <option value="14">14 Hari</option>
                <option value="30">30 Hari</option>
                <option value="60">60 Hari (Rekomendasi)</option>
                <option value="90">90 Hari</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              onClick={prevStep}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              onClick={nextStep}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              Lanjut
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Provision */}
      {!result && !provisioning && step === 4 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Langkah 4: Tinjau Detail</h2>
          <div className="divide-y divide-gray-700 border-t border-b border-gray-700 py-2">
            <div className="flex justify-between py-3">
              <span className="text-gray-400 text-sm">Nama Penyewa</span>
              <span className="text-white text-sm font-semibold">{name}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-400 text-sm">Nama Restoran</span>
              <span className="text-white text-sm font-semibold">{restaurantName}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-400 text-sm">Email Administrator</span>
              <span className="text-white text-sm font-semibold">{adminEmail}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-400 text-sm">Masa Trial</span>
              <span className="text-white text-sm font-semibold">{trialDays} Hari</span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={prevStep}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              onClick={startProvisioning}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"
            >
              Eksekusi Provisioning &rarr;
            </button>
          </div>
        </div>
      )}

      {/* PROVISIONING PIPELINE LOADING (PRD §155) */}
      {provisioning && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500 mx-auto" />
            <h3 className="text-xl font-bold text-white">Memproses Provisioning Tenant</h3>
            <p className="text-gray-400 text-sm">Harap tunggu, server sedang menyiapkan infrastruktur terisolasi...</p>
          </div>

          <div className="space-y-4 max-w-md mx-auto pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <Database className={`h-5 w-5 ${stepStatus.database === 'RUNNING' ? 'text-rose-500' : stepStatus.database === 'SUCCESS' ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className={stepStatus.database === 'RUNNING' ? 'text-white font-medium' : 'text-gray-400'}>Alokasi Database & Migrasi Skema</span>
              </div>
              <span className="text-xs font-mono">{stepStatus.database}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <Mail className={`h-5 w-5 ${stepStatus.auth === 'RUNNING' ? 'text-rose-500' : stepStatus.auth === 'SUCCESS' ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className={stepStatus.auth === 'RUNNING' ? 'text-white font-medium' : 'text-gray-400'}>Setup Administrator & Kredensial</span>
              </div>
              <span className="text-xs font-mono">{stepStatus.auth}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <Settings className={`h-5 w-5 ${stepStatus.config === 'RUNNING' ? 'text-rose-500' : stepStatus.config === 'SUCCESS' ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className={stepStatus.config === 'RUNNING' ? 'text-white font-medium' : 'text-gray-400'}>Inisialisasi Settings & Default Branding</span>
              </div>
              <span className="text-xs font-mono">{stepStatus.config}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <Globe className={`h-5 w-5 ${stepStatus.web === 'RUNNING' ? 'text-rose-500' : stepStatus.web === 'SUCCESS' ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className={stepStatus.web === 'RUNNING' ? 'text-white font-medium' : 'text-gray-400'}>Build Aset Web & Subdomain Routing</span>
              </div>
              <span className="text-xs font-mono">{stepStatus.web}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <FileCheck className={`h-5 w-5 ${stepStatus.apk === 'RUNNING' ? 'text-rose-500' : stepStatus.apk === 'SUCCESS' ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className={stepStatus.apk === 'RUNNING' ? 'text-white font-medium' : 'text-gray-400'}>Build & Konfigurasi Paket Android APK</span>
              </div>
              <span className="text-xs font-mono">{stepStatus.apk}</span>
            </div>
          </div>
        </div>
      )}

      {/* PROVISIONING COMPLETE UI */}
      {result && (
        <div className="bg-gray-800 border border-emerald-500 rounded-xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h3 className="text-2xl font-bold text-white">Tenant Sukses Dibuat!</h3>
            <p className="text-gray-400 text-sm">Infrastruktur Multi-Tenant terisolasi untuk {restaurantName} telah online.</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Detail Kredensial & Server</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="block text-[10px] text-gray-500 uppercase">Tenant ID</span>
                <span className="text-white text-xs">{result.tenantId}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="block text-[10px] text-gray-500 uppercase">Tenant Code</span>
                <span className="text-white text-xs">{result.tenantCode}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 col-span-1 md:col-span-2">
                <span className="block text-[10px] text-gray-500 uppercase">Email Admin</span>
                <span className="text-white text-xs">{result.adminEmail}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 col-span-1 md:col-span-2 relative">
                <span className="block text-[10px] text-gray-500 uppercase">Temporary Password</span>
                <span className="text-emerald-400 text-xs font-bold">{result.temporaryPassword}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="block text-[10px] text-gray-500 uppercase">Database PostgreSQL</span>
                <span className="text-white text-xs">{result.databaseName}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="block text-[10px] text-gray-500 uppercase">Subdomain Web</span>
                <span className="text-white text-xs">{result.tenantCode.toLowerCase()}.sibangku.example</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-4 text-xs text-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <p>
              <strong>PERHATIAN KESELAMATAN:</strong> Password sementara di atas dibuat secara acak. Admin restoran wajib menggantinya pada login pertama kali. Jangan simpan kredensial ini secara permanen di log server atau commit ke Git!
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={resetWizard}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-lg"
            >
              Kembali ke Halaman Provisioning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
