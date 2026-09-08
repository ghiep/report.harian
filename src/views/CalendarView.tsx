import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api';
import { Task } from '../types';

interface CalendarViewProps {
  onOpenAddTask: (date?: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onOpenAddTask, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks();
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar month days math
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${m.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    days.push({ dateStr, dayNum, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    days.push({ dateStr, dayNum: i, isCurrentMonth: true });
  }

  // Next month padding to fill full 35 or 42 grid
  const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${m.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    days.push({ dateStr, dayNum: i, isCurrentMonth: false });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            <span>Kalender Jadwal & Deadline</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor distribusi beban kerja dan tenggat waktu per hari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition"
          >
            Hari Ini
          </button>

          <button
            onClick={() => onOpenAddTask()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Task</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-3">
          <span>Minggu</span>
          <span>Senin</span>
          <span>Selasa</span>
          <span>Rabu</span>
          <span>Kamis</span>
          <span>Jumat</span>
          <span>Sabtu</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map((d, index) => {
            const isToday = d.dateStr === todayStr;
            const dayTasks = tasks.filter(
              (t) => t.scheduled_date === d.dateStr || t.deadline === d.dateStr
            );

            return (
              <div
                key={index}
                className={`min-h-[105px] p-2 flex flex-col justify-between transition group hover:bg-slate-50/80 ${
                  !d.isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white text-slate-800'
                } ${isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : d.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    {d.dayNum}
                  </span>

                  {d.isCurrentMonth && (
                    <button
                      onClick={() => onOpenAddTask(d.dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition text-[11px]"
                      title="Tambah pekerjaan di tanggal ini"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Day Tasks Chips */}
                <div className="space-y-1 my-1 overflow-y-auto max-h-[70px]">
                  {dayTasks.map((t) => {
                    const isDone = t.status === 'completed';
                    const isOverdue = !isDone && t.deadline === d.dateStr && d.dateStr < todayStr;

                    return (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(t.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition flex items-center gap-1 ${
                          isDone
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-700 font-semibold'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                        title={t.title}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-right text-slate-400 font-mono">
                  {dayTasks.length > 0 && `${dayTasks.length} task`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
