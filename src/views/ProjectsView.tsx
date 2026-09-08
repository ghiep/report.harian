import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Folder,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { api } from '../api';
import { Project, Task, TaskPriority } from '../types';

interface ProjectsViewProps {
  onSelectTask: (taskId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onSelectTask }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal create/edit project
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');

  // AI Insight
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      setProjects(res.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetail = async (id: string) => {
    try {
      const res = await api.getProject(id);
      setSelectedProject(res.project);
      setAiInsight(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetail(selectedProjectId);
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId]);

  const handleOpenCreate = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setColor('#3B82F6');
    setPriority('medium');
    setDeadline('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setColor(p.color || '#3B82F6');
    setPriority(p.priority || 'medium');
    setDeadline(p.deadline || '');
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editId) {
        await api.updateProject(editId, {
          name: name.trim(),
          description: description.trim(),
          color,
          priority,
          deadline: deadline || null,
        });
      } else {
        await api.createProject({
          name: name.trim(),
          description: description.trim(),
          color,
          priority,
          deadline: deadline || null,
        });
      }
      setIsModalOpen(false);
      loadProjects();
      if (selectedProjectId) loadProjectDetail(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Hapus project ini beserta seluruh task di dalamnya?')) return;
    try {
      await api.deleteProject(id);
      if (selectedProjectId === id) setSelectedProjectId(null);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetProjectAIInsight = async () => {
    if (!selectedProject) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Analisis performa project "${selectedProject.name}": 
Total task: ${selectedProject.task_count}, Selesai: ${selectedProject.completed_tasks}, Pending: ${selectedProject.pending_tasks}, Progress: ${selectedProject.progress}%, Total jam kerja: ${selectedProject.total_working_hours} jam, Deadline: ${selectedProject.deadline || 'tidak ada'}.
Berikan ringkasan risiko timeline, rekomendasi prioritas task berikutnya, dan kiat menjaga momentum penyelesaian.`;

      const res = await api.askAssistant(prompt, []);
      setAiInsight(res.reply);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            <span>Manajemen Project</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organisir pekerjaan berdasarkan project, monitor progres, dan analisa beban kerja
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedProjectId && (
            <button
              onClick={() => setSelectedProjectId(null)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              ← Semua Project
            </button>
          )}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Project Baru</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat data project...</div>
      ) : selectedProject ? (
        /* PROJECT DETAIL VIEW */
        <div className="space-y-6">
          {/* Detail Banner */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedProject.color }}
                >
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedProject.name}</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {selectedProject.priority}
                    </span>
                  </div>
                  {selectedProject.description && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGetProjectAIInsight}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Menganalisis...' : 'AI Project Insight'}</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedProject)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress & Stats */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Progres Penyelesaian</span>
                <span className="font-bold text-indigo-700">{selectedProject.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-500">
                <div>Total Task: <strong>{selectedProject.task_count}</strong></div>
                <div>Selesai: <strong>{selectedProject.completed_tasks}</strong></div>
                <div>Waktu Kerja: <strong>{selectedProject.total_working_hours} jam</strong></div>
                <div>Deadline: <strong>{selectedProject.deadline || 'Tidak ada'}</strong></div>
              </div>
            </div>

            {/* AI Insight Box if generated */}
            {aiInsight && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Insight & Rekomendasi Project</span>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            )}
          </div>

          {/* Tasks in this Project */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-800">
              Pekerjaan dalam Project Ini ({selectedProject.tasks?.length || 0})
            </h4>

            {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {selectedProject.tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        t.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`} />
                      <div>
                        <h5 className={`text-xs font-bold ${
                          t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}>
                          {t.title}
                        </h5>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{t.deadline || 'No deadline'}</span>
                          <span>•</span>
                          <span>{t.estimated_minutes}m</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-700">
                      {t.ai_priority_score} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Belum ada pekerjaan di dalam project ini.
              </p>
            )}
          </div>
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
          <Folder className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">Belum ada project</h4>
          <p className="text-xs text-slate-500">
            Kelompokkan pekerjaan harian Anda ke dalam project agar progres dapat dimonitor secara terstruktur.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Buat Project Pertama
          </button>
        </div>
      ) : (
        /* PROJECTS LIST GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: p.color }}
                  >
                    <Folder className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {p.priority}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Progres</span>
                  <span className="font-bold text-indigo-700">{p.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{p.completed_tasks}/{p.task_count} task selesai</span>
                  <span>{p.total_working_hours} jam</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editId ? 'Edit Project' : 'Buat Project Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Project <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Website Redesign Q3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Tujuan project, target deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Warna</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 p-1 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl capitalize"
                  >
                    <option value="critical">Critical</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tenggat Waktu</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Simpan Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
