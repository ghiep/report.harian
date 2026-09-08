import React, { useEffect, useState } from 'react';
import {
  Menu,
  Plus,
  Sparkles,
  Square,
  Clock,
  Calendar as CalendarIcon,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddTask: () => void;
  onOpenCheckIn: () => void;
  onRunAIPrioritize: () => void;
  isAnalyzing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddTask,
  onOpenCheckIn,
  onRunAIPrioritize,
  isAnalyzing = false,
}) => {
  const { user } = useAuth();
  const { activeTimer, elapsedSeconds, stopTimer } = useTimer();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-all">
      {/* Left: Mobile trigger & Greeting / Date */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Rekan Kerja'}</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-slate-600 font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live Timer Widget (if running) */}
      {activeTimer && (
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 shadow-sm animate-pulse">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <div className="text-xs max-w-[140px] sm:max-w-[200px] truncate font-medium text-slate-800">
            <span className="text-slate-400 mr-1 text-[10px] uppercase font-bold">Fokus:</span>
            {activeTimer.task_title || 'Pekerjaan Berjalan'}
          </div>
          <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
            {formatTimer(elapsedSeconds)}
          </span>
          <button
            onClick={() => stopTimer(activeTimer.task_id)}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 transition"
            title="Selesaikan Sesi Waktu"
          >
            <Square className="w-3 h-3 fill-rose-600" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* Right: Quick Action CTAs */}
      <div className="flex items-center gap-2.5 ml-auto">
        <button
          onClick={onOpenCheckIn}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200/70"
          title="Daily Check-in & Review Harian"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
          <span>Daily Review</span>
        </button>

        <button
          id="btn-ai-prioritize"
          onClick={onRunAIPrioritize}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition shadow-sm ${
            isAnalyzing
              ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 text-indigo-700 border border-indigo-200/90'
          }`}
          title="Analisis dan Prioritaskan Task Menggunakan AI"
        >
          <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Menganalisis...' : 'AI Prioritize'}</span>
        </button>

        <button
          id="btn-global-add-task"
          onClick={onOpenAddTask}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>
    </header>
  );
};
