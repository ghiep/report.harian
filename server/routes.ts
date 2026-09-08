import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { getDb, queryAll, queryOne, execute } from './db.js';
import { calculateTaskPriority, calculateProductivityScore } from './priorityEngine.js';
import {
  analyzeTasksWithAI,
  generateDailyReviewWithAI,
  generateReportInsightWithAI,
  askAIAssistant,
} from './geminiService.js';

export const apiRouter = Router();

// In-memory token store for sessions: token -> userId
const sessions = new Map<string, string>();

export const DEFAULT_USER_ID = 'default_user';

export function ensureDefaultUser() {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [DEFAULT_USER_ID]);
    if (!existing) {
      const now = new Date().toISOString();
      execute(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [DEFAULT_USER_ID, 'ghiepp', 'ghiep865@gmail.com', 'no_password_required', now, now]
      );
    }
  } catch (err) {
    console.error('Error ensuring default user exists:', err);
  }
}

// Auth middleware (seamlessly defaults to default_user if not logged in)
function authenticate(req: Request, res: Response, next: () => void) {
  ensureDefaultUser();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token && sessions.has(token)) {
    (req as any).userId = sessions.get(token)!;
  } else {
    // Automatically use default_user so the app works without friction
    (req as any).userId = DEFAULT_USER_ID;
  }
  next();
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_workflow_salt').digest('hex');
}

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------
apiRouter.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }

  try {
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' });
    }

    const id = 'usr_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    execute(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), email.toLowerCase().trim(), passwordHash, now, now]
    );

    const token = 'tok_' + crypto.randomUUID();
    sessions.set(token, id);

    const user = queryOne('SELECT id, name, email, avatar_url, timezone, working_hours_start, working_hours_end, work_days FROM users WHERE id = ?', [id]);
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mendaftar pengguna.' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const hash = hashPassword(password);
    const user = queryOne(
      'SELECT id, name, email, avatar_url, timezone, working_hours_start, working_hours_end, work_days FROM users WHERE email = ? AND password_hash = ?',
      [email.toLowerCase().trim(), hash]
    );

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = 'tok_' + crypto.randomUUID();
    sessions.set(token, user.id);

    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal login.' });
  }
});

apiRouter.post('/auth/logout', authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);
  if (token) sessions.delete(token);
  res.json({ success: true });
});

apiRouter.get('/auth/me', authenticate, (req, res) => {
  const userId = (req as any).userId || DEFAULT_USER_ID;
  let user = queryOne(
    'SELECT id, name, email, avatar_url, timezone, working_hours_start, working_hours_end, work_days, notifications_enabled, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user) {
    ensureDefaultUser();
    user = queryOne(
      'SELECT id, name, email, avatar_url, timezone, working_hours_start, working_hours_end, work_days, notifications_enabled, created_at FROM users WHERE id = ?',
      [DEFAULT_USER_ID]
    );
  }
  res.json({ user });
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email diperlukan.' });
  const user = queryOne('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return res.status(404).json({ error: 'Akun dengan email tersebut tidak ditemukan.' });
  }
  // Informational response
  res.json({
    message: 'Tautan pemulihan kata sandi telah disiapkan. Silakan atur ulang kata sandi Anda.',
    resetAllowed: true,
  });
});

apiRouter.put('/auth/profile', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, timezone, working_hours_start, working_hours_end, work_days, notifications_enabled, avatar_url } = req.body;

  const now = new Date().toISOString();
  execute(
    `UPDATE users SET 
      name = COALESCE(?, name),
      timezone = COALESCE(?, timezone),
      working_hours_start = COALESCE(?, working_hours_start),
      working_hours_end = COALESCE(?, working_hours_end),
      work_days = COALESCE(?, work_days),
      notifications_enabled = COALESCE(?, notifications_enabled),
      avatar_url = COALESCE(?, avatar_url),
      updated_at = ?
    WHERE id = ?`,
    [name, timezone, working_hours_start, working_hours_end, work_days, notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : null, avatar_url, now, userId]
  );

  const updated = queryOne('SELECT id, name, email, avatar_url, timezone, working_hours_start, working_hours_end, work_days, notifications_enabled FROM users WHERE id = ?', [userId]);
  res.json({ user: updated });
});

// ----------------------------------------------------
// PROJECTS CRUD
// ----------------------------------------------------
apiRouter.get('/projects', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const projects = queryAll('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);

  // Augment with task count & actual progress
  const enriched = projects.map((p) => {
    const tasks = queryAll('SELECT id, status, actual_minutes FROM tasks WHERE project_id = ?', [p.id]);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalWorkingMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);
    const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 10) / 10;

    return {
      ...p,
      task_count: total,
      completed_tasks: completed,
      pending_tasks: pending,
      progress,
      total_working_hours: totalWorkingHours,
    };
  });

  res.json({ projects: enriched });
});

