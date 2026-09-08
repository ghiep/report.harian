import React, { useState } from 'react';
import { Settings, User, Clock, Bell, Shield, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [workingHoursStart, setWorkingHoursStart] = useState(user?.working_hours_start || '09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState(user?.working_hours_end || '17:00');
  const [workDays, setWorkDays] = useState(user?.work_days || 'Senin - Jumat');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Jakarta (WIB)');
  const [notifications, setNotifications] = useState(!!user?.notifications_enabled);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await updateProfile({
        name: name.trim(),
        working_hours_start: workingHoursStart,
        working_hours_end: workingHoursEnd,
        work_days: workDays,
        timezone,
        notifications_enabled: notifications,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>Pengaturan Akun & Preferensi Kerja</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Atur profil, zona waktu, jam kerja optimal, dan konfigurasi sistem
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan berhasil disimpan dan diterapkan!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile Card */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Profil Pengguna</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email (Akun)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Working Hours & Timezone */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Jam Kerja & Zona Waktu</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam Mulai Kerja</label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam Selesai Kerja</label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hari Kerja</label>
              <input
                type="text"
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                placeholder="Contoh: Senin - Jumat"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Zona Waktu</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              >
                <option value="Asia/Jakarta (WIB)">Asia/Jakarta (WIB, UTC+7)</option>
                <option value="Asia/Makassar (WITA)">Asia/Makassar (WITA, UTC+8)</option>
                <option value="Asia/Jayapura (WIT)">Asia/Jayapura (WIT, UTC+9)</option>
                <option value="UTC">UTC / GMT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & System */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Notifikasi & Peringatan Sistem</h3>
          </div>

          <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>
              Aktifkan pengingat in-app saat ada task yang mendekati atau melewati tenggat waktu (deadline).
            </span>
          </label>
        </div>

        {/* Data Integrity Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Integritas Data Asli Pengguna</p>
            <p className="mt-0.5 leading-relaxed text-slate-500">
              Sistem beroperasi menggunakan database relasional terisolasi. Seluruh project, task, durasi kerja, dan laporan berasal secara murni dari aktivitas Anda tanpa data dummy permanen.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
