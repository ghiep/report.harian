import { User, Project, Category, Tag, Task, Subtask, TimeLog, DailyReview, DashboardData } from './types';
import { localStore } from './localStore';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('workflow_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('workflow_token', token);
  } else {
    localStorage.removeItem('workflow_token');
  }
}

// Low-level fetch
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = {};
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server status ${res.status}`);
    }
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Server status ${res.status}`);
  }
  return data as T;
}

// Resilient wrapper: calls server first, falls back instantly to localStore on 404 or connection failure
async function resilient<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  try {
    return await request<T>(endpoint, options);
  } catch (err: any) {
    const msg = String(err?.message || '');
    // If server returned 404 (e.g. static hosting on Vercel) or failed to fetch
    if (
      msg.includes('404') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed')
    ) {
      return await fallbackFn();
    }
    // Also fall back gracefully for unexpected server errors so the app never blocks the user
    console.warn(`[WorkFlow AI] API ${endpoint} error: ${msg}. Menggunakan penyimpanan lokal.`);
    return await fallbackFn();
  }
}

export const api = {
  // Auth & Profile
  register: (body: { name: string; email: string; password: string }) =>
    resilient(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(body) },
      () => ({
        token: 'local_token',
        user: localStore.updateUser({ name: body.name, email: body.email }),
      })
    ),

  login: (body: { email: string; password: string }) =>
    resilient(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(body) },
      () => ({
        token: 'local_token',
        user: localStore.getUser(),
      })
    ),

  logout: () =>
    resilient('/auth/logout', { method: 'POST' }, () => ({ success: true })),

  getMe: () =>
    resilient('/auth/me', {}, () => ({ user: localStore.getUser() })),

  forgotPassword: (email: string) =>
    resilient(
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      () => ({ message: 'Instruksi reset terkirim', resetAllowed: true })
    ),

  updateProfile: (profile: Partial<User>) =>
    resilient(
      '/auth/profile',
      { method: 'PUT', body: JSON.stringify(profile) },
      () => ({ user: localStore.updateUser(profile) })
    ),

  // Projects
  getProjects: () =>
    resilient('/projects', {}, () => ({ projects: localStore.getProjects() })),

  getProject: (id: string) =>
    resilient('/projects/' + id, {}, () => {
      const proj = localStore.getProject(id);
      if (!proj) throw new Error('Project tidak ditemukan');
      return { project: proj };
    }),

  createProject: (project: Partial<Project>) =>
    resilient(
      '/projects',
      { method: 'POST', body: JSON.stringify(project) },
      () => ({ project: localStore.createProject(project) })
    ),

  updateProject: (id: string, project: Partial<Project>) =>
    resilient(
      `/projects/${id}`,
      { method: 'PUT', body: JSON.stringify(project) },
      () => {
        const updated = localStore.updateProject(id, project);
        if (!updated) throw new Error('Project tidak ditemukan');
        return { project: updated };
      }
    ),

  deleteProject: (id: string) =>
    resilient(
      `/projects/${id}`,
      { method: 'DELETE' },
      () => ({ success: localStore.deleteProject(id) })
    ),

  // Categories
  getCategories: () =>
    resilient('/categories', {}, () => ({ categories: localStore.getCategories() })),

  createCategory: (cat: { name: string; icon?: string; color?: string }) =>
    resilient(
      '/categories',
      { method: 'POST', body: JSON.stringify(cat) },
      () => ({ category: localStore.createCategory(cat) })
    ),

  updateCategory: (id: string, cat: Partial<Category>) =>
    resilient(
      `/categories/${id}`,
      { method: 'PUT', body: JSON.stringify(cat) },
      () => ({ category: { ...localStore.getCategories()[0], ...cat, id } })
    ),

  deleteCategory: (id: string) =>
    resilient(
      `/categories/${id}`,
      { method: 'DELETE' },
      () => ({ success: localStore.deleteCategory(id) })
    ),

  // Tags
  getTags: () =>
    resilient('/tags', {}, () => ({ tags: localStore.getTags() })),

  createTag: (name: string) =>
    resilient(
      '/tags',
      { method: 'POST', body: JSON.stringify({ name }) },
      () => ({ tag: localStore.createTag(name) })
    ),

  deleteTag: (id: string) =>
    resilient(
      `/tags/${id}`,
      { method: 'DELETE' },
      () => ({ success: localStore.deleteTag(id) })
    ),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return resilient('/tasks' + query, {}, () => localStore.getTasks(params));
  },

  getTask: (id: string) =>
    resilient('/tasks/' + id, {}, () => {
      const task = localStore.getTask(id);
      if (!task) throw new Error('Task tidak ditemukan');
      return { task };
    }),

  createTask: (task: any) =>
    resilient(
      '/tasks',
      { method: 'POST', body: JSON.stringify(task) },
      () => localStore.createTask(task)
    ),

  updateTask: (id: string, task: Partial<Task>) =>
    resilient(
      `/tasks/${id}`,
      { method: 'PUT', body: JSON.stringify(task) },
      () => {
        const updated = localStore.updateTask(id, task);
        if (!updated) throw new Error('Task tidak ditemukan');
        return { task: updated };
      }
    ),

  deleteTask: (id: string) =>
    resilient(
      `/tasks/${id}`,
      { method: 'DELETE' },
      () => ({ success: localStore.deleteTask(id) })
    ),

  completeTask: (id: string) =>
    resilient(
      `/tasks/${id}/complete`,
      { method: 'POST' },
      () => ({ success: localStore.completeTask(id) })
    ),

  postponeTask: (id: string, newDate?: string) =>
    resilient(
      `/tasks/${id}/postpone`,
      { method: 'POST', body: JSON.stringify({ newDate }) },
      () => localStore.postponeTask(id, newDate)
    ),

  // Subtasks
  createSubtask: (taskId: string, title: string) =>
    resilient(
      `/tasks/${taskId}/subtasks`,
      { method: 'POST', body: JSON.stringify({ title }) },
      () => ({ subtask: localStore.createSubtask(taskId, title) })
    ),

  updateSubtask: (subtaskId: string, data: { is_completed?: boolean; title?: string }) =>
    resilient(
      `/subtasks/${subtaskId}`,
      { method: 'PUT', body: JSON.stringify(data) },
      () => {
        const updated = localStore.updateSubtask(subtaskId, data);
        if (!updated) throw new Error('Subtask tidak ditemukan');
        return { subtask: updated };
      }
    ),

  deleteSubtask: (subtaskId: string) =>
    resilient(
      `/subtasks/${subtaskId}`,
      { method: 'DELETE' },
      () => ({ success: localStore.deleteSubtask(subtaskId) })
    ),

  // Time Tracker
  getActiveTimer: () =>
    resilient('/timer/active', {}, () => ({ activeTimer: localStore.getActiveTimer() })),

  startTimer: (taskId: string) =>
    resilient(
      `/tasks/${taskId}/timer/start`,
      { method: 'POST' },
      () => ({ activeTimer: localStore.startTimer(taskId) })
    ),

  stopTimer: (taskId: string) =>
    resilient(
      `/tasks/${taskId}/timer/stop`,
      { method: 'POST' },
      () => localStore.stopTimer(taskId)
    ),

  // AI Analysis
  analyzeTasks: () =>
    resilient(
      '/ai/analyze-tasks',
      { method: 'POST' },
      () => localStore.analyzeTasks()
    ),

  askAssistant: (message: string, history: { role: 'user' | 'assistant'; text: string }[]) =>
    resilient(
      '/ai/assistant',
      { method: 'POST', body: JSON.stringify({ message, history }) },
      () => localStore.askAssistant(message, history)
    ),

  // Dashboard & Analytics
  getDashboard: () =>
    resilient('/dashboard', {}, () => localStore.getDashboard()),

  getAnalytics: () =>
    resilient('/analytics', {}, () => localStore.getAnalytics()),

  // Daily Review & Reports
  getDailyReviews: () =>
    resilient('/daily-reviews', {}, () => localStore.getDailyReviews()),

  generateDailyReview: (data: {
    date?: string;
    accomplished?: string;
    unfinished?: string;
    blocker?: string;
    tomorrowPriority?: string;
    notes?: string;
  }) =>
    resilient(
      '/daily-reviews/generate',
      { method: 'POST', body: JSON.stringify(data) },
      () => ({ review: localStore.createDailyReview(data) })
    ),

  getReports: (params?: { type?: 'weekly' | 'monthly'; project_id?: string; category_id?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return resilient('/reports' + query, {}, () => localStore.getReports(params));
  },
};