apiRouter.post('/projects', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, description, color, status, priority, start_date, deadline } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nama project wajib diisi.' });
  }

  const id = 'prj_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  execute(
    `INSERT INTO projects (id, user_id, name, description, color, status, priority, start_date, deadline, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      name.trim(),
      description || '',
      color || '#3B82F6',
      status || 'active',
      priority || 'medium',
      start_date || null,
      deadline || null,
      now,
      now,
    ]
  );

  const created = queryOne('SELECT * FROM projects WHERE id = ?', [id]);
  res.json({ project: created });
});

apiRouter.get('/projects/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const projectId = req.params.id;

  const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.status(404).json({ error: 'Project tidak ditemukan.' });

  const tasks = queryAll('SELECT * FROM tasks WHERE project_id = ? ORDER BY deadline ASC, ai_priority_score DESC', [projectId]);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = total - completed;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalWorkingMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);
  const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 10) / 10;

  res.json({
    project: {
      ...project,
      task_count: total,
      completed_tasks: completed,
      pending_tasks: pending,
      progress,
      total_working_hours: totalWorkingHours,
      tasks,
    },
  });
});

apiRouter.put('/projects/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const projectId = req.params.id;
  const { name, description, color, status, priority, start_date, deadline } = req.body;

  const now = new Date().toISOString();
  execute(
    `UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      color = COALESCE(?, color),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      start_date = ?,
      deadline = ?,
      updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [name, description, color, status, priority, start_date, deadline, now, projectId, userId]
  );

  const updated = queryOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  res.json({ project: updated });
});

apiRouter.delete('/projects/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const projectId = req.params.id;

  execute('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  res.json({ success: true });
});

// ----------------------------------------------------
// CATEGORIES CRUD
// ----------------------------------------------------
apiRouter.get('/categories', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC', [userId]);
  res.json({ categories });
});

