export type UserRole =
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'TEACHER'
  | 'GURU'
  | 'PRINCIPAL'
  | 'KEPALA_SEKOLAH'
  | 'PARENT'
  | 'ORANG_TUA';

export interface SchoolProfile {
  id: string;
  name?: string;
  schoolName: string;
  schoolLogo: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  academicYear: string;
  semester: string;
  locationContext?: string; // misal: perdesaan agraris, pesisir, perkotaan
  locationCategory?: string;
  cultureContext?: string; // kearifan lokal, budaya, bahasa daerah
  culturalContext?: string;
  availableMedia?: string[]; // media murah/tersedia, bahan alam, loose parts
  availableMediaTypes?: string[];
  facilitiesSummary?: string; // sarana prasarana sekolah
  schoolFacilities?: string;
  studentCharacteristics?: string; // karakteristik & latar belakang peserta didik
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  className: string;
  classId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  studentsCount: number;
}

export interface ParentProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  studentIds: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  displayName?: string;
  role: UserRole;
  email: string;
  avatar: string;
  schoolId: string;
  schoolName: string;
  isActive: boolean;
  className?: string;
  classId?: string;
  childId?: string; // Khusus untuk Orang Tua
  studentIds?: string[];
  linkedStudentIds?: string[];
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DevelopmentalAspect =
  | 'NAM' // Nilai Agama & Budi Pekerti / Moral
  | 'JATI_DIRI' // Jati Diri & Sosial Emosional
  | 'LITERASI_STEAM' // Literasi & STEAM
  | 'MOTORIK_KASAR' // Motorik Kasar
  | 'MOTORIK_HALUS' // Motorik Halus
  | 'KOGNITIF'; // Kognitif

export type RatingLevel = 'BB' | 'MB' | 'BSH' | 'BSB' | 'BELUM_DINILAI';

export interface RubricDefinition {
  BB: string; // Belum Berkembang
  MB: string; // Mulai Berkembang
  BSH: string; // Berkembang Sesuai Harapan
  BSB: string; // Berkembang Sangat Baik
}

export interface ElementItem {
  id: string;
  curriculumId?: string;
  code: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface IndicatorItem {
  id: string;
  text: string;
  description?: string;
  aspect: DevelopmentalAspect;
  aspectId?: DevelopmentalAspect;
  subaspectId?: string;
  elementId?: string;
  cpId?: string;
  tpId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  source?: string;
  ownerType?: 'NATIONAL' | 'SCHOOL' | 'TEACHER';
  ownerId?: string;
  rubric?: RubricDefinition;
  rating?: RatingLevel; // Status penilaian observasi
  checked?: boolean; // Untuk kompatibilitas
}

export interface ActivityPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  iconName: string;
  cp: string; // Capaian Pembelajaran text
  tp: string; // Tujuan Pembelajaran text
  elementId?: string;
  cpId?: string;
  tpId?: string;
  themeId?: string;
  subthemeId?: string;
  theme?: string;
  subtheme?: string;
  aspectId?: DevelopmentalAspect;
  subaspectId?: string;
  ageGroup?: string;
  duration?: string;
  materials?: string[];
  instructions?: string[];
  status?: 'ACTIVE' | 'ARCHIVED';
  source?: string;
  ownerType?: 'NATIONAL' | 'SCHOOL' | 'TEACHER';
  ownerId?: string;
  indicators: IndicatorItem[];
  provocationQuestions?: string[];
  pedagogicalRationale?: string;
  tarlAdjustments?: { perluDukungan: string; berkembang: string; pengayaan: string };
  materialAlternatives?: Array<{ main: string; alternative: string; reason: string }>;
  modality?: string;
  documentationFocus?: string;
}

