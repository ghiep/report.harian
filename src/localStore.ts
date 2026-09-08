import {
  User,
  Project,
  Category,
  Tag,
  Task,
  Subtask,
  TimeLog,
  DailyReview,
  DashboardData,
  TaskPriority,
  TaskStatus,
} from './types';

const STORAGE_KEYS = {
  USER: 'workflow_local_user',
  PROJECTS: 'workflow_local_projects',
  CATEGORIES: 'workflow_local_categories',
  TAGS: 'workflow_local_tags',
  TASKS: 'workflow_local_tasks',
  SUBTASKS: 'workflow_local_subtasks',
  TIME_LOGS: 'workflow_local_time_logs',
  DAILY_REVIEWS: 'workflow_local_daily_reviews',
  ACTIVE_TIMER: 'workflow_local_active_timer',
};

// Helper: safe JSON parsing
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage error:', err);
  }
}

// Generate unique ID
function uid(): string {
  return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

// Deterministic 6-Factor AI Priority Formula
export function calculateLocalPriority(task: Partial<Task>): { score: number; rationale: string } {
  const today = new Date().toISOString().split('T')[0];
  let urgency = 40;
  let importance = 50;
  let projectImpact = 40;
  let effort = 50;
  let dependency = 50;
  let overdue = 0;

  // 1. Urgency (30%)
  if (task.deadline) {
    const daysLeft = Math.ceil(
      (new Date(task.deadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) {
      urgency = 100;
      overdue = 100;
    } else if (daysLeft === 0) {
      urgency = 95;
    } else if (daysLeft === 1) {
      urgency = 85;
    } else if (daysLeft <= 3) {
      urgency = 70;
    } else if (daysLeft <= 7) {
      urgency = 50;
    } else {
      urgency = 25;
    }
  }

  // 2. Importance (25%)
  switch (task.priority) {
    case 'critical':
      importance = 100;
      break;
    case 'urgent':
      importance = 85;
      break;
    case 'high':
      importance = 70;
      break;
    case 'medium':
      importance = 50;
      break;
    case 'low':
      importance = 25;
      break;
  }

  // 3. Project Impact (20%)
  if (task.project_id) {
    projectImpact = 75;
  }

  // 4. Effort (10%)
  const mins = task.estimated_minutes || 30;
  if (mins <= 20) {
    effort = 90; // quick win
  } else if (mins <= 60) {
    effort = 70;
  } else if (mins <= 120) {
    effort = 50;
  } else {
    effort = 30;
  }

  // Final Weighted Calculation
  const totalScore = Math.round(
    urgency * 0.3 +
      importance * 0.25 +
      projectImpact * 0.2 +
      effort * 0.1 +
      dependency * 0.1 +
      overdue * 0.05
  );

  let rationale = `Skor ${totalScore}: Prioritas ${task.priority || 'medium'}`;
  if (overdue > 0) rationale += ' (Melewati deadline)';
  else if (urgency >= 85) rationale += ' (Mendekati deadline hari ini/besok)';
  if (effort >= 80) rationale += ' • Quick win';

  return { score: Math.min(100, Math.max(0, totalScore)), rationale };
}

// Local Store Operations
export const localStore = {
  getUser(): User {
    return getStored<User>(STORAGE_KEYS.USER, {
      id: 'default_user',
      name: 'ghiepp',
      email: 'ghiep865@gmail.com',
      avatar_url: '',
      timezone: 'Asia/Jakarta (WIB)',
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      work_days: 'Senin - Jumat',
      notifications_enabled: true,
      created_at: new Date().toISOString(),
    });
  },

  updateUser(patch: Partial<User>): User {
    const current = this.getUser();
    const updated = { ...current, ...patch };
    setStored(STORAGE_KEYS.USER, updated);
    return updated;
  },

  // Projects
  getProjects(): Project[] {
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);

    return projects.map((p) => {
      const projTasks = tasks.filter((t) => t.project_id === p.id);
      const completed = projTasks.filter((t) => t.status === 'completed').length;
      const total = projTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const totalMinutes = projTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);
      return {
        ...p,
        task_count: total,
        completed_tasks: completed,
        pending_tasks: total - completed,
        progress,
        total_working_hours: Math.round((totalMinutes / 60) * 10) / 10,
      };
    });
  },

  getProject(id: string): Project | null {
    const projects = this.getProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) return null;
    const tasks = this.getTasks({ project_id: id }).tasks;
    return { ...project, tasks };
  },

  createProject(data: Partial<Project>): Project {
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const newProj: Project = {
      id: uid(),
      user_id: 'default_user',
      name: data.name || 'Untitled Project',
      description: data.description || '',
      color: data.color || '#4F46E5',
      priority: data.priority || 'medium',
      deadline: data.deadline || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_count: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      progress: 0,
      total_working_hours: 0,
    };
    projects.push(newProj);
    setStored(STORAGE_KEYS.PROJECTS, projects);
    return newProj;
  },

  updateProject(id: string, patch: Partial<Project>): Project | null {
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...patch, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.PROJECTS, projects);
    return projects[idx];
  },

  deleteProject(id: string): boolean {
    let projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    projects = projects.filter((p) => p.id !== id);
    setStored(STORAGE_KEYS.PROJECTS, projects);

    // Also remove or unlink tasks in this project
    let tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    tasks = tasks.filter((t) => t.project_id !== id);
    setStored(STORAGE_KEYS.TASKS, tasks);
    return true;
  },

  // Categories
  getCategories(): Category[] {
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, [
      { id: 'cat_work', user_id: 'default_user', name: 'Work', icon: 'Briefcase', color: '#4F46E5' },
      { id: 'cat_personal', user_id: 'default_user', name: 'Personal', icon: 'User', color: '#10B981' },
      { id: 'cat_dev', user_id: 'default_user', name: 'Development', icon: 'Code', color: '#F59E0B' },
    ]);
  },

  createCategory(data: { name: string; icon?: string; color?: string }): Category {
    const cats = this.getCategories();
    const newCat: Category = {
      id: uid(),
      user_id: 'default_user',
      name: data.name,
      icon: data.icon || 'Folder',
      color: data.color || '#4F46E5',
    };
    cats.push(newCat);
    setStored(STORAGE_KEYS.CATEGORIES, cats);
    return newCat;
  },

  deleteCategory(id: string): boolean {
    let cats = this.getCategories();
    cats = cats.filter((c) => c.id !== id);
    setStored(STORAGE_KEYS.CATEGORIES, cats);
    return true;
  },

  // Tags
  getTags(): Tag[] {
    return getStored<Tag[]>(STORAGE_KEYS.TAGS, []);
  },

  createTag(name: string): Tag {
    const tags = this.getTags();
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const newTag: Tag = { id: uid(), name };
    tags.push(newTag);
    setStored(STORAGE_KEYS.TAGS, tags);
    return newTag;
  },

  deleteTag(id: string): boolean {
    let tags = this.getTags();
    tags = tags.filter((t) => t.id !== id);
    setStored(STORAGE_KEYS.TAGS, tags);
    return true;
  },

  // Tasks
  getTasks(params?: Record<string, string>): { tasks: Task[] } {
    let tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const projects = this.getProjects();
    const categories = this.getCategories();
    const subtasks = getStored<Subtask[]>(STORAGE_KEYS.SUBTASKS, []);

    // Enrich tasks
    tasks = tasks.map((t) => {
      const p = projects.find((proj) => proj.id === t.project_id);
      const c = categories.find((cat) => cat.id === t.category_id);
      const subs = subtasks.filter((s) => s.task_id === t.id);
      return {
        ...t,
        project_name: p ? p.name : undefined,
        project_color: p ? p.color : undefined,
        category_name: c ? c.name : undefined,
        category_color: c ? c.color : undefined,
        subtasks: subs,
      };
    });

    if (params) {
      if (params.project_id && params.project_id !== 'all') {
        tasks = tasks.filter((t) => t.project_id === params.project_id);
      }
      if (params.category_id && params.category_id !== 'all') {
        tasks = tasks.filter((t) => t.category_id === params.category_id);
      }
      if (params.status && params.status !== 'all') {
        tasks = tasks.filter((t) => t.status === params.status);
      }
      if (params.priority && params.priority !== 'all') {
        tasks = tasks.filter((t) => t.priority === params.priority);
      }
      if (params.date) {
        tasks = tasks.filter((t) => t.scheduled_date === params.date || t.deadline === params.date);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
      }
    }

    // Default sorting: AI priority score desc
    tasks.sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0));

    return { tasks };
  },

  getTask(id: string): Task | null {
    const { tasks } = this.getTasks();
    return tasks.find((t) => t.id === id) || null;
  },

  createTask(data: any): { task: Task; priorityInfo: any } {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const { score, rationale } = calculateLocalPriority(data);

    const newTask: Task = {
      id: uid(),
      user_id: 'default_user',
      project_id: data.project_id || null,
      category_id: data.category_id || null,
      title: data.title || 'Pekerjaan Baru',
      description: data.description || '',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      deadline: data.deadline || null,
      scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      estimated_minutes: Number(data.estimated_minutes) || 30,
      actual_minutes: 0,
      ai_priority_score: score,
      recommendation_reason: rationale,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    tasks.push(newTask);
    setStored(STORAGE_KEYS.TASKS, tasks);

    return {
      task: newTask,
      priorityInfo: { score, rationale },
    };
  },

  updateTask(id: string, patch: Partial<Task>): Task | null {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const merged = { ...tasks[idx], ...patch, updated_at: new Date().toISOString() };
    const { score, rationale } = calculateLocalPriority(merged);
    merged.ai_priority_score = score;
    merged.recommendation_reason = rationale;

    tasks[idx] = merged;
    setStored(STORAGE_KEYS.TASKS, tasks);
    return merged;
  },

  deleteTask(id: string): boolean {
    let tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    tasks = tasks.filter((t) => t.id !== id);
    setStored(STORAGE_KEYS.TASKS, tasks);

    let subtasks = getStored<Subtask[]>(STORAGE_KEYS.SUBTASKS, []);
    subtasks = subtasks.filter((s) => s.task_id !== id);
    setStored(STORAGE_KEYS.SUBTASKS, subtasks);
    return true;
  },

  completeTask(id: string): boolean {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    tasks[idx].status = 'completed';
    tasks[idx].completed_at = new Date().toISOString();
    tasks[idx].updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.TASKS, tasks);
    return true;
  },

  postponeTask(id: string, newDate?: string): { success: boolean; scheduled_date: string } {
    const targetDate =
      newDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    this.updateTask(id, { scheduled_date: targetDate, status: 'postponed' });
    return { success: true, scheduled_date: targetDate };
  },

  // Subtasks
  createSubtask(taskId: string, title: string): Subtask {
    const subtasks = getStored<Subtask[]>(STORAGE_KEYS.SUBTASKS, []);
    const newSub: Subtask = {
      id: uid(),
      task_id: taskId,
      title,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    subtasks.push(newSub);
    setStored(STORAGE_KEYS.SUBTASKS, subtasks);
    return newSub;
  },

  updateSubtask(subtaskId: string, data: { is_completed?: boolean; title?: string }): Subtask | null {
    const subtasks = getStored<Subtask[]>(STORAGE_KEYS.SUBTASKS, []);
    const idx = subtasks.findIndex((s) => s.id === subtaskId);
    if (idx === -1) return null;
    subtasks[idx] = { ...subtasks[idx], ...data };
    setStored(STORAGE_KEYS.SUBTASKS, subtasks);
    return subtasks[idx];
  },

  deleteSubtask(subtaskId: string): boolean {
    let subtasks = getStored<Subtask[]>(STORAGE_KEYS.SUBTASKS, []);
    subtasks = subtasks.filter((s) => s.id !== subtaskId);
    setStored(STORAGE_KEYS.SUBTASKS, subtasks);
    return true;
  },

  // Time Tracker
  getActiveTimer(): TimeLog | null {
    return getStored<TimeLog | null>(STORAGE_KEYS.ACTIVE_TIMER, null);
  },

  startTimer(taskId: string): TimeLog {
    const log: TimeLog = {
      id: uid(),
      task_id: taskId,
      user_id: 'default_user',
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_minutes: 0,
      created_at: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.ACTIVE_TIMER, log);

    // Also update task status to in_progress
    this.updateTask(taskId, { status: 'in_progress' });
    return log;
  },

  stopTimer(taskId: string): { success: boolean; duration_minutes: number; task: Task } {
    const active = this.getActiveTimer();
    let mins = 15;
    if (active && active.task_id === taskId) {
      const elapsedMs = Date.now() - new Date(active.started_at).getTime();
      mins = Math.max(1, Math.round(elapsedMs / 60000));
    }
    setStored(STORAGE_KEYS.ACTIVE_TIMER, null);

    const task = this.getTask(taskId);
    const updatedMins = (task?.actual_minutes || 0) + mins;
    const updatedTask = this.updateTask(taskId, { actual_minutes: updatedMins });

    return {
      success: true,
      duration_minutes: mins,
      task: updatedTask || (task as Task),
    };
  },

  // AI Task Prioritization
  analyzeTasks(): any {
    const { tasks } = this.getTasks();
    const pending = tasks.filter((t) => t.status !== 'completed');

    const prioritized = pending.map((t) => {
      const { score, rationale } = calculateLocalPriority(t);
      this.updateTask(t.id, { ai_priority_score: score, ai_recommendation: rationale });
      return {
        task_id: t.id,
        score,
        recommendation: rationale,
        reason: rationale,
        suggested_time: t.start_time || '09:00',
      };
    });

    return {
      prioritized_tasks: prioritized,
      workload_warning:
        pending.length > 7
          ? 'Perhatian: Terdapat lebih dari 7 task aktif hari ini. Disarankan mendelegasikan atau menjadwalkan ulang task berprioritas rendah.'
          : 'Beban kerja harian terkelola dengan baik dan seimbang.',
      general_advice:
        'Selesaikan task dengan skor AI tertinggi terlebih dahulu pada jam energi puncak Anda.',
    };
  },

  // Assistant Chat
  askAssistant(message: string, history: any[]): { reply: string } {
    const { tasks } = this.getTasks();
    const projects = this.getProjects();
    const pending = tasks.filter((t) => t.status !== 'completed');
    const completed = tasks.filter((t) => t.status === 'completed');

    const topTask = pending.sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0))[0];

    const reply = `Halo ghiepp! Berdasarkan data pekerjaan Anda saat ini:
• Anda memiliki **${pending.length} task aktif** dan telah menyelesaikan **${completed.length} task**.
• Total **${projects.length} project** sedang berjalan.
${topTask ? `\n🎯 **Rekomendasi Utama Sekarang:**\nFokuslah menyelesaikan task **"${topTask.title}"** (Skor AI: ${topTask.ai_priority_score}). Estimasi waktu pengerjaan: ${topTask.estimated_minutes} menit.` : '\n🎉 Semua pekerjaan telah tuntas! Anda dapat merencanakan target project berikutnya.'}

💡 *Saran Produktivitas*: Gunakan teknik time-blocking 25-50 menit untuk menjaga konsentrasi tinggi tanpa kelelahan.`;

    return { reply };
  },

  // Dashboard Data
  getDashboard(): DashboardData {
    const { tasks } = this.getTasks();
    const projects = this.getProjects();
    const today = new Date().toISOString().split('T')[0];

    const todayTasks = tasks.filter(
      (t) => t.scheduled_date === today || (t.deadline === today && t.status !== 'completed')
    );
    const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
    const completedAll = tasks.filter((t) => t.status === 'completed').length;

    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.deadline && t.deadline < today
    );

    const totalEstimated = todayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
    const totalActual = todayTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);

    const topPriority = tasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0))
      .slice(0, 5);

    // Productivity Score: 0-100
    let score = 75;
    if (tasks.length > 0) {
      const compRate = completedAll / tasks.length;
      score = Math.round(compRate * 40 + 50);
      if (overdueTasks.length > 0) score = Math.max(20, score - overdueTasks.length * 5);
      score = Math.min(100, score);
    }

    return {
      kpis: {
        today_tasks: todayTasks.length,
        completed: completedToday,
        urgent: todayTasks.filter((t) => t.priority === 'urgent' || t.priority === 'critical').length,
        overdue: overdueTasks.length,
        completion_rate:
          todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0,
        productivity_score: score,
        total_working_minutes: totalActual,
        total_working_hours: Math.round((totalActual / 60) * 10) / 10,
      },
      focus_today: topPriority,
      insights: [
        {
          type: overdueTasks.length > 0 ? 'warning' : 'success',
          title: overdueTasks.length > 0 ? 'Tugas Tertunda' : 'Fokus Optimal',
          message:
            overdueTasks.length > 0
              ? `Terdapat ${overdueTasks.length} task melewati deadline.`
              : 'Jadwal hari ini tertata dengan baik. Pertahankan fokus.',
        },
      ],
      has_tasks: tasks.length > 0,
    };
  },

  // Analytics Data
  getAnalytics(): any {
    const { tasks } = this.getTasks();
    const has_data = tasks.length > 0;

    const statusCounts: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      todo: 0,
      postponed: 0,
    };
    const priorityCounts: Record<string, number> = {
      critical: 0,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    tasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
      if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++;
    });

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);

    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const trend = days.map((day, i) => ({
      day,
      completed: Math.max(0, Math.round(completed / 7) + (i % 2 === 0 ? 1 : 0)),
    }));

    const hours = days.map((day, i) => ({
      day,
      hours: Math.round(((totalMinutes / 7 / 60) * (0.8 + i * 0.1)) * 10) / 10,
    }));

    return {
      has_data,
      kpis: {
        productivity_score: has_data ? 82 : 0,
        completion_rate: has_data ? Math.round((completed / tasks.length) * 100) : 0,
        total_tasks: tasks.length,
        completed_tasks: completed,
        total_working_hours: Math.round((totalMinutes / 60) * 10) / 10,
        average_daily_tasks: has_data ? Math.round((tasks.length / 7) * 10) / 10 : 0,
      },
      productivity_trend: trend,
      working_hours: hours,
      status_distribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      priority_distribution: Object.entries(priorityCounts).map(([priority, count]) => ({
        priority,
        count,
      })),
    };
  },

  // Daily Reviews
  getDailyReviews(): { reviews: DailyReview[] } {
    return { reviews: getStored<DailyReview[]>(STORAGE_KEYS.DAILY_REVIEWS, []) };
  },

  createDailyReview(data: any): DailyReview {
    const reviews = getStored<DailyReview[]>(STORAGE_KEYS.DAILY_REVIEWS, []);
    const { tasks } = this.getTasks();
    const today = data.date || new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter((t) => t.scheduled_date === today);
    const completed = todayTasks.filter((t) => t.status === 'completed').length;

    const newRev: DailyReview = {
      id: uid(),
      user_id: 'default_user',
      date: today,
      planned_tasks: todayTasks.length || 1,
      completed_tasks: completed,
      overdue_tasks: 0,
      completion_rate:
        todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 100,
      productivity_score: 85,
      what_went_well: data.accomplished || 'Pekerjaan inti berhasil diselesaikan dengan baik.',
      needs_attention: data.unfinished || 'Perhatikan alokasi waktu istirahat dan minimalkan distraksi.',
      tomorrow_recommendation: data.tomorrowPriority || 'Lanjutkan penyelesaian tugas dengan prioritas tinggi.',
      ai_summary:
        'Refleksi harian menunjukkan konsistensi kerja yang solid. Pertahankan ritme kerja terstruktur untuk hari esok.',
      created_at: new Date().toISOString(),
    };

    reviews.unshift(newRev);
    setStored(STORAGE_KEYS.DAILY_REVIEWS, reviews);
    return newRev;
  },

  // Reports
  getReports(params?: { type?: 'weekly' | 'monthly'; project_id?: string; category_id?: string }): any {
    const { tasks } = this.getTasks();
    const type = params?.type || 'weekly';
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);

    return {
      has_data: tasks.length > 0,
      periodLabel: type === 'weekly' ? '7 Hari Terakhir' : '30 Hari Terakhir',
      metrics: {
        total_tasks: tasks.length,
        completed_tasks: completed,
        completion_rate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        total_hours: Math.round((totalMinutes / 60) * 10) / 10,
        productivity_score: tasks.length > 0 ? 84 : 0,
      },
      ai_analysis: {
        summary: `Rekapitulasi ${type === 'weekly' ? 'mingguan' : 'bulanan'}: Terdata ${tasks.length} pekerjaan dengan ${completed} pekerjaan berhasil diselesaikan.`,
        best_performance: 'Ketepatan dalam menyelesaikan task prioritas tinggi dan pemanfaatan timer fokus.',
        weakest_area: 'Estimasi waktu beberapa pekerjaan yang melampaui target awal.',
        recurring_problems: 'Distraksi minor pada jam kerja siang hari.',
        recommendations: 'Gunakan interval kerja 45 menit dengan istirahat 10 menit untuk menjaga energi tetap prima.',
      },
    };
  },
};
