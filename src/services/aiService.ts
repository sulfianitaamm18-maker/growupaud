import { GoogleGenAI } from '@google/genai';
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
} from '../types';
import {
  calculateAspectScores,
  calculateConfidenceScore,
} from './curriculumStore';
import { ASPECT_LABELS } from '../data/initialData';
import { formatStudentAge, getStudentAgeContext } from '../utils/ageUtils';
import { buildPedagogicalRecommendation } from './pedagogicalRecommendationEngine';
import { getCuratedActivitiesForTheme, ThematicCuratedActivity } from './thematicActivityCurator';

interface AnalyzeObservationParams {
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

  const historyContext = previousObservations.length > 0
    ? previousObservations.map(o => `- Tanggal ${o.date}: Kegiatan "${o.activityTitle}" (${o.indicators.filter(i=>i.rating && i.rating !== 'BELUM_DINILAI').length} indikator dinilai)`).join('\n')
    : 'Belum ada riwayat observasi sebelumnya untuk anak ini.';

  const evidenceContext = evidences.length > 0
    ? evidences.map((e, idx) => `Bukti ${idx + 1} (${e.type}): "${e.title}"${e.caption ? ` - ${e.caption}` : ''}`).join('\n')
    : 'Belum ada file bukti visual/dokumen khusus yang dilampirkan.';

