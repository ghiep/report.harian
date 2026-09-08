import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api';
import { DailyReview, Project, Category } from '../types';

interface ReportsViewProps {
  onOpenCheckIn: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenCheckIn }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReviews();
    } else {
      loadReport(activeTab);
    }
  }, [activeTab, projectFilter, categoryFilter]);

  const loadFilters = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.getProjects(), api.getCategories()]);
      setProjects(pRes.projects);
      setCategories(cRes.categories);
    } catch {
      // ignore
    }
  };

  const loadDailyReviews = async () => {
    setLoading(true);
    try {
      const res = await api.getDailyReviews();
      setDailyReviews(res.reviews);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (type: 'weekly' | 'monthly') => {
    setLoading(true);
    try {
      const res = await api.getReports({
        type,
        project_id: projectFilter,
        category_id: categoryFilter,
      });
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Laporan & Evaluasi Produktivitas</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Laporan berkala otomatis dan evaluasi harian didukung analisis AI
          </p>
        </div>

        <button
          onClick={onOpenCheckIn}
          className="px-4 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-900/20 inline-flex items-center gap-2"
        >
          <Moon className="w-4 h-4 text-indigo-300" />
          <span>Daily Check-in</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'weekly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Laporan Mingguan (Weekly)
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'monthly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Laporan Bulanan (Monthly)
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'daily' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Arsip Daily Review ({dailyReviews.length})
          </button>
        </div>

        {activeTab !== 'daily' && (
          <div className="flex items-center gap-2 text-xs">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">Semua Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Menyusun laporan data...</div>
      ) : activeTab === 'daily' ? (
        /* DAILY REVIEWS LIST */
        dailyReviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
            <Moon className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Daily Review</h4>
            <p className="text-xs text-slate-500">
              Lakukan check-in di penghujung hari kerja Anda untuk mendapatkan evaluasi AI otomatis.
            </p>
            <button
              onClick={onOpenCheckIn}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Mulai Daily Check-in Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Review Harian</span>
                    <h3 className="text-base font-bold text-slate-900">
                      {new Date(rev.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                      Productivity Score: {rev.productivity_score} / 100
                    </span>
                    <span className="text-slate-500">
                      Selesai: <strong>{rev.completed_tasks} / {rev.planned_tasks}</strong> ({rev.completion_rate}%)
                    </span>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ringkasan AI
                  </span>
                  <p className="text-slate-700 leading-relaxed">{rev.ai_summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pencapaian Terbaik
                    </span>
                    <p className="text-slate-600 leading-relaxed">{rev.what_went_well}</p>
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Perlu Perhatian
                    </span>
                    <p className="text-slate-600 leading-relaxed">{rev.needs_attention}</p>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                    <span className="font-bold text-indigo-800 flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" /> Prioritas Besok
                    </span>
                    <p className="text-slate-600 leading-relaxed">{rev.tomorrow_recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !reportData || !reportData.has_data ? (
        /* Empty Report */
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Belum Ada Data Pekerjaan</h4>
          <p className="text-xs text-slate-500">
            Laporan berkala memerlukan data pengerjaan task dan log waktu. Mulai kerjakan task Anda untuk melihat rekapitulasi.
          </p>
        </div>
      ) : (
        /* WEEKLY / MONTHLY REPORT VIEW */
        <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Pekerjaan</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{reportData.metrics.total_tasks}</p>
              <span className="text-[11px] text-slate-500">{reportData.metrics.completed_tasks} berhasil tuntas</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Tingkat Penyelesaian</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{reportData.metrics.completion_rate}%</p>
              <span className="text-[11px] text-slate-500">Beban kerja periode</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Waktu Kerja</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{reportData.metrics.total_hours} Jam</p>
              <span className="text-[11px] text-slate-500">Fokus pengerjaan</span>
            </div>

            <div className="p-4 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 shadow-xs">
              <span className="text-[11px] font-bold text-indigo-700 uppercase">Productivity Score</span>
              <p className="text-2xl font-black text-indigo-900 mt-1">{reportData.metrics.productivity_score} / 100</p>
              <span className="text-[11px] text-indigo-600">Performa periode</span>
            </div>
          </div>

          {/* AI Comprehensive Analysis Card (Section AI) */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Analisis Kinerja & Rekomendasi AI ({reportData.periodLabel})
              </h3>
            </div>

            {/* AI Summary */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-slate-700 leading-relaxed space-y-1">
              <strong className="text-indigo-900 block font-bold">Ringkasan Eksekutif:</strong>
              <p>{reportData.ai_analysis.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Best Performance */}
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80 space-y-1.5">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Area Performa Terbaik
                </span>
                <p className="text-slate-600 leading-relaxed">{reportData.ai_analysis.best_performance}</p>
              </div>

              {/* Weakest Area */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-1.5">
                <span className="font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Area yang Perlu Ditingkatkan
                </span>
                <p className="text-slate-600 leading-relaxed">{reportData.ai_analysis.weakest_area}</p>
              </div>
            </div>

            {/* Recurring Problems */}
            {reportData.ai_analysis.recurring_problems && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <strong className="text-slate-800 block font-semibold">Pola Kendala / Pola Penundaan:</strong>
                <p className="text-slate-600 leading-relaxed">{reportData.ai_analysis.recurring_problems}</p>
              </div>
            )}

            {/* AI Recommendations */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
              <strong className="text-indigo-300 block font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Rekomendasi Strategis AI untuk Periode Berikutnya:
              </strong>
              <p className="text-slate-200 leading-relaxed">{reportData.ai_analysis.recommendations}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
