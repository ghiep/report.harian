import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  CheckCircle2,
  Calendar,
  Clock,
  Tag as TagIcon,
  AlertTriangle,
  Folder,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  ArrowRight,
  History,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { Task, TaskStatus } from '../types';
import { useTimer } from '../context/TimerContext';

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEditTask: (task: Task) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  onClose,
  onTaskUpdated,
  onEditTask,
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const { activeTimer, startTimer, stopTimer } = useTimer();

  useEffect(() => {
    if (taskId) {
      loadTaskDetails(taskId);
    } else {
      setTask(null);
    }
  }, [taskId]);

  const loadTaskDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getTask(id);
      setTask(res.task);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!taskId) return null;

  const isTimerRunning = activeTimer?.task_id === task?.id;

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean | number) => {
    try {
      await api.updateSubtask(subtaskId, { is_completed: !currentStatus });
      if (task) {
        setTask({
          ...task,
          subtasks: task.subtasks?.map((st) =>
            st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st
          ),
        });
      }
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;
    try {
      const res = await api.createSubtask(task.id, newSubtaskTitle.trim());
      setTask({
        ...task,
        subtasks: [...(task.subtasks || []), res.subtask],
      });
      setNewSubtaskTitle('');
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      if (newStatus === 'completed') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        await api.completeTask(task.id);
      } else {
        await api.updateTask(task.id, { status: newStatus });
      }
      loadTaskDetails(task.id);
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostpone = async () => {
    if (!task) return;
    try {
      await api.postponeTask(task.id);
      loadTaskDetails(task.id);
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm(`Hapus pekerjaan "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      onTaskUpdated();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-700">🔴 Critical</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800">🟠 Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-yellow-100 text-yellow-800">🟡 High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-sky-100 text-sky-800">🔵 Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">⚪ Low</span>;
    }
  };

  const getRecommendationBadge = (type?: string) => {
    switch (type) {
      case 'do_now':
        return <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-rose-500 text-white tracking-wide">DO NOW</span>;
      case 'do_next':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500 text-white">DO NEXT</span>;
      case 'schedule':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-500 text-white">SCHEDULE</span>;
      case 'do_later':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-500 text-white">DO LATER</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-200 text-slate-700">OPTIONAL</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detail Pekerjaan</span>
            {task && getPriorityBadge(task.priority)}
          </div>
          <div className="flex items-center gap-1.5">
            {task && (
              <>
                <button
                  onClick={() => {
                    onEditTask(task);
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
                  title="Edit Pekerjaan"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Hapus Pekerjaan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        {loading || !task ? (
          <div className="flex-1 p-8 flex items-center justify-center text-slate-400 text-sm">
            Memuat data pekerjaan...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {task.title}
              </h2>
              {task.description && (
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            {/* Quick Status Pill Selector */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Status Pekerjaan
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                {(['backlog', 'todo', 'in_progress', 'completed', 'postponed', 'cancelled'] as TaskStatus[]).map(
                  (st) => {
                    const active = task.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-2 py-1.5 rounded-lg font-medium text-center capitalize transition ${
                          active
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* AI Priority & Recommendation Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-white rounded-xl border border-indigo-100 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    AI Priority Engine
                  </span>
                </div>
                {getRecommendationBadge(task.recommendation_type)}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">Skor Prioritas:</span>
                <span className="font-extrabold text-indigo-700 text-base">{task.ai_priority_score} / 100</span>
              </div>
              <div className="w-full bg-indigo-100/70 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, task.ai_priority_score)}%` }}
                />
              </div>

              {task.recommendation_reason && (
                <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 leading-relaxed">
                  <strong className="text-indigo-900 block mb-0.5">Analisis:</strong>
                  {task.recommendation_reason}
                </p>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Project */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-medium">Project</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                  <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {task.project_name || 'Tanpa Project'}
                </span>
              </div>

              {/* Category */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-medium">Kategori</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                  <TagIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  {task.category_name || 'Tanpa Kategori'}
                </span>
              </div>

              {/* Deadline */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-medium">Deadline</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {task.deadline || 'Tidak ada'}
                </span>
              </div>

              {/* Scheduled Date */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-medium">Jadwal Dikerjakan</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  {task.scheduled_date || 'Belum dijadwalkan'}
                </span>
              </div>
            </div>

            {/* Time Tracking Comparison */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Waktu Pengerjaan</span>
                <span className="font-mono text-slate-600">
                  {task.actual_minutes}m / {task.estimated_minutes}m
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    task.actual_minutes > task.estimated_minutes ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (task.actual_minutes / (task.estimated_minutes || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Aktual: {Math.round((task.actual_minutes / 60) * 10) / 10} jam</span>
                <span>Estimasi: {Math.round((task.estimated_minutes / 60) * 10) / 10} jam</span>
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subtasks ({task.subtasks?.filter((s) => s.is_completed).length || 0}/
                  {task.subtasks?.length || 0})
                </h3>
              </div>

              <div className="space-y-1.5 mb-3">
                {task.subtasks && task.subtasks.length > 0 ? (
                  task.subtasks.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={!!st.is_completed}
                        onChange={() => handleToggleSubtask(st.id, st.is_completed)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span
                        className={`flex-1 ${
                          st.is_completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">Belum ada subtask.</p>
                )}
              </div>

              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="+ Tambah subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Tambah
                </button>
              </form>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tg) => (
                    <span
                      key={tg.id}
                      className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                    >
                      #{tg.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Catatan
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {task.notes}
                </div>
              </div>
            )}

            {/* Time Logs History */}
            {task.time_logs && task.time_logs.length > 0 && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Riwayat Waktu Pengerjaan
                </span>
                <div className="space-y-1.5">
                  {task.time_logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 font-mono"
                    >
                      <span>{new Date(log.started_at).toLocaleString('id-ID')}</span>
                      <span className="font-bold text-indigo-600">{log.duration_minutes || 0} menit</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer Actions */}
        {task && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isTimerRunning ? (
                <button
                  onClick={() => stopTimer(task.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop Timer</span>
                </button>
              ) : (
                <button
                  onClick={() => startTimer(task.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Timer</span>
                </button>
              )}

              <button
                onClick={handlePostpone}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                title="Tunda pekerjaan ini ke hari esok"
              >
                Tunda (Postpone)
              </button>
            </div>

            {task.status !== 'completed' ? (
              <button
                onClick={() => handleStatusChange('completed')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                Telah Selesai
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
