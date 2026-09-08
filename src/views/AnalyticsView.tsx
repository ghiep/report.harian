import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../api';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: '#10B981',
    in_progress: '#6366F1',
    todo: '#38BDF8',
    postponed: '#F59E0B',
    cancelled: '#94A3B8',
    overdue: '#F43F5E',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    critical: '#F43F5E',
    urgent: '#F97316',
    high: '#FBBF24',
    medium: '#38BDF8',
    low: '#94A3B8',
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Memuat analisis data produktivitas...
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Belum Ada Data Analitik</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Data analitik dihitung secara otomatis dari aktivitas input pekerjaan harian, pencatatan waktu pengerjaan, dan penyelesaian tugas Anda.
          </p>
        </div>
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>Statistik & Analitik Produktivitas</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Wawasan komprehensif tentang performa kerja, tren penyelesaian, dan efisiensi waktu
        </p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Productivity Score</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-indigo-700">{kpis.productivity_score}</span>
            <span className="text-xs text-slate-400 font-bold">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Formula algoritma 5 bobot</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Completion Rate</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-600">{kpis.completion_rate}%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{kpis.completed_tasks} dari {kpis.total_tasks} task</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Jam Kerja</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900">{kpis.total_working_hours}</span>
            <span className="text-xs text-slate-500 font-medium">Jam</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Terekam via live timer</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Rata-rata Task/Hari</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-sky-600">{kpis.average_daily_tasks}</span>
            <span className="text-xs text-slate-500 font-medium">Task</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dalam 7 hari terakhir</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trend Line Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Tren Produktivitas (7 Hari Terakhir)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Task selesai per hari</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.productivity_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Task Selesai"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366F1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Distribution Donut Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Distribusi Status Task</span>
            </h3>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.status_distribution.filter((s: any) => s.count > 0)}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {data.status_distribution.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || '#94A3B8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-600 capitalize">
                      {value.replace('_', ' ')}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Working Hours Bar Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Jam Kerja Harian (7 Hari Terakhir)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total durasi live timer</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.working_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" jam" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="hours" name="Jam Kerja" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Distribusi Tingkat Kepentingan (Priority)</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.priority_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Jumlah Task" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Productivity Score Formula Card (Section P) */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold">Formula Perhitungan Productivity Score (0 - 100)</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Skor produktivitas WorkFlow AI dihitung secara transparan dan matematis berdasarkan 5 pilar utama performa kerja harian:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="font-extrabold text-indigo-300 text-sm block">35%</span>
            <strong className="block text-white mt-0.5">Completion Rate</strong>
            <p className="text-[11px] text-slate-400 mt-1">Rasio task tuntas vs direncanakan</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="font-extrabold text-indigo-300 text-sm block">25%</span>
            <strong className="block text-white mt-0.5">Deadline Adherence</strong>
            <p className="text-[11px] text-slate-400 mt-1">Ketepatan waktu sebelum batas tenggat</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="font-extrabold text-indigo-300 text-sm block">20%</span>
            <strong className="block text-white mt-0.5">Priority Completion</strong>
            <p className="text-[11px] text-slate-400 mt-1">Penyelesaian task critical & urgent</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="font-extrabold text-indigo-300 text-sm block">10%</span>
            <strong className="block text-white mt-0.5">Focus Efficiency</strong>
            <p className="text-[11px] text-slate-400 mt-1">Akurasi estimasi vs durasi aktual</p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="font-extrabold text-indigo-300 text-sm block">10%</span>
            <strong className="block text-white mt-0.5">Consistency</strong>
            <p className="text-[11px] text-slate-400 mt-1">Ritme kerja konsisten tiap hari</p>
          </div>
        </div>
      </div>
    </div>
  );
};
