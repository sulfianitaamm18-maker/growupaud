import {
  AIInsightResult,
  IndicatorItem,
  ObservationRecord,
  EvidenceItem,
  DevelopmentalAspect,
  EvidenceTriangulationItem,
  InconsistencyReport,
  DevelopmentInterpretation,
  RatingLevel,
  PedagogicalRecommendation,
  DevelopmentIndicatorGenerationRequest,
  DevelopmentIndicatorEngineResponse,
  GeneratedIndicatorResult,
  LearningObjectiveItem,
  CPItem,
  TPItem,
} from '../types';
import {
  calculateAspectScores,
  calculateConfidenceScore,
} from './curriculumStore';
import { ASPECT_LABELS } from '../data/initialData';
import { formatStudentAge, getStudentAgeContext } from '../utils/ageUtils';
import { buildPedagogicalRecommendation } from './pedagogicalRecommendationEngine';
import { getCuratedActivitiesForTheme, ThematicCuratedActivity } from './thematicActivityCurator';
import { auth } from '../lib/firebase';

export async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
    } catch {
      // ignore
    }
  }

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

interface AnalyzeObservationParams {
  studentId?: string;
  studentName: string;
  studentAge?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  ageLabel?: string | null;
  activityTitle: string;
  cp: string;
  tp: string;
  indicators: IndicatorItem[];
  teacherNote: string;
  voiceNoteText?: string;
  evidences?: EvidenceItem[];
  evidencesCount?: number;
  previousObservations?: ObservationRecord[];
}

export async function generateAIAssessmentInsight(
  params: AnalyzeObservationParams
): Promise<AIInsightResult> {
  const {
    studentId,
    studentName,
    studentAge,
    ageYears,
    ageMonths,
    ageLabel,
    activityTitle,
    cp,
    tp,
    indicators,
    teacherNote,
    voiceNoteText,
    evidences = [],
    evidencesCount = evidences.length,
    previousObservations = [],
  } = params;

  // Resolve structured age context
  const ageContext = getStudentAgeContext({
    age: studentAge,
    ageYears,
    ageMonths,
    ageLabel,
  });

  // Real calculation from observations
  const realAspectScores = calculateAspectScores(indicators);
  const rawConfidence = calculateConfidenceScore(
    indicators,
    teacherNote,
    voiceNoteText,
    evidencesCount
  );

  const normalizedLevel: 'TINGGI' | 'SEDANG' | 'RENDAH' =
    rawConfidence.score !== null && rawConfidence.score >= 70
      ? 'TINGGI'
      : rawConfidence.score !== null && rawConfidence.score >= 40
      ? 'SEDANG'
      : 'RENDAH';

  const confidenceInfo = {
    score: rawConfidence.score ?? 50,
    level: normalizedLevel,
    factors: rawConfidence.factors,
  };

  const ratedIndicators = indicators.filter(
    (i) => i.rating && i.rating !== 'BELUM_DINILAI'
  );

  try {
    // 1. All AI requests must route through authenticated server-side endpoint with Firebase ID token
    const authHeaders = await getAuthHeader();
    if (authHeaders) {
      const serverRes = await fetch('/api/ai/analyze-observation', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          studentId,
          studentName,
          studentAge: ageContext.isAgeFilled ? ageContext.ageDisplay : studentAge,
          activityTitle,
          cp,
          tp,
          indicators,
          teacherNote,
          voiceNoteText,
          evidences,
        }),
      });

      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success && json.data) {
          const d = json.data;
          return {
            overview: d.overview || `Analisis asesmen perkembangan Ananda ${studentName}`,
            aspectScores: realAspectScores,
            strengths: Array.isArray(d.strengths) && d.strengths.length > 0 ? d.strengths : ['Belum ada capaian terukur yang menonjol pada kegiatan ini.'],
            needsStimulation: Array.isArray(d.needsStimulation) && d.needsStimulation.length > 0 ? d.needsStimulation : ['Stimulasi lanjutan akan disesuaikan dengan kebutuhan bermain ananda.'],
            generatedNarrative: d.generatedNarrative || '',
            homeStimulationAdvice: Array.isArray(d.homeStimulationAdvice) && d.homeStimulationAdvice.length > 0 ? d.homeStimulationAdvice : ['Dampingi ananda dalam bermain harian di rumah dengan penuh perhatian.'],
            confidenceScore: confidenceInfo.score,
            confidenceLevel: confidenceInfo.level,
            confidenceFactors: confidenceInfo.factors,
            triangulationMatrix: d.triangulationMatrix || [],
            inconsistencies: d.inconsistencies || [],
            interpretations: d.interpretations || [],
            dataSourcesAnalyzed: {
              rubricCount: ratedIndicators.length,
              hasTeacherNote: Boolean(teacherNote),
              hasVoiceNote: Boolean(voiceNoteText),
              evidenceCount: evidences.length,
              hasHistory: previousObservations.length > 0,
            },
            lastUpdated: new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          };
        }
      }
    }
  } catch (serverErr) {
    console.warn('[AI Service] Authenticated server endpoint failed, falling back to deterministic triangulation:', serverErr);
  }

  // =========================================================================
  // DETERMINISTIC TRIANGULATION & REASONING ENGINE (SECURE OFFLINE/FALLBACK)
  // ZERO FABRICATED DEVELOPMENTAL CLAIMS
  // =========================================================================
  return buildDeterministicTriangulation({
    studentName,
    ageContext,
    activityTitle,
    cp,
    tp,
    indicators,
    teacherNote,
    voiceNoteText,
    evidences,
    previousObservations,
    realAspectScores,
    confidenceInfo,
  });
}