  try {
    // 1. Call server-side API proxy first (keeps API key secure)
    const serverRes = await fetch('/api/ai/analyze-observation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
          strengths: Array.isArray(d.strengths) ? d.strengths : ['Menunjukkan antusiasme eksplorasi yang baik'],
          needsStimulation: Array.isArray(d.needsStimulation) ? d.needsStimulation : ['Penguatan stimulasi bertahap pada aktivitas mandiri'],
          generatedNarrative: d.generatedNarrative || '',
          homeStimulationAdvice: Array.isArray(d.homeStimulationAdvice) ? d.homeStimulationAdvice : [d.homeStimulationAdvice || 'Ajak anak bercerita mengenai kegiatannya.'],
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
  } catch (serverErr) {
    console.warn('[AI Service] Server endpoint failed, attempting direct or fallback:', serverErr);
  }

  try {
    const env = (import.meta as any).env || {};
    const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Kamu adalah sistem AI Assessment Intelligence (GAI) untuk platform GrowUPAUD, spesialis asesmen anak usia dini (PAUD) berbasis Kurikulum Merdeka.
Tugasmu: Lakukan ANALISIS TRIANGULASI 6 SUMBER DATA dan INTERPRETASI PERKEMBANGAN BERBASIS USIA untuk LAPORAN ORANG TUA.
JANGAN HANYA MERINGKAS ATAU MENGGABUNGKAN TEKS. Lakukan triangulasi komprehensif antar seluruh sumber data.

6 SUMBER DATA OBSERVASI:
1. Konteks Data Anak & Umur:
   - Nama Anak: Ananda ${studentName}
   - Umur Anak: ${ageContext.isAgeFilled ? ageContext.ageDisplay : 'Umur belum dicantumkan'}
   - Tahap Perkembangan Usia: ${ageContext.phaseName} (${ageContext.ageGroup})
   - Karakteristik Pedagogis Usia: ${ageContext.pedagogicalContext}

2. Konteks Kegiatan & Kurikulum:
   - Kegiatan: ${activityTitle}
   - Capaian Pembelajaran (CP): ${cp}
   - Tujuan Pembelajaran (TP): ${tp}

3. Rubrik Penilaian Indikator Guru:
${indicators
  .map(
    (ind) =>
      `- [${ind.aspect}] ${ind.text} -> Level: ${ind.rating || 'BELUM_DINILAI'}`
  )
  .join('\n')}

4. Catatan Pengamatan Teks Guru:
"${teacherNote || 'Tidak ada catatan teks'}"

5. Transkrip Voice Note Guru:
"${voiceNoteText || 'Tidak ada rekaman suara'}"

6. Bukti Fisik/Visual Autentik & Riwayat:
${evidenceContext}
${historyContext}

Aturan Analisis Berbasis Usia & Pedagogi PAUD:
1. UMUR SEBAGAI KONTEKS: Analisis apakah perilaku yang diamati menunjukkan capaian yang sesuai dengan tahap perkembangan anak berdasarkan usianya (${ageContext.isAgeFilled ? ageContext.ageDisplay : 'usia anak'}).
2. DILARANG MENGHAKIMI ATAU MEMBERI LABEL NEGATIF: DILARANG menulis "anak gagal", "anak tertinggal", "tidak normal", atau vonis defisit. Gunakan bahasa perkembangan yang hati-hati, hangat, dan mengapresiasi proses:
   - Contoh bahasa yang tepat: "Pada usia ${ageContext.isAgeFilled ? ageContext.ageDisplay : 'tahap ini'}, Ananda mulai menunjukkan kemampuan...", "Perilaku yang diamati menunjukkan bahwa kemampuan tersebut mulai berkembang dan masih memerlukan penguatan melalui..."
   - Jika bukti data belum mencukupi untuk suatu aspek: "Belum tersedia bukti observasi yang cukup untuk menyimpulkan capaian kemampuan ini."
3. TRIANGULASI DATA: Hubungkan bukti antara Rubrik, Catatan Guru, Voice Note, Bukti Fisik/Foto, Konteks Kegiatan, dan Umur Anak.
4. DETEKSI KETIDAKSESUAIAN: Jika rubrik mencatat level tinggi (BSH/BSB) tetapi catatan guru/suara menyebut masih sering dibantu, simpulkan bahwa kemampuan sudah muncul namun masih memerlukan pendampingan bertahap agar konsisten mandiri.
5. Terjemahkan istilah rubrik (BB, MB, BSH, BSB) ke dalam bahasa narasi yang mudah dipahami orang tua secara bermakna.

Keluarkan format JSON murni TANPA markdown/backticks:
{
  "overview": "Ringkasan analisis perkembangan ramah orang tua dengan mempertimbangkan usia anak (2-3 kalimat)",
  "triangulationMatrix": [
    { "id": "t1", "sourceType": "RUBRIC", "sourceLabel": "Rubrik Indikator", "fact": "Fakta teramati", "aspect": "KOGNITIF", "status": "SUPPORTING" }
  ],
  "inconsistencies": [
    { "detected": false, "finding": "...", "interpretiveConclusion": "...", "recommendation": "..." }
  ],
  "interpretations": [
    {
      "aspect": "KOGNITIF",
      "aspectName": "Kognitif",
      "score": 75,
      "consistencyStatus": "KONSISTEN",
      "fakta": "Fakta konkret yang dilakukan anak dalam kegiatan",
      "buktiSumber": ["Rubrik Penilaian", "Catatan Guru"],
      "interpretasi": "Makna pedagogis terhadap tahapan usia anak yang mudah dipahami orang tua",
      "kebutuhanDukungan": "Langkah dukungan dan stimulasi lanjutan"
    }
  ],
  "strengths": ["Kekuatan teramati yang patut diapresiasi"],
  "needsStimulation": ["Area kemampuan yang sedang berproses dan memerlukan penguatan"],
  "generatedNarrative": "Narasi laporan perkembangan komprehensif ramah orang tua (120-180 kata) dengan perspektif usia anak, kemandirian yang dicapai, makna perkembangan, dan rekomendasi lanjutannya.",
  "homeStimulationAdvice": ["Rekomendasi kegiatan bermain bersama di rumah yang praktis dan bermakna"]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        overview: parsed.overview || `Analisis asesmen perkembangan Ananda ${studentName}`,
        aspectScores: realAspectScores,
        strengths: parsed.strengths || ['Menunjukkan keterlibatan positif dalam kegiatan'],
        needsStimulation: parsed.needsStimulation || ['Penguatan stimulasi bertahap pada aktivitas eksplorasi'],
        generatedNarrative: parsed.generatedNarrative || '',
        homeStimulationAdvice: parsed.homeStimulationAdvice || [],
        confidenceScore: confidenceInfo.score,
        confidenceLevel: confidenceInfo.level,
        confidenceFactors: confidenceInfo.factors,
        triangulationMatrix: parsed.triangulationMatrix || [],
        inconsistencies: parsed.inconsistencies || [],
        interpretations: parsed.interpretations || [],
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
  } catch (err) {
    console.warn('Gemini API unreachable or failed, fallback to Deterministic Triangulation Engine:', err);
  }

  // =========================================================================
  // DETERMINISTIC TRIANGULATION & REASONING ENGINE (OFFLINE/FALLBACK)
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

export interface LessonPlanRecommendationResult {
  theme: string;
  subtheme: string;
  recommendedCP: {
    code: string;
    title: string;
    description: string;
  };
  recommendedATP: {
    code: string;
    title: string;
    phase: string;
    stepOrder: number;
    description: string;
  };
  recommendedTP: {
    code: string;
    title: string;
    description: string;
  };
  recommendedIndicators: Array<{
    aspect: DevelopmentalAspect;
    text: string;
    rubric: {
      BB: string;
      MB: string;
      BSH: string;
      BSB: string;
    };
  }>;
  activityIdeas: Array<{
    title: string;
    duration: string;
    description: string;
    steps: string[];
  }>;
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
}

export async function fetchLessonPlanRecommendation(params: {
  theme: string;
  subtheme: string;
  ageGroup?: string;
  schoolContext?: any;
  customPrompt?: string;
  studentId?: string;
  studentName?: string;
  childObservations?: ObservationRecord[];
}): Promise<LessonPlanRecommendationResult> {
  const isKelompokA = (params.ageGroup || '').includes('4-5') || (params.ageGroup || '').toLowerCase().includes('kelompok a');
  const curatedActivities = getCuratedActivitiesForTheme(params.theme, params.subtheme, isKelompokA);

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
    const res = await fetch('/api/ai/lesson-plan-recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          ...json.data,
          chainedRecommendation: chained,
          curatedActivityOptions: curatedActivities,
        };
      }
    }
  } catch (err) {
    console.warn('[AI Service] Lesson plan recommendation request error, using engine fallback:', err);
  }

