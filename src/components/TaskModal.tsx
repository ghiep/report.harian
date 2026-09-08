import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Tag as TagIcon,
  Folder,
  ListTodo,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../api';
import { Project, Category, Task, TaskPriority } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSaved: () => void;
  initialTask?: Task | null;
  defaultDate?: string;
  defaultProjectId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onTaskSaved,
  initialTask,
  defaultDate,
  defaultProjectId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline creation toggles
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProjectsAndCategories();
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description || '');
        setProjectId(initialTask.project_id || '');
        setCategoryId(initialTask.category_id || '');
        setPriority(initialTask.priority || 'medium');
        setDeadline(initialTask.deadline || '');
        setScheduledDate(initialTask.scheduled_date || '');
        setStartTime(initialTask.start_time || '');
        setEndTime(initialTask.end_time || '');
        setEstimatedMinutes(initialTask.estimated_minutes || 30);
        setNotes(initialTask.notes || '');
        setTags(initialTask.tags ? initialTask.tags.map((t) => t.name) : []);
        setSubtasks([]);
      } else {
        resetForm();
        if (defaultDate) setScheduledDate(defaultDate);
        if (defaultProjectId) setProjectId(defaultProjectId);
      }
    }
  }, [isOpen, initialTask, defaultDate, defaultProjectId]);

  const loadProjectsAndCategories = async () => {
    try {
      const [projRes, catRes] = await Promise.all([api.getProjects(), api.getCategories()]);
      setProjects(projRes.projects);
      setCategories(catRes.categories);
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setCategoryId('');
    setPriority('medium');
    setDeadline('');
    setScheduledDate('');
    setStartTime('');
    setEndTime('');
    setEstimatedMinutes(30);
    setNotes('');
    setTags([]);
    setSubtasks([]);
    setError(null);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, newSubtaskTitle.trim()]);
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleCreateInlineProject = async () => {
    if (!newProjName.trim()) return;
    try {
      const res = await api.createProject({ name: newProjName.trim(), color: '#3B82F6' });
      setProjects([...projects, res.project]);
      setProjectId(res.project.id);
      setNewProjName('');
      setShowNewProject(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateInlineCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await api.createCategory({ name: newCatName.trim(), color: '#6366F1' });
      setCategories([...categories, res.category]);
      setCategoryId(res.category.id);
      setNewCatName('');
      setShowNewCategory(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul pekerjaan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (initialTask) {
        await api.updateTask(initialTask.id, {
          title: title.trim(),
          description: description.trim(),
          project_id: projectId || null,
          category_id: categoryId || null,
          priority,
          deadline: deadline || null,
          scheduled_date: scheduledDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          estimated_minutes: Number(estimatedMinutes) || 30,
          notes: notes.trim(),
        });
      } else {
        await api.createTask({
          title: title.trim(),
          description: description.trim(),
          project_id: projectId || null,
          category_id: categoryId || null,
          priority,
          deadline: deadline || null,
          scheduled_date: scheduledDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          estimated_minutes: Number(estimatedMinutes) || 30,
          notes: notes.trim(),
          tags,
          subtasks,
        });
      }

      onTaskSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialTask ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              {initialTask ? 'Perbarui detail dan jadwal pekerjaan' : 'Catat pekerjaan harian dengan parameter prioritas & estimasi waktu'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Pekerjaan <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="Contoh: Menyusun laporan keuangan Q3 atau Refactor auth flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              placeholder="Tambahkan detail, konteks, atau hasil yang diharapkan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Project & Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Project</label>
                <button
                  type="button"
                  onClick={() => setShowNewProject(!showNewProject)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {showNewProject ? 'Batal' : '+ Buat Project'}
                </button>
              </div>

              {showNewProject ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nama project..."
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineProject}
                    className="px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Tanpa Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Kategori</label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {showNewCategory ? 'Batal' : '+ Buat Kategori'}
                </button>
              </div>

              {showNewCategory ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nama kategori..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineCategory}
                    className="px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Priority & Estimated Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Kepentingan (Priority)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 capitalize"
              >
                <option value="critical">🔴 Critical (Sangat Kritis)</option>
                <option value="urgent">🟠 Urgent (Mendesak)</option>
                <option value="high">🟡 High (Tinggi)</option>
                <option value="medium">🔵 Medium (Sedang)</option>
                <option value="low">⚪ Low (Rendah)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimasi Waktu (Menit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 shrink-0 font-medium">
                  (~{Math.round((estimatedMinutes / 60) * 10) / 10} jam)
                </span>
              </div>
            </div>
          </div>

          {/* Scheduled Date & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Dikerjakan (Scheduled)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tenggat Waktu (Deadline)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Subtasks (if creating new task) */}
          {!initialTask && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtasks / Langkah Kerja
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Tambahkan subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  Tambah
                </button>
              </div>

              {subtasks.length > 0 && (
                <ul className="space-y-1 pl-1">
                  {subtasks.map((st, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-700"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {st}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(i)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tags */}
          {!initialTask && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tags / Label (Tekan Enter untuk menambahkan)
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl min-h-[42px] items-center">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Ketik tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="text-xs bg-transparent border-none focus:outline-none flex-1 min-w-[80px]"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan (Notes)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan pengerjaan, link referensi, dll..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : initialTask ? 'Simpan Perubahan' : 'Simpan Pekerjaan'}
          </button>
        </div>
      </div>
    </div>
  );
};