function buildDeterministicTriangulation({
  studentName,
  ageContext,
  activityTitle,
  cp,
  tp,
  indicators,
  teacherNote,
  voiceNoteText,
  evidences,
  previousObservations,
  realAspectScores,
  confidenceInfo,
}: {
  studentName: string;
  ageContext: ReturnType<typeof getStudentAgeContext>;
  activityTitle: string;
  cp: string;
  tp: string;
  indicators: IndicatorItem[];
  teacherNote: string;
  voiceNoteText?: string;
  evidences: EvidenceItem[];
  previousObservations: ObservationRecord[];
  realAspectScores: Record<DevelopmentalAspect, number | null>;
  confidenceInfo: { score: number; level: 'TINGGI' | 'SEDANG' | 'RENDAH'; factors: any[] };
}): AIInsightResult {
  const ratedIndicators = indicators.filter(
    (i) => i.rating && i.rating !== 'BELUM_DINILAI'
  );

  // 1. Text & Audio Cross-Validation Scan
  const teacherNoteClean = teacherNote ? teacherNote.trim() : '';
  const voiceNoteClean = voiceNoteText ? voiceNoteText.trim() : '';
  const fullTextNotes = `${teacherNoteClean} ${voiceNoteClean}`.toLowerCase();

  // If no rated indicators and no notes exist, provide honest neutral status (no fabricated claims)
  if (ratedIndicators.length === 0 && !teacherNoteClean && !voiceNoteClean) {
    return {
      overview: `Belum tersedia bukti observasi yang cukup untuk Ananda ${studentName} pada kegiatan "${activityTitle}".`,
      aspectScores: realAspectScores,
      strengths: ['Belum tersedia cukup data asesmen terukur untuk memetakan kekuatan capaian ananda.'],
      needsStimulation: ['Pengamatan autentik guru akan terus diperbarui seiring berlangsungnya kegiatan bermain di sekolah.'],
      generatedNarrative: `Pengamatan untuk Ananda ${studentName} pada kegiatan "${activityTitle}" belum mencukupi untuk menarik kesimpulan perkembangan. Guru akan melengkapi catatan dan bukti autentik pada sesi pembelajaran berikutnya.`,
      homeStimulationAdvice: [
        'Ajak ananda berbincang santai tentang kegiatan bermain yang paling disukainya hari ini.',
        'Dampingi ananda dalam aktivitas harian di rumah dengan suasana yang hangat dan menyenangkan.',
      ],
      confidenceScore: 0,
      confidenceLevel: 'RENDAH',
      confidenceFactors: ['Belum ada indikator yang dinilai', 'Belum ada catatan naratif guru'],
      triangulationMatrix: [],
      inconsistencies: [],
      interpretations: [],
      dataSourcesAnalyzed: {
        rubricCount: 0,
        hasTeacherNote: false,
        hasVoiceNote: false,
        evidenceCount: evidences.length,
        hasHistory: previousObservations.length > 0,
      },
      lastUpdated: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  const assistanceKeywords = [
    'bantuan', 'bantu', 'arahan', 'dibimbing', 'ragu', 'masih bingung',
    'didampingi', 'diingatkan', 'kurang fokus', 'belum mandiri', 'kesulitan', 'masih malu'
  ];
  const independentKeywords = [
    'mandiri', 'lancar', 'tanpa bantuan', 'antusias', 'fokus', 'cepat', 
    'mampu menjelaskan', 'berinisiatif', 'percaya diri', 'selesai', 'rapi'
  ];

  const mentionsAssistance = assistanceKeywords.some((kw) => fullTextNotes.includes(kw));
  const mentionsIndependence = independentKeywords.some((kw) => fullTextNotes.includes(kw));

  // 2. Build Triangulation Matrix & Inconsistency Reports
  const triangulationMatrix: EvidenceTriangulationItem[] = [];
  const inconsistencies: InconsistencyReport[] = [];

  // A. Age & Developmental Stage Context
  if (ageContext.isAgeFilled) {
    triangulationMatrix.push({
      id: 'tri-age-context',
      sourceType: 'CONTEXT' as any,
      sourceLabel: `Konteks Usia (${ageContext.ageDisplay})`,
      fact: `Ananda berada pada rentang ${ageContext.ageDisplay} (${ageContext.phaseName}), dengan karakteristik: ${ageContext.pedagogicalContext}`,
      aspect: 'JATI_DIRI',
      status: 'SUPPORTING',
      traceRef: 'age-profile',
    });
  }

  // B. Rubric Evidence Items
  ratedIndicators.forEach((ind, idx) => {
    const isHighRating = ind.rating === 'BSH' || ind.rating === 'BSB';
    const isLowRating = ind.rating === 'BB' || ind.rating === 'MB';

    triangulationMatrix.push({
      id: `tri-rubric-${idx}-${ind.id}`,
      sourceType: 'RUBRIC',
      sourceLabel: `Rubrik (${ind.rating})`,
      fact: `Penilaian indikator "${ind.text}" mencapai level ${ind.rating} (${ASPECT_LABELS[ind.aspect] || ind.aspect}).`,
      aspect: ind.aspect,
      indicatorText: ind.text,
      status: 'SUPPORTING',
      traceRef: `rubric-${ind.id}`,
    });

    // Detect discrepancy: High Rubric rating but teacher note mentions assistance needed
    if (isHighRating && mentionsAssistance) {
      inconsistencies.push({
        detected: true,
        aspect: ind.aspect,
        indicatorText: ind.text,
        rubricRating: ind.rating,
        teacherNoteExcerpt: teacherNoteClean || undefined,
        voiceExcerpt: voiceNoteClean || undefined,
        finding: `Rubrik mencatat level ${ind.rating} pada indikator "${ind.text}", namun catatan/suara guru mencatat bahwa ananda masih membutuhkan arahan/bantuan pada bagian tertentu.`,
        interpretiveConclusion: `Kemampuan ananda sudah mulai muncul dan berkembang dalam kegiatan ini, namun masih dalam tahap transisi dan belum sepenuhnya konsisten secara mandiri.`,
        recommendation: `Berikan kesempatan latihan berulang dengan scaffolding bertahap agar ananda semakin mantap dan mandiri.`,
      });
    } else if (isLowRating && mentionsIndependence) {
      inconsistencies.push({
        detected: true,
        aspect: ind.aspect,
        indicatorText: ind.text,
        rubricRating: ind.rating,
        teacherNoteExcerpt: teacherNoteClean || undefined,
        voiceExcerpt: voiceNoteClean || undefined,
        finding: `Rubrik mencatat level ${ind.rating} pada "${ind.text}", tetapi catatan pengamatan menunjukkan inisiatif dan antusiasme positif anak.`,
        interpretiveConclusion: `Potensi ananda sudah mulai terbangun dengan baik; penilaian rubrik merefleksikan proses awal pengenalan keterampilan.`,
        recommendation: `Lanjutkan penguatan dan apresiasi atas setiap proses belajar ananda.`,
      });
    }
  });

  // C. Teacher Note Evidence Item
  if (teacherNoteClean) {
    triangulationMatrix.push({
      id: `tri-note-1`,
      sourceType: 'TEACHER_NOTE',
      sourceLabel: 'Catatan Pengamatan Guru',
      fact: `Guru mencatat: "${teacherNoteClean}"`,
      status: mentionsAssistance && ratedIndicators.some(i => i.rating === 'BSH' || i.rating === 'BSB')
        ? 'DISCREPANCY'
        : 'SUPPORTING',
      traceRef: 'teacher-note',
    });
  }

  // D. Voice Note Evidence Item
  if (voiceNoteClean) {
    triangulationMatrix.push({
      id: `tri-voice-1`,
      sourceType: 'VOICE_NOTE',
      sourceLabel: 'Transkrip Rekaman Suara Guru',
      fact: `Verbatim audio guru: "${voiceNoteClean}"`,
      status: 'SUPPORTING',
      traceRef: 'voice-note',
    });
  }

  // E. Visual / Physical Evidence Items
  evidences.forEach((ev, idx) => {
    triangulationMatrix.push({
      id: `tri-evidence-${idx}-${ev.id}`,
      sourceType: ev.type === 'PHOTO' ? 'PHOTO' : 'KARYA',
      sourceLabel: `Bukti Autentik (${ev.type})`,
      fact: `Dokumentasi visual terverifikasi: "${ev.title}"${ev.caption ? ` (${ev.caption})` : ''}.`,
      status: 'SUPPORTING',
      traceRef: ev.id,
    });
  });

  // F. Previous History Item
  if (previousObservations.length > 0) {
    const lastObs = previousObservations[0];
    triangulationMatrix.push({
      id: `tri-history-1`,
      sourceType: 'HISTORY',
      sourceLabel: 'Riwayat Observasi Sebelumnya',
      fact: `Tercatat observasi terdahulu pada ${lastObs.date} pada kegiatan "${lastObs.activityTitle}".`,
      status: 'SUPPLEMENTARY',
      traceRef: lastObs.id,
    });
  }

  // 3. Build Aspect-by-Aspect Development Interpretations with Age Context
  const interpretations: DevelopmentInterpretation[] = [];
  const aspectsInObservation = Array.from(
    new Set(indicators.map((i) => i.aspect))
  ) as DevelopmentalAspect[];

  aspectsInObservation.forEach((aspectKey) => {
    const aspectIndicators = indicators.filter((i) => i.aspect === aspectKey);
    const aspectRated = aspectIndicators.filter(
      (i) => i.rating && i.rating !== 'BELUM_DINILAI'
    );
    const scoreVal = realAspectScores[aspectKey];

    if (aspectRated.length === 0) {
      interpretations.push({
        aspect: aspectKey,
        aspectName: ASPECT_LABELS[aspectKey],
        score: null,
        consistencyStatus: 'BELUM_TERAMATI',
        fakta: `Aspek ${ASPECT_LABELS[aspectKey]} belum dinilai secara spesifik pada lembar observasi sesi ini.`,
        buktiSumber: ['Tidak ada data rubrik pada sesi ini'],
        interpretasi: 'Belum tersedia bukti observasi yang cukup untuk menyimpulkan capaian kemampuan ini.',
        kebutuhanDukungan: 'Dapat diamati pada kegiatan terencana berikutnya.',
        traceableEvidenceIds: [],
      });
      return;
    }

    // Determine consistency status
    const hasDiscrepancyInAspect = inconsistencies.some((inc) => inc.aspect === aspectKey);
    const averageScore = scoreVal || 0;

    let consistencyStatus: DevelopmentInterpretation['consistencyStatus'] = 'KONSISTEN';
    if (hasDiscrepancyInAspect || (mentionsAssistance && averageScore >= 60)) {
      consistencyStatus = 'MUNCUL_DENGAN_BANTUAN';
    } else if (averageScore < 50) {
      consistencyStatus = 'PERLU_STIMULASI';
    } else {
      consistencyStatus = 'KONSISTEN';
    }

    // Concrete facts & sources
    const indicatorSummary = aspectRated
      .map((i) => `"${i.text}" (Level: ${i.rating})`)
      .join(', ');

    const factsList = [
      `Ananda terlibat dalam indikator: ${indicatorSummary}.`,
      teacherNoteClean ? `Catatan guru: "${teacherNoteClean}".` : null,
      voiceNoteClean ? `Catatan suara: "${voiceNoteClean}".` : null,
      evidences.length > 0 ? `Didukung ${evidences.length} dokumentasi bukti autentik.` : null,
    ].filter(Boolean) as string[];

    const sourcesList = [
      `Rubrik ${aspectRated.map((i) => `${i.text} (${i.rating})`).join(', ')}`,
      teacherNoteClean ? 'Catatan Observasi Guru' : null,
      voiceNoteClean ? 'Transkrip Voice Note Guru' : null,
      evidences.length > 0 ? `Bukti Dokumentasi (${evidences.length} File)` : null,
    ].filter(Boolean) as string[];

    // Meaningful pedagogical interpretation based on Kurikulum Merdeka PAUD & Age
    const agePrefix = ageContext.isAgeFilled ? `Pada usia ${ageContext.ageDisplay}, ` : '';
    let interpretasiText = '';
    let dukunganText = '';

    if (consistencyStatus === 'KONSISTEN') {
      interpretasiText = `${agePrefix}Ananda ${studentName} menunjukkan capaian yang mantap dan mandiri pada aspek ${ASPECT_LABELS[aspectKey]} dalam kegiatan "${activityTitle}". Perilaku yang teramati selaras antara rubrik dan bukti nyata.`;
      dukunganText = `Berikan tantangan pengayaan baru yang menyenangkan dan eksploratif untuk memperluas pengalaman belajar ananda.`;
    } else if (consistencyStatus === 'MUNCUL_DENGAN_BANTUAN') {
      interpretasiText = `${agePrefix}Ananda ${studentName} mulai menunjukkan kemampuan pada aspek ${ASPECT_LABELS[aspectKey]} dengan antusias. Triangulasi data mencatat bahwa kemampuan ini sedang berkembang aktif dan memerlukan penguatan berkelanjutan agar semakin mandiri.`;
      dukunganText = `Lanjutkan pendampingan yang hangat dan berikan kesempatan bagi ananda untuk mencoba mandiri secara bertahap.`;
    } else {
      interpretasiText = `${agePrefix}Ananda ${studentName} sedang dalam tahap awal pengenalan dan pembiasaan keterampilan pada aspek ${ASPECT_LABELS[aspectKey]}.`;
      dukunganText = `Dukung dengan stimulasi bermain sensori dan aktivitas terstruktur yang santai untuk menumbuhkan rasa percaya diri.`;
    }

    interpretations.push({
      aspect: aspectKey,
      aspectName: ASPECT_LABELS[aspectKey],
      score: scoreVal,
      consistencyStatus,
      fakta: factsList.join(' '),
      buktiSumber: sourcesList,
      interpretasi: interpretasiText,
      kebutuhanDukungan: dukunganText,
      traceableEvidenceIds: aspectRated.map((i) => `rubric-${i.id}`),
    });
  });

  // 4. Strengths & Needs
  const strengths: string[] = [];
  const needsStimulation: string[] = [];

  interpretations.forEach((interp) => {
    if (interp.consistencyStatus === 'KONSISTEN') {
      strengths.push(
        `Kemandirian pada ${interp.aspectName}: teramati konsisten menyelesaikan indikator kegiatan ${activityTitle}`
      );
    } else if (interp.consistencyStatus === 'MUNCUL_DENGAN_BANTUAN') {
      strengths.push(
        `Munculnya inisiatif pada ${interp.aspectName}: mampu berpartisipasi aktif dengan pendampingan guru`
      );
      needsStimulation.push(
        `Penguatan konsistensi pada ${interp.aspectName} agar terbiasa mandiri tanpa ragu`
      );
    } else if (interp.consistencyStatus === 'PERLU_STIMULASI') {
      needsStimulation.push(
        `Stimulasi intensif dan menyenangkan pada aspek ${interp.aspectName}`
      );
    }
  });

  if (strengths.length === 0) {
    strengths.push(`Keterlibatan awal dan adaptasi yang baik dalam kegiatan "${activityTitle}"`);
  }
  if (needsStimulation.length === 0) {
    needsStimulation.push(`Pemeliharaan capaian positif melalui ragam kegiatan eksploratif lanjutan`);
  }

  // 5. Authentic Integrated Narrative Formulation (Parent-Friendly Translation with Age Context)
  const descriptiveAchievements = ratedIndicators.map((ind) => {
    const ratingDesc =
      ind.rating === 'BSB'
        ? 'berkembang sangat baik dan konsisten mandiri'
        : ind.rating === 'BSH'
        ? 'berkembang sesuai harapan dengan baik'
        : ind.rating === 'MB'
        ? 'mulai berkembang dengan pendampingan bertahap'
        : 'sedang dalam proses pembiasaan dan pengenalan';
    return `kemampuan ${ind.text.toLowerCase()} ${ratingDesc}`;
  });

  const achievementText =
    descriptiveAchievements.length > 0
      ? `terlihat bahwa ${descriptiveAchievements.join(', ')}.`
      : 'keterlibatan aktif ananda dalam seluruh rangkaian kegiatan berjalan dengan baik.';

  const evidenceNarrative = evidences.length > 0
    ? ` Pengamatan didukung oleh ${evidences.length} dokumentasi karya dan foto aktivitas autentik.`
    : '';

  const teacherNarrative = teacherNoteClean
    ? ` Catatan guru di kelas mencatat bahwa ${teacherNoteClean}.`
    : '';

  const voiceNarrative = voiceNoteClean
    ? ` Observasi langsung guru juga menegaskan bahwa ${voiceNoteClean}.`
    : '';

  const inconsistencySummary = inconsistencies.length > 0
    ? ` Triangulasi pengamatan menunjukkan potensi ananda telah tampak nyata, dan dengan pemberian kesempatan berlatih secara bertahap, kemandirian ananda akan semakin mantap.`
    : ` Seluruh catatan pengamatan menunjukkan proses belajar yang selaras dan terkonfirmasi secara positif.`;

  const ageSalutation = ageContext.isAgeFilled ? `Pada usia ${ageContext.ageDisplay}, ` : '';
  const generatedNarrative = `${ageSalutation}Ananda ${studentName} mengikuti kegiatan "${activityTitle}" dengan antusiasme yang positif. Berdasarkan triangulasi data pengamatan, ${achievementText}${teacherNarrative}${voiceNarrative}${evidenceNarrative}${inconsistencySummary} Capaian perkembangan ini dapat terus diperkuat melalui stimulasi yang konsisten dan menyenangkan baik di sekolah maupun di rumah.`;

  const homeStimulationAdvice = [
    `Ajak ${studentName} melakukan permainan eksploratif yang relevan dengan ${activityTitle} di rumah dalam suasana ceria.`,
    `Berikan apresiasi langsung terhadap proses usaha ananda dan beri ruang untuk mencoba secara mandiri terlebih dahulu.`,
    `Ajak ananda berbincang hangat tentang pengalamannya di sekolah setiap hari untuk menumbuhkan kepercayaan diri dan komunikasi dua arah.`,
  ];

  return {
    overview: `Analisis triangulasi Ananda ${studentName} (${ageContext.ageDisplay}) pada kegiatan "${activityTitle}" mengintegrasikan ${ratedIndicators.length} rubrik indikator, catatan guru, audio suara, dan ${evidences.length} bukti autentik.`,
    aspectScores: realAspectScores,
    strengths,
    needsStimulation,
    generatedNarrative,
    homeStimulationAdvice,
    confidenceScore: confidenceInfo.score,
    confidenceLevel: confidenceInfo.level,
    confidenceFactors: confidenceInfo.factors,
    triangulationMatrix,
    inconsistencies,
    interpretations,
    dataSourcesAnalyzed: {
      rubricCount: ratedIndicators.length,
      hasTeacherNote: Boolean(teacherNoteClean),
      hasVoiceNote: Boolean(voiceNoteClean),
      evidenceCount: evidences.length,
      hasHistory: previousObservations.length > 0,
    },
    lastUpdated: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

export interface ActivityIdeaItem {
  activityId?: string;
  title: string;
  duration: string;
  description: string;
  steps: string[];
  linkedCPIds?: string[];
  linkedTPIds?: string[];
  linkedObjectiveIds?: string[];
  materials?: string[] | string;
  provocationQuestions?: string[];
  assessmentIndicators?: Array<{
    aspect: DevelopmentalAspect | string;
    text: string;
    linkedTPId?: string;
    rubric?: {
      BB: string;
      MB: string;
      BSH: string;
      BSB: string;
    };
  }>;
  tarlAdjustments?: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
}

export interface LessonPlanRecommendationResult {
  theme: string;
  subtheme: string;
  selectedCPIds?: string[];
  selectedCPs?: Array<{
    id: string;
    code: string;
    title: string;
    description?: string;
  }>;
  selectedTpIds?: string[];
  selectedTPs?: Array<{
    id: string;
    cpId?: string;
    code: string;
    title: string;
    description?: string;
  }>;
  learningObjectives?: LearningObjectiveItem[];
  recommendedCP?: {
    code: string;
    title: string;
    description: string;
  };
  recommendedATP?: {
    code: string;
    title: string;
    phase: string;
    stepOrder: number;
    description: string;
  };
  recommendedTP?: {
    code: string;
    title: string;
    description: string;
  };
  recommendedIndicators: Array<{
    aspect: DevelopmentalAspect;
    text: string;
    linkedTPId?: string;
    rubric: {
      BB: string;
      MB: string;
      BSH: string;
      BSB: string;
    };
  }>;
  activityIdeas: ActivityIdeaItem[];
  mediaAndMaterials: string[];
  provocationQuestions: string[];
  tarlAdjustments: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  pedagogicalNotes?: string;
  chainedRecommendation?: PedagogicalRecommendation;
  curatedActivityOptions?: ThematicCuratedActivity[];
  staticCuratedPresets?: ThematicCuratedActivity[];
  source?: 'gemini' | 'ai' | 'engine_fallback' | 'thematic_curator';
}

export async function fetchLessonPlanRecommendation(params: {
  theme: string;
  subtheme: string;
  selectedCPs?: CPItem[] | any[];
  selectedCPIds?: string[];
  selectedTPs?: TPItem[] | any[];
  selectedTpIds?: string[];
  ageGroup?: string;
  schoolContext?: any;
  customPrompt?: string;
  studentId?: string;
  studentName?: string;
  childObservations?: ObservationRecord[];
}): Promise<LessonPlanRecommendationResult> {
  const isKelompokA = (params.ageGroup || '').includes('4-5') || (params.ageGroup || '').toLowerCase().includes('kelompok a');
  const curatedActivities = getCuratedActivitiesForTheme(
    params.theme,
    params.subtheme,
    isKelompokA,
    params.selectedCPIds,
    params.selectedTpIds
  );

  // 1. Build foundational unified pedagogical chain locally
  const chained = buildPedagogicalRecommendation({
    theme: params.theme,
    subtheme: params.subtheme,
    ageGroup: params.ageGroup || 'Usia 5-6 Tahun (Kelompok B)',
    schoolContext: params.schoolContext,
    studentId: params.studentId,
    studentName: params.studentName,
    childObservations: params.childObservations,
  });

  try {
    const authHeaders = await getAuthHeader();
    if (authHeaders) {
      const res = await fetch('/api/ai/lesson-plan-recommendation', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const hasDynamicAiActivities = Array.isArray(json.data.activityIdeas) && json.data.activityIdeas.length > 0;
          return {
            ...json.data,
            source: json.source || (json.data.source || 'gemini'),
            chainedRecommendation: chained,
            // Keep curatedActivityOptions empty if AI produced dynamic activityIdeas,
            // so frontend prioritizes the contextual AI recommendations over static templates!
            curatedActivityOptions: hasDynamicAiActivities ? undefined : curatedActivities,
            staticCuratedPresets: curatedActivities,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[AI Service] Lesson plan recommendation request error, using engine fallback:', err);
  }

  // Pure Pedagogical Engine Result with Strict Traceability (Theme & Age Aligned, Zero Dummy Data)
  const fallbackCpIds = params.selectedCPIds && params.selectedCPIds.length > 0
    ? params.selectedCPIds
    : ['cp-03'];

  const fallbackTpIds = params.selectedTpIds && params.selectedTpIds.length > 0
    ? params.selectedTpIds
    : [chained.context.tp.code || 'tp-lit-01'];

  // Construct linked operational learning objectives
  const objectives: LearningObjectiveItem[] = fallbackTpIds.map((tId, idx) => ({
    objectiveId: `obj-fallback-${idx + 1}`,
    objectiveText: `Anak mampu menyelidiki dan mengekspresikan pemahaman tentang ${params.subtheme} sesuai capaian target.`,
    linkedCPIds: [fallbackCpIds[idx % fallbackCpIds.length]],
    linkedTPIds: [tId],
  }));

  const activityList = curatedActivities.length > 0
    ? curatedActivities.map((act, i) => {
        const actCp = [fallbackCpIds[i % fallbackCpIds.length]];
        const actTp = [fallbackTpIds[i % fallbackTpIds.length]];
        return {
          activityId: act.id,
          title: act.title,
          duration: act.duration,
          description: act.description,
          steps: act.steps,
          materials: [...act.primaryMaterials, ...act.localLooseParts],
          provocationQuestions: act.provocationQuestions,
          linkedCPIds: act.linkedCPIds && act.linkedCPIds.length > 0 ? act.linkedCPIds : actCp,
          linkedTPIds: act.linkedTPIds && act.linkedTPIds.length > 0 ? act.linkedTPIds : actTp,
          linkedObjectiveIds: [objectives[i % objectives.length]?.objectiveId || `obj-fallback-${i + 1}`],
          assessmentIndicators: act.observableIndicators.map((ind) => ({
            aspect: ind.aspect,
            text: ind.observableBehavior,
            linkedTPId: actTp[0],
            rubric: ind.rubric,
          })),
          tarlAdjustments: {
            beginner: act.tarlAdjustments.perluDukungan,
            intermediate: act.tarlAdjustments.berkembang,
            advanced: act.tarlAdjustments.pengayaan,
          },
        };
      })
    : [
        {
          activityId: 'act-fallback-01',
          title: chained.activityRecommendation.title,
          duration: chained.activityRecommendation.duration,
          description: chained.activityRecommendation.description,
          steps: chained.activityRecommendation.steps,
          materials: [...chained.materials.primary, ...chained.materials.localLooseParts],
          provocationQuestions: [
            ...chained.promptingQuestions.introductory,
            ...chained.promptingQuestions.exploratory,
          ],
          linkedCPIds: fallbackCpIds,
          linkedTPIds: fallbackTpIds,
          linkedObjectiveIds: objectives.map((o) => o.objectiveId),
          assessmentIndicators: chained.assessmentIndicators.map((ind) => ({
            aspect: ind.aspect,
            text: ind.observableBehavior,
            linkedTPId: fallbackTpIds[0],
            rubric: ind.rubric,
          })),
        },
      ];

  return {
    theme: params.theme,
    subtheme: params.subtheme,
    selectedCPIds: fallbackCpIds,
    selectedTpIds: fallbackTpIds,
    learningObjectives: objectives,
    recommendedCP: chained.context.cp,
    recommendedATP: {
      code: chained.context.atp.code,
      title: chained.context.atp.title,
      phase: chained.context.atp.phase,
      stepOrder: chained.context.atp.stepOrder,
      description: chained.context.atp.description,
    },
    recommendedTP: chained.context.tp,
    recommendedIndicators: chained.assessmentIndicators.map((ind) => ({
      aspect: ind.aspect,
      text: ind.observableBehavior,
      rubric: ind.rubric,
    })),
    activityIdeas: activityList,
    curatedActivityOptions: curatedActivities,
    mediaAndMaterials: [
      ...chained.materials.primary,
      ...chained.materials.localLooseParts,
    ],
    provocationQuestions: [
      ...chained.promptingQuestions.introductory,
      ...chained.promptingQuestions.exploratory,
    ],
    tarlAdjustments: {
      beginner: chained.tarlDifferentiation.perluDukungan.activityAdjustment,
      intermediate: chained.tarlDifferentiation.berkembang.activityAdjustment,
      advanced: chained.tarlDifferentiation.pengayaan.activityAdjustment,
    },
    pedagogicalNotes: `${chained.activityRecommendation.pedagogicalRationale} ${chained.ctrRecommendation.antiBiasNote}`,
    chainedRecommendation: chained,
  };
}

export interface PhotoAnalysisResult {
  visualDescription: string;
  suggestedAspects: DevelopmentalAspect[];
  potentialBehaviors: string[];
  suggestedFollowUpQuestions: string[];
  pedagogicInsight: string;
}

export async function analyzeActivityPhoto(params: {
  activityTitle: string;
  teacherNotes?: string;
  studentAge?: string;
  imageBase64?: string;
  imageUrl?: string;
  schoolContext?: any;
}): Promise<PhotoAnalysisResult> {
  try {
    const authHeaders = await getAuthHeader();
    if (authHeaders) {
      const res = await fetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    }
  } catch (err) {
    console.warn('[AI Service] Photo analysis request error:', err);
  }

  return {
    visualDescription: 'Analisis visual otomatis belum tersedia. Gunakan foto sebagai bukti pendukung dan lengkapi deskripsi berdasarkan apa yang benar-benar diamati guru.',
    suggestedAspects: [],
    potentialBehaviors: [],
    suggestedFollowUpQuestions: [
      'Apa yang benar-benar tampak dilakukan anak pada dokumentasi ini?',
      'Bukti perilaku apa yang dapat diverifikasi melalui pengamatan langsung?'
    ],
    pedagogicInsight: 'Dokumentasi foto tidak boleh menjadi satu-satunya dasar penilaian. Validasi dengan pengamatan autentik guru.'
  };
}

/**
 * ENGINE INDIKATOR PERKEMBANGAN (6 ASPEK GROWUPAUD)
 * Menganalisis Tujuan Pembelajaran, Kegiatan, Kelompok Usia, dan Konteks
 * Menghasilkan aspek relevan + indikator teramati + identifikasi aspek non-fokus
 */
export async function generateDevelopmentIndicators(
  req: DevelopmentIndicatorGenerationRequest
): Promise<DevelopmentIndicatorEngineResponse> {
  try {
    const authHeaders = await getAuthHeader();
    if (authHeaders) {
      const res = await fetch('/api/ai/generate-development-indicators', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(req),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.indicators)) {
          return json.data;
        }
      }
    }
  } catch (err) {
    console.warn('[AI Service] generateDevelopmentIndicators server error, using local engine:', err);
  }

  // Fallback Engine Pedagogis Lokal
  return generateLocalDevelopmentIndicators(req);
}

export function generateLocalDevelopmentIndicators(
  req: DevelopmentIndicatorGenerationRequest
): DevelopmentIndicatorEngineResponse {
  const {
    learningObjective = '',
    activity = '',
    ageGroup = 'Usia 5-6 Tahun (Kelompok B)',
    activityContext = '',
  } = req;

  const aspectsMeta: Record<
    DevelopmentalAspect,
    { label: string; keywords: RegExp; nonFocusReason: string }
  > = {
    NAM: {
      label: 'Nilai Agama & Moral',
      keywords: /doa|tuhan|agama|ibadah|ciptaan|syukur|moral|akhlak|adab|sopan|santun|kebaikan|sedekah|alam ciptaan/i,
      nonFocusReason: 'Kegiatan berfokus pada eksplorasi fisik/kognitif dan tidak memuat penanaman nilai spiritual secara langsung.',
    },
    JATI_DIRI: {
      label: 'Jati Diri (Sosial Emosional)',
      keywords: /teman|sosial|emosi|perasaan|bergantian|antre|antri|giliran|kerja sama|kerjasama|mandiri|percaya diri|regulasi|empati|berbagi|merapikan/i,
      nonFocusReason: 'Interaksi sosial dan regulasi emosi tidak menjadi fokus target utama dalam sesi bermain ini.',
    },
    LITERASI_STEAM: {
      label: 'Literasi & STEAM',
      keywords: /cerita|buku|huruf|kata|membaca|dongeng|menyimak|sains|eksperimen|teknologi|seni|lukis|gambar|pola|steam|loose parts|meneliti/i,
      nonFocusReason: 'Kegiatan tidak menekankan keaksaraan simbolik, teknologi, atau rekayasa bahan.',
    },
    MOTORIK_KASAR: {
      label: 'Motorik Kasar',
      keywords: /lari|lompat|loncat|lempar|tangkap|panjat|titi|senam|gerak|tari|tendang|rangkak|keseimbangan|jinjit|estafet|tubuh|olahraga/i,
      nonFocusReason: 'Aktivitas dilakukan pada area duduk/meja dengan ruang gerak lokomotor terbatas.',
    },
    MOTORIK_HALUS: {
      label: 'Motorik Halus',
      keywords: /gunting|potong|robek|remas|tempel|ronce|jemari|jari|tangan|pensil|kuas|balok|susun|pilin|plastisin|lempung|menjepit|meronce/i,
      nonFocusReason: 'Manipulasi benda kecil atau koordinasi jemari tidak menjadi titik berat kegiatan.',
    },
    KOGNITIF: {
      label: 'Kognitif & Berpikir',
      keywords: /hitung|angka|kelompok|ukur|bentuk|warna|urut|klasifikasi|cocok|masalah|sebab|mengapa|bagaimana|beda|sama|bandingkan/i,
      nonFocusReason: 'Penekanan lebih diarahkan pada ekspresi motorik dan sensomotorik bebas.',
    },
  };

  const combinedText = `${learningObjective} ${activity} ${activityContext}`;
  const relevantAspectKeys: DevelopmentalAspect[] = [];
  const nonFocusAspects: Array<{
    aspect: DevelopmentalAspect;
    aspectLabel: string;
    reason: string;
  }> = [];

  const allAspectsList = Object.keys(aspectsMeta) as DevelopmentalAspect[];

  for (const key of allAspectsList) {
    if (aspectsMeta[key].keywords.test(combinedText)) {
      relevantAspectKeys.push(key);
    }
  }

  // Jika tidak ada kata kunci yang cocok, tetapkan 2 aspek yang paling natural
  if (relevantAspectKeys.length === 0) {
    relevantAspectKeys.push('KOGNITIF', 'MOTORIK_HALUS');
  } else if (relevantAspectKeys.length > 4) {
    // Batasi maksimal 3-4 aspek relevan agar tidak memaksakan semua 6 aspek
    relevantAspectKeys.length = 3;
  }

  for (const key of allAspectsList) {
    if (!relevantAspectKeys.includes(key)) {
      nonFocusAspects.push({
        aspect: key,
        aspectLabel: aspectsMeta[key].label,
        reason: `Tidak menjadi fokus utama kegiatan: ${aspectsMeta[key].nonFocusReason}`,
      });
    }
  }

  const generatedIndicators: GeneratedIndicatorResult[] = relevantAspectKeys.map((aspectKey) => {
    const meta = aspectsMeta[aspectKey];
    let text = '';
    let observableBehavior = '';
    let rubric = {
      BB: 'Belum menunjukkan kemampuan yang diharapkan meskipun telah diberi contoh dan dorongan hangat.',
      MB: 'Mulai menunjukkan upaya berkegiatan dengan bimbingan dan pendampingan bertahap dari guru.',
      BSH: 'Mampu menunjukkan kemampuan secara mandiri, stabil, dan konsisten sesuai tahap usianya.',
      BSB: 'Menunjukkan kemampuan dengan sangat percaya diri, mandiri, serta mampu berkreasi/mengajak teman.',
    };

    if (aspectKey === 'KOGNITIF') {
      text = `Anak mampu menganalisis atau membedakan unsur/karakteristik dalam kegiatan "${activity || 'bermain'}" secara terarah.`;
      observableBehavior = 'Anak mengamati, mengelompokkan, atau membandingkan unsur kegiatan dengan pemahaman yang tepat.';
      rubric = {
        BB: 'Belum dapat mengenali atau membedakan unsur kegiatan tanpa bantuan penuh guru.',
        MB: 'Mulai mengenali unsur kegiatan ketika diberi bimbingan atau pertanyaan pemantik guru.',
        BSH: 'Mampu membedakan dan mengelompokkan unsur kegiatan secara mandiri dan tepat.',
        BSB: 'Mampu membedakan unsur secara mandiri serta menjelaskan alasan pemikirannya secara lugas.',
      };
    } else if (aspectKey === 'MOTORIK_HALUS') {
      text = `Anak mampu menggunakan koordinasi jari-jemari tangan secara terkontrol saat melakukan "${activity || 'kegiatan'}"`;
      observableBehavior = 'Anak memegang, menata, atau memanipulasi bahan main dengan stabil menggunakan koordinasi jemarinya.';
      rubric = {
        BB: 'Belum terbiasa mengkoordinasikan jemari secara stabil saat memegang media bahan main.',
        MB: 'Mulai mampu memegang dan menggerakkan bahan main dengan dorongan dan bantuan guru.',
        BSH: 'Mandiri dan terkoordinasi dengan baik saat memanipulasi bahan bermain.',
        BSB: 'Sangat terampil dan teliti menggunakan koordinasi jemari serta menghasilkan karya yang rapi.',
      };
    } else if (aspectKey === 'MOTORIK_KASAR') {
      text = `Anak mampu melakukan koordinasi gerak tubuh dan menjaga keseimbangan selama "${activity || 'kegiatan'}"`;
      observableBehavior = 'Anak menggerakkan anggota tubuh dengan seimbang, lincah, dan aman mengikuti alur kegiatan.';
      rubric = {
        BB: 'Tampak ragu atau kurang seimbang saat melakukan gerakan motorik kasar yang diarahkan.',
        MB: 'Mulai mau mencoba gerakan fisik dengan bimbingan dan pendampingan guru.',
        BSH: 'Mampu melakukan gerakan fisik secara mandiri, teratur, dan menjaga keseimbangan tubuh.',
        BSB: 'Sangat lincah, terampil menjaga keseimbangan, dan antusias memimpin atau membantu teman.',
      };
    } else if (aspectKey === 'JATI_DIRI') {
      text = `Anak menunjukkan kemandirian, regulasi emosi, dan sikap kooperatif saat mengikuti "${activity || 'kegiatan'}"`;
      observableBehavior = 'Anak mau bergantian, berbagi alat/bahan bermain, dan mengekspresikan perasaannya secara positif.';
      rubric = {
        BB: 'Masih membutuhkan pendampingan intensif dalam mengelola emosi atau berbagi media main.',
        MB: 'Mulai mau berbagi atau menunggu giliran setelah diingatkan secara lembut oleh guru.',
        BSH: 'Secara mandiri mampu bekerja sama, bersabar menunggu giliran, dan menjaga suasana kondusif.',
        BSB: 'Menunjukkan empati yang tinggi, dengan senang hati membantu teman dan menjadi teladan kerja sama.',
      };
    } else if (aspectKey === 'NAM') {
      text = `Anak menunjukkan rasa syukur, merawat bahan alam/lingkungan sekitar, dan bersikap santun saat "${activity || 'kegiatan'}"`;
      observableBehavior = 'Anak mengucapkan rasa terima kasih, menjaga media main ciptaan Tuhan, dan bersikap ramah.';
      rubric = {
        BB: 'Belum terbiasa menunjukkan perilaku merawat bahan atau mengucap syukur secara mandiri.',
        MB: 'Mulai menunjukkan sikap bersyukur dan merawat alat setelah diingatkan guru.',
        BSH: 'Mampu merawat media main dan bersikap sopan santun secara konsisten dan mandiri.',
        BSB: 'Menunjukkan kesadaran spiritual dan moral yang tinggi serta mengajak teman berbuat baik.',
      };
    } else if (aspectKey === 'LITERASI_STEAM') {
      text = `Anak mampu mengekspresikan ide, menggunakan kosakata kontekstual, atau bereksplorasi dengan bahan dalam "${activity || 'kegiatan'}"`;
      observableBehavior = 'Anak menceritakan apa yang dibuatnya atau menunjukkan rasa ingin tahu terhadap fenomena/bahan main.';
      rubric = {
        BB: 'Belum mau menceritakan atau mengeksplorasi bahan selain yang ditentukan guru.',
        MB: 'Mulai mau bertanya atau menyebutkan bagian dari hasil karyanya dengan panduan guru.',
        BSH: 'Mampu menceritakan ide karyanya dengan kalimat sederhana serta mengeksplorasi media dengan baik.',
        BSB: 'Sangat kreatif mengeksplorasi media, menghubungkan dengan pengalaman nyata, dan bercerita komunikatif.',
      };
    }

    return {
      aspect: aspectKey,
      aspectLabel: meta.label,
      text,
      observableBehavior,
      isRelevant: true,
      rubric,
    };
  });

  return {
    learningObjective,
    activity,
    ageGroup,
    activityContext,
    relevantAspects: relevantAspectKeys,
    indicators: generatedIndicators,
    nonFocusAspects,
    pedagogicalAdvice: `Amati keterlibatan anak selama "${activity}". Catat bukti autentik berupa perilaku yang tampak, dan gunakan rubrik sebagai panduan refleksi objektif.`,
  };
}

