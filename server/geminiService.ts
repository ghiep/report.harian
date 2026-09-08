import { GoogleGenAI, Type } from '@google/genai';
import { calculateTaskPriority, PriorityComponents } from './priorityEngine.js';

let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export interface TaskAIAnalysisResult {
  prioritized_tasks: {
    task_id: string;
    recommendation: 'do_now' | 'do_next' | 'schedule' | 'do_later' | 'optional';
    score: number;
    reason: string;
    suggested_time: string;
  }[];
  workload_warning: string;
  general_advice: string;
}

export async function analyzeTasksWithAI(
  tasks: any[],
  projects: any[],
  userContext: {
    workingHours?: string;
    completedToday?: number;
    activeCount?: number;
    totalEstimatedMinutes?: number;
  }
): Promise<TaskAIAnalysisResult> {
  // If no tasks available, return empty result
  if (!tasks || tasks.length === 0) {
    return {
      prioritized_tasks: [],
      workload_warning: '',
      general_advice: 'Belum ada task aktif untuk dianalisis.',
    };
  }

  // Pre-calculate deterministic fallback scores
  const deterministicList = tasks.map((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    const scoreObj = calculateTaskPriority(t, proj);
    return {
      task_id: t.id,
      recommendation: scoreObj.recommendation,
      score: scoreObj.finalScore,
      reason: scoreObj.reason,
      suggested_time: `${t.estimated_minutes || 30} menit`,
    };
  });

  const ai = getGeminiClient();
  if (!ai) {
    // Return deterministic engine output if Gemini API key is not configured
    return {
      prioritized_tasks: deterministicList,
      workload_warning:
        (userContext.totalEstimatedMinutes || 0) > 480
          ? 'Perhatian: Total beban kerja melebihi kapasitas kerja 8 jam hari ini.'
          : '',
      general_advice:
        'Prioritas dihitung menggunakan WorkFlow AI Deterministic Engine.',
    };
  }

  try {
    const prompt = `
Kamu adalah Chief Productivity Officer dan AI Personal Work Management Assistant dalam aplikasi WorkFlow AI.
Analisis daftar pekerjaan (tasks) aktif pengguna berikut ini dan berikan prioritasasi matematis dan strategis.

Konteks Pengguna:
- Jam Kerja: ${userContext.workingHours || '09:00 - 17:00'}
- Task Selesai Hari Ini: ${userContext.completedToday || 0}
- Total Task Aktif: ${userContext.activeCount || tasks.length}
- Total Estimasi Menit Kerja: ${userContext.totalEstimatedMinutes || 0} menit

Daftar Task:
${JSON.stringify(
  tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline,
    scheduled_date: t.scheduled_date,
    estimated_minutes: t.estimated_minutes,
    project: projects.find((p) => p.id === t.project_id)?.name || 'Tanpa Project',
    project_priority: projects.find((p) => p.id === t.project_id)?.priority || 'None',
  })),
  null,
  2
)}

Aturan Ketat:
1. Kembalikan HANYA task_id yang benar-benar ada dalam daftar di atas! JANGAN buat task_id baru.
2. Klasifikasikan tiap task ke dalam: "do_now" (score 90-100), "do_next" (score 75-89), "schedule" (score 55-74), "do_later" (score 30-54), "optional" (score 0-29).
3. Berikan alasan ("reason") yang spesifik dan non-generik berdasarkan deadline, prioritas, beban estimasi waktu, dan impact project.
4. "workload_warning": Jika total estimasi menit melebihi jam kerja normal (>480 menit), beri peringatan yang jelas dan actionable.
5. "general_advice": Strategi eksekusi untuk hari ini dalam Bahasa Indonesia yang profesional, ramah, dan ringkas.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prioritized_tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task_id: { type: Type.STRING },
                  recommendation: {
                    type: Type.STRING,
                    enum: ['do_now', 'do_next', 'schedule', 'do_later', 'optional'],
                  },
                  score: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                  suggested_time: { type: Type.STRING },
                },
                required: ['task_id', 'recommendation', 'score', 'reason'],
              },
            },
            workload_warning: { type: Type.STRING },
            general_advice: { type: Type.STRING },
          },
          required: ['prioritized_tasks', 'workload_warning', 'general_advice'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    // Ensure all returned task_ids belong to the actual tasks
    const validIds = new Set(tasks.map((t) => t.id));
    const validatedTasks = (parsed.prioritized_tasks || []).filter((pt: any) =>
      validIds.has(pt.task_id)
    );

    // If any tasks were missed by AI, merge with deterministic
    for (const d of deterministicList) {
      if (!validatedTasks.some((vt: any) => vt.task_id === d.task_id)) {
        validatedTasks.push(d);
      }
    }

    return {
      prioritized_tasks: validatedTasks,
      workload_warning: parsed.workload_warning || '',
      general_advice: parsed.general_advice || 'Fokus pada task "DO NOW" sebelum beralih ke jadwal lainnya.',
    };
  } catch (err) {
    console.error('Gemini analyzeTasksWithAI error, falling back to deterministic:', err);
    return {
      prioritized_tasks: deterministicList,
      workload_warning:
        (userContext.totalEstimatedMinutes || 0) > 480
          ? 'Perhatian: Total beban kerja melebihi kapasitas kerja normal hari ini.'
          : '',
      general_advice: 'Prioritas dihitung otomatis berdasarkan deadline dan tingkat kepentingan.',
    };
  }
}

export async function generateDailyReviewWithAI(params: {
  date: string;
  plannedTasks: any[];
  completedTasks: any[];
  overdueTasks: any[];
  actualMinutes: number;
  checkInResponses?: {
    accomplished?: string;
    unfinished?: string;
    blocker?: string;
    tomorrowPriority?: string;
    notes?: string;
  };
}) {
  const { date, plannedTasks, completedTasks, overdueTasks, actualMinutes, checkInResponses } = params;

  const total = plannedTasks.length;
  const completed = completedTasks.length;
  const overdue = overdueTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const ai = getGeminiClient();
  if (!ai) {
    return {
      ai_summary: `Pada tanggal ${date}, Anda menyelesaikan ${completed} dari ${total} task (${completionRate}%). Total waktu kerja tercatat: ${Math.round(actualMinutes / 60)} jam.`,
      what_went_well:
        completed > 0
          ? `Berhasil menyelesaikan ${completed} task penting hari ini.`
          : 'Mencatat aktivitas kerja secara terstruktur.',
      needs_attention:
        overdue > 0
          ? `Terdapat ${overdue} task yang melewati tenggat waktu.`
          : 'Pertahankan ritme kerja dan fokus.',
      tomorrow_recommendation:
        checkInResponses?.tomorrowPriority ||
        'Mulai hari esok dengan menyelesaikan task yang tertunda.',
    };
  }

  try {
    const prompt = `
Kamu adalah AI Executive Coach di WorkFlow AI.
Buat evaluasi dan Daily Review yang mendalam, objektif, dan menyemangati untuk tanggal ${date}.

Statistik Hari Ini:
- Task Direncanakan: ${total}
- Task Selesai: ${completed} (${completedTasks.map((t) => t.title).join(', ') || 'Belum ada'})
- Task Melewati Deadline: ${overdue} (${overdueTasks.map((t) => t.title).join(', ') || 'Nihil'})
- Total Menit Kerja Aktif: ${actualMinutes} menit
- Tingkat Penyelesaian: ${completionRate}%

Jawaban Check-In Pengguna:
- Pencapaian yang dirasakan: "${checkInResponses?.accomplished || 'Tidak diisi'}"
- Yang belum terselesaikan: "${checkInResponses?.unfinished || 'Tidak diisi'}"
- Hambatan/Blocker utama: "${checkInResponses?.blocker || 'Tidak diisi'}"
- Prioritas besok: "${checkInResponses?.tomorrowPriority || 'Tidak diisi'}"
- Catatan tambahan: "${checkInResponses?.notes || 'Tidak diisi'}"

Berikan output JSON dengan field:
1. "ai_summary": Rekap komprehensif (2-3 kalimat) mengenai ritme produktivitas hari ini.
2. "what_went_well": Poin-poin positif dan keberhasilan hari ini.
3. "needs_attention": Area yang memerlukan perhatian khusus atau perbaikan disiplin kerja.
4. "tomorrow_recommendation": Rekomendasi aksi strategis untuk besok pagi.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ai_summary: { type: Type.STRING },
            what_went_well: { type: Type.STRING },
            needs_attention: { type: Type.STRING },
            tomorrow_recommendation: { type: Type.STRING },
          },
          required: ['ai_summary', 'what_went_well', 'needs_attention', 'tomorrow_recommendation'],
        },
      },
    });

    return JSON.parse(response.text?.trim() || '{}');
  } catch (err) {
    console.error('generateDailyReviewWithAI error:', err);
    return {
      ai_summary: `Review harian ${date}: menyelesaikan ${completed} dari ${total} task (${completionRate}%).`,
      what_went_well: `Penyelesaian ${completed} task secara tervalidasi.`,
      needs_attention: overdue > 0 ? `Menangani ${overdue} task overdue.` : 'Mengatur estimasi waktu lebih realistis.',
      tomorrow_recommendation: checkInResponses?.tomorrowPriority || 'Fokus pada prioritas utama esok hari.',
    };
  }
}