apiRouter.post('/categories', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, icon, color } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  }

  const id = 'cat_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  execute(
    `INSERT INTO categories (id, user_id, name, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name.trim(), icon || 'Folder', color || '#6366F1', now, now]
  );

  const created = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  res.json({ category: created });
});

apiRouter.put('/categories/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, icon, color } = req.body;
  const now = new Date().toISOString();

  execute(
    `UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), updated_at = ? WHERE id = ? AND user_id = ?`,
    [name, icon, color, now, req.params.id, userId]
  );

  const updated = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json({ category: updated });
});

apiRouter.delete('/categories/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  execute('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  res.json({ success: true });
});

// ----------------------------------------------------
// TAGS CRUD
// ----------------------------------------------------
apiRouter.get('/tags', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const tags = queryAll('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC', [userId]);
  res.json({ tags });
});

apiRouter.post('/tags', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nama tag wajib diisi.' });

  const existing = queryOne('SELECT * FROM tags WHERE user_id = ? AND name = ?', [userId, name.trim()]);
  if (existing) return res.json({ tag: existing });

  const id = 'tag_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  execute('INSERT INTO tags (id, user_id, name, created_at) VALUES (?, ?, ?, ?)', [id, userId, name.trim(), now]);
  const created = queryOne('SELECT * FROM tags WHERE id = ?', [id]);
  res.json({ tag: created });
});

apiRouter.delete('/tags/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  execute('DELETE FROM tags WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  res.json({ success: true });
});

// ----------------------------------------------------
// TASKS CRUD & SUBTASKS
// ----------------------------------------------------
apiRouter.get('/tasks', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { status, priority, project_id, category_id, deadline, date, search, tag } = req.query;

  let sql = `
    SELECT t.*, 
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color, c.icon as category_icon,
      (SELECT recommendation_type FROM ai_recommendations WHERE task_id = t.id ORDER BY updated_at DESC LIMIT 1) as recommendation_type,
      (SELECT reason FROM ai_recommendations WHERE task_id = t.id ORDER BY updated_at DESC LIMIT 1) as recommendation_reason
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [userId];

  if (status && status !== 'all') {
    sql += ` AND t.status = ?`;
    params.push(status);
  }
  if (priority && priority !== 'all') {
    sql += ` AND t.priority = ?`;
    params.push(priority);
  }
  if (project_id && project_id !== 'all') {
    sql += ` AND t.project_id = ?`;
    params.push(project_id);
  }
  if (category_id && category_id !== 'all') {
    sql += ` AND t.category_id = ?`;
    params.push(category_id);
  }
  if (date) {
    sql += ` AND (t.scheduled_date = ? OR t.deadline = ?)`;
    params.push(date, date);
  }
  if (search) {
    sql += ` AND (t.title LIKE ? OR t.description LIKE ? OR t.notes LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ` ORDER BY t.ai_priority_score DESC, t.deadline ASC, t.created_at DESC`;

  const rawTasks = queryAll(sql, params);

  // Attach subtasks and tags
  const tasks = rawTasks.map((task) => {
    const subtasks = queryAll('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC', [task.id]);
    const tags = queryAll('SELECT t.* FROM tags t INNER JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?', [task.id]);
    return {
      ...task,
      subtasks,
      tags,
    };
  });

  if (tag) {
    const filtered = tasks.filter((t) => t.tags.some((tg: any) => tg.name === tag || tg.id === tag));
    return res.json({ tasks: filtered });
  }

  res.json({ tasks });
});

apiRouter.post('/tasks', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const {
    title,
    description,
    project_id,
    category_id,
    priority,
    status,
    deadline,
    scheduled_date,
    start_time,
    end_time,
    estimated_minutes,
    notes,
    subtasks = [],
    tags = [],
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Judul task wajib diisi.' });
  }

  const id = 'tsk_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  // Find project for priority calculations
  const project = project_id ? queryOne('SELECT * FROM projects WHERE id = ?', [project_id]) : null;

  // Calculate deterministic AI Priority Score
  const scoreResult = calculateTaskPriority(
    {
      deadline,
      scheduled_date,
      priority: priority || 'medium',
      estimated_minutes: Number(estimated_minutes) || 30,
      status: status || 'todo',
    },
    project
  );

  execute(
    `INSERT INTO tasks (
      id, user_id, project_id, category_id, title, description, status, priority,
      ai_priority_score, scheduled_date, deadline, start_time, end_time,
      estimated_minutes, actual_minutes, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      project_id || null,
      category_id || null,
      title.trim(),
      description || '',
      status || 'todo',
      priority || 'medium',
      scoreResult.finalScore,
      scheduled_date || null,
      deadline || null,
      start_time || null,
      end_time || null,
      Number(estimated_minutes) || 30,
      0,
      notes || '',
      now,
      now,
    ]
  );

  // Insert initial AI recommendation
  const recId = 'rec_' + crypto.randomUUID().slice(0, 8);
  execute(
    `INSERT INTO ai_recommendations (id, user_id, task_id, recommendation_type, priority_score, reason, suggested_action, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recId,
      userId,
      id,
      scoreResult.recommendation,
      scoreResult.finalScore,
      scoreResult.reason,
      scoreResult.suggestedAction,
      now,
      now,
    ]
  );

  // Insert subtasks if provided
  if (Array.isArray(subtasks)) {
    for (const st of subtasks) {
      if (typeof st === 'string' && st.trim()) {
        const subId = 'sub_' + crypto.randomUUID().slice(0, 8);
        execute('INSERT INTO subtasks (id, task_id, title, is_completed, created_at) VALUES (?, ?, ?, 0, ?)', [
          subId,
          id,
          st.trim(),
          now,
        ]);
      } else if (st?.title?.trim()) {
        const subId = 'sub_' + crypto.randomUUID().slice(0, 8);
        execute('INSERT INTO subtasks (id, task_id, title, is_completed, created_at) VALUES (?, ?, ?, ?, ?)', [
          subId,
          id,
          st.title.trim(),
          st.is_completed ? 1 : 0,
          now,
        ]);
      }
    }
  }

  // Attach tags
  if (Array.isArray(tags)) {
    for (const tagName of tags) {
      if (typeof tagName === 'string' && tagName.trim()) {
        let tagRecord = queryOne('SELECT id FROM tags WHERE user_id = ? AND name = ?', [userId, tagName.trim()]);
        if (!tagRecord) {
          const newTagId = 'tag_' + crypto.randomUUID().slice(0, 8);
          execute('INSERT INTO tags (id, user_id, name, created_at) VALUES (?, ?, ?, ?)', [newTagId, userId, tagName.trim(), now]);
          tagRecord = { id: newTagId };
        }
        execute('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [id, tagRecord.id]);
      }
    }
  }

  const created = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
  res.json({ task: created, priorityInfo: scoreResult });
});

apiRouter.get('/tasks/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;

  const task = queryOne(
    `SELECT t.*, 
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color, c.icon as category_icon,
      r.recommendation_type, r.reason as recommendation_reason, r.suggested_action
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN ai_recommendations r ON t.id = r.task_id
    WHERE t.id = ? AND t.user_id = ?`,
    [taskId, userId]
  );

  if (!task) return res.status(404).json({ error: 'Task tidak ditemukan.' });

  const subtasks = queryAll('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC', [taskId]);
  const tags = queryAll('SELECT t.* FROM tags t INNER JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?', [taskId]);
  const dependencies = queryAll(
    `SELECT td.id, td.depends_on_task_id, t.title, t.status 
     FROM task_dependencies td 
     JOIN tasks t ON td.depends_on_task_id = t.id 
     WHERE td.task_id = ?`,
    [taskId]
  );
  const timeLogs = queryAll('SELECT * FROM time_logs WHERE task_id = ? ORDER BY started_at DESC', [taskId]);

  res.json({
    task: {
      ...task,
      subtasks,
      tags,
      dependencies,
      time_logs: timeLogs,
    },
  });
});

apiRouter.put('/tasks/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;
  const {
    title,
    description,
    project_id,
    category_id,
    status,
    priority,
    ai_priority_score,
    deadline,
    scheduled_date,
    start_time,
    end_time,
    estimated_minutes,
    actual_minutes,
    notes,
    completed_at,
  } = req.body;

  const now = new Date().toISOString();
  let compAt = completed_at;
  if (status === 'completed' && !compAt) {
    compAt = now;
  } else if (status && status !== 'completed') {
    compAt = null;
  }

  // Check if priority or deadline changed to recalculate score if manual override not specified
  const existing = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  if (!existing) return res.status(404).json({ error: 'Task tidak ditemukan.' });

  let newScore = ai_priority_score;
  if (newScore === undefined) {
    const projId = project_id !== undefined ? project_id : existing.project_id;
    const proj = projId ? queryOne('SELECT * FROM projects WHERE id = ?', [projId]) : null;
    const scoreRes = calculateTaskPriority(
      {
        deadline: deadline !== undefined ? deadline : existing.deadline,
        scheduled_date: scheduled_date !== undefined ? scheduled_date : existing.scheduled_date,
        priority: priority !== undefined ? priority : existing.priority,
        estimated_minutes: estimated_minutes !== undefined ? estimated_minutes : existing.estimated_minutes,
        status: status !== undefined ? status : existing.status,
      },
      proj
    );
    newScore = scoreRes.finalScore;
  }

  execute(
    `UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      project_id = ?,
      category_id = ?,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      ai_priority_score = COALESCE(?, ai_priority_score),
      deadline = ?,
      scheduled_date = ?,
      start_time = ?,
      end_time = ?,
      estimated_minutes = COALESCE(?, estimated_minutes),
      actual_minutes = COALESCE(?, actual_minutes),
      completed_at = ?,
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ? AND user_id = ?`,
    [
      title,
      description,
      project_id !== undefined ? project_id : existing.project_id,
      category_id !== undefined ? category_id : existing.category_id,
      status,
      priority,
      newScore,
      deadline !== undefined ? deadline : existing.deadline,
      scheduled_date !== undefined ? scheduled_date : existing.scheduled_date,
      start_time !== undefined ? start_time : existing.start_time,
      end_time !== undefined ? end_time : existing.end_time,
      estimated_minutes,
      actual_minutes,
      compAt,
      notes,
      now,
      taskId,
      userId,
    ]
  );

  const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.json({ task: updated });
});

apiRouter.delete('/tasks/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;

  execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  res.json({ success: true });
});

apiRouter.post('/tasks/:id/complete', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;
  const now = new Date().toISOString();

  execute('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
    'completed',
    now,
    now,
    taskId,
    userId,
  ]);

  res.json({ success: true });
});

apiRouter.post('/tasks/:id/postpone', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;
  const { newDate } = req.body;
  const now = new Date().toISOString();

  // If no date provided, postpone to tomorrow
  const targetDate = newDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

  execute('UPDATE tasks SET status = ?, scheduled_date = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
    'postponed',
    targetDate,
    now,
    taskId,
    userId,
  ]);

  res.json({ success: true, scheduled_date: targetDate });
});

// Subtask toggle/create/delete
apiRouter.post('/tasks/:id/subtasks', authenticate, (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Judul subtask wajib diisi.' });

  const id = 'sub_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  execute('INSERT INTO subtasks (id, task_id, title, is_completed, created_at) VALUES (?, ?, ?, 0, ?)', [
    id,
    req.params.id,
    title.trim(),
    now,
  ]);
  const sub = queryOne('SELECT * FROM subtasks WHERE id = ?', [id]);
  res.json({ subtask: sub });
});

apiRouter.put('/subtasks/:id', authenticate, (req, res) => {
  const { is_completed, title } = req.body;
  const now = new Date().toISOString();
  const completedAt = is_completed ? now : null;

  execute(
    'UPDATE subtasks SET is_completed = COALESCE(?, is_completed), title = COALESCE(?, title), completed_at = ? WHERE id = ?',
    [is_completed !== undefined ? (is_completed ? 1 : 0) : null, title, completedAt, req.params.id]
  );
  const sub = queryOne('SELECT * FROM subtasks WHERE id = ?', [req.params.id]);
  res.json({ subtask: sub });
});

apiRouter.delete('/subtasks/:id', authenticate, (req, res) => {
  execute('DELETE FROM subtasks WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ----------------------------------------------------
// TIME TRACKING (Live Timer)
// ----------------------------------------------------
apiRouter.get('/timer/active', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const activeLog = queryOne(
    `SELECT tl.*, t.title as task_title, t.estimated_minutes, t.actual_minutes 
     FROM time_logs tl 
     JOIN tasks t ON tl.task_id = t.id 
     WHERE tl.user_id = ? AND tl.ended_at IS NULL 
     ORDER BY tl.started_at DESC LIMIT 1`,
    [userId]
  );
  res.json({ activeTimer: activeLog });
});

apiRouter.post('/tasks/:id/timer/start', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;
  const now = new Date().toISOString();

  // Stop any currently running timer first
  const running = queryOne('SELECT * FROM time_logs WHERE user_id = ? AND ended_at IS NULL', [userId]);
  if (running) {
    const started = new Date(running.started_at).getTime();
    const duration = Math.max(1, Math.round((Date.now() - started) / 60000));
    execute('UPDATE time_logs SET ended_at = ?, duration_minutes = ? WHERE id = ?', [now, duration, running.id]);
    execute('UPDATE tasks SET actual_minutes = actual_minutes + ? WHERE id = ?', [duration, running.task_id]);
  }

  // Create new active log
  const logId = 'log_' + crypto.randomUUID().slice(0, 8);
  execute(
    'INSERT INTO time_logs (id, user_id, task_id, started_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [logId, userId, taskId, now, now]
  );

  // Set task status to in_progress if not already
  execute("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status != 'completed'", [now, taskId]);

  const active = queryOne(
    `SELECT tl.*, t.title as task_title, t.estimated_minutes, t.actual_minutes 
     FROM time_logs tl JOIN tasks t ON tl.task_id = t.id 
     WHERE tl.id = ?`,
    [logId]
  );
  res.json({ activeTimer: active });
});

apiRouter.post('/tasks/:id/timer/stop', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const taskId = req.params.id;
  const now = new Date().toISOString();

  const running = queryOne('SELECT * FROM time_logs WHERE user_id = ? AND task_id = ? AND ended_at IS NULL', [userId, taskId]);
  if (!running) {
    return res.status(404).json({ error: 'Tidak ada timer aktif untuk task ini.' });
  }

  const started = new Date(running.started_at).getTime();
  const duration = Math.max(1, Math.round((Date.now() - started) / 60000));

  execute('UPDATE time_logs SET ended_at = ?, duration_minutes = ? WHERE id = ?', [now, duration, running.id]);
  execute('UPDATE tasks SET actual_minutes = actual_minutes + ?, updated_at = ? WHERE id = ?', [duration, now, taskId]);

  const updatedTask = queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.json({ success: true, duration_minutes: duration, task: updatedTask });
});

// ----------------------------------------------------
// AI WORK INSIGHTS & ANALYZE TASKS
// ----------------------------------------------------
apiRouter.post('/ai/analyze-tasks', authenticate, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    const tasks = queryAll("SELECT * FROM tasks WHERE user_id = ? AND status != 'completed' AND status != 'cancelled'", [userId]);
    const projects = queryAll('SELECT * FROM projects WHERE user_id = ?', [userId]);

    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = queryOne("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at LIKE ?", [userId, todayStr + '%'])?.count || 0;
    const totalEst = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);

    const analysis = await analyzeTasksWithAI(tasks, projects, {
      workingHours: `${user?.working_hours_start || '09:00'} - ${user?.working_hours_end || '17:00'}`,
      completedToday,
      activeCount: tasks.length,
      totalEstimatedMinutes: totalEst,
    });

    const now = new Date().toISOString();
    // Save AI scores and recommendations to DB
    for (const item of analysis.prioritized_tasks) {
      execute('UPDATE tasks SET ai_priority_score = ?, updated_at = ? WHERE id = ? AND user_id = ?', [item.score, now, item.task_id, userId]);

      // Upsert recommendation
      const existingRec = queryOne('SELECT id FROM ai_recommendations WHERE user_id = ? AND task_id = ?', [userId, item.task_id]);
      if (existingRec) {
        execute(
          'UPDATE ai_recommendations SET recommendation_type = ?, priority_score = ?, reason = ?, suggested_action = ?, updated_at = ? WHERE id = ?',
          [item.recommendation, item.score, item.reason, item.suggested_time, now, existingRec.id]
        );
      } else {
        const recId = 'rec_' + crypto.randomUUID().slice(0, 8);
        execute(
          'INSERT INTO ai_recommendations (id, user_id, task_id, recommendation_type, priority_score, reason, suggested_action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [recId, userId, item.task_id, item.recommendation, item.score, item.reason, item.suggested_time, now, now]
        );
      }
    }

    res.json(analysis);
  } catch (err: any) {
    console.error('Task analysis route error:', err);
    res.status(500).json({ error: err.message || 'Gagal menganalisis task.' });
  }
});

apiRouter.post('/ai/assistant', authenticate, async (req, res) => {
  const userId = (req as any).userId;
  const { message, history = [] } = req.body;

  if (!message?.trim()) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });

  try {
    const user = queryOne('SELECT name, working_hours_start, working_hours_end FROM users WHERE id = ?', [userId]);
    const tasks = queryAll("SELECT * FROM tasks WHERE user_id = ? AND status != 'completed'", [userId]);
    const projects = queryAll('SELECT * FROM projects WHERE user_id = ?', [userId]);
    const categories = queryAll('SELECT * FROM categories WHERE user_id = ?', [userId]);
    const recentLogs = queryAll('SELECT * FROM time_logs WHERE user_id = ? ORDER BY started_at DESC LIMIT 10', [userId]);

    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = queryOne("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at LIKE ?", [userId, todayStr + '%'])?.c || 0;
    const overdueCount = queryAll("SELECT id FROM tasks WHERE user_id = ? AND status != 'completed' AND deadline < ?", [userId, todayStr]).length;

    const reply = await askAIAssistant(message, history, {
      userName: user?.name || 'Pengguna',
      tasks,
      projects,
      categories,
      recentLogs,
      todayStats: {
        completedToday,
        activeTasks: tasks.length,
        overdueCount,
      },
    });

    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal merespons pesan.' });
  }
});

// ----------------------------------------------------
// DASHBOARD & ANALYTICS
// ----------------------------------------------------
apiRouter.get('/dashboard', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const todayStr = new Date().toISOString().split('T')[0];

  const allTasks = queryAll('SELECT * FROM tasks WHERE user_id = ?', [userId]);
  const todayTasks = allTasks.filter(
    (t) => t.scheduled_date === todayStr || t.deadline === todayStr || (t.status === 'in_progress' && t.status !== 'completed')
  );

  const completedToday = allTasks.filter(
    (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(todayStr)
  );

  const urgentTasks = allTasks.filter(
    (t) => (t.priority === 'urgent' || t.priority === 'critical') && t.status !== 'completed' && t.status !== 'cancelled'
  );

  const overdueTasks = allTasks.filter(
    (t) => t.deadline && t.deadline < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
  );

  const totalTodayScheduled = todayTasks.length;
  const completionRate =
    totalTodayScheduled > 0 ? Math.round((completedToday.length / totalTodayScheduled) * 100) : allTasks.length > 0 && completedToday.length > 0 ? 100 : 0;

  // Calculate today's working time from time_logs
  const todayLogs = queryAll(
    'SELECT duration_minutes FROM time_logs WHERE user_id = ? AND started_at LIKE ?',
    [userId, todayStr + '%']
  );
  const totalWorkingMinutes = todayLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  // Overall Productivity Score Formula (0-100)
  const totalTasksCount = allTasks.length;
  const allCompleted = allTasks.filter((t) => t.status === 'completed');
  const overallCompletionRate = totalTasksCount > 0 ? (allCompleted.length / totalTasksCount) * 100 : 0;

  // Deadline adherence: % of completed tasks where completed_at <= deadline
  const completedWithDeadline = allCompleted.filter((t) => t.deadline);
  const metDeadline = completedWithDeadline.filter((t) => t.completed_at && t.completed_at.split('T')[0] <= t.deadline!);
  const deadlineAdherence =
    completedWithDeadline.length > 0 ? (metDeadline.length / completedWithDeadline.length) * 100 : 80;

  const criticalAndUrgent = allTasks.filter((t) => t.priority === 'critical' || t.priority === 'urgent');
  const criticalCompleted = criticalAndUrgent.filter((t) => t.status === 'completed');
  const priorityCompletion =
    criticalAndUrgent.length > 0 ? (criticalCompleted.length / criticalAndUrgent.length) * 100 : 70;

  const productivityScore = calculateProductivityScore({
    completionRate: overallCompletionRate,
    deadlineAdherence,
    priorityCompletionRate: priorityCompletion,
    focusEfficiency: totalWorkingMinutes > 0 ? 85 : 50,
    consistency: completedToday.length > 0 ? 90 : 60,
  });

  // Focus Today tasks: Active tasks ordered by AI priority score, deadline, importance
  const focusToday = queryAll(
    `SELECT t.*, 
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color, c.icon as category_icon,
      r.recommendation_type, r.reason as recommendation_reason, r.suggested_action
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN ai_recommendations r ON t.id = r.task_id
    WHERE t.user_id = ? AND t.status != 'completed' AND t.status != 'cancelled'
    ORDER BY t.ai_priority_score DESC, t.deadline ASC, t.estimated_minutes ASC
    LIMIT 10`,
    [userId]
  );

  // AI Work Insights (detect bottlenecks, overdue, frequent postponements, workload)
  const workInsights: { type: 'warning' | 'info' | 'success'; title: string; message: string; actionText?: string }[] = [];
  if (overdueTasks.length > 0) {
    workInsights.push({
      type: 'warning',
      title: `${overdueTasks.length} Task Melewati Deadline`,
      message: `Ada pekerjaan yang melewati tenggat waktu. Segera selesaikan atau jadwalkan ulang untuk menjaga ritme kerja.`,
      actionText: 'Tinjau Overdue',
    });
  }

  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress');
  if (inProgressTasks.length > 3) {
    workInsights.push({
      type: 'info',
      title: 'Terlalu Banyak Task Aktif Bersamaan',
      message: `Anda memiliki ${inProgressTasks.length} task dalam status "In Progress". Mengurangi multitasking dapat meningkatkan fokus dan kecepatan penyelesaian.`,
    });
  }

  const postponedTasks = allTasks.filter((t) => t.status === 'postponed');
  if (postponedTasks.length >= 3) {
    workInsights.push({
      type: 'info',
      title: 'Pola Penundaan Terdeteksi',
      message: `${postponedTasks.length} task sedang dalam status tertunda. Pertimbangkan untuk memecahnya menjadi subtask kecil berdurasi 15-30 menit.`,
    });
  }

  if (completedToday.length >= 3) {
    workInsights.push({
      type: 'success',
      title: 'Momentum Produktivitas Bagus!',
      message: `Luar biasa! Anda telah menuntaskan ${completedToday.length} task hari ini. Pertahankan ritme kerja fokus Anda.`,
    });
  }

  res.json({
    kpis: {
      today_tasks: totalTodayScheduled,
      completed: completedToday.length,
      urgent: urgentTasks.length,
      overdue: overdueTasks.length,
      completion_rate: completionRate,
      productivity_score: productivityScore,
      total_working_minutes: totalWorkingMinutes,
      total_working_hours: Math.round((totalWorkingMinutes / 60) * 10) / 10,
    },
    focus_today: focusToday,
    insights: workInsights,
    has_tasks: allTasks.length > 0,
  });
});

apiRouter.get('/analytics', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const tasks = queryAll('SELECT * FROM tasks WHERE user_id = ?', [userId]);
  const projects = queryAll('SELECT * FROM projects WHERE user_id = ?', [userId]);
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ?', [userId]);
  const timeLogs = queryAll('SELECT * FROM time_logs WHERE user_id = ?', [userId]);

  if (tasks.length === 0) {
    return res.json({ has_data: false });
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completionRate = Math.round((completedTasks.length / totalTasks) * 100);
  const totalWorkingMinutes = timeLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 10) / 10;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter((t) => t.deadline && t.deadline < todayStr && t.status !== 'completed').length;

  // Average completion time (for completed tasks that have actual_minutes)
  const completedWithTime = completedTasks.filter((t) => t.actual_minutes && t.actual_minutes > 0);
  const avgCompletionMinutes =
    completedWithTime.length > 0
      ? Math.round(completedWithTime.reduce((s, t) => s + t.actual_minutes, 0) / completedWithTime.length)
      : 35;

  // Productivity Trend: tasks completed in the last 7 days
  const trendDays: { date: string; day: string; completed: number; created: number }[] = [];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;

    const compCount = completedTasks.filter((t) => t.completed_at && t.completed_at.startsWith(dateStr)).length;
    const createCount = tasks.filter((t) => t.created_at && t.created_at.startsWith(dateStr)).length;

    trendDays.push({
      date: dateStr,
      day: dayLabel,
      completed: compCount,
      created: createCount,
    });
  }

  // Task Status distribution
  const statusCounts: Record<string, number> = {
    completed: 0,
    in_progress: 0,
    todo: 0,
    postponed: 0,
    cancelled: 0,
    overdue: overdueTasks,
  };
  for (const t of tasks) {
    if (statusCounts[t.status] !== undefined) {
      statusCounts[t.status]++;
    }
  }

  // Category distribution
  const categoryMap = new Map<string, { name: string; count: number; color: string }>();
  for (const c of categories) {
    categoryMap.set(c.id, { name: c.name, count: 0, color: c.color });
  }
  categoryMap.set('uncategorized', { name: 'Tanpa Kategori', count: 0, color: '#94A3B8' });

  for (const t of tasks) {
    const key = t.category_id && categoryMap.has(t.category_id) ? t.category_id : 'uncategorized';
    categoryMap.get(key)!.count++;
  }
  const categoryDistribution = Array.from(categoryMap.values()).filter((c) => c.count > 0);

  // Working Hours per day (last 7 days)
  const workingHoursDays = trendDays.map((td) => {
    const logs = timeLogs.filter((l) => l.started_at && l.started_at.startsWith(td.date));
    const mins = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    return {
      day: td.day,
      hours: Math.round((mins / 60) * 10) / 10,
    };
  });

  // Priority distribution
  const priorityCounts = {
    critical: tasks.filter((t) => t.priority === 'critical').length,
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };

  // Project Workload
  const projectWorkload = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    const mins = pTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0);
    return {
      name: p.name,
      tasks: pTasks.length,
      hours: Math.round((mins / 60) * 10) / 10,
      color: p.color,
    };
  }).filter((p) => p.tasks > 0);

  const productivityScore = calculateProductivityScore({
    completionRate,
    deadlineAdherence: 85,
    priorityCompletionRate: 75,
    focusEfficiency: 80,
    consistency: 70,
  });

  res.json({
    has_data: true,
    kpis: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks.length,
      completion_rate: completionRate,
      total_working_hours: totalWorkingHours,
      average_daily_tasks: Math.round((completedTasks.length / 7) * 10) / 10,
      overdue_tasks: overdueTasks,
      average_completion_minutes: avgCompletionMinutes,
      productivity_score: productivityScore,
    },
    productivity_trend: trendDays,
    status_distribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    category_distribution: categoryDistribution,
    working_hours: workingHoursDays,
    priority_distribution: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
    project_workload: projectWorkload,
  });
});

// ----------------------------------------------------
// DAILY REVIEW & CHECK-IN
// ----------------------------------------------------
apiRouter.get('/daily-reviews', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const reviews = queryAll('SELECT * FROM daily_reviews WHERE user_id = ? ORDER BY date DESC', [userId]);
  res.json({ reviews });
});

apiRouter.post('/daily-reviews/generate', authenticate, async (req, res) => {
  const userId = (req as any).userId;
  const { date, accomplished, unfinished, blocker, tomorrowPriority, notes } = req.body;

  const targetDate = date || new Date().toISOString().split('T')[0];

  const plannedTasks = queryAll(
    'SELECT * FROM tasks WHERE user_id = ? AND (scheduled_date = ? OR deadline = ?)',
    [userId, targetDate, targetDate]
  );
  const completedTasks = queryAll(
    "SELECT * FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at LIKE ?",
    [userId, targetDate + '%']
  );
  const overdueTasks = queryAll(
    "SELECT * FROM tasks WHERE user_id = ? AND status != 'completed' AND deadline < ?",
    [userId, targetDate]
  );

  const logs = queryAll('SELECT duration_minutes FROM time_logs WHERE user_id = ? AND started_at LIKE ?', [userId, targetDate + '%']);
  const actualMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  const total = plannedTasks.length;
  const completed = completedTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : completed > 0 ? 100 : 0;
  const prodScore = calculateProductivityScore({
    completionRate,
    deadlineAdherence: overdueTasks.length === 0 ? 100 : 60,
    priorityCompletionRate: 80,
    focusEfficiency: actualMinutes > 0 ? 90 : 50,
    consistency: 80,
  });

  const aiReview = await generateDailyReviewWithAI({
    date: targetDate,
    plannedTasks,
    completedTasks,
    overdueTasks,
    actualMinutes,
    checkInResponses: {
      accomplished,
      unfinished,
      blocker,
      tomorrowPriority,
      notes,
    },
  });

  const id = 'rev_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  // Upsert daily review
  const existing = queryOne('SELECT id FROM daily_reviews WHERE user_id = ? AND date = ?', [userId, targetDate]);
  if (existing) {
    execute(
      `UPDATE daily_reviews SET
        planned_tasks = ?, completed_tasks = ?, overdue_tasks = ?, completion_rate = ?, productivity_score = ?,
        what_went_well = ?, needs_attention = ?, tomorrow_recommendation = ?, ai_summary = ?, updated_at = ?
       WHERE id = ?`,
      [
        total,
        completed,
        overdueTasks.length,
        completionRate,
        prodScore,
        aiReview.what_went_well,
        aiReview.needs_attention,
        aiReview.tomorrow_recommendation,
        aiReview.ai_summary,
        now,
        existing.id,
      ]
    );
  } else {
    execute(
      `INSERT INTO daily_reviews (
        id, user_id, date, planned_tasks, completed_tasks, overdue_tasks, completion_rate, productivity_score,
        what_went_well, needs_attention, tomorrow_recommendation, ai_summary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        targetDate,
        total,
        completed,
        overdueTasks.length,
        completionRate,
        prodScore,
        aiReview.what_went_well,
        aiReview.needs_attention,
        aiReview.tomorrow_recommendation,
        aiReview.ai_summary,
        now,
        now,
      ]
    );
  }

  const review = queryOne('SELECT * FROM daily_reviews WHERE user_id = ? AND date = ?', [userId, targetDate]);
  res.json({ review });
});

