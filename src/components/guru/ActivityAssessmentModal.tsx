import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Mic,
  Camera,
  Video,
  FileText,
  Upload,
  FolderOpen,
  UserCheck,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Award,
  ChevronRight,
  BookOpen,
  Search,
  Plus,
  Info,
  Layers,
  HelpCircle,
  Sliders,
  ShieldCheck,
  Scale,
  TrendingUp,
  Eye,
  FileCheck,
} from 'lucide-react';
import {
  StudentProfile,
  UserProfile,
  ActivityPreset,
  ObservationRecord,
  IndicatorItem,
  AIInsightResult,
  RatingLevel,
  EvidenceItem,
  DevelopmentalAspect,
  EvidenceTriangulationItem,
  InconsistencyReport,
  DevelopmentInterpretation,
} from '../../types';
import { schoolStore } from '../../services/schoolStore';
import { useAuth } from '../../context/AuthContext';
import {
  ASPECT_LABELS,
  ASPECT_COLORS,
} from '../../data/initialData';
import { canViewStudent } from '../../utils/authorization';
import {
  curriculumStore,
  DEFAULT_RUBRIC,
  calculateAspectScores,
  calculateConfidenceScore,
} from '../../services/curriculumStore';
import { observationStore } from '../../services/observationStore';
import { generateAIAssessmentInsight } from '../../services/aiService';
import { formatStudentAge } from '../../utils/ageUtils';
import { RadarChartCard } from '../common/RadarChartCard';
import { TraceableEvidenceInspector } from '../common/TraceableEvidenceInspector';

interface ActivityAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveObservation: (record: ObservationRecord) => void | Promise<void>;
  selectedStudentId?: string;
  initialActivityId?: string;
  students?: StudentProfile[];
  currentUser?: UserProfile;
  onOpenReportPreview?: (student: StudentProfile) => void;
  initialObservation?: ObservationRecord | null;
}