export async function generateReportInsightWithAI(params: {
  type: 'weekly' | 'monthly';
  periodLabel: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalHours: number;
  overdueTasks: number;
  topProjects: any[];
  topCategories: any[];
  productivityScore: number;
}) {
  const ai = getGeminiClient();
  const { type, periodLabel, totalTasks, completedTasks, completionRate, totalHours, overdueTasks, topProjects, topCategories, productivityScore } = params;

  if (!ai) {
    return {
      summary: `Laporan ${type === 'weekly' ? 'Mingguan' : 'Bulanan'} (${periodLabel}): Skor Produktivitas ${productivityScore}/100 dengan rasio penyelesaian ${completionRate}%.`,
      bestPerformance: `Total ${completedTasks} task terselesaikan dengan alokasi waktu ${totalHours} jam.`,
      weakestArea: overdueTasks > 0 ? `Ada ${overdueTasks} task melewati deadline.` : 'Konsistensi pencatatan waktu pengerjaan.',
      recurringProblems: overdueTasks > 0 ? 'Penjadwalan task berdekatan pada akhir siklus.' : 'Tidak ada masalah berulang yang signifikan.',
      recommendation: 'Alokasikan buffer time 20% untuk setiap proyek besar guna mencegah keterlambatan.',
    };
  }

  try {
    const prompt = `
Sebagai AI Productivity Analyst di WorkFlow AI, analisis data ${type === 'weekly' ? 'mingguan' : 'bulanan'} pengguna untuk periode ${periodLabel}:
- Total Task: ${totalTasks}
- Task Selesai: ${completedTasks}
- Rasio Penyelesaian: ${completionRate}%
- Total Jam Kerja: ${totalHours} jam
- Task Overdue: ${overdueTasks}
- Skor Produktivitas: ${productivityScore} / 100
- Distribusi Project: ${JSON.stringify(topProjects)}
- Distribusi Kategori: ${JSON.stringify(topCategories)}

Kembalikan analisis JSON:
{
  "summary": "Ringkasan analitis performa kerja pengguna",
  "bestPerformance": "Aspek atau pencapaian terbaik",
  "weakestArea": "Titik lemah atau area yang butuh perbaikan",
  "recurringProblems": "Pola hambatan yang teridentifikasi",
  "recommendation": "Rekomendasi konkret untuk periode berikutnya"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            bestPerformance: { type: Type.STRING },
            weakestArea: { type: Type.STRING },
            recurringProblems: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ['summary', 'bestPerformance', 'weakestArea', 'recurringProblems', 'recommendation'],
        },
      },
    });

    return JSON.parse(response.text?.trim() || '{}');
  } catch (err) {
    console.error('generateReportInsightWithAI error:', err);
    return {
      summary: `Performa ${periodLabel}: ${completedTasks} task selesai dengan skor ${productivityScore}.`,
      bestPerformance: `Penyelesaian ${completedTasks} tugas.`,
      weakestArea: overdueTasks > 0 ? `${overdueTasks} tugas tertunda.` : 'Beban kerja harian belum merata.',
      recurringProblems: 'Estimasi waktu tugas berukuran besar.',
      recommendation: 'Pecah tugas besar menjadi subtask kecil berdurasi 30 menit.',
    };
  }
}

export async function askAIAssistant(
  message: string,
  chatHistory: { role: 'user' | 'assistant'; text: string }[],
  userContextData: {
    userName: string;
    tasks: any[];
    projects: any[];
    categories: any[];
    recentLogs: any[];
    todayStats: any;
  }
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    return 'Maaf, Gemini AI API key belum terkonfigurasi di server. Namun Anda dapat menggunakan seluruh fitur WorkFlow AI seperti manajemen task, filter, time tracking, dan priority engine.';
  }

  try {
    const systemInstruction = `
Kamu adalah asisten produktivitas pribadi cerdas di WorkFlow AI untuk pengguna bernama ${userContextData.userName || 'Pengguna'}.
PANDUAN UTAMA:
1. Jawab HANYA berdasarkan data aktual pengguna yang disediakan di bawah. JANGAN berhalusinasi atau mengarang pekerjaan, project, atau statistik fiktif.
2. Jika pengguna menanyakan tentang data yang kosong atau belum ada, jawab secara jujur dan ramah: "Tidak ada cukup data untuk membuat analisis" atau sarankan pengguna menambahkan task terlebih dahulu.
3. Fokus pada saran actionable: apa yang harus dikerjakan sekarang, apa yang harus dijadwalkan, bagaimana mengatur waktu kerja.
4. Gunakan bahasa Indonesia yang santun, profesional, ringkas, dan memotivasi.

DATA AKTUAL PENGGUNA DI DATABASE:
- Statistik Hari Ini: ${JSON.stringify(userContextData.todayStats)}
- Daftar Task Aktif: ${JSON.stringify(
      userContextData.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        ai_score: t.ai_priority_score,
        deadline: t.deadline,
        scheduled: t.scheduled_date,
        estimated_min: t.estimated_minutes,
        actual_min: t.actual_minutes,
        project: userContextData.projects.find((p) => p.id === t.project_id)?.name || 'None',
      }))
    )}
- Daftar Project: ${JSON.stringify(
      userContextData.projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        deadline: p.deadline,
      }))
    )}
- Riwayat Kerja Terbaru (Time Logs): ${JSON.stringify(userContextData.recentLogs)}
`;

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction,
      },
    });

    // Feed recent history
    for (const h of chatHistory.slice(-6)) {
      if (h.role === 'user') {
        await chat.sendMessage({ message: h.text });
      }
    }

    const response = await chat.sendMessage({ message });
    return response.text?.trim() || 'Tidak ada tanggapan.';
  } catch (err: any) {
    console.error('askAIAssistant error:', err);
    return `Terjadi kendala saat memproses jawaban AI: ${err.message || 'Silakan coba sesaat lagi.'}`;
  }
}
