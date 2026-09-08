import React, { useState, useEffect } from 'react';
import {
  List,
  Columns,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  Folder,
  Tag,
  CheckCircle2,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { Task, Project, Category, TaskStatus, TaskPriority } from '../types';
import { useTimer } from '../context/TimerContext';

interface TasksViewProps {
  onOpenAddTask: () => void;
  onSelectTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenAddTask, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'ai_score' | 'deadline' | 'priority' | 'created'>('ai_score');

  const { activeTimer, startTimer, stopTimer } = useTimer();

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskRes, projRes, catRes] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
        api.getCategories(),
      ]);
      setTasks(taskRes.tasks);
      setProjects(projRes.projects);
      setCategories(catRes.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      if (newStatus === 'completed') {
        confetti({ particleCount: 50, spread: 60 });
        await api.completeTask(taskId);
      } else {
        await api.updateTask(taskId, { status: newStatus });
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Sort
  const filteredTasks = tasks.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
    if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'ai_score') {
      return (b.ai_priority_score || 0) - (a.ai_priority_score || 0);
    }
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    }
    if (sortBy === 'created') {
      return b.created_at.localeCompare(a.created_at);
    }
    if (sortBy === 'priority') {
      const order: Record<TaskPriority, number> = {
        critical: 5,
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      return order[b.priority] - order[a.priority];
    }
    return 0;
  });

  const kanbanColumns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'backlog', label: 'Backlog', color: 'border-slate-300' },
    { id: 'todo', label: 'To Do', color: 'border-sky-400' },
    { id: 'in_progress', label: 'In Progress', color: 'border-indigo-500' },
    { id: 'postponed', label: 'Postponed', color: 'border-amber-400' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Manajemen Pekerjaan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar lengkap pekerjaan dengan filter, pengelompokan project, dan status Kanban
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={onOpenAddTask}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari pekerjaan, deskripsi, atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {/* Sort by */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ai_score">Skor AI (Tertinggi)</option>
                <option value="deadline">Deadline (Terdekat)</option>
                <option value="priority">Prioritas (Tertinggi)</option>
                <option value="created">Terbaru Dibuat</option>
              </select>
            </div>

            {/* Status Filter (if list view) */}
            {viewMode === 'list' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl shrink-0 capitalize"
              >
                <option value="all">Semua Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
                <option value="backlog">Backlog</option>
              </select>
            )}

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl shrink-0 capitalize"
            >
              <option value="all">Semua Prioritas</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl shrink-0"
            >
              <option value="all">Semua Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter */}
        <div className="text-[11px] text-slate-500 font-medium">
          Menampilkan <strong>{sortedTasks.length}</strong> pekerjaan
        </div>
      </div>

      {/* Main Content: List or Kanban */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar pekerjaan...</div>
      ) : sortedTasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
          <List className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Tidak ada pekerjaan ditemukan</h4>
          <p className="text-xs text-slate-500">
            {search || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Coba sesuaikan kata kunci pencarian atau filter yang dipilih.'
              : 'Mulai buat pekerjaan baru untuk mengelola tugas harian Anda.'}
          </p>
          <button
            onClick={onOpenAddTask}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Tambah Pekerjaan Baru
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {sortedTasks.map((task) => {
            const isDone = task.status === 'completed';
            const isTimerRunning = activeTimer?.task_id === task.id;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`p-4 hover:bg-slate-50/80 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isDone ? 'opacity-65 bg-slate-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(task.id, isDone ? 'todo' : 'completed');
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 hover:border-indigo-600'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {task.priority}
                      </span>
                      <span className="text-[10px] font-medium capitalize px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {task.project_name && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Folder className="w-3 h-3 text-indigo-500" />
                          {task.project_name}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {task.deadline}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {task.actual_minutes}m / {task.estimated_minutes}m
                      </span>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1">
                          {task.tags.map((tg) => (
                            <span key={tg.id} className="text-[10px] text-slate-400">
                              #{tg.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold text-slate-400">AI Score</div>
                    <div className="text-sm font-black text-indigo-700 font-mono">
                      {task.ai_priority_score}
                    </div>
                  </div>

                  {!isDone && (
                    <>
                      {isTimerRunning ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTimer(task.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
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
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Timer</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colTasks = sortedTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition shadow-xs hover:shadow-md cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {task.priority}
                        </span>
                        <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          {task.ai_priority_score} pts
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      {task.project_name && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                          <Folder className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{task.project_name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>{task.deadline || 'No deadline'}</span>
                        <span>{task.estimated_minutes}m</span>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs italic">
                      Kosong
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