export interface CPItem {
  id: string;
  elementId: string;
  code: string;
  title: string;
  description: string;
  source: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ATPItem {
  id: string;
  cpId: string;
  cpCode?: string;
  code: string;
  title: string;
  phase: string;
  stepOrder: number;
  description: string;
  targetAspects?: DevelopmentalAspect[];
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface TPItem {
  id: string;
  cpId: string;
  atpId?: string;
  code: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ScheduleItem {
  id: string;
  schoolId?: string;
  classId?: string;
  className?: string;
  targetClass?: string;
  dayOfWeek?: string;
  date?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  activityTitle: string;
  category: 'PEMBELAJARAN' | 'ISTIRAHAT' | 'EVALUASI' | 'PENJEMPUTAN' | 'UPACARA';
  location: string;
  theme?: string;
  subtheme?: string;
  tp?: string;
  materials?: string[];
  teacherName?: string;
  targetAspects?: DevelopmentalAspect[];
  notes?: string;
  status: 'UPCOMING' | 'NOW' | 'DONE' | 'PLANNED';
}

export interface ThemeItem {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface SubthemeItem {
  id: string;
  themeId: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AspectItem {
  id: DevelopmentalAspect;
  code: string;
  name: string;
  description: string;
  color: string;
}

export interface SubaspectItem {
  id: string;
  aspectId: DevelopmentalAspect;
  name: string;
  description?: string;
}

export interface EvidenceItem {
  id: string;
  type: 'PHOTO' | 'VIDEO' | 'VOICE_NOTE' | 'KARYA' | 'DOCUMENT' | 'AUDIO' | 'TEXT';
  url: string;
  title: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
  createdAt?: string;
  transcript?: string;
  duration?: string;
  date: string;
}

export interface EvidenceTriangulationItem {
  id: string;
  sourceType: 'RUBRIC' | 'TEACHER_NOTE' | 'VOICE_NOTE' | 'PHOTO' | 'KARYA' | 'HISTORY';
  sourceLabel: string;
  fact: string; // FAKTA: Perilaku/ucapan/kondisi teramati nyata
  aspect?: DevelopmentalAspect;
  indicatorText?: string;
  status: 'SUPPORTING' | 'DISCREPANCY' | 'SUPPLEMENTARY';
  traceRef?: string;
}

export interface InconsistencyReport {
  detected: boolean;
  aspect?: DevelopmentalAspect;
  indicatorText?: string;
  rubricRating?: RatingLevel;
  teacherNoteExcerpt?: string;
  voiceExcerpt?: string;
  finding: string; // Deskripsi perbedaan temuan antar sumber
  interpretiveConclusion: string; // Kesimpulan perkembangan (misal kemampuan sudah muncul namun belum konsisten)
  recommendation: string; // Kebutuhan dukungan / pendampingan
}

export interface DevelopmentInterpretation {
  aspect: DevelopmentalAspect;
  aspectName: string;
  score: number | null;
  consistencyStatus: 'KONSISTEN' | 'MUNCUL_DENGAN_BANTUAN' | 'PERLU_STIMULASI' | 'BELUM_TERAMATI';
  fakta: string; // Apa yang dilakukan anak secara nyata
  buktiSumber: string[]; // ['Rubrik BSH (Indikator 1)', 'Catatan Guru: "..."', 'Foto Aktivitas']
  interpretasi: string; // Makna capaian terhadap perkembangan anak
  kebutuhanDukungan: string; // Tindak lanjut pendampingan
  traceableEvidenceIds?: string[];
}

export interface DataSourceStats {
  rubricCount: number;
  hasTeacherNote: boolean;
  hasVoiceNote: boolean;
  evidenceCount: number;
  hasHistory: boolean;
}

export interface AIInsightResult {
  overview: string;
  aspectScores: Record<DevelopmentalAspect, number | null>; // number atau null jika belum diamati
  strengths: string[];
  needsStimulation: string[];
  generatedNarrative: string; // Narasi laporan perkembangan otomatis
  homeStimulationAdvice: string[]; // Rekomendasi aktivitas di rumah
  confidenceScore?: number | null; // 0-100 atau null
  confidenceLevel?: string; // 'Sangat Tinggi' | 'Tinggi' | 'Sedang' | 'Cukup' | 'Belum Tersedia'
  confidenceFactors?: string[];
  triangulationMatrix?: EvidenceTriangulationItem[];
  inconsistencies?: InconsistencyReport[];
  interpretations?: DevelopmentInterpretation[];
  dataSourcesAnalyzed?: DataSourceStats;
  lastUpdated: string;
}

export interface ObservationRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  activityId: string;
  activityTitle: string;
  date: string;
  observationDateISO?: string;
  cp: string;
  tp: string;
  elementId?: string;
  cpId?: string;
  tpId?: string;
  themeId?: string;
  subthemeId?: string;
  indicators: IndicatorItem[];
  evidences: EvidenceItem[];
  teacherNote: string;
  voiceNoteText?: string;
  voiceNote?: {
    audioUrl: string | null;
    transcript: string;
    duration: number;
  };
  aiAnalysis?: AIInsightResult;
  academicYear?: string;
  semester?: string;
  status: 'DRAFT' | 'VERIFIED' | 'REPORT_READY';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentProfile {
  id: string;
  schoolId?: string;
  classId?: string;
  parentIds?: string[];
  teacherIds?: string[];
  name: string;
  nickname: string;
  age?: string | null; // misal "5 tahun 3 bulan"
  ageYears?: number | null; // tahun (>= 0)
  ageMonths?: number | null; // bulan (0-11)
  ageLabel?: string | null; // label terformat misal "5 tahun 3 bulan"
  gender: 'L' | 'P';
  className: string;
  parentName: string;
  parentContact: string;
  avatar: string;
  attendanceRate: number;
  overallScore: number | null;
  aspectScores: Record<DevelopmentalAspect, number | null>;
  observationsCount: number;
  reportStatus: 'BELUM' | 'PROSES' | 'SELESAI';
  latestObservationDate: string;
  timeline: {
    id: string;
    date: string;
    title: string;
    category: string;
    description: string;
    aspectBadge: string;
    imageUrl?: string;
    voiceNoteUrl?: string;
  }[];
  nisn?: string;
}

export interface SchoolSummary {
  id: string;
  name: string;
  address: string;
  principalName: string;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  activeObservationsToday: number;
  completedReportsCount: number;
  aspectAverageScores: Record<DevelopmentalAspect, number | null>;
}

export interface ParentFeedback {
  id: string;
  studentId: string;
  studentName?: string;
  parentId?: string;
  parentName: string;
  date: string;
  comment: string;
  replyFromTeacher?: string;
  recipientRole?: 'GURU' | 'KEPALA_SEKOLAH';
  recipientName?: string;
  category?: 'KONSULTASI_PERKEMBANGAN' | 'KEGIATAN_RUMAH' | 'PERTANYAAN_UMUM';
  status?: 'TERKIRIM' | 'DIBALAS';
  repliedAt?: string;
  repliedBy?: string;
  schoolId?: string;
  createdAt?: string;
}

// ==========================================
// SISTEM RANTAI REKOMENDASI PEDAGOGIS (CHAINED ENGINE)
// Tema → Subtema → Kelompok/Usia → TP/ATP → Ide Kegiatan → Bahan → TaRL → UDL → CRT → Pertanyaan → Dukungan → Indikator → Tindak Lanjut
// ==========================================

export interface TarlLevelGuidance {
  label: string; // 'Perlu Dukungan' | 'Berkembang' | 'Pengayaan'
  childCharacteristics: string; // Karakteristik kesiapan nyata anak
  activityAdjustment: string; // Penyesuaian bentuk tugas konkret
  promptingQuestions: string[]; // Pertanyaan spesifik untuk tahap ini
  teacherSupport: string; // Bentuk intervensi/scaffolding guru
  realisticExpectation: string; // Capaian yang wajar dan dapat diobservasi
}

export interface TarlDifferentiationBundle {
  perluDukungan: TarlLevelGuidance;
  berkembang: TarlLevelGuidance;
  pengayaan: TarlLevelGuidance;
}

export interface UdlPillarsBundle {
  engagement: {
    title: string;
    description: string;
    options: string[]; // Pilihan minat, peran, dan koneksi personal
  };
  representation: {
    title: string;
    description: string;
    modalities: string[]; // Benda konkret, gambar, kinestetik, narasi
  };
  actionAndExpression: {
    title: string;
    description: string;
    expressionChoices: string[]; // Menunjuk, bercerita, menyusun benda, bermain peran
  };
}

export interface CtrRecommendation {
  approachName: string; // Culturally Responsive Teaching (CRT)
  culturalContextSummary: string;
  localConnection: string; // Koneksi dengan lingkungan sekitar anak & bahan lokal
  communityOrFamilyLink: string; // Keterkaitan dengan kebiasaan dan pengalaman rumah
  antiBiasNote: string; // Panduan inklusif tanpa prasangka atau stereotip
}

export interface PromptingQuestionsBundle {
  introductory: string[]; // Pembuka / Pemicu rasa ingin tahu
  exploratory: string[]; // Saat proses bermain / penyelidikan
  reflective: string[]; // Refleksi / Berbagi makna di akhir
  differentiatedByTarl: {
    perluDukungan: string[];
    berkembang: string[];
    pengayaan: string[];
  };
}

export interface TeacherSupportBundle {
  scaffoldingSteps: string[];
  environmentalSetup: string;
  emotionalSupport: string;
}

export interface AssessmentIndicatorBundle {
  aspect: DevelopmentalAspect;
  aspectLabel: string;
  observableBehavior: string;
  rubric: {
    BB: string;
    MB: string;
    BSH: string;
    BSB: string;
  };
}

export interface FollowUpRecommendationBundle {
  nextSteps: string[];
  observationFocus: string;
  homeStimulation: string[];
  basedOnPreviousObservations?: string;
}

export interface PedagogicalRecommendationContext {
  theme: string;
  subtheme: string;
  ageGroup: string; // misal 'Usia 4-5 Tahun (Kelompok A)' atau 'Usia 5-6 Tahun (Kelompok B)'
  tpId?: string;
  tpTitle?: string;
  atpId?: string;
  atpTitle?: string;
  cpId?: string;
  cpTitle?: string;
  activityTitle?: string;
  activityDescription?: string;
  childAbilityLevel?: 'PERLU_DUKUNGAN' | 'BERKEMBANG' | 'PENGAYAAN' | 'CAMPURAN';
  studentId?: string;
  studentName?: string;
  availableMaterials?: string[];
  schoolContext?: {
    name?: string;
    locationContext?: string;
    locationCategory?: string;
    culturalContext?: string;
    cultureContext?: string;
    availableMedia?: string[];
    availableMediaTypes?: string[];
    facilitiesSummary?: string;
    studentCharacteristics?: string;
  };
  childObservations?: ObservationRecord[];
  previousAssessments?: AIInsightResult[];
}

export interface PedagogicalRecommendation {
  id: string;
  createdAt: string;
  context: {
    theme: string;
    subtheme: string;
    ageGroup: string;
    cp: { code: string; title: string; description: string };
    atp: { code: string; title: string; phase: string; description: string; stepOrder: number };
    tp: { code: string; title: string; description: string };
    isCurriculumVerified: boolean;
  };
  activityRecommendation: {
    title: string;
    duration: string;
    description: string;
    steps: string[];
    pedagogicalRationale: string;
    ageAppropriateness: string;
  };
  materials: {
    primary: string[];
    localLooseParts: string[];
    alternatives: Array<{ main: string; alternative: string; reason: string }>;
    safetyNote: string;
  };
  tarlDifferentiation: TarlDifferentiationBundle;
  udlRecommendation: UdlPillarsBundle;
  ctrRecommendation: CtrRecommendation;
  promptingQuestions: PromptingQuestionsBundle;
  teacherSupport: TeacherSupportBundle;
  assessmentIndicators: AssessmentIndicatorBundle[];
  followUpRecommendation: FollowUpRecommendationBundle;
}
