import {
  StudentProfile,
  ObservationRecord,
  SchoolProfile,
  DevelopmentalAspect,
} from '../types';
import { ASPECT_LABELS } from '../data/initialData';
import { getStudentAgeContext } from '../utils/ageUtils';
import {
  extractIndicatorAspect,
  getAchievementPredicate,
  calculateOverallScore,
  RATING_PERCENTAGES,
} from '../utils/studentMetrics';

export interface ObservedIndicatorItem {
  text: string;
  rating: string;
  ratingLabel: string;
  activityTitle?: string;
  date?: string;
}

export interface AspectDetailedReportItem {
  aspectKey: DevelopmentalAspect;
  aspectTitle: string;
  score: number | null; // null if no data
  scoreDisplay: string; // "85%" or "Belum Teramati"
  ratingLevel: 'BB' | 'MB' | 'BSH' | 'BSB' | 'BELUM_TERAMATI';
  ratingLabel: string; // 'BSH' | 'MB' | 'BSB' | 'BB' | 'Belum Teramati'
  conditionLabel: string; // 'Berkembang Sesuai Harapan (BSH)'
  whatIsObserved: string; // Specific observed behavior in parent language
  whatNeedsStrengthening: string; // Actionable positive growth focus
  hasSufficientData: boolean;
  relatedIndicatorsCount: number;
  observedIndicators: ObservedIndicatorItem[];
  observationNotes: string[];
  supportingActivities: string[];
  supportingEvidence?: {
    activityTitle: string;
    note?: string;
    photoUrl?: string;
    date?: string;
  }[];
}

export interface DevelopedPointItem {
  aspect: string;
  title: string;
  behavior: string;
  activityContext?: string;
  date?: string;
}

export interface GrowthPointItem {
  aspect: string;
  title: string;
  recommendation: string;
}

export interface HomeStimulationItem {
  title: string; // Nama kegiatan
  purpose: string; // Tujuan
  howTo: string; // Cara melakukan
  materials: string; // Alat/bahan sederhana
  duration: string; // Durasi
  aspectStimulated: string; // Kemampuan/aspek yang distimulasi
  skillTrained: string; // Melatih kemampuan spesifik
  activity: string; // Deskripsi singkat
  curriculumContext?: string; // CP / TP relevan
}

export interface AuthenticEvidenceReportItem {
  id: string;
  title: string;
  activityTitle: string;
  date: string;
  url?: string;
  caption: string;
  isAssessmentLinked?: boolean;
  aspectName?: string;
  curriculumContext?: string;
  tags?: string[];
}

export interface CanonicalReportDocument {
  metadata: {
    documentTitle: string;
    documentSubtitle: string;
    academicYear: string;
    semester: string;
    generatedDate: string;
    reportStatus: 'BELUM' | 'PROSES' | 'REPORT_READY';
    statusLabel: string;
    fileBaseName: string;
  };
  school: {
    name: string;
    address: string;
    cityName: string;
    principalName: string;
    logoUrl?: string | null;
  };
  student: {
    id: string;
    nisn: string;
    fullName: string;
    nickname: string;
    className: string;
    parentName: string;
    avatar?: string | null;
    ageDisplay: string;
    ageYears: number | null;
    ageMonths: number | null;
    phaseName: string;
    ageGroup: string;
    pedagogicalContext: string;
  };
  observationSummary: {
    totalObservations: number;
    totalRatedIndicators: number;
    dateRangeText: string;
    latestObservationDate: string;
    hasAIAnalysis: boolean;
  };
  overallSummary: {
    title: string;
    description: string; // 60 - 85 words concise parent-friendly synthesis
    overallPercentage?: number | null;
    topStrengths?: string[];
    emergingAreas?: string[];
  };
  aspects: AspectDetailedReportItem[];
  overallPercentage: number | null;
  visualSummary?: {
    strengths: string[];
    emerging: string[];
    needsReinforcement: string[];
    mostProminentSkill: string;
    furtherStimulationPriority: string;
  };
  teacherNotesData?: {
    generalNote: string;
    positiveToMaintain: string;
    areasToStrengthen: string;
    additionalNote?: string;
    teacherName: string;
    principalName: string;
    reportDate: string;
  };
  quickSummary: {
    topDeveloped: {
      aspect: string;
      status: string;
      detail: string;
    };
    emerging: {
      aspect: string;
      status: string;
      detail: string;
    };
    needsStimulation: {
      aspect: string;
      status: string;
      detail: string;
    };
  };
  rubricGuide: {
    code: string;
    name: string;
    description: string;
  }[];
  // Core Sections:
  developedPoints: DevelopedPointItem[]; // Max 3-4 points
  growthPoints: GrowthPointItem[]; // Max 2-3 points
  homeStimulations: HomeStimulationItem[]; // Max 3-4 activities
  evidences: AuthenticEvidenceReportItem[]; // 2-3 authentic photos (or empty if none)
  teacherMessage: string; // Warm 40-55 words personal note
  signatures: {
    parent: {
      label: string;
      name: string;
      signatureDataUrl?: string | null;
      isAuthorized?: boolean;
      authorizedAt?: string | null;
    };
    teacher: {
      label: string;
      name: string;
      locationAndDate: string;
      nip?: string;
      signatureDataUrl?: string | null;
      isAuthorized?: boolean;
      authorizedAt?: string | null;
      authorizedBy?: string | null;
      verificationCode?: string | null;
    };
    principal: {
      label: string;
      name: string;
      nip?: string;
      signatureDataUrl?: string | null;
      isAuthorized?: boolean;
      authorizedAt?: string | null;
      authorizedBy?: string | null;
      verificationCode?: string | null;
    };
    authorizationStatus?: 'UNAUTHORIZED' | 'PARTIALLY_AUTHORIZED' | 'FULLY_AUTHORIZED';
  };
}

