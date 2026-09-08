export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  timezone?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  work_days?: string;
  notifications_enabled?: boolean | number;
  created_at?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
export type TaskPriority = 'critical' | 'urgent' | 'high' | 'medium' | 'low';
export type RecommendationType = 'do_now' | 'do_next' | 'schedule' | 'delegate' | 'do_later' | 'optional';

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  priority: TaskPriority;
  start_date?: string | null;
  deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  task_count?: number;
  completed_tasks?: number;
  pending_tasks?: number;
  progress?: number;
  total_working_hours?: number;
  tasks?: Task[];
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon: string;
  color: string;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: number | boolean;
  created_at?: string;
  completed_at?: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  project_id?: string | null;
  category_id?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  ai_priority_score: number;
  scheduled_date?: string | null;
  deadline?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  completed_at?: string | null;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  project_name?: string;
  project_color?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  recommendation_type?: RecommendationType;
  recommendation_reason?: string;
  suggested_action?: string;
  subtasks?: Subtask[];
  tags?: Tag[];
  dependencies?: { id: string; depends_on_task_id: string; title: string; status: string }[];
  time_logs?: TimeLog[];
}

export interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number;
  created_at?: string;
  task_title?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
}

export interface DailyReview {
  id: string;
  user_id: string;
  date: string;
  planned_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  productivity_score: number;
  what_went_well: string;
  needs_attention: string;
  tomorrow_recommendation: string;
  ai_summary: string;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardData {
  kpis: {
    today_tasks: number;
    completed: number;
    urgent: number;
    overdue: number;
    completion_rate: number;
    productivity_score: number;
    total_working_minutes: number;
    total_working_hours: number;
  };
  focus_today: Task[];
  insights: {
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    actionText?: string;
  }[];
  has_tasks: boolean;
}
