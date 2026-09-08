import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { TimeLog } from '../types';

interface TimerContextType {
  activeTimer: TimeLog | null;
  elapsedSeconds: number;
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
  refreshTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTimer, setActiveTimer] = useState<TimeLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const refreshTimer = async () => {
    try {
      const res = await api.getActiveTimer();
      setActiveTimer(res.activeTimer);
      if (res.activeTimer?.started_at) {
        const start = new Date(res.activeTimer.started_at).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      } else {
        setElapsedSeconds(0);
      }
    } catch {
      setActiveTimer(null);
      setElapsedSeconds(0);
    }
  };

  useEffect(() => {
    refreshTimer();
  }, []);

  // Tick timer every second when active
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      if (activeTimer?.started_at) {
        const start = new Date(activeTimer.started_at).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = async (taskId: string) => {
    const res = await api.startTimer(taskId);
    setActiveTimer(res.activeTimer);
    setElapsedSeconds(0);
  };

  const stopTimer = async (taskId: string) => {
    await api.stopTimer(taskId);
    setActiveTimer(null);
    setElapsedSeconds(0);
  };

  return (
    <TimerContext.Provider value={{ activeTimer, elapsedSeconds, startTimer, stopTimer, refreshTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer must be used within a TimerProvider');
  return context;
};