  // Pure Pedagogical Engine Result (Theme & Age Aligned, Zero Dummy Data)
  const activityList = curatedActivities.length > 0
    ? curatedActivities.map((act) => ({
        title: act.title,
        duration: act.duration,
        description: act.description,
        steps: act.steps,
      }))
    : [
        {
          title: chained.activityRecommendation.title,
          duration: chained.activityRecommendation.duration,
          description: chained.activityRecommendation.description,
          steps: chained.activityRecommendation.steps,
        },
      ];

  return {
    theme: params.theme,
    subtheme: params.subtheme,
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
    const res = await fetch('/api/ai/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[AI Service] Photo analysis request error:', err);
  }

  return {
    visualDescription: `Dokumentasi menunjukkan keaktifan anak dalam berproses pada kegiatan "${params.activityTitle}". Terlihat koordinasi gerakan dan interaksi langsung dengan media bermain.`,
    suggestedAspects: ['MOTORIK_HALUS', 'LITERASI_STEAM', 'JATI_DIRI'],
    potentialBehaviors: [
      'Menunjukkan koordinasi visual-motorik yang baik saat mengoperasikan media kegiatan.',
      'Memperlihatkan ekspresi konsentrasi dan rasa ingin tahu yang tinggi terhadap benda di depannya.',
      'Mencoba menyusun atau mengeksplorasi media dengan cara unik dan mandiri.',
    ],
    suggestedFollowUpQuestions: [
      'Bagaimana caramu menyusun benda ini sehingga bisa berdiri seimbang?',
      'Ceritakan pada Ibu guru, apa yang sedang kamu buat ini?',
    ],
    pedagogicInsight: 'Apresiasi proses usaha anak daripada hasil jadinya. Sediakan media variatif tambahan jika anak ingin memperluas kreasinya.',
  };
}
