import { User, Project, Category, Tag, Task, Subtask, TimeLog, DailyReview, DashboardData } from './types';

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
    throw new Error(data?.error || `Terjadi kesalahan pada server (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{ user: User }>('/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string; resetAllowed: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  updateProfile: (profile: Partial<User>) =>
    request<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  // Projects
  getProjects: () =>
    request<{ projects: Project[] }>('/projects'),

  getProject: (id: string) =>
    request<{ project: Project }>('/projects/' + id),

  createProject: (project: Partial<Project>) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(project) }),

  updateProject: (id: string, project: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(project) }),

  deleteProject: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () =>
    request<{ categories: Category[] }>('/categories'),

  createCategory: (cat: { name: string; icon?: string; color?: string }) =>
    request<{ category: Category }>('/categories', { method: 'POST', body: JSON.stringify(cat) }),

  updateCategory: (id: string, cat: Partial<Category>) =>
    request<{ category: Category }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(cat) }),

  deleteCategory: (id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () =>
    request<{ tags: Tag[] }>('/tags'),

  createTag: (name: string) =>
    request<{ tag: Tag }>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),

  deleteTag: (id: string) =>
    request<{ success: boolean }>(`/tags/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ tasks: Task[] }>('/tasks' + query);
  },

  getTask: (id: string) =>
    request<{ task: Task }>(`/tasks/${id}`),

  createTask: (task: any) =>
    request<{ task: Task; priorityInfo: any }>('/tasks', { method: 'POST', body: JSON.stringify(task) }),

  updateTask: (id: string, task: Partial<Task>) =>
    request<{ task: Task }>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),

  deleteTask: (id: string) =>
    request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  completeTask: (id: string) =>
    request<{ success: boolean }>(`/tasks/${id}/complete`, { method: 'POST' }),

  postponeTask: (id: string, newDate?: string) =>
    request<{ success: boolean; scheduled_date: string }>(`/tasks/${id}/postpone`, { method: 'POST', body: JSON.stringify({ newDate }) }),

  // Subtasks
  createSubtask: (taskId: string, title: string) =>
    request<{ subtask: Subtask }>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),

  updateSubtask: (subtaskId: string, data: { is_completed?: boolean; title?: string }) =>
    request<{ subtask: Subtask }>(`/subtasks/${subtaskId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSubtask: (subtaskId: string) =>
    request<{ success: boolean }>(`/subtasks/${subtaskId}`, { method: 'DELETE' }),

  // Time Tracker
  getActiveTimer: () =>
    request<{ activeTimer: TimeLog | null }>('/timer/active'),

  startTimer: (taskId: string) =>
    request<{ activeTimer: TimeLog }>(`/tasks/${taskId}/timer/start`, { method: 'POST' }),

  stopTimer: (taskId: string) =>
    request<{ success: boolean; duration_minutes: number; task: Task }>(`/tasks/${taskId}/timer/stop`, { method: 'POST' }),

  // AI
  analyzeTasks: () =>
    request<{
      prioritized_tasks: { task_id: string; recommendation: string; score: number; reason: string; suggested_time: string }[];
      workload_warning: string;
      general_advice: string;
    }>('/ai/analyze-tasks', { method: 'POST' }),

  askAssistant: (message: string, history: { role: 'user' | 'assistant'; text: string }[]) =>
    request<{ reply: string }>('/ai/assistant', { method: 'POST', body: JSON.stringify({ message, history }) }),

  // Dashboard & Analytics
  getDashboard: () =>
    request<DashboardData>('/dashboard'),

  getAnalytics: () =>
    request<any>('/analytics'),

  // Daily Review & Reports
  getDailyReviews: () =>
    request<{ reviews: DailyReview[] }>('/daily-reviews'),

  generateDailyReview: (data: {
    date?: string;
    accomplished?: string;
    unfinished?: string;
    blocker?: string;
    tomorrowPriority?: string;
    notes?: string;
  }) =>
    request<{ review: DailyReview }>('/daily-reviews/generate', { method: 'POST', body: JSON.stringify(data) }),

  getReports: (params?: { type?: 'weekly' | 'monthly'; project_id?: string; category_id?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any>('/reports' + query);
  },
};