/**
 * Truncates text cleanly to a maximum word count without breaking mid-sentence if possible.
 */
function trimToWordCount(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  const trimmed = words.slice(0, maxWords).join(' ');
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot > trimmed.length * 0.6) {
    return trimmed.substring(0, lastDot + 1);
  }
  return trimmed + '.';
}

/**
 * Single Source of Truth: Canonical Report Builder
 * Synthesizes multi-source data (rubric scores, anecdotes, voice note transcript, authentic photos, context)
 * into a clean, parent-friendly 2-Page A4 report format.
 */
export function buildCanonicalReportDocument(
  student: StudentProfile | null,
  observations: ObservationRecord[] = [],
  schoolProfile: SchoolProfile,
  customOverrides?: {
    schoolName?: string;
    schoolAddress?: string;
    logoUrl?: string | null;
    digitalSignatures?: {
      teacher?: {
        signerName?: string;
        signerTitle?: string;
        nip?: string;
        signatureDataUrl?: string | null;
        isAuthorized?: boolean;
        authorizedAt?: string | null;
        verificationCode?: string | null;
        locationAndDate?: string;
      } | null;
      principal?: {
        signerName?: string;
        signerTitle?: string;
        nip?: string;
        signatureDataUrl?: string | null;
        isAuthorized?: boolean;
        authorizedAt?: string | null;
        verificationCode?: string | null;
      } | null;
      parent?: {
        signerName?: string;
        signatureDataUrl?: string | null;
        isAuthorized?: boolean;
        authorizedAt?: string | null;
      } | null;
    };
  }
): CanonicalReportDocument {
  const activeYear = schoolProfile.academicYear || '2026/2027';
  const activeSem = schoolProfile.semester || 'Semester I (Ganjil)';
  const activeSchoolName =
    customOverrides?.schoolName?.trim() ||
    schoolProfile.schoolName?.trim() ||
    'PAUD Melati Terpadu';
  const activeAddress =
    customOverrides?.schoolAddress?.trim() ||
    schoolProfile.address?.trim() ||
    'Jakarta, Indonesia';
  const cityName = activeAddress.split(',')[0]?.trim() || 'Jakarta';
  const principalName = schoolProfile.principalName?.trim() || 'Kepala Sekolah';

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const ageContext = getStudentAgeContext(student);
  const studentName = student?.name || 'Peserta Didik';
  const studentNick = student?.nickname || studentName.split(' ')[0] || 'Ananda';
  const className = student?.className || 'TK Kelompok B';
  const parentName = student?.parentName?.trim() || 'Orang Tua / Wali';
  const nisn = (student as any)?.nisn || student?.id || '-';

  const sanitizedStudent = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedSem = activeSem.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedYear = activeYear.replace(/[^a-zA-Z0-9]/g, '_');
  const fileBaseName = `Laporan_Perkembangan_${sanitizedStudent}_${sanitizedSem}_${sanitizedYear}`;

  // 1. Filter student observations strictly for the student
  const childObs = (observations || []).filter(
    (o) => o && (o.studentId === student?.id || (o as any).student_id === student?.id)
  );

  // 2. Map and aggregate observation data across the 6 developmental aspects
  const aspectMap: Record<
    DevelopmentalAspect,
    {
      sum: number;
      count: number;
      indicators: { text: string; rating: string; actTitle: string; date?: string }[];
      notes: string[];
      activities: string[];
      evidences: { activityTitle: string; note?: string; photoUrl?: string; date?: string }[];
    }
  > = {
    NAM: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
    JATI_DIRI: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
    LITERASI_STEAM: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
    MOTORIK_KASAR: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
    MOTORIK_HALUS: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
    KOGNITIF: { sum: 0, count: 0, indicators: [], notes: [], activities: [], evidences: [] },
  };

  let totalSum = 0;
  let totalCount = 0;
  const teacherNamesSet = new Set<string>();
  const teacherNotes: string[] = [];
  const rawEvidences: {
    id: string;
    title: string;
    activityTitle: string;
    date: string;
    url?: string;
    caption: string;
    isLinked: boolean;
    timestamp: number;
    aspectName?: string;
    curriculumContext?: string;
  }[] = [];

  const rawDeveloped: DevelopedPointItem[] = [];
  const rawGrowth: GrowthPointItem[] = [];

  childObs.forEach((obs) => {
    if (obs.teacherName) teacherNamesSet.add(obs.teacherName);
    if (obs.teacherNote && obs.teacherNote.trim()) {
      teacherNotes.push(obs.teacherNote.trim());
    }
    const obsNoteText = (obs as any).notes || obs.teacherNote || (obs as any).anecdote || obs.voiceNoteText || '';

    const actTitle = obs.activityTitle || 'Kegiatan Pembelajaran';
    const obsDate = obs.date || todayFormatted;
    const hasIndicators = Boolean(obs.indicators && obs.indicators.length > 0);
    const themeName = (obs as any).theme || obs.themeId;
    const subThemeName = (obs as any).subTheme || obs.subthemeId;
    const currCtx = themeName ? `${themeName}${subThemeName ? ` • ${subThemeName}` : ''}` : undefined;

    // Determine primary aspect for observation if available
    let primaryAspectName: string | undefined = undefined;
    if ((obs as any).aspect) {
      primaryAspectName = (ASPECT_LABELS as any)[(obs as any).aspect] || (obs as any).aspect;
    }

    // Collect Photos / Evidences
    if (obs.evidences && obs.evidences.length > 0) {
      obs.evidences.forEach((ev, idx) => {
        if (ev && ev.url && ev.url.trim().length > 0) {
          rawEvidences.push({
            id: ev.id || `ev-${obs.id}-${idx}`,
            title: ev.title || `Dokumentasi ${idx + 1}`,
            activityTitle: actTitle,
            date: obsDate,
            url: ev.url,
            caption:
              ev.caption && ev.caption.trim().length > 0
                ? ev.caption.trim()
                : `Ananda aktif berpartisipasi dan menunjukkan ketertarikan tinggi saat kegiatan ${actTitle}.`,
            isLinked: hasIndicators,
            timestamp: new Date(obs.observationDateISO || obs.createdAt || Date.now()).getTime(),
            aspectName: primaryAspectName,
            curriculumContext: currCtx,
          });
        }
      });
    }

    // Process Indicators
    (obs.indicators || []).forEach((ind) => {
      if (!ind.rating || ind.rating === 'BELUM_DINILAI') return;
      const score = RATING_PERCENTAGES[ind.rating];
      if (score === undefined) return;

      totalSum += score;
      totalCount += 1;

      const matchedAspect = extractIndicatorAspect(ind);

      aspectMap[matchedAspect].sum += score;
      aspectMap[matchedAspect].count += 1;
      aspectMap[matchedAspect].indicators.push({
        text: ind.text,
        rating: ind.rating,
        actTitle,
        date: obsDate,
      });

      if (!aspectMap[matchedAspect].activities.includes(actTitle)) {
        aspectMap[matchedAspect].activities.push(actTitle);
      }

      if (obsNoteText && !aspectMap[matchedAspect].notes.includes(obsNoteText)) {
        aspectMap[matchedAspect].notes.push(obsNoteText);
      }

      if (obs.evidences && obs.evidences.length > 0) {
        obs.evidences.forEach((ev) => {
          if (ev?.url) {
            aspectMap[matchedAspect].evidences.push({
              activityTitle: actTitle,
              note: ev.caption || obsNoteText,
              photoUrl: ev.url,
              date: obsDate,
            });
          }
        });
      }

      if (ind.rating === 'BSB' || ind.rating === 'BSH') {
        rawDeveloped.push({
          aspect: ASPECT_LABELS[matchedAspect],
          title: ind.text,
          behavior: `Mampu ${ind.text.toLowerCase()} secara mandiri dan percaya diri.`,
          activityContext: actTitle,
          date: obsDate,
        });
      } else if (ind.rating === 'MB' || ind.rating === 'BB') {
        rawGrowth.push({
          aspect: ASPECT_LABELS[matchedAspect],
          title: ind.text,
          recommendation: `Kemampuan ${ind.text.toLowerCase()} mulai muncul dan terus dikuatkan dengan latihan teratur.`,
        });
      }
    });
  });

  // 3. Aspect Specific Synthesis (Parent-Friendly Observations & Growth Points)
  const aspectKeys: DevelopmentalAspect[] = [
    'NAM',
    'JATI_DIRI',
    'LITERASI_STEAM',
    'MOTORIK_KASAR',
    'MOTORIK_HALUS',
    'KOGNITIF',
  ];

  const defaultAspectInsights: Record<
    DevelopmentalAspect,
    { observed: string; strengthen: string }
  > = {
    NAM: {
      observed: 'Mengenal doa harian, membiasakan salam, dan bersikap sopan santun.',
      strengthen: 'Membiasakan perilaku berbagi dan merawat ciptaan Tuhan.',
    },
    JATI_DIRI: {
      observed: 'Mandiri merapikan alat main dan berinteraksi positif dengan teman.',
      strengthen: 'Meningkatkan rasa percaya diri saat menyampaikan ide di depan kelas.',
    },
    LITERASI_STEAM: {
      observed: 'Antusias menyimak cerita, mengenali simbol huruf, dan bereksplorasi.',
      strengthen: 'Memperkaya kosakata baru melalui percakapan dan tanya jawab.',
    },
    MOTORIK_KASAR: {
      observed: 'Lincah bergerak, mampu melompat, berlari, dan menjaga keseimbangan.',
      strengthen: 'Melatih ketahanan fisik melalui permainan gerak berirama.',
    },
    MOTORIK_HALUS: {
      observed: 'Mampu memegang krayon, meremas plastisin, dan menggunting pola sederhana.',
      strengthen: 'Melatih kelenturan jari melalui kegiatan meronce dan melipat.',
    },
    KOGNITIF: {
      observed: 'Mampu mengenali bentuk, membedakan warna, dan mengelompokkan benda.',
      strengthen: 'Meningkatkan daya fokus dalam menuntaskan teka-teki sederhana.',
    },
  };

  const aspects: AspectDetailedReportItem[] = aspectKeys.map((key) => {
    const data = aspectMap[key];
    const aspectTitle = ASPECT_LABELS[key] || key;

    let score: number | null = null;
    if (data.count > 0) {
      score = Math.round(data.sum / data.count);
    } else if (student?.aspectScores && typeof student.aspectScores[key] === 'number') {
      score = student.aspectScores[key];
    }

    const predicate = getAchievementPredicate(score);
    const ratingLevel = predicate.code;
    const ratingLabel = predicate.label === 'Belum Ada Penilaian' ? 'Belum Teramati' : predicate.label;
    const conditionLabel =
      predicate.conditionLabel === 'Belum Ada Penilaian'
        ? 'Belum Cukup Teramati'
        : predicate.conditionLabel;

    // Synthesize real behavior description if indicators exist
    let whatIsObserved = 'Belum tersedia cukup data asesmen terukur.';
    let whatNeedsStrengthening = 'Pengamatan guru akan terus dilengkapi seiring proses bermain di sekolah.';

    if (data.indicators.length > 0) {
      const topInds = data.indicators.map((i) => i.text);
      if (topInds.length > 0) {
        whatIsObserved = `Tampak berproses saat ${topInds[0].toLowerCase()}${
          topInds.length > 1 ? ` serta ${topInds[1].toLowerCase()}` : ''
        }.`;
        whatNeedsStrengthening = `Kemampuan pada aspek ini terus dikuatkan melalui pembiasaan bermain bermakna.`;
      }
    }

    const observedIndicators: ObservedIndicatorItem[] = data.indicators.map((ind) => {
      const pred = getAchievementPredicate(RATING_PERCENTAGES[ind.rating] ?? 75);
      return {
        text: ind.text,
        rating: ind.rating,
        ratingLabel: pred.label === 'Belum Ada Penilaian' ? ind.rating : pred.label,
        activityTitle: ind.actTitle,
        date: ind.date,
      };
    });

    const supportingActivities = Array.from(new Set(data.activities));
    const observationNotes = Array.from(new Set(data.notes.filter(Boolean)));
    const supportingEvidence = data.evidences.slice(0, 3);

    return {
      aspectKey: key,
      aspectTitle,
      score,
      scoreDisplay: score !== null ? `${score}%` : 'Belum Teramati',
      ratingLevel,
      ratingLabel,
      conditionLabel,
      whatIsObserved,
      whatNeedsStrengthening,
      hasSufficientData: score !== null,
      relatedIndicatorsCount: data.count,
      observedIndicators,
      observationNotes,
      supportingActivities,
      supportingEvidence,
    };
  });

  const aspectScoresMap: Record<DevelopmentalAspect, number | null> = {
    NAM: null,
    JATI_DIRI: null,
    LITERASI_STEAM: null,
    MOTORIK_KASAR: null,
    MOTORIK_HALUS: null,
    KOGNITIF: null,
  };
  aspects.forEach((a) => {
    aspectScoresMap[a.aspectKey] = a.score;
  });

  const overallPercentage = calculateOverallScore(aspectScoresMap);

  // 4. Quick Overview Cards for Radar Chart (Parent-Friendly)
  const sortedAspectsByScore = [...aspects].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  const topAspect = sortedAspectsByScore[0] || aspects[1]; // Jati Diri default
  const emergingAspect =
    sortedAspectsByScore.find((a) => a.ratingLevel === 'MB') ||
    sortedAspectsByScore[Math.min(2, sortedAspectsByScore.length - 1)] ||
    aspects[5];
  const lowestAspect =
    sortedAspectsByScore.find((a) => a.ratingLevel === 'BB' || a.ratingLevel === 'BELUM_TERAMATI') ||
    sortedAspectsByScore[sortedAspectsByScore.length - 1] ||
    aspects[2];

  const quickSummary = {
    topDeveloped: {
      aspect: topAspect.aspectTitle,
      status: topAspect.ratingLabel,
      detail: topAspect.whatIsObserved,
    },
    emerging: {
      aspect: emergingAspect.aspectTitle,
      status: emergingAspect.ratingLabel,
      detail: emergingAspect.whatIsObserved,
    },
    needsStimulation: {
      aspect: lowestAspect.aspectTitle,
      status: lowestAspect.ratingLabel,
      detail: lowestAspect.whatNeedsStrengthening,
    },
  };

  // 5. Overall Synthesis Narrative (Max 60 - 85 Words, Warm & Insightful)
  let summaryNarrative = '';
  if (totalCount > 0 && overallPercentage !== null) {
    summaryNarrative = `Ananda ${studentNick} menunjukkan proses belajar dan bermain yang aktif di kelas ${className}. Berdasarkan pengamatan terukur pada periode ini, capaian perkembangan ananda tercatat ${overallPercentage}% dengan kekuatan utama pada aspek ${topAspect.aspectTitle}. Stimulasi terarah terus diberikan guru dan orang tua untuk menguatkan aspek yang sedang berkembang.`;
  } else if (student?.timeline?.[0]?.description) {
    summaryNarrative = student.timeline[0].description;
  } else {
    summaryNarrative = `Laporan perkembangan Ananda ${studentNick} pada periode ini sedang dalam tahap pengumpulan data observasi autentik kelas. Belum tersedia cukup data asesmen terukur untuk menyimpulkan capaian keseluruhan. Catatan dan dokumentasi akan terus diperbarui oleh guru.`;
  }
  summaryNarrative = trimToWordCount(summaryNarrative, 80);

  // 6. Legenda Kamus Tingkat Capaian (Sederhana & Mudah Dipahami Orang Tua)
  const rubricGuide = [
    {
      code: 'BB',
      name: 'Belum Berkembang',
      description: 'Kemampuan belum terlihat konsisten dan masih membutuhkan banyak bantuan.',
    },
    {
      code: 'MB',
      name: 'Mulai Berkembang',
      description: 'Kemampuan mulai terlihat, terutama ketika mendapat contoh, pengingat, atau dorongan.',
    },
    {
      code: 'BSH',
      name: 'Berkembang Sesuai Harapan',
      description: 'Kemampuan sudah terlihat dan dilakukan secara mandiri sesuai tahap usia ananda.',
    },
    {
      code: 'BSB',
      name: 'Berkembang Sangat Baik',
      description: 'Kemampuan terlihat sangat baik, mandiri, konsisten, dan dapat membantu teman.',
    },
  ];

  // 7. Photo Selection Mechanism (Max 2 - 3 Authentic Evidence Photos)
  const uniqueEvidencesMap = new Map<string, (typeof rawEvidences)[0]>();
  rawEvidences.forEach((ev) => {
    if (ev.url && !uniqueEvidencesMap.has(ev.url)) {
      uniqueEvidencesMap.set(ev.url, ev);
    }
  });

  const sortedEvidences = Array.from(uniqueEvidencesMap.values()).sort((a, b) => {
    if (a.isLinked && !b.isLinked) return -1;
    if (!a.isLinked && b.isLinked) return 1;
    return b.timestamp - a.timestamp;
  });

  const selectedEvidences: AuthenticEvidenceReportItem[] = sortedEvidences
    .slice(0, 6)
    .map((ev) => {
      let shortCap = ev.caption.trim();
      const firstSentence = shortCap.split('.')[0];
      if (firstSentence && firstSentence.length > 10) {
        shortCap = firstSentence.trim() + '.';
      }
      return {
        id: ev.id,
        title: ev.title,
        activityTitle: ev.activityTitle,
        date: ev.date,
        url: ev.url,
        caption: shortCap,
        isAssessmentLinked: ev.isLinked,
        aspectName: ev.aspectName,
        curriculumContext: ev.curriculumContext,
      };
    });

  // 8. Structured "Yang Sudah Berkembang" (Max 3 - 4 Poin Konkret dalam Bahasa Orang Tua)
  const developedPoints: DevelopedPointItem[] = [];
  if (rawDeveloped.length > 0) {
    const uniqueTitles = new Set<string>();
    rawDeveloped.forEach((p) => {
      if (!uniqueTitles.has(p.title) && developedPoints.length < 4) {
        uniqueTitles.add(p.title);
        developedPoints.push(p);
      }
    });
  }
  if (developedPoints.length === 0) {
    developedPoints.push({
      aspect: 'Status Asesmen',
      title: 'Data Asesmen Terukur',
      behavior: 'Belum tersedia cukup data asesmen terukur untuk memetakan capaian ananda pada periode ini.',
      activityContext: 'Pengamatan Berjalan',
      date: todayFormatted,
    });
  }

  // 9. Structured "Masih Perlu Dikembangkan" (Max 2 - 3 Poin Positif & Membangun)
  const growthPoints: GrowthPointItem[] = [];
  if (rawGrowth.length > 0) {
    const uniqueTitles = new Set<string>();
    rawGrowth.forEach((p) => {
      if (!uniqueTitles.has(p.title) && growthPoints.length < 3) {
        uniqueTitles.add(p.title);
        growthPoints.push(p);
      }
    });
  }
  if (growthPoints.length === 0) {
    growthPoints.push({
      aspect: 'Status Perkembangan',
      title: 'Penguatan Terjadwal',
      recommendation: 'Belum tersedia cukup data asesmen terukur. Pengamatan autentik guru akan terus diperbarui pada kegiatan bermain selanjutnya.',
    });
  }

  // 10. Bagian 8 — Rekomendasi Stimulasi di Rumah (WAJIB ADA, Realistis, Sederhana & Menyenangkan)
  const homeStimulations: HomeStimulationItem[] = [];

  // Rekomendasi 1: Stimulasi khusus penguatan aspek/indikator yang masih berkembang
  if (emergingAspect.aspectKey === 'NAM') {
    homeStimulations.push({
      title: 'Kisah Kejujuran & Doa Bersama Sebelum Tidur',
      purpose: 'Membiasakan ananda bersyukur, berdoa mandiri, dan menumbuhkan empati sejak dini.',
      howTo: `1. Ajak Ananda ${studentNick} duduk santai sebelum tidur. 2. Bacakan 1 cerita bergambar tentang tolong-menolong atau kejujuran. 3. Berikan giliran ananda memimpin doa singkat dengan kata-katanya sendiri.`,
      materials: 'Buku cerita dongeng anak bergambar atau buku kisah teladan.',
      duration: '15–20 menit setiap malam',
      aspectStimulated: 'Nilai Agama & Budi Pekerti (Empati, Pembiasaan Doa Mandiri)',
      skillTrained: 'Mengenal nilai moral, empati sosial, dan pembiasaan doa harian.',
      activity: 'Membaca buku cerita budi pekerti dan bergantian memimpin doa tidur bersama orang tua.',
      curriculumContext: 'Elemen Nilai Agama dan Budi Pekerti',
    });
  } else if (emergingAspect.aspectKey === 'JATI_DIRI') {
    homeStimulations.push({
      title: 'Misi Mandiri: Merapikan Mainan dan Memilih Pakaian Sendiri',
      purpose: 'Melatih kemandirian, tanggung jawab atas barang pribadi, dan regulasi emosi ananda di rumah.',
      howTo: `1. Berikan ananda 2 pilihan pakaian dan biarkan ia memutuskan pilihannya sendiri. 2. Nyalakan lagu ceria berdurasi 3 menit saat waktu merapikan mainan ke keranjang. 3. Beri pelukan hangat dan apresiasi atas usahanya.`,
      materials: 'Keranjang mainan ananda, pakaian sehari-hari, lagu anak ceria.',
      duration: '10–15 menit',
      aspectStimulated: 'Jati Diri (Kemandirian, Tanggung Jawab, Regulasi Emosi)',
      skillTrained: 'Kemandirian memilih dan merapikan perlengkapan pribadi tanpa disuruh berulang.',
      activity: 'Permainan merapikan mainan ke keranjang sambil bernyanyi riang.',
      curriculumContext: 'Elemen Jati Diri - Regulasi Diri & Kemandirian',
    });
  } else if (emergingAspect.aspectKey === 'MOTORIK_HALUS') {
    homeStimulations.push({
      title: 'Meremas Adonan Tepung atau Plastisin Rumahan',
      purpose: 'Menguatkan otot-otot jari tangan (koordinasi motorik halus) untuk kesiapan memegang pensil dan menulis.',
      howTo: `1. Sediakan plastisin ramah anak atau adonan tepung rumahan. 2. Ajak ananda meremas, menggulung seperti mie/ular, dan membuat bola-bola kecil. 3. Tancapkan sedotan atau manik-manik aman pada adonan.`,
      materials: 'Plastisin ramah anak atau adonan tepung terigu + minyak, potongan sedotan.',
      duration: '15–20 menit',
      aspectStimulated: 'Motorik Halus (Kekuatan Jari Jemari, Koordinasi Mata-Tangan)',
      skillTrained: 'Kekuatan genggaman jari dan kelenturan pergelangan tangan.',
      activity: 'Membuat kreasi adonan plastisin berbagai bentuk dan menancapkan sedotan warna-warni.',
      curriculumContext: 'Elemen Jati Diri / Fisik Motorik Halus',
    });
  } else if (emergingAspect.aspectKey === 'MOTORIK_KASAR') {
    homeStimulations.push({
      title: 'Jalur Rintangan Karpet Ajaib (Obstacle Course Rumahan)',
      purpose: 'Melatih keseimbangan tubuh, kelincahan gerak, dan kekuatan motorik kasar ananda.',
      howTo: `1. Letakkan 3-4 bantal kecil di lantai sebagai pulau batu. 2. Ajak ananda melompati pulau tanpa menyentuh lantai seperti menyeberangi sungai. 3. Tambahkan tantangan berjalan jinjit di atas garis lurus selotip.`,
      materials: 'Bantal lantai, selotip kertas ramah lantai, matras.',
      duration: '15–20 menit',
      aspectStimulated: 'Motorik Kasar (Keseimbangan, Koordinasi Tubuh, Kelincahan)',
      skillTrained: 'Keseimbangan dinamis dan koordinasi motorik kasar seluruh tubuh.',
      activity: 'Melompati bantal-bantal pulau dan berjalan jinjit mengikuti lintasan garis lantai.',
      curriculumContext: 'Elemen Jati Diri / Fisik Motorik Kasar',
    });
  } else {
    homeStimulations.push({
      title: 'Detektif Benda Rumah: Menghitung & Mengelompokkan Warna',
      purpose: 'Melatih kemampuan berpikir logis, klasifikasi benda nyata, dan literasi matematika awal.',
      howTo: `1. Ajak ananda mencari 3 sendok dan 3 wadah plastik di dapur. 2. Ajak mengelompokkan berdasarkan warna dan ukuran dari yang terkecil ke terbesar. 3. Hitung bersama-sama benda yang berhasil dikumpulkan.`,
      materials: 'Peralatan makan plastik aman, buah-buahan, atau mainan ananda di rumah.',
      duration: '15–20 menit',
      aspectStimulated: 'Dasar-dasar Literasi, Matematika, Sains & Teknologi (Kognitif)',
      skillTrained: 'Klasifikasi logis, korespondensi angka-benda, dan kemampuan observasi kritis.',
      activity: 'Bermain mengelompokkan dan menghitung benda aman di sekitar rumah bersama Ayah/Bunda.',
      curriculumContext: 'Elemen Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
    });
  }

  // Rekomendasi 2: Stimulasi Literasi & Bahasa Ekspresif Berdasarkan Kekuatan Anak
  homeStimulations.push({
    title: 'Pojok Bincang Ceria: Bertukar Cerita Hari Ini',
    purpose: 'Menguatkan literasi bahasa ekspresif, memperluas kosakata, dan membangun kedekatan emosional.',
    howTo: `1. Duduk berhadapan santai dengan kontak mata hangat. 2. Tanyakan pertanyaan terbuka: "Momen apa yang paling bikin ananda tersenyum hari ini?". 3. Dengarkan dengan sabar tanpa memotong kalimat ananda, lalu berikan tanggapan apresiatif.`,
    materials: 'Suasana tenang di ruang keluarga atau meja makan.',
    duration: '10–15 menit setiap hari',
    aspectStimulated: 'Literasi Bahasa & Komunikasi Emosional (Sosio-Emosional)',
    skillTrained: 'Kemampuan menyusun kalimat runtut, percaya diri bercerita, dan mengenali emosi diri.',
    activity: 'Berbincang santai bertukar cerita pengalaman berkesan harian antara anak dan orang tua.',
    curriculumContext: 'Literasi Awal & Pengembangan Sosio-Emosional',
  });

  // Rekomendasi 3: Eksplorasi Seni & STEAM Menggunakan Bahan Alam (Loose Parts)
  homeStimulations.push({
    title: 'Kreasi Kolase Daun dan Ranting di Halaman',
    purpose: 'Melatih daya cipta seni, apresiasi lingkungan alam sekitar, dan imajinasi eksploratif.',
    howTo: `1. Ajak ananda berjalan di halaman memungut 5 lembar daun gugur dan ranting kecil. 2. Sediakan kertas gambar dan lem aman. 3. Biarkan ananda menempel dan membentuk gambar hewan, kendaraan, atau wajah sesuai imajinasinya.`,
    materials: 'Dedaunan kering yang gugur, ranting kecil, kertas gambar, lem kertas.',
    duration: '20–25 menit',
    aspectStimulated: 'Seni, Kreativitas & STEAM Bahan Alam (Loose Parts)',
    skillTrained: 'Eksplorasi sensorik bahan alam, kepekaan estetika, dan berpikir kreatif mandiri.',
    activity: 'Membuat kolase bentuk imajinatif dari dedaunan kering yang dipungut bersama di sekitar rumah.',
    curriculumContext: 'Seni dan Eksplorasi Lingkungan Alam Sekitar',
  });

  // 11. Pesan Hangat Wali Kelas (Max 40 - 50 Kata)
  let rawTeacherMessage = '';
  if (teacherNotes.length > 0) {
    rawTeacherMessage = teacherNotes[0];
  } else if (totalCount > 0) {
    rawTeacherMessage = `Terima kasih kepada Ayah dan Bunda atas kerjasama yang baik dalam mendampingi tumbuh kembang Ananda ${studentNick}. Mari kita terus bersinergi mendukung ananda dengan stimulasi bermain yang menyenangkan di rumah.`;
  } else {
    rawTeacherMessage = `Buku laporan perkembangan Ananda ${studentNick} memuat catatan proses belajar autentik di sekolah. Guru dan sekolah siap berkolaborasi bersama orang tua dalam memantau setiap langkah perkembangan ananda.`;
  }
  const teacherMessage = trimToWordCount(rawTeacherMessage, 50);

  // 12. Signatures & Status
  const teacherName =
    teacherNamesSet.size > 0
      ? Array.from(teacherNamesSet).join(', ')
      : 'Guru Wali Kelas';

  let reportStatus: 'BELUM' | 'PROSES' | 'REPORT_READY' = 'BELUM';
  if (childObs.length > 0) {
    reportStatus = childObs.some((o) => o.status === 'REPORT_READY' || o.status === 'VERIFIED')
      ? 'REPORT_READY'
      : 'PROSES';
  } else if (
    student?.reportStatus === 'SELESAI' ||
    (student?.reportStatus as any) === 'REPORT_READY'
  ) {
    reportStatus = 'REPORT_READY';
  }

  const statusLabel =
    reportStatus === 'REPORT_READY'
      ? 'Terverifikasi & Siap Dibagikan ke Orang Tua'
      : 'Sedang Dalam Proses Pengamatan';

  return {
    metadata: {
      documentTitle: 'LAPORAN PERKEMBANGAN ANAK',
      documentSubtitle: `KURIKULUM MERDEKA PAUD • ${activeSem.toUpperCase()} • TAHUN AJARAN ${activeYear}`,
      academicYear: activeYear,
      semester: activeSem,
      generatedDate: todayFormatted,
      reportStatus,
      statusLabel,
      fileBaseName,
    },
    school: {
      name: activeSchoolName,
      address: activeAddress,
      cityName,
      principalName,
      logoUrl: customOverrides?.logoUrl ?? schoolProfile.schoolLogo ?? null,
    },
    student: {
      id: student?.id || 'ID-SISWA',
      nisn,
      fullName: studentName,
      nickname: studentNick,
      className,
      parentName,
      avatar: student?.avatar || null,
      ageDisplay: ageContext.ageDisplay,
      ageYears: ageContext.ageYears,
      ageMonths: ageContext.ageMonths,
      phaseName: ageContext.phaseName,
      ageGroup: ageContext.ageGroup,
      pedagogicalContext: ageContext.pedagogicalContext,
    },
    observationSummary: {
      totalObservations: childObs.length,
      totalRatedIndicators: totalCount,
      dateRangeText:
        childObs.length > 0 ? `${childObs.length} Sesi Terverifikasi` : 'Belum Ada Sesi',
      latestObservationDate: student?.latestObservationDate || todayFormatted,
      hasAIAnalysis: childObs.some((o) => Boolean(o.aiAnalysis)),
    },
    overallSummary: {
      title: 'Perkembangan Ananda',
      description: summaryNarrative,
      overallPercentage,
      topStrengths: rawDeveloped.slice(0, 3).map((d) => `${d.aspect}: ${d.title}`),
      emergingAreas: rawGrowth.slice(0, 3).map((g) => `${g.aspect}: ${g.title}`),
    },
    aspects,
    overallPercentage,
    visualSummary: {
      strengths: rawDeveloped.slice(0, 4).map((d) => d.title),
      emerging: rawGrowth.slice(0, 3).map((g) => g.title),
      needsReinforcement: rawGrowth.slice(0, 2).map((g) => g.recommendation || g.title),
      mostProminentSkill: rawDeveloped[0]?.title || `Kemampuan aktif pada aspek ${topAspect.aspectTitle}`,
      furtherStimulationPriority: rawGrowth[0]?.title || `Stimulasi terarah pada aspek ${emergingAspect.aspectTitle}`,
    },
    teacherNotesData: {
      generalNote: teacherMessage,
      positiveToMaintain: rawDeveloped.length > 0
        ? `Pertahankan kemandirian dan antusiasme ananda dalam kegiatan ${rawDeveloped[0].title.toLowerCase()}.`
        : 'Pertahankan antusiasme bermain dan interaksi hangat bersama teman di sekolah.',
      areasToStrengthen: rawGrowth.length > 0
        ? `Dukungan bersama untuk memperkuat ${rawGrowth[0].title.toLowerCase()} melalui stimulasi konsisten.`
        : `Penguatan pada aspek ${emergingAspect.aspectTitle} melalui pembiasaan bermain di rumah.`,
      additionalNote: teacherNotes.length > 1 ? teacherNotes[1] : undefined,
      teacherName: teacherName,
      principalName: principalName,
      reportDate: todayFormatted,
    },
    quickSummary,
    rubricGuide,
    developedPoints: developedPoints.slice(0, 4),
    growthPoints: growthPoints.slice(0, 3),
    homeStimulations: homeStimulations.slice(0, 3),
    evidences: selectedEvidences,
    teacherMessage,
    signatures: (() => {
      const teacherOverride = customOverrides?.digitalSignatures?.teacher;
      const principalOverride = customOverrides?.digitalSignatures?.principal;
      const parentOverride = customOverrides?.digitalSignatures?.parent;

      const isTeacherAuth = Boolean(teacherOverride?.isAuthorized);
      const isPrincipalAuth = Boolean(principalOverride?.isAuthorized);

      let authorizationStatus: 'UNAUTHORIZED' | 'PARTIALLY_AUTHORIZED' | 'FULLY_AUTHORIZED' =
        'UNAUTHORIZED';
      if (isTeacherAuth && isPrincipalAuth) {
        authorizationStatus = 'FULLY_AUTHORIZED';
      } else if (isTeacherAuth || isPrincipalAuth) {
        authorizationStatus = 'PARTIALLY_AUTHORIZED';
      }

      return {
        parent: {
          label: 'Orang Tua / Wali',
          name: parentOverride?.signerName || parentName,
          signatureDataUrl: parentOverride?.signatureDataUrl || null,
          isAuthorized: parentOverride?.isAuthorized ?? false,
          authorizedAt: parentOverride?.authorizedAt || null,
        },
        teacher: {
          label: teacherOverride?.signerTitle || 'Guru Wali Kelas',
          name: teacherOverride?.signerName || teacherName,
          locationAndDate:
            teacherOverride?.locationAndDate || `${cityName}, ${todayFormatted}`,
          nip: teacherOverride?.nip || undefined,
          signatureDataUrl: teacherOverride?.signatureDataUrl || null,
          isAuthorized: isTeacherAuth,
          authorizedAt: teacherOverride?.authorizedAt || null,
          verificationCode: teacherOverride?.verificationCode || null,
        },
        principal: {
          label: principalOverride?.signerTitle || 'Kepala Sekolah',
          name: principalOverride?.signerName || principalName,
          nip: principalOverride?.nip || undefined,
          signatureDataUrl: principalOverride?.signatureDataUrl || null,
          isAuthorized: isPrincipalAuth,
          authorizedAt: principalOverride?.authorizedAt || null,
          verificationCode: principalOverride?.verificationCode || null,
        },
        authorizationStatus,
      };
    })(),
  };
}
