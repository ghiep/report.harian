import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import { Sidebar, NavRoute } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskModal } from './components/TaskModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { EndDayCheckInModal } from './components/EndDayCheckInModal';

// Views
import { DashboardView } from './views/DashboardView';
import { TodayView } from './views/TodayView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { ProjectsView } from './views/ProjectsView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView } from './views/ReportsView';
import { AIAssistantView } from './views/AIAssistantView';
import { SettingsView } from './views/SettingsView';

import { api } from './api';
import { DashboardData, Task } from './types';

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskDate, setDefaultTaskDate] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Dashboard Data & AI Status
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleRunAIPrioritize = async () => {
    setIsAnalyzing(true);
    try {
      await api.analyzeTasks();
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Gagal menjalankan analisis AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenAddTask = (date?: string) => {
    setEditingTask(null);
    setDefaultTaskDate(date);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAddTask={() => handleOpenAddTask()}
          onOpenCheckIn={() => setIsCheckInModalOpen(true)}
          onRunAIPrioritize={handleRunAIPrioritize}
          isAnalyzing={isAnalyzing}
        />

        {/* View Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentRoute === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              loading={loadingDashboard}
              onRefresh={loadDashboard}
              onOpenAddTask={() => handleOpenAddTask()}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onRunAIPrioritize={handleRunAIPrioritize}
              isAnalyzing={isAnalyzing}
            />
          )}

          {currentRoute === 'today' && (
            <TodayView
              onOpenAddTask={() => handleOpenAddTask()}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          )}

          {currentRoute === 'tasks' && (
            <TasksView
              onOpenAddTask={() => handleOpenAddTask()}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          )}

          {currentRoute === 'calendar' && (
            <CalendarView
              onOpenAddTask={(date) => handleOpenAddTask(date)}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          )}

          {currentRoute === 'projects' && (
            <ProjectsView
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          )}

          {currentRoute === 'analytics' && <AnalyticsView />}

          {currentRoute === 'reports' && (
            <ReportsView onOpenCheckIn={() => setIsCheckInModalOpen(true)} />
          )}

          {currentRoute === 'ai-assistant' && <AIAssistantView />}

          {currentRoute === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialTask={editingTask}
        defaultDate={defaultTaskDate}
        onTaskSaved={() => {
          loadDashboard();
        }}
      />

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {
          loadDashboard();
        }}
        onEditTask={handleEditTask}
      />

      <EndDayCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onReviewCreated={() => {
          loadDashboard();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <MainApp />
      </TimerProvider>
    </AuthProvider>
  );
}
