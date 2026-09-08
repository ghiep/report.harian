import React, { useState } from 'react';
import { X, Sparkles, Moon, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { DailyReview } from '../types';

interface EndDayCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewCreated: () => void;
}

export const EndDayCheckInModal: React.FC<EndDayCheckInModalProps> = ({
  isOpen,
  onClose,
  onReviewCreated,
}) => {
  const [accomplished, setAccomplished] = useState('');
  const [unfinished, setUnfinished] = useState('');
  const [blocker, setBlocker] = useState('');
  const [tomorrowPriority, setTomorrowPriority] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DailyReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.generateDailyReview({
        accomplished: accomplished.trim(),
        unfinished: unfinished.trim(),
        blocker: blocker.trim(),
        tomorrowPriority: tomorrowPriority.trim(),
        notes: notes.trim(),
      });
      setResult(res.review);
      onReviewCreated();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat review harian.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAccomplished('');
    setUnfinished('');
    setBlocker('');
    setTomorrowPriority('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/30 border border-indigo-400/30">
              <Moon className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">End-of-Day Check-in & AI Review</h2>
              <p className="text-xs text-indigo-200">
                Tinjau pencapaian hari ini dan siapkan momentum esok hari
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {result ? (
            /* Review Result */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-emerald-900 text-sm">Review Harian Tersimpan!</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Skor Produktivitas Hari Ini: <span className="font-extrabold text-base">{result.productivity_score} / 100</span>
                  </p>
                </div>
                <div className="text-right text-xs text-emerald-800">
                  <p>Tingkat Penyelesaian: <strong>{result.completion_rate}%</strong></p>
                  <p>Task Selesai: <strong>{result.completed_tasks} / {result.planned_tasks}</strong></p>
                </div>
              </div>

              {/* AI Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ringkasan AI
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{result.ai_summary}</p>
              </div>

              {/* What Went Well */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pencapaian Terbaik Hari Ini
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{result.what_went_well}</p>
              </div>

              {/* Needs Attention */}
              {result.needs_attention && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Perlu Perhatian & Evaluasi
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.needs_attention}</p>
                </div>
              )}

              {/* Tomorrow Recommendation */}
              <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Rekomendasi Utama Esok Hari
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{result.tomorrow_recommendation}</p>
              </div>
            </div>
          ) : (
            /* Check-in Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Apa saja yang berhasil Anda selesaikan hari ini?
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Menyelesaikan draft proposal klien, mereview PR backend..."
                  value={accomplished}
                  onChange={(e) => setAccomplished(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Apa yang belum sempat selesai dan apa penyebabnya?
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Modul testing belum kelar karena ada revisi mendadak di desain..."
                  value={unfinished}
                  onChange={(e) => setUnfinished(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Apakah ada hambatan atau blocker teknis/komunikasi?
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Menunggu approval dari tim legal..."
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. Apa prioritas nomor satu Anda untuk besok pagi?
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Deploy update ke production pada jam 10 pagi..."
                  value={tomorrowPriority}
                  onChange={(e) => setTomorrowPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5. Refleksi & energi kerja Anda hari ini (opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Merasa produktif di pagi hari, siang agak lelah karena rapat panjang."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          {result ? (
            <button
              onClick={handleReset}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
            >
              Tutup & Simpan
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Menganalisis Review...' : 'Generate AI Daily Review'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
