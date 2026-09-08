export interface PriorityComponents {
  urgency: number;
  importance: number;
  projectImpact: number;
  effort: number;
  dependency: number;
  overdue: number;
  finalScore: number;
  recommendation: 'do_now' | 'do_next' | 'schedule' | 'do_later' | 'optional';
  reason: string;
  suggestedAction: string;
}

export function calculateTaskPriority(
  task: {
    deadline?: string | null;
    scheduled_date?: string | null;
    priority?: string;
    estimated_minutes?: number;
    status?: string;
  },
  project?: { priority?: string; name?: string } | null,
  isBlockerForOthers: boolean = false,
  hasUnfinishedDependencies: boolean = false
): PriorityComponents {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Urgency (30%)
  let urgency = 15;
  let isOverdue = false;
  let deadlineNote = 'Tidak ada tenggat waktu.';

  if (task.deadline) {
    const deadlineDate = new Date(task.deadline + 'T23:59:59');
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      urgency = 100;
      isOverdue = true;
      deadlineNote = 'Melewati tenggat waktu (Overdue)!';
    } else if (diffDays <= 0 || task.deadline === todayStr) {
      urgency = 95;
      deadlineNote = 'Jatuh tempo hari ini!';
    } else if (diffDays === 1) {
      urgency = 80;
      deadlineNote = 'Jatuh tempo besok.';
    } else if (diffDays <= 3) {
      urgency = 65;
      deadlineNote = `Jatuh tempo dalam ${diffDays} hari.`;
    } else if (diffDays <= 7) {
      urgency = 45;
      deadlineNote = `Jatuh tempo dalam ${diffDays} hari.`;
    } else {
      urgency = 25;
      deadlineNote = `Tenggat waktu masih ${diffDays} hari lagi.`;
    }
  }

  // 2. Importance (25%)
  let importance = 50;
  switch (task.priority?.toLowerCase()) {
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
  let projectImpact = 40;
  if (project?.priority) {
    switch (project.priority.toLowerCase()) {
      case 'critical':
        projectImpact = 100;
        break;
      case 'urgent':
        projectImpact = 85;
        break;
      case 'high':
        projectImpact = 75;
        break;
      case 'medium':
        projectImpact = 50;
        break;
      case 'low':
        projectImpact = 25;
        break;
    }
  } else {
    // If no project, use task importance as fallback
    projectImpact = importance * 0.8;
  }

  // 4. Effort (10%) - Quick wins get slight prioritization advantage
  const estMin = task.estimated_minutes || 30;
  let effort = 50;
  if (estMin <= 15) {
    effort = 95; // very quick win
  } else if (estMin <= 30) {
    effort = 85;
  } else if (estMin <= 60) {
    effort = 65;
  } else if (estMin <= 120) {
    effort = 45;
  } else {
    effort = 30; // large task, needs time blocking
  }

  // 5. Dependency (10%)
  let dependency = 50;
  if (isBlockerForOthers) {
    dependency = 100; // Unblock others first!
  } else if (hasUnfinishedDependencies) {
    dependency = 15; // Waiting for upstream tasks
  }

  // 6. Overdue (5%)
  const overdueScore = isOverdue ? 100 : 20;

  // Final Weighted Score
  const rawScore =
    urgency * 0.3 +
    importance * 0.25 +
    projectImpact * 0.2 +
    effort * 0.1 +
    dependency * 0.1 +
    overdueScore * 0.05;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));

  // Determine Recommendation
  let recommendation: PriorityComponents['recommendation'] = 'schedule';
  let suggestedAction = 'Jadwalkan di kalender pengerjaan.';
  let reason = '';

  if (finalScore >= 90) {
    recommendation = 'do_now';
    suggestedAction = 'Mulai kerjakan sekarang juga tanpa penundaan.';
    reason = isOverdue
      ? 'Task telah melewati batas tenggat waktu dan memiliki prioritas sangat tinggi.'
      : isBlockerForOthers
      ? 'Task ini menjadi blocker pekerjaan lain dan mendekati deadline kritis.'
      : 'Tingkat urgensi dan kepentingan tertinggi untuk diselesaikan hari ini.';
  } else if (finalScore >= 75) {
    recommendation = 'do_next';
    suggestedAction = 'Siapkan untuk dikerjakan segera setelah task aktif selesai.';
    reason = `Urgensi tinggi (${deadlineNote}) dan berdampak penting pada progres project.`;
  } else if (finalScore >= 55) {
    recommendation = 'schedule';
    suggestedAction = 'Tetapkan tanggal & estimasi waktu khusus di agenda mingguan.';
    reason = `Pekerjaan berbobot sedang-tinggi yang perlu alokasi waktu terencana.`;
  } else if (finalScore >= 30) {
    recommendation = 'do_later';
    suggestedAction = 'Kerjakan saat slot fokus utama telah tuntas.';
    reason = `Tenggat masih longgar dan dampak operasional tidak mendesak.`;
  } else {
    recommendation = 'optional';
    suggestedAction = 'Evaluasi apakah perlu didelegasikan atau diarsipkan.';
    reason = 'Tingkat urgensi rendah dan tidak memiliki ketergantungan kritis.';
  }

  return {
    urgency,
    importance,
    projectImpact,
    effort,
    dependency,
    overdue: overdueScore,
    finalScore,
    recommendation,
    reason,
    suggestedAction,
  };
}

// Calculate comprehensive Productivity Score (0-100)
export function calculateProductivityScore(metrics: {
  completionRate: number; // 0 to 100
  deadlineAdherence: number; // 0 to 100 (percentage of completed tasks that met deadline)
  priorityCompletionRate: number; // 0 to 100 (weighted completion of High/Urgent/Critical tasks)
  focusEfficiency: number; // 0 to 100 (actual vs estimated time accuracy)
  consistency: number; // 0 to 100 (work day consistency)
}): number {
  const score =
    (metrics.completionRate || 0) * 0.35 +
    (metrics.deadlineAdherence || 0) * 0.25 +
    (metrics.priorityCompletionRate || 0) * 0.2 +
    (metrics.focusEfficiency || 0) * 0.1 +
    (metrics.consistency || 0) * 0.1;

  return Math.min(100, Math.max(0, Math.round(score)));
}
