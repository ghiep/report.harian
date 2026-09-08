import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Play,
  Square,
  Clock,
  CheckCircle2,
  AlertCircle,
  Folder,
  Tag,
  Plus,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { Task, TaskPriority } from '../types';
import { useTimer } from '../context/TimerContext';

interface TodayViewProps {
  onOpenAddTask: () => void;
  onSelectTask: (taskId: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onOpenAddTask, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { activeTimer, startTimer, stopTimer } = useTimer();

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTodayTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks({ date: todayStr });
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayTasks();
  }, []);

  const handleComplete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      confetti({ particleCount: 50, spread: 60 });
      await api.completeTask(taskId);
      loadTodayTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const actualMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            <span>Today Focus & Time Blocking</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fokus menyelesaikan pekerjaan yang diagendakan untuk hari ini.
          </p>
        </div>

        <button
          onClick={onOpenAddTask}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Task Hari Ini</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Target Hari Ini</span>
          <p className="text-xl font-black text-slate-900 mt-1">{tasks.length} Pekerjaan</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Tuntas</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{completedCount} Selesai</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Estimasi Waktu</span>
          <p className="text-xl font-black text-slate-900 mt-1">{Math.round((totalMinutes / 60) * 10) / 10} Jam</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-600 uppercase">Waktu Aktual</span>
          <p className="text-xl font-black text-indigo-700 mt-1">{Math.round((actualMinutes / 60) * 10) / 10} Jam</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {['all', 'critical', 'urgent', 'high', 'medium', 'low'].map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
              priorityFilter === p
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {p === 'all' ? 'Semua Prioritas' : p}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat pekerjaan hari ini...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
          <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Tidak ada task untuk hari ini</h4>
          <p className="text-xs text-slate-500">
            Jadwalkan task untuk hari ini atau buat pekerjaan baru.
          </p>
          <button
            onClick={onOpenAddTask}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Jadwalkan Pekerjaan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isTimerRunning = activeTimer?.task_id === task.id;
            const isDone = task.status === 'completed';

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-slate-50/70 border-slate-200 opacity-70'
                    : isTimerRunning
                    ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-400/40'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={(e) => handleComplete(e, task.id)}
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
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {task.project_name && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Folder className="w-3 h-3 text-indigo-500" />
                          {task.project_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {task.actual_minutes}m / {task.estimated_minutes}m
                      </span>
                      {task.start_time && task.end_time && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                          {task.start_time} - {task.end_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
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
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
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
      )}
    </div>
  );
};
