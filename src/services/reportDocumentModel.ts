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
  title: string;
  activity: string;
  skillTrained: string;
}

export interface AuthenticEvidenceReportItem {
  id: string;
  title: string;
  activityTitle: string;
  date: string;
  url?: string;
  caption: string;
  isAssessmentLinked?: boolean;
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
  };
  aspects: AspectDetailedReportItem[];
  overallPercentage: number | null;
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
    };
    teacher: {
      label: string;
      name: string;
      locationAndDate: string;
    };
    principal: {
      label: string;
      name: string;
    };
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
      indicators: { text: string; rating: string; actTitle: string }[];
      notes: string[];
    }
  > = {
    NAM: { sum: 0, count: 0, indicators: [], notes: [] },
    JATI_DIRI: { sum: 0, count: 0, indicators: [], notes: [] },
    LITERASI_STEAM: { sum: 0, count: 0, indicators: [], notes: [] },
    MOTORIK_KASAR: { sum: 0, count: 0, indicators: [], notes: [] },
    MOTORIK_HALUS: { sum: 0, count: 0, indicators: [], notes: [] },
    KOGNITIF: { sum: 0, count: 0, indicators: [], notes: [] },
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
  }[] = [];

  const rawDeveloped: DevelopedPointItem[] = [];
  const rawGrowth: GrowthPointItem[] = [];

  childObs.forEach((obs) => {
    if (obs.teacherName) teacherNamesSet.add(obs.teacherName);
    if (obs.teacherNote && obs.teacherNote.trim()) {
      teacherNotes.push(obs.teacherNote.trim());
    }

    const actTitle = obs.activityTitle || 'Kegiatan Pembelajaran';
    const obsDate = obs.date || todayFormatted;
    const hasIndicators = Boolean(obs.indicators && obs.indicators.length > 0);

    // Collect Photos / Evidences
    if (obs.evidences && obs.evidences.length > 0) {
      obs.evidences.forEach((ev, idx) => {
        if (ev && ev.url && ev.url.trim().length > 0) {
          rawEvidences.push({
            id: ev.id || `ev-${obs.id}-${idx}`,
            title: ev.title || `Foto ${idx + 1}`,
            activityTitle: actTitle,
            date: obsDate,
            url: ev.url,
            caption:
              ev.caption && ev.caption.trim().length > 0
                ? ev.caption.trim()
                : `Ananda aktif berpartisipasi dan menunjukkan ketertarikan tinggi saat kegiatan ${actTitle}.`,
            isLinked: hasIndicators,
            timestamp: new Date(obs.observationDateISO || obs.createdAt || Date.now()).getTime(),
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
      });

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
    let whatIsObserved = defaultAspectInsights[key].observed;
    let whatNeedsStrengthening = defaultAspectInsights[key].strengthen;

    if (data.indicators.length > 0) {
      const topInds = data.indicators.map((i) => i.text);
      if (topInds.length > 0) {
        whatIsObserved = `Tampak aktif saat ${topInds[0].toLowerCase()}${
          topInds.length > 1 ? ` serta ${topInds[1].toLowerCase()}` : ''
        }.`;
      }
    }

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
  const defaultSummary = `Ananda ${studentNick} menunjukkan tumbuh kembang yang sangat menggembirakan di kelas ${className}. Ananda aktif berpartisipasi, mandiri merapikan alat bermain, dan mampu berinteraksi akrab dengan guru maupun teman. Kemampuan eksplorasi serta motorik ananda terus berkembang positif. Selanjutnya, ananda terus didampingi untuk memperkuat kepercayaan diri dalam menyampaikan ide dan mempertahankan fokus kegiatan.`;
  const summaryNarrative = trimToWordCount(
    student?.timeline?.[0]?.description || defaultSummary,
    80
  );

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
    .slice(0, 3)
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
    developedPoints.push(
      {
        aspect: 'Jati Diri',
        title: 'Kemandirian & Tanggung Jawab',
        behavior: 'Mulai mampu merapikan alat bermain sendiri setelah selesai digunakan.',
        activityContext: 'Rutinitas Kelas',
        date: todayFormatted,
      },
      {
        aspect: 'Sosial Emosional',
        title: 'Kerjasama & Berbagi',
        behavior: 'Mau berbagi alat mewarnai dan bermain bersama teman dengan hangat.',
        activityContext: 'Bermain Kelompok',
        date: todayFormatted,
      },
      {
        aspect: 'Kognitif',
        title: 'Mengenali Bentuk & Warna',
        behavior: 'Mampu mengenali dan mengelompokkan beberapa benda berdasarkan cirinya.',
        activityContext: 'Sentra Balok & Eksplorasi',
        date: todayFormatted,
      }
    );
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
    growthPoints.push(
      {
        aspect: 'Bahasa & Kepercayaan Diri',
        title: 'Keberanian Menyampaikan Pendapat',
        recommendation: `Masih perlu dukungan dan dorongan lembut untuk menyampaikan jawaban secara lebih percaya diri.`,
      },
      {
        aspect: 'Motorik & Ketekunan',
        title: 'Fokus Menyelesaikan Kegiatan',
        recommendation: `Kemampuan mempertahankan perhatian dan menuntaskan karya masih perlu dilatih secara bertahap.`,
      },
      {
        aspect: 'Motorik Halus',
        title: 'Koordinasi Jari Tangan',
        recommendation: `Perlu lebih banyak stimulasi bermain yang melatih koordinasi tangan dan mata seperti meronce dan meremas adonan.`,
      }
    );
  }

  // 10. Structured "Stimulasi Sederhana di Rumah" (Max 3 - 4 Aktivitas Konkret: Aktivitas → Kemampuan yang dilatih)
  const homeStimulations: HomeStimulationItem[] = [
    {
      title: 'Bermain Mengelompokkan Benda di Rumah',
      activity: 'Ajak ananda mengelompokkan sendok, mainan, atau pakaian berdasarkan warna, bentuk, atau ukurannya.',
      skillTrained: 'Melatih kemampuan berpikir logis dan klasifikasi.',
    },
    {
      title: 'Bercerita Bergantian Sebelum Tidur',
      activity: 'Ajak ananda menceritakan kembali satu kegiatan paling berkesan hari ini dalam 2–3 kalimat sederhana.',
      skillTrained: 'Melatih kemampuan bahasa ekspresif dan kepercayaan diri.',
    },
    {
      title: 'Merapikan Bersama Menjadi Permainan',
      activity: 'Tantang ananda mengembalikan 3 benda ke tempat semula secara mandiri sambil bernyanyi riang.',
      skillTrained: 'Menumbuhkan kemandirian dan rasa tanggung jawab.',
    },
  ];

  // 11. Pesan Hangat Wali Kelas (Max 40 - 50 Kata)
  let rawTeacherMessage = '';
  if (teacherNotes.length > 0) {
    rawTeacherMessage = teacherNotes[0];
  } else {
    rawTeacherMessage = `Ananda ${studentNick} adalah pribadi yang ceria, sopan, dan bersemangat saat belajar. Terima kasih kepada Ayah dan Bunda atas pendampingan penuh kasih di rumah. Mari terus bersama mendukung tumbuh kembang bahagia ananda.`;
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
    },
    aspects,
    overallPercentage,
    quickSummary,
    rubricGuide,
    developedPoints: developedPoints.slice(0, 4),
    growthPoints: growthPoints.slice(0, 3),
    homeStimulations: homeStimulations.slice(0, 3),
    evidences: selectedEvidences,
    teacherMessage,
    signatures: {
      parent: {
        label: 'Orang Tua / Wali',
        name: parentName,
      },
      teacher: {
        label: 'Guru Wali Kelas',
        name: teacherName,
        locationAndDate: `${cityName}, ${todayFormatted}`,
      },
      principal: {
        label: 'Kepala Sekolah',
        name: principalName,
      },
    },
  };
}