export const ActivityAssessmentModal: React.FC<ActivityAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSaveObservation,
  selectedStudentId,
  initialActivityId,
  students,
  currentUser: propCurrentUser,
  onOpenReportPreview,
  initialObservation,
}) => {
  // Load activities from Centralized Store
  const [activitiesList, setActivitiesList] = useState<ActivityPreset[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Step state (Wizard)
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Anak, 2: Kegiatan & Assessment, 3: Bukti & AI, 4: Preview

  const { userProfile } = useAuth();
  const currentUser = propCurrentUser || userProfile;
  const availableStudents = React.useMemo(() => {
    const list = students && students.length > 0 ? students : schoolStore.getStudents();
    if (!currentUser) return [];
    return list.filter((s) => canViewStudent(currentUser, s));
  }, [students, currentUser]);

  // Step 1: Student & Meta
  const [studentId, setStudentId] = useState<string>('');

  React.useEffect(() => {
    if (!isOpen) return;

    if (initialObservation) {
      setStudentId(initialObservation.studentId);
      if (initialObservation.observationDateISO) {
        setObservationDate(initialObservation.observationDateISO);
      }
      setSelectedActivityId(initialObservation.activityId);
      setObservationIndicators(initialObservation.indicators || []);
      setTeacherNote(initialObservation.teacherNote || '');
      setVoiceNoteText(
        initialObservation.voiceNoteText ||
          initialObservation.voiceNote?.transcript ||
          ''
      );
      setEvidences(initialObservation.evidences || []);
      if (initialObservation.aiAnalysis) {
        setAiInsight(initialObservation.aiAnalysis as any);
        setEditedNarrative(
          initialObservation.editedNarrative ||
            initialObservation.aiAnalysis.generatedNarrative ||
            ''
        );
      }
      return;
    }

    if (selectedStudentId && availableStudents.some((s) => s.id === selectedStudentId)) {
      setStudentId(selectedStudentId);
    } else if (availableStudents.length > 0) {
      setStudentId(availableStudents[0].id);
    } else {
      setStudentId('');
    }
  }, [isOpen, selectedStudentId, availableStudents, initialObservation]);

  const [observationDate, setObservationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [semester, setSemester] = useState<string>(() => {
    const profile = schoolStore.getSchoolProfile();
    return profile?.semester || 'Semester I (Ganjil)';
  });

  // Step 2: Activity selection
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  // Indicators state for current observation (with rating level BB, MB, BSH, BSB)
  const [observationIndicators, setObservationIndicators] = useState<IndicatorItem[]>([]);

  // Add custom indicator form
  const [showAddCustomInd, setShowAddCustomInd] = useState<boolean>(false);
  const [customIndText, setCustomIndText] = useState<string>('');
  const [customIndAspect, setCustomIndAspect] = useState<DevelopmentalAspect>('KOGNITIF');

  // Step 3: Evidences, Teacher Note & Voice Note
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [voiceNoteText, setVoiceNoteText] = useState<string>('');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // Evidences list (Start empty for real observations!)
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);

  // AI Assessment & Narrative Editing
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<AIInsightResult | null>(null);
  const [editedNarrative, setEditedNarrative] = useState<string>('');

  // Expanded Rubric Info State
  const [expandedRubricIndId, setExpandedRubricIndId] = useState<string | null>(null);

  // Saving state & error feedback (Double-submit prevention)
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Voice Note Recording Timer Ref
  const timerRef = useRef<any>(null);

  // Sync activities from store
  useEffect(() => {
    if (!isOpen) return;

    const syncActivities = () => {
      const list = curriculumStore.getActivities();
      setActivitiesList(list);

      if (initialActivityId) {
        const found = list.find((a) => a.id === initialActivityId);
        if (found) {
          setSelectedActivityId(found.id);
          loadActivityIndicators(found);
          return;
        }
      }

      if (list.length > 0 && !selectedActivityId) {
        setSelectedActivityId(list[0].id);
        loadActivityIndicators(list[0]);
      }
    };

    syncActivities();
    const unsubscribe = curriculumStore.subscribe(syncActivities);
    return () => unsubscribe();
  }, [isOpen, initialActivityId]);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl space-y-4">
          <p className="text-sm font-semibold text-slate-800">Profil pengguna belum tersedia.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-300"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const selectedStudent =
    availableStudents.find((s) => s.id === studentId) || availableStudents[0] || null;

  const currentActivity =
    activitiesList.find((a) => a.id === selectedActivityId) || activitiesList[0];

  // Filtered activities by search
  const filteredActivities = activitiesList.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.cp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadActivityIndicators = (act: ActivityPreset) => {
    if (!act) return;
    // CRITICAL: Do NOT auto-check or auto-rate! Set to BELUM_DINILAI
    const formatted: IndicatorItem[] = (act.indicators || []).map((ind) => ({
      ...ind,
      rubric: ind.rubric || DEFAULT_RUBRIC,
      rating: 'BELUM_DINILAI',
      checked: false,
    }));
    setObservationIndicators(formatted);
    setAiInsight(null);
  };

  const handleSelectActivity = (actId: string) => {
    setSelectedActivityId(actId);
    const act = activitiesList.find((a) => a.id === actId);
    if (act) loadActivityIndicators(act);
  };

  const handleSetRating = (indicatorId: string, rating: RatingLevel) => {
    setObservationIndicators((prev) =>
      prev.map((ind) =>
        ind.id === indicatorId
          ? {
              ...ind,
              rating: rating,
              checked: rating !== 'BELUM_DINILAI' && rating !== 'BB',
            }
          : ind
      )
    );
    setAiInsight(null); // Reset AI insight when indicators change
  };

  const handleAddCustomIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIndText.trim() || !currentActivity) return;

    // Save to centralized store so it persists!
    const newInd = curriculumStore.addIndicatorToActivity(currentActivity.id, {
      text: customIndText.trim(),
      aspect: customIndAspect,
      rubric: DEFAULT_RUBRIC,
      ownerType: 'TEACHER',
      status: 'ACTIVE',
    });

    // Add to current observation with BELUM_DINILAI
    setObservationIndicators((prev) => [
      ...prev,
      {
        ...newInd,
        rating: 'BELUM_DINILAI',
        checked: false,
      },
    ]);

    setCustomIndText('');
    setShowAddCustomInd(false);
  };

  // Voice Note Recording Mock / Web Speech API
  const handleToggleVoiceRecord = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setIsRecordingVoice(true);
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              text += event.results[i][0].transcript + ' ';
            }
          }
          if (text.trim()) {
            setVoiceNoteText((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
          }
        };
        recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition init error:', e);
      }
    }
  };

  const handleInsertSampleVoiceNote = () => {
    const studentNick = selectedStudent?.nickname || selectedStudent?.name || 'anak';
    const samples = [
      `Transkrip Suara Observasi: Ananda ${studentNick} sangat tenang dan konsisten saat menjalankan kegiatan. Respon fisik dan koordinasi mata tangannya meningkat pesat.`,
      `Transkrip Suara Observasi: ${studentNick} dapat bekerjasama dengan baik saat berada di area kelompok, mau mendengar teman, dan tidak berebut alat main.`,
    ];
    setVoiceNoteText(samples[Math.floor(Math.random() * samples.length)]);
  };

  const handleFileUpload = (type: 'PHOTO' | 'DOCUMENT', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          const studentNick = selectedStudent?.nickname || selectedStudent?.name || 'anak';
          const newEv: EvidenceItem = {
            id: `ev-${Date.now()}`,
            type: type,
            url: reader.result as string,
            title: file.name,
            caption: `Bukti ${type} observasi ${studentNick}`,
            date: new Date().toLocaleDateString('id-ID'),
          };
          setEvidences((prev) => [...prev, newEv]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!currentActivity || !selectedStudent) return;
    setIsAnalyzing(true);
    try {
      const prevObs = observationStore.getObservationsByStudent(selectedStudent.id);
      const result = await generateAIAssessmentInsight({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        studentAge: formatStudentAge(selectedStudent),
        ageYears: selectedStudent.ageYears,
        ageMonths: selectedStudent.ageMonths,
        ageLabel: selectedStudent.ageLabel,
        activityTitle: currentActivity.title,
        cp: currentActivity.cp,
        tp: currentActivity.tp,
        indicators: observationIndicators,
        teacherNote,
        voiceNoteText,
        evidences,
        evidencesCount: evidences.length,
        previousObservations: prevObs,
      });

      setAiInsight(result);
      setEditedNarrative(result.generatedNarrative);
    } catch (err) {
      console.error('Error in AI Analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAndClose = async (
    status: 'VERIFIED' | 'REPORT_READY',
    openReportAfter: boolean = false
  ) => {
    if (isSaving || !selectedStudent || !currentActivity || !currentUser) return;
    setIsSaving(true);
    setSaveError(null);

    const realAspectScores = calculateAspectScores(observationIndicators);
    const confidenceInfo = calculateConfidenceScore(
      observationIndicators,
      teacherNote,
      voiceNoteText,
      evidences.length
    );

    const currentSchool = schoolStore.getSchoolProfile();
    const targetSchoolId = currentUser.schoolId || currentSchool.id || selectedStudent.schoolId || 'main-school';

    const record: ObservationRecord = {
      id: initialObservation?.id || `obs-${Date.now()}`,
      schoolId: targetSchoolId,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      classId: selectedStudent.classId || '',
      className: selectedStudent.className || '',
      teacherId: currentUser.id,
      teacherName: currentUser.name || currentUser.displayName || currentUser.username,
      activityId: currentActivity.id,
      activityTitle: currentActivity.title,
      academicYear: currentSchool.academicYear,
      semester: currentSchool.semester,
      date: new Date(observationDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      observationDateISO: observationDate,
      cp: currentActivity.cp,
      tp: currentActivity.tp,
      elementId: currentActivity.elementId,
      cpId: currentActivity.cpId,
      tpId: currentActivity.tpId,
      themeId: currentActivity.themeId,
      subthemeId: currentActivity.subthemeId,
      indicators: observationIndicators,
      evidences: evidences,
      teacherNote: teacherNote,
      voiceNoteText: voiceNoteText,
      voiceNote: voiceNoteText ? {
        audioUrl: null,
        transcript: voiceNoteText,
        duration: recordingDuration,
      } : undefined,
      aiAnalysis: aiInsight
        ? {
            ...aiInsight,
            generatedNarrative: editedNarrative || aiInsight.generatedNarrative,
          }
        : {
            overview: "Analisis AI belum dibuat.",
            aspectScores: realAspectScores,
            strengths: [],
            needsStimulation: [],
            generatedNarrative: editedNarrative || "Narasi AI belum dibuat.",
            homeStimulationAdvice: [],
            confidenceScore: confidenceInfo.score,
            confidenceLevel: confidenceInfo.level,
            confidenceFactors: confidenceInfo.factors,
            lastUpdated: new Date().toLocaleDateString('id-ID'),
          },
      status: status,
    };

    console.log('[OBSERVATION SAVE START]');
    console.log(`teacherUid = ${currentUser.id}`);
    console.log(`teacherRole = ${currentUser.role}`);
    console.log(`teacherSchoolId = ${currentUser.schoolId}`);
    console.log(`studentId = ${selectedStudent.id}`);
    console.log(`studentName = ${selectedStudent.name}`);
    console.log(`studentSchoolId = ${selectedStudent.schoolId || record.schoolId}`);
    console.log(`classId = ${selectedStudent.classId || '-'}`);
    console.log(`observationId = ${record.id}`);
    console.log(`targetCollection = observations`);
    console.log(`payload fields =`);
    console.log(`schoolId = ${record.schoolId}`);
    console.log(`studentId = ${record.studentId}`);
    console.log(`classId = ${record.classId || '-'}`);
    console.log(`teacherId = ${record.teacherId}`);
    console.log(`createdBy = ${record.teacherId}`);

    try {
      await onSaveObservation(record);
      onClose();
      if (openReportAfter && onOpenReportPreview && selectedStudent) {
        onOpenReportPreview(selectedStudent);
      }
    } catch (err: any) {
      console.error('[OBSERVATION SAVE ERROR]', err);
      setSaveError(err?.message || 'Gagal menyimpan observasi ke Firestore. Periksa koneksi Anda.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculated Real Aspect Scores for preview
  const currentAspectScores = calculateAspectScores(observationIndicators);
  const currentConfidence = calculateConfidenceScore(
    observationIndicators,
    teacherNote,
    voiceNoteText,
    evidences.length
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Modul Observasi & AI Assessment PAUD</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-extrabold border border-emerald-500/40 uppercase">
                  Kurikulum Merdeka
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Alur wizard observasi step-by-step terhubung langsung dengan Centralized Curriculum Store.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Tracker Bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          {[
            { step: 1, label: '1. Pilih Anak' },
            { step: 2, label: '2. Pilih Kegiatan & Rubrik' },
            { step: 3, label: '3. Bukti Autentik & AI' },
            { step: 4, label: '4. Visualisasi & Simpan' },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
                    isActive
                      ? 'bg-white text-emerald-700'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : item.step}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content by Step */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800">
          {/* STEP 1: PILIH ANAK */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Langkah 1: Pilih Anak & Informasi Observasi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih anak didik yang diamati dan tetapkan tanggal serta semester observasi.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  Total Anak: {availableStudents.length}
                </span>
              </div>

              {/* Student Selector Grid */}
              {availableStudents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-medium text-xs">
                  Belum ada siswa yang ditugaskan ke kelas Anda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableStudents.map((student) => {
                    const isSelected = student.id === studentId;
                    return (
                      <div
                        key={student.id}
                        onClick={() => setStudentId(student.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
                          alt={student.name || 'Anak'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {student.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            NIS: {student.id.toUpperCase()} • Usia: {formatStudentAge(student)}
                          </p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 mt-1">
                            {student.className}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="p-1 rounded-full bg-emerald-600 text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Meta Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Observasi:
                  </label>
                  <input
                    type="date"
                    value={observationDate}
                    onChange={(e) => setObservationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester:
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="Semester 1 (Ganjil)">Semester 1 (Ganjil)</option>
                    <option value="Semester 2 (Genap)">Semester 2 (Genap)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anak Terpilih:
                  </label>
                  <div className="px-3 py-2 text-xs font-extrabold text-emerald-800 bg-emerald-100 rounded-xl border border-emerald-300">
                    {selectedStudent ? `${selectedStudent.name} (${selectedStudent.age})` : 'Belum ada anak yang dipilih'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PILIH KEGIATAN & RUBRIK (BB, MB, BSH, BSB) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Langkah 2: Pilih Kegiatan & Penilaian Indikator Rubrik
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem otomatis memetakan CP, TP, dan Indikator dari Centralized Store. Tentukan hasil penilaian (BB, MB, BSH, BSB).
                  </p>
                </div>

                {/* Search Activity Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kegiatan..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Activity Selector & Mapping Header */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Activities Bank */}
                <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 max-h-[400px] overflow-y-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase px-1">
                    Pilih Kegiatan ({filteredActivities.length})
                  </p>
                  {filteredActivities.map((act) => {
                    const isSelected = act.id === selectedActivityId;
                    return (
                      <div
                        key={act.id}
                        onClick={() => handleSelectActivity(act.id)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <p className="text-xs leading-snug">{act.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {act.category}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                            {act.indicators.length} indikator
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Activity Auto Mapping & Indicators Rubric Checklist */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-5">
                  {currentActivity ? (
                    <>
                      {/* Automatic Mapping Banner */}
                      <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-indigo-600 text-white uppercase">
                            Pemetaan Otomatis Kurikulum
                          </span>
                          <span className="text-xs font-extrabold text-indigo-900">
                            {currentActivity.title}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <p>
                            <strong className="text-indigo-900">CP (Capaian):</strong> {currentActivity.cp}
                          </p>
                          <p>
                            <strong className="text-indigo-900">TP (Tujuan):</strong> {currentActivity.tp}
                          </p>
                        </div>
                      </div>

                      {/* Indicators Rubric Assessment */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            <span>Rubrik Penilaian Indikator Guru</span>
                          </h4>
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                            Status: Wajib Diisi Guru (BB / MB / BSH / BSB)
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                          {observationIndicators.map((ind) => {
                            const rubric = ind.rubric || DEFAULT_RUBRIC;
                            const isExpanded = expandedRubricIndId === ind.id;
                            const currentRating = ind.rating || 'BELUM_DINILAI';

                            return (
                              <div
                                key={ind.id}
                                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-300 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase shrink-0">
                                      {ind.aspect}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900">{ind.text}</p>
                                      {ind.observableBehavior && (
                                        <p className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded-md mt-1 border border-emerald-100">
                                          <strong className="font-semibold">Perilaku Teramati:</strong> {ind.observableBehavior}
                                        </p>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedRubricIndId(isExpanded ? null : ind.id)
                                        }
                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline mt-0.5 block"
                                      >
                                        {isExpanded ? 'Sembunyikan Deskripsi Rubrik' : 'Lihat Deskripsi Rubrik BB/MB/BSH/BSB'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* BB / MB / BSH / BSB Rating Buttons */}
                                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                    {(
                                      [
                                        { level: 'BB', label: 'BB (1)', color: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100', active: 'bg-red-600 text-white border-red-600 shadow-xs' },
                                        { level: 'MB', label: 'MB (2)', color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100', active: 'bg-amber-600 text-white border-amber-600 shadow-xs' },
                                        { level: 'BSH', label: 'BSH (3)', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100', active: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
                                        { level: 'BSB', label: 'BSB (4)', color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100', active: 'bg-blue-600 text-white border-blue-600 shadow-xs' },
                                      ] as const
                                    ).map((item) => {
                                      const isSelected = currentRating === item.level;
                                      return (
                                        <button
                                          key={item.level}
                                          type="button"
                                          onClick={() => handleSetRating(ind.id, item.level)}
                                          className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all ${
                                            isSelected ? item.active : item.color
                                          }`}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                    {currentRating !== 'BELUM_DINILAI' && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetRating(ind.id, 'BELUM_DINILAI')}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1 font-bold"
                                        title="Reset ke Belum Dinilai"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Expanded Rubric Descriptions */}
                                {isExpanded && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 animate-fadeIn">
                                    <div className="p-1.5 rounded bg-red-50 border border-red-200">
                                      <strong className="text-red-700">BB (1):</strong> {rubric.BB}
                                    </div>
                                    <div className="p-1.5 rounded bg-amber-50 border border-amber-200">
                                      <strong className="text-amber-700">MB (2):</strong> {rubric.MB}
                                    </div>
                                    <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                                      <strong className="text-emerald-700">BSH (3):</strong> {rubric.BSH}
                                    </div>
                                    <div className="p-1.5 rounded bg-blue-50 border border-blue-200">
                                      <strong className="text-blue-700">BSB (4):</strong> {rubric.BSB}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Non-Focus Aspects Section (Transparent & Polite) */}
                        {currentActivity.nonFocusAspects && currentActivity.nonFocusAspects.length > 0 && (
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-600 flex items-center gap-1.5 text-[11px]">
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                <span>Aspek Non-Fokus (Sengaja Tidak Dinilai pada Kegiatan Ini):</span>
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {currentActivity.nonFocusAspects.map((nfa) => (
                                <div
                                  key={nfa.aspect}
                                  className="px-2.5 py-1 bg-white rounded-xl border border-slate-200 text-[11px] flex items-center gap-2 shadow-2xs"
                                >
                                  <span className="font-bold text-slate-700">{nfa.aspectLabel || nfa.aspect}</span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-500 italic text-[10px]">{nfa.reason}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newInd = curriculumStore.addIndicatorToActivity(currentActivity.id, {
                                        text: `Anak menunjukkan capaian aspek ${nfa.aspectLabel || nfa.aspect} selama kegiatan`,
                                        aspect: nfa.aspect,
                                        rubric: DEFAULT_RUBRIC,
                                        ownerType: 'TEACHER',
                                        status: 'ACTIVE',
                                      });
                                      setObservationIndicators((prev) => [
                                        ...prev,
                                        { ...newInd, rating: 'BELUM_DINILAI', checked: false },
                                      ]);
                                    }}
                                    className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px] ml-1 cursor-pointer underline"
                                  >
                                    + Amati Aspek Ini
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Custom Indicator Button & Form */}
                        {!showAddCustomInd ? (
                          <button
                            type="button"
                            onClick={() => setShowAddCustomInd(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Indikator Baru (Simpan ke Referensi Bank Kegiatan)</span>
                          </button>
                        ) : (
                          <form
                            onSubmit={handleAddCustomIndicator}
                            className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn"
                          >
                            <p className="text-xs font-bold text-indigo-900">
                              Tambah Indikator Baru untuk Kegiatan ini:
                            </p>
                            <div className="flex flex-wrap sm:flex-nowrap gap-2">
                              <select
                                value={customIndAspect}
                                onChange={(e) => setCustomIndAspect(e.target.value as DevelopmentalAspect)}
                                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                              >
                                <option value="NAM">1. Nilai Agama & Moral (NAM)</option>
                                <option value="JATI_DIRI">2. Jati Diri / Sosial Emosional (JATI_DIRI)</option>
                                <option value="LITERASI_STEAM">3. Literasi & STEAM (LITERASI_STEAM)</option>
                                <option value="MOTORIK_KASAR">4. Motorik Kasar (MOTORIK_KASAR)</option>
                                <option value="MOTORIK_HALUS">5. Motorik Halus (MOTORIK_HALUS)</option>
                                <option value="KOGNITIF">6. Kognitif & Berpikir (KOGNITIF)</option>
                              </select>
                              <input
                                type="text"
                                required
                                value={customIndText}
                                onChange={(e) => setCustomIndText(e.target.value)}
                                placeholder="Uraian indikator baru..."
                                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                              <button
                                type="submit"
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                              >
                                Simpan Indikator
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAddCustomInd(false)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 py-10 text-center">Pilih kegiatan terlebih dahulu.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUKTI AUTENTIK & ANALISIS TRIANGULASI AI */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Step Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-600" />
                    <span>Langkah 3: Triangulasi Multi-Sumber & Analisis Perkembangan</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mengintegrasikan Rubrik ({observationIndicators.filter((i) => i.rating && i.rating !== 'BELUM_DINILAI').length} Indikator), Catatan Teks, Suara, Bukti Fisik, dan Konteks Kurikulum Merdeka PAUD.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunAIAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Triangulasi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{aiInsight ? 'Jalankan Ulang Analisis Triangulasi' : 'Jalankan Analisis Triangulasi AI'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Data Input Grid (Multi-Source Observasi) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Teacher Notes & Voice Note */}
                <div className="space-y-4">
                  {/* Teacher Text Note */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Catatan Pengamatan Guru (Teks):</span>
                      </span>
                      {teacherNote && (
                        <span className="text-[10px] text-emerald-700 font-extrabold">Terisi</span>
                      )}
                    </label>
                    <textarea
                      rows={3}
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                      className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Tuliskan perilaku konkret yang diamati secara faktual (contoh: Ananda mampu menyusun balok mandiri, namun saat pencampuran warna masih meminta bantuan guru)..."
                    />
                  </div>

                  {/* Voice Note Recorder */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-emerald-600" />
                        <span>Voice Note Guru (Speech-to-Text):</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleInsertSampleVoiceNote}
                        className="text-[10px] font-bold text-emerald-700 hover:underline"
                      >
                        + Contoh Transkrip Suara
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleVoiceRecord}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                          isRecordingVoice
                            ? 'bg-red-600 text-white border-red-700 animate-pulse'
                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        <span>{isRecordingVoice ? `Merekam (${recordingDuration}s)` : 'Mulai Rekam Suara'}</span>
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {isRecordingVoice ? 'Bicaralah dekat mikrofon...' : 'Tekan untuk merekam pengamatan langsung'}
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={voiceNoteText}
                      onChange={(e) => setVoiceNoteText(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none"
                      placeholder="Hasil transkripsi rekaman suara akan muncul di sini..."
                    />
                  </div>
                </div>

                {/* Right: Authentic Evidence Preview Grid */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span>Bukti Autentik Terunggah ({evidences.length})</span>
                      </h4>
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload('PHOTO', e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                      {evidences.length === 0 ? (
                        <div className="col-span-2 py-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                          <p className="text-xs font-bold text-slate-500">Belum ada file bukti diunggah</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Dapat melampirkan foto hasil karya atau aktivitas bermain</p>
                        </div>
                      ) : (
                        evidences.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2 bg-white rounded-xl border border-slate-200 text-xs space-y-1 relative group"
                          >
                            {ev.type === 'PHOTO' && (
                              <img
                                src={ev.url}
                                alt={ev.title}
                                className="w-full h-16 object-cover rounded-lg border"
                              />
                            )}
                            <p className="font-bold text-slate-800 truncate text-[11px]">{ev.title}</p>
                            <p className="text-[9px] text-slate-500">{ev.date}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Summary of Evaluated Rubric Indicators */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 mt-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Data Rubrik yang Diikutsertakan dalam Triangulasi:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {observationIndicators
                        .filter((i) => i.rating && i.rating !== 'BELUM_DINILAI')
                        .map((ind) => (
                          <span
                            key={ind.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700"
                          >
                            {ind.text} ({ind.rating})
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Source Triangulation & AI Assessment Results Panel */}
              {aiInsight && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-xs animate-fadeIn">
                  {/* Top Analytics Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Hasil Analisis Triangulasi & Capaian Perkembangan
                        </h4>
                        <p className="text-xs text-slate-500">
                          {aiInsight.overview}
                        </p>
                      </div>
                    </div>

                    {/* Confidence Score Badge */}
                    <div className="px-3.5 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-right shrink-0">
                      <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">AI Confidence Score</p>
                      <p className="text-sm font-extrabold text-emerald-950">
                        {aiInsight.confidenceScore !== null ? `${aiInsight.confidenceScore}% (${aiInsight.confidenceLevel})` : 'Belum Tersedia'}
                      </p>
                    </div>
                  </div>

                  {/* 1. Deteksi Ketidaksesuaian Data (Inconsistency Detection) */}
                  {aiInsight.inconsistencies && aiInsight.inconsistencies.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Deteksi Ketidaksesuaian Antar Sumber Data (Inconsistency Finding):</span>
                      </div>
                      {aiInsight.inconsistencies.map((inc, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 text-slate-700">
                          <p className="font-bold text-amber-950">
                            • Temuan: <span className="font-normal text-slate-800">{inc.finding}</span>
                          </p>
                          <p className="font-bold text-indigo-950">
                            • Interpretasi Perkembangan: <span className="font-normal text-slate-800">{inc.interpretiveConclusion}</span>
                          </p>
                          <p className="font-bold text-emerald-950">
                            • Rekomendasi Tindak Lanjut: <span className="font-normal text-slate-800">{inc.recommendation}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Triangulasi Data Selaras:</strong> Seluruh sumber bukti (rubrik indikator, catatan teks pengamatan, dan audio suara) saling mengonfirmasi capaian anak secara konsisten.</span>
                    </div>
                  )}

                  {/* 2. Analisis Capaian Perkembangan per Aspek (Fakta vs Bukti vs Interpretasi) */}
                  {aiInsight.interpretations && aiInsight.interpretations.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <span>Analisis Capaian & Interpretasi Perkembangan per Aspek (Kurikulum Merdeka PAUD)</span>
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiInsight.interpretations
                          .filter((interp) => interp.consistencyStatus !== 'BELUM_TERAMATI')
                          .map((interp) => {
                            const badgeColors = {
                              KONSISTEN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                              MUNCUL_DENGAN_BANTUAN: 'bg-amber-100 text-amber-800 border-amber-300',
                              PERLU_STIMULASI: 'bg-rose-100 text-rose-800 border-rose-300',
                              BELUM_TERAMATI: 'bg-slate-100 text-slate-600 border-slate-200',
                            };

                            return (
                              <div
                                key={interp.aspect}
                                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: ASPECT_COLORS[interp.aspect] }}
                                    />
                                    <span>{interp.aspectName}</span>
                                    {interp.score !== null && (
                                      <span className="text-slate-500 font-mono text-[11px]">({interp.score}%)</span>
                                    )}
                                  </span>

                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${badgeColors[interp.consistencyStatus]}`}
                                  >
                                    {interp.consistencyStatus.replace(/_/g, ' ')}
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-slate-700">
                                  <p>
                                    <strong className="text-slate-900">Fakta Teramati:</strong> {interp.fakta}
                                  </p>
                                  <p>
                                    <strong className="text-indigo-900">Makna Perkembangan:</strong> {interp.interpretasi}
                                  </p>
                                  <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-150 text-[11px]">
                                    <strong className="text-emerald-800">Tindak Lanjut:</strong> {interp.kebutuhanDukungan}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 3. Strengths & Needs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-1.5">
                      <strong className="text-emerald-900 font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Kekuatan yang Teramati:</span>
                      </strong>
                      <ul className="list-disc pl-5 text-slate-700 space-y-1">
                        {aiInsight.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-1.5">
                      <strong className="text-amber-900 font-extrabold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Area Perlu Pendampingan Lanjutan:</span>
                      </strong>
                      <ul className="list-disc pl-5 text-slate-700 space-y-1">
                        {aiInsight.needsStimulation.map((nd, idx) => (
                          <li key={idx}>{nd}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 4. Editable Integrated Narrative */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Narasi Perkembangan Otentik (Otomatis dari Bukti Triangulasi - Dapat Diedit Guru):</span>
                      </label>
                      <span className="text-[10px] text-slate-500">Akan dicetak di Lembar Rapor</span>
                    </div>
                    <textarea
                      rows={5}
                      value={editedNarrative}
                      onChange={(e) => setEditedNarrative(e.target.value)}
                      className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 5. Home Advice */}
                  {aiInsight.homeStimulationAdvice && aiInsight.homeStimulationAdvice.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-1 text-slate-700">
                      <strong className="text-indigo-900 font-bold block">
                        Rekomendasi Aktivitas Bermain di Rumah (Untuk Orang Tua):
                      </strong>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
                        {aiInsight.homeStimulationAdvice.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: VISUALISASI HASIL ANALISIS & PENELUSURAN BUKTI (TRACEABILITY) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-600" />
                    <span>Langkah 4: Visualisasi Hasil Analisis Seluruh Sumber Data & Finalisasi</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visualisasi terintegrasi mencerminkan capaian nyata, status konsistensi, dan rujukan bukti autentik yang dapat ditelusuri.
                  </p>
                </div>
              </div>

              {/* Main Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Radar Chart with Consistency Indicators */}
                <div className="lg:col-span-6 space-y-4">
                  <RadarChartCard
                    aspectScores={currentAspectScores}
                    interpretations={aiInsight?.interpretations}
                    title="Capaian Aspek Berbasis Analisis Triangulasi"
                    subtitle="Skor dihitung dari rubrik & divalidasi dengan catatan pengamatan"
                  />
                </div>

                {/* Right: Multi-Source Evidence Breakdown & Observation Summary */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Summary Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ringkasan Validasi Lembar Observasi Anak</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <p className="p-2 bg-white rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block text-[10px] uppercase text-slate-400">Siswa:</strong>{' '}
                        {selectedStudent ? `${selectedStudent.name} (${selectedStudent.age})` : '-'}
                      </p>
                      <p className="p-2 bg-white rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block text-[10px] uppercase text-slate-400">Kegiatan:</strong>{' '}
                        {currentActivity?.title || '-'}
                      </p>
                      <p className="p-2 bg-white rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block text-[10px] uppercase text-slate-400">Tanggal & Semester:</strong>{' '}
                        {observationDate} ({semester})
                      </p>
                      <p className="p-2 bg-white rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block text-[10px] uppercase text-slate-400">Indikator Dinilai:</strong>{' '}
                        {observationIndicators.filter((i) => i.rating && i.rating !== 'BELUM_DINILAI').length} dari {observationIndicators.length}
                      </p>
                    </div>

                    {/* Multi-Source Data Coverage Bar */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <strong className="text-slate-800 font-bold block text-[11px]">
                        Distribusi Sumber Data yang Membentuk Visualisasi:
                      </strong>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
                          {observationIndicators.filter((i) => i.rating && i.rating !== 'BELUM_DINILAI').length} Rubrik
                        </div>
                        <div className={`p-1.5 rounded-lg font-bold border ${teacherNote ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                          {teacherNote ? 'Catatan Teks ✓' : 'Tanpa Catatan'}
                        </div>
                        <div className={`p-1.5 rounded-lg font-bold border ${voiceNoteText ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                          {voiceNoteText ? 'Voice Audio ✓' : 'Tanpa Suara'}
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold">
                          {evidences.length} File Bukti
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Traceability Evidence Inspector */}
              <TraceableEvidenceInspector
                aiInsight={aiInsight}
                indicators={observationIndicators}
                teacherNote={teacherNote}
                voiceNoteText={voiceNoteText}
                evidences={evidences}
                activityTitle={currentActivity?.title || 'Aktivitas'}
                studentName={selectedStudent?.name || 'Anak'}
                observationDate={observationDate}
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Kembali
              </button>
            )}
            <p className="text-xs text-slate-500 hidden sm:block">
              Langkah {currentStep} dari 4
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                disabled={
                  (currentStep === 1 && !selectedStudent) ||
                  (currentStep === 2 && !currentActivity)
                }
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  (currentStep === 1 && !selectedStudent) ||
                  (currentStep === 2 && !currentActivity)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <span>
                  {currentStep === 1 && !selectedStudent
                    ? 'Pilih Anak Terlebih Dahulu'
                    : currentStep === 2 && !currentActivity
                    ? 'Pilih Kegiatan Terlebih Dahulu'
                    : `Lanjut ke Langkah ${currentStep + 1}`}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                {saveError && (
                  <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                    {saveError}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || !selectedStudent || !currentActivity}
                    onClick={() => handleSaveAndClose('VERIFIED')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold ${
                      isSaving || !selectedStudent || !currentActivity
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Draf / Verifikasi'}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !selectedStudent || !currentActivity}
                    onClick={() => handleSaveAndClose('REPORT_READY')}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                      isSaving || !selectedStudent || !currentActivity
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
                  </button>
                  <button
                    type="button"
                    id="btn-save-and-preview-report"
                    disabled={isSaving || !selectedStudent || !currentActivity}
                    onClick={() => handleSaveAndClose('REPORT_READY', true)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                      isSaving || !selectedStudent || !currentActivity
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan & Pratinjau Rapor'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityAssessmentModal;
