import {
  StudentProfile,
  ObservationRecord,
  DevelopmentalAspect,
} from '../types';

export const ALL_ASPECTS: DevelopmentalAspect[] = [
  'NAM',
  'JATI_DIRI',
  'LITERASI_STEAM',
  'MOTORIK_KASAR',
  'MOTORIK_HALUS',
  'KOGNITIF',
];

export const RATING_WEIGHTS: Record<string, number> = {
  BB: 1,
  MB: 2,
  BSH: 3,
  BSB: 4,
};

export const RATING_PERCENTAGES: Record<string, number> = {
  BB: 25,
  MB: 50,
  BSH: 75,
  BSB: 100,
};

export interface AchievementPredicate {
  code: 'BSB' | 'BSH' | 'MB' | 'BB' | 'BELUM_TERAMATI';
  label: string; // 'BSB' | 'BSH' | 'MB' | 'BB' | 'Belum Ada Penilaian'
  conditionLabel: string; // 'Berkembang Sangat Baik (BSB)' | ... | 'Belum Ada Penilaian'
}

/**
 * Single Source of Truth for converting numerical score (0-100) to achievement predicate.
 * Standard thresholds:
 * - >= 85 : BSB (Berkembang Sangat Baik)
 * - >= 70 : BSH (Berkembang Sesuai Harapan)
 * - >= 45 : MB  (Mulai Berkembang)
 * - < 45  : BB  (Belum Berkembang)
 * - null / undefined / < 0 : BELUM_TERAMATI (Belum Ada Penilaian)
 */
export function getAchievementPredicate(
  score: number | null | undefined
): AchievementPredicate {
  if (score === null || score === undefined || isNaN(score) || score < 0) {
    return {
      code: 'BELUM_TERAMATI',
      label: 'Belum Ada Penilaian',
      conditionLabel: 'Belum Ada Penilaian',
    };
  }
  if (score >= 85) {
    return {
      code: 'BSB',
      label: 'BSB',
      conditionLabel: 'Berkembang Sangat Baik (BSB)',
    };
  }
  if (score >= 70) {
    return {
      code: 'BSH',
      label: 'BSH',
      conditionLabel: 'Berkembang Sesuai Harapan (BSH)',
    };
  }
  if (score >= 45) {
    return {
      code: 'MB',
      label: 'MB',
      conditionLabel: 'Mulai Berkembang (MB)',
    };
  }
  return {
    code: 'BB',
    label: 'BB',
    conditionLabel: 'Belum Berkembang (BB)',
  };
}

/**
 * Normalizes and extracts the aspect key from an indicator item
 */
export function extractIndicatorAspect(ind: any): DevelopmentalAspect {
  const aspectStr = String(
    ind?.aspect || ind?.aspectId || ind?.developmentalAspect || ''
  ).toUpperCase();

  if (
    aspectStr.includes('NAM') ||
    aspectStr.includes('AGAMA') ||
    aspectStr.includes('MORAL')
  ) {
    return 'NAM';
  }
  if (
    aspectStr.includes('JATI') ||
    aspectStr.includes('SOSIAL') ||
    aspectStr.includes('EMOSIONAL')
  ) {
    return 'JATI_DIRI';
  }
  if (
    aspectStr.includes('MOTORIK_KASAR') ||
    (aspectStr.includes('MOTORIK') && aspectStr.includes('KASAR'))
  ) {
    return 'MOTORIK_KASAR';
  }
  if (
    aspectStr.includes('MOTORIK_HALUS') ||
    (aspectStr.includes('MOTORIK') && aspectStr.includes('HALUS'))
  ) {
    return 'MOTORIK_HALUS';
  }
  if (aspectStr.includes('KOGNITIF')) {
    return 'KOGNITIF';
  }
  return 'LITERASI_STEAM';
}

/**
 * Calculates developmental aspect scores (0-100%) from a list of observations.
 * If an aspect has no rated indicators, it returns null (Empty State), never arbitrary 0%.
 * Formula: percentage = (averageRating / 4) * 100
 */
export function calculateStudentAspectScores(
  studentObservations: ObservationRecord[]
): Record<DevelopmentalAspect, number | null> {
  const scores: Record<DevelopmentalAspect, number | null> = {
    NAM: null,
    JATI_DIRI: null,
    LITERASI_STEAM: null,
    MOTORIK_KASAR: null,
    MOTORIK_HALUS: null,
    KOGNITIF: null,
  };

  const totals: Record<DevelopmentalAspect, { sum: number; count: number }> = {
    NAM: { sum: 0, count: 0 },
    JATI_DIRI: { sum: 0, count: 0 },
    LITERASI_STEAM: { sum: 0, count: 0 },
    MOTORIK_KASAR: { sum: 0, count: 0 },
    MOTORIK_HALUS: { sum: 0, count: 0 },
    KOGNITIF: { sum: 0, count: 0 },
  };

  studentObservations.forEach((obs) => {
    (obs.indicators || []).forEach((ind) => {
      if (!ind.rating || ind.rating === 'BELUM_DINILAI') return;
      const weight = RATING_WEIGHTS[ind.rating];
      if (!weight) return;

      const aspect = extractIndicatorAspect(ind);
      totals[aspect].sum += weight;
      totals[aspect].count += 1;
    });
  });

  ALL_ASPECTS.forEach((key) => {
    const { sum, count } = totals[key];
    if (count === 0) {
      scores[key] = null;
    } else {
      // Max possible score per rated indicator is 4 (BSB)
      scores[key] = Math.round((sum / (count * 4)) * 100);
    }
  });

  return scores;
}

/**
 * Calculates MACRO-AVERAGE overall score from aspect scores.
 * Rule: average only non-null aspect scores.
 * If all aspects are null, returns null (never arbitrary 0%).
 */
export function calculateOverallScore(
  aspectScores: Record<DevelopmentalAspect, number | null>
): number | null {
  const validScores = Object.values(aspectScores).filter(
    (val): val is number => typeof val === 'number' && !isNaN(val)
  );

  if (validScores.length === 0) return null;

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / validScores.length);
}

/**
 * Enriches student master profile dynamically with calculated metrics derived
 * strictly from real Firestore observations.
 */
export function enrichStudentWithObservations(
  student: StudentProfile,
  allObservations: ObservationRecord[]
): StudentProfile {
  const studentObs = allObservations.filter(
    (o) => o.studentId === student.id || (o as any).student_id === student.id
  );

  const aspectScores = calculateStudentAspectScores(studentObs);
  const overallScore = calculateOverallScore(aspectScores);

  let latestDate: string | undefined = undefined;
  if (studentObs.length > 0) {
    const sorted = [...studentObs].sort((a, b) => {
      const dateA = a.observationDateISO || a.date || '';
      const dateB = b.observationDateISO || b.date || '';
      return dateB.localeCompare(dateA);
    });
    latestDate = sorted[0].date;
  }

  return {
    ...student,
    observationsCount: studentObs.length,
    latestObservationDate: latestDate,
    aspectScores,
    overallScore,
  };
}
