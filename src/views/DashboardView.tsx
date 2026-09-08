import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Play,
  Square,
  Plus,
  TrendingUp,
  Folder,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DashboardData, Task } from '../types';
import { useTimer } from '../context/TimerContext';
import { api } from '../api';

interface DashboardViewProps {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddTask: () => void;
  onSelectTask: (taskId: string) => void;
  onRunAIPrioritize: () => void;
  isAnalyzing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  loading,
  onRefresh,
  onOpenAddTask,
  onSelectTask,
  onRunAIPrioritize,
  isAnalyzing,
}) => {
  const { activeTimer, startTimer, stopTimer } = useTimer();

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh] text-slate-400 text-sm">
        Memuat dashboard produktivitas...
      </div>
    );
  }

  const kpis = data?.kpis || {
    today_tasks: 0,
    completed: 0,
    urgent: 0,
    overdue: 0,
    completion_rate: 0,
    productivity_score: 0,
    total_working_minutes: 0,
    total_working_hours: 0,
  };

  const focusTasks = data?.focus_today || [];
  const insights = data?.insights || [];
  const hasTasks = data?.has_tasks ?? false;

  const handleQuickComplete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
      await api.completeTask(taskId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickPostpone = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await api.postponeTask(taskId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-700">CRITICAL</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-yellow-100 text-yellow-800">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700">LOW</span>;
    }
  };

  const getRecommendationBadge = (type?: string) => {
    switch (type) {
      case 'do_now':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-600 text-white tracking-wider animate-pulse">DO NOW</span>;
      case 'do_next':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-white">DO NEXT</span>;
      case 'schedule':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-600 text-white">SCHEDULE</span>;
      case 'do_later':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-600 text-white">DO LATER</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-200 text-slate-700">OPTIONAL</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Question: "Apa yang harus saya kerjakan sekarang?" */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-2 border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Smart Productivity Directive</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Apa yang harus Anda kerjakan sekarang?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Sistem memprioritaskan pekerjaan Anda menggunakan algoritma AI terbobot
              (Urgency, Importance, Impact, Effort, & Dependency).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRunAIPrioritize}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Menganalisis...' : 'Re-analisis AI'}</span>
            </button>
            <button
              onClick={onOpenAddTask}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (7 Key Metrics from Section I) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Today's Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Hari Ini
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{kpis.today_tasks}</span>
            <span className="text-[11px] text-slate-400 font-medium">Task</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 truncate">
            <span>Terjadwal hari ini</span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
            Selesai
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{kpis.completed}</span>
            <span className="text-[11px] text-emerald-700 font-medium">Task</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Tuntas hari ini</span>
          </div>
        </div>

        {/* Urgent */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
            Mendesak
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{kpis.urgent}</span>
            <span className="text-[11px] text-amber-700 font-medium">Urgent</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            <span>Perlu perhatian</span>
          </div>
        </div>

        {/* Overdue */}
        <div className={`p-4 rounded-2xl border shadow-xs transition ${
          kpis.overdue > 0 ? 'bg-rose-50/50 border-rose-200 text-rose-900' : 'bg-white border-slate-200/80'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
            kpis.overdue > 0 ? 'text-rose-600' : 'text-slate-400'
          }`}>
            Overdue
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black ${kpis.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.overdue}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Terlewat</span>
          </div>
          <div className={`mt-2 text-[11px] flex items-center gap-1 ${
            kpis.overdue > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            <span>{kpis.overdue > 0 ? 'Tenggat terlewati' : 'Aman terkendali'}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tingkat Selesai
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">{kpis.completion_rate}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${kpis.completion_rate}%` }}
            />
          </div>
        </div>

        {/* Productivity Score */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
            Productivity Score
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-900">{kpis.productivity_score}</span>
            <span className="text-[11px] text-indigo-600 font-bold">/ 100</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-700 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span>Formula terbobot</span>
          </div>
        </div>

        {/* Total Working Time */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Waktu Kerja
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{kpis.total_working_hours}</span>
            <span className="text-[11px] text-slate-500 font-medium">Jam</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{kpis.total_working_minutes} menit fokus</span>
          </div>
        </div>
      </div>

      {/* AI Work Insights Alert Banners */}
      {insights.length > 0 && (
        <div className="space-y-2.5">
          {insights.map((ins, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                ins.type === 'warning'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : ins.type === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
              }`}
            >
              <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${
                ins.type === 'warning' ? 'text-amber-600' : ins.type === 'success' ? 'text-emerald-600' : 'text-indigo-600'
              }`} />
              <div className="flex-1 text-xs">
                <p className="font-bold">{ins.title}</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Focus Today Section (Section J) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Focus Today</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                {focusTasks.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Urutan pekerjaan diprioritaskan berdasarkan skor AI & urgensi deadline
            </p>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Klik task untuk melihat subtask & riwayat waktu
          </div>
        </div>

        {!hasTasks ? (
          /* Empty State strictly following user constraint: no dummy data! */
          <div className="p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Belum ada pekerjaan tersimpan</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Mulai dengan mencatat pekerjaan harian Anda. Sistem AI akan langsung mengkalkulasi bobot
                prioritas dan menyusun rekomendasi kerja optimal untuk Anda.
              </p>
            </div>
            <button
              onClick={onOpenAddTask}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pekerjaan Pertama</span>
            </button>
          </div>
        ) : focusTasks.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            🎉 Tidak ada pekerjaan pending untuk hari ini! Semua telah tuntas atau terjadwal di hari lain.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {focusTasks.map((task) => {
              const isTimerRunning = activeTimer?.task_id === task.id;
              const isOverdue = task.deadline && task.deadline < new Date().toISOString().split('T')[0];

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={`p-4 sm:p-5 hover:bg-slate-50/80 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isTimerRunning ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  {/* Left: Checkbox, Title, Badges, Reason */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleQuickComplete(e, task.id)}
                      className="mt-0.5 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-indigo-600 hover:bg-indigo-50 flex items-center justify-center text-transparent hover:text-indigo-600 transition shrink-0"
                      title="Tandai Selesai"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {task.title}
                        </h4>
                        {getRecommendationBadge(task.recommendation_type)}
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* AI Reason Preview */}
                      {task.recommendation_reason && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          💡 <span className="text-slate-700 font-medium">{task.recommendation_reason}</span>
                        </p>
                      )}

                      {/* Project, Category, Time, Deadline metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        {task.project_name && (
                          <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Folder className="w-3 h-3 text-indigo-500" />
                            {task.project_name}
                          </span>
                        )}

                        {task.deadline && (
                          <span className={`flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {isOverdue ? `Overdue (${task.deadline})` : `Deadline: ${task.deadline}`}
                          </span>
                        )}

                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.actual_minutes}m / {task.estimated_minutes}m
                        </span>

                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="text-slate-400">
                            Subtasks: {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: AI Score Gauge & Action buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* AI Score Badge */}
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">AI Score</div>
                      <div className="text-base font-black text-indigo-700 font-mono">
                        {task.ai_priority_score}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {isTimerRunning ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTimer(task.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
                          title="Hentikan Sesi Timer"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTimer(task.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
                          title="Mulai Timer Pengerjaan"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Timer</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleQuickPostpone(e, task.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        title="Tunda ke esok hari"
                      >
                        Tunda
                      </button>

                      <button
                        onClick={(e) => handleQuickComplete(e, task.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                        title="Selesaikan Task"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