// ----------------------------------------------------
// REPORTS (Weekly & Monthly with AI Analysis)
// ----------------------------------------------------
apiRouter.get('/reports', authenticate, async (req, res) => {
  const userId = (req as any).userId;
  const { type = 'weekly', project_id, category_id } = req.query;

  const tasks = queryAll('SELECT * FROM tasks WHERE user_id = ?', [userId]);
  const projects = queryAll('SELECT * FROM projects WHERE user_id = ?', [userId]);
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ?', [userId]);
  const timeLogs = queryAll('SELECT * FROM time_logs WHERE user_id = ?', [userId]);

  if (tasks.length === 0) {
    return res.json({ has_data: false });
  }

  const now = new Date();
  const daysBack = type === 'monthly' ? 30 : 7;
  const startDate = new Date(now.getTime() - daysBack * 86400000).toISOString().split('T')[0];
  const periodLabel = type === 'monthly' ? '30 Hari Terakhir' : '7 Hari Terakhir';

  let filteredTasks = tasks.filter((t) => t.created_at >= startDate || (t.completed_at && t.completed_at >= startDate));
  if (project_id && project_id !== 'all') {
    filteredTasks = filteredTasks.filter((t) => t.project_id === project_id);
  }
  if (category_id && category_id !== 'all') {
    filteredTasks = filteredTasks.filter((t) => t.category_id === category_id);
  }

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const logs = timeLogs.filter((l) => l.started_at >= startDate);
  const totalMins = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  const totalHours = Math.round((totalMins / 60) * 10) / 10;
  const todayStr = now.toISOString().split('T')[0];
  const overdueTasks = filteredTasks.filter((t) => t.deadline && t.deadline < todayStr && t.status !== 'completed').length;

  // Top project
  const projCounts: Record<string, number> = {};
  for (const t of filteredTasks) {
    if (t.project_id) projCounts[t.project_id] = (projCounts[t.project_id] || 0) + 1;
  }
  const topProjects = Object.entries(projCounts).map(([pid, count]) => ({
    name: projects.find((p) => p.id === pid)?.name || 'Project',
    count,
  }));

  // Top category
  const catCounts: Record<string, number> = {};
  for (const t of filteredTasks) {
    if (t.category_id) catCounts[t.category_id] = (catCounts[t.category_id] || 0) + 1;
  }
  const topCategories = Object.entries(catCounts).map(([cid, count]) => ({
    name: categories.find((c) => c.id === cid)?.name || 'Kategori',
    count,
  }));

  const productivityScore = calculateProductivityScore({
    completionRate,
    deadlineAdherence: overdueTasks === 0 ? 95 : 70,
    priorityCompletionRate: 80,
    focusEfficiency: totalHours > 5 ? 85 : 60,
    consistency: 75,
  });

  const aiAnalysis = await generateReportInsightWithAI({
    type: type as 'weekly' | 'monthly',
    periodLabel,
    totalTasks,
    completedTasks: completedTasks.length,
    completionRate,
    totalHours,
    overdueTasks,
    topProjects,
    topCategories,
    productivityScore,
  });

  res.json({
    has_data: true,
    periodLabel,
    type,
    metrics: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks.length,
      completion_rate: completionRate,
      total_hours: totalHours,
      overdue_tasks: overdueTasks,
      productivity_score: productivityScore,
      top_projects: topProjects,
      top_categories: topCategories,
    },
    ai_analysis: aiAnalysis,
  });
});
