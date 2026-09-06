import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  HelpCircle,
  Package,
  Compass,
  RefreshCw,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  BookOpen,
  Sliders,
  Calendar,
  ClipboardCheck,
  Search,
  Tag,
  Lightbulb,
  AlertCircle,
  PlusCircle,
  Eye,
  Edit3,
} from 'lucide-react';
import { schoolStore } from '../../services/schoolStore';
import { curriculumStore } from '../../services/curriculumStore';
import {
  fetchLessonPlanRecommendation,
  LessonPlanRecommendationResult,
} from '../../services/aiService';
import { ThematicCuratedActivity, getCuratedActivitiesForTheme } from '../../services/thematicActivityCurator';
import { ActivityPreset, ThemeItem, SubthemeItem, CPItem, ATPItem, TPItem } from '../../types';

interface LightweightLessonPlannerProps {
  onStartObservationWithActivity: (activityId: string, activityTitle: string) => void;
  onClose?: () => void;
}

export const LightweightLessonPlanner: React.FC<LightweightLessonPlannerProps> = ({
  onStartObservationWithActivity,
  onClose,
}) => {
  // Step tracker: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Store state subscriptions
  const [allThemes, setAllThemes] = useState<ThemeItem[]>(() => curriculumStore.getThemes());
  const [allSubthemes, setAllSubthemes] = useState<SubthemeItem[]>(() => curriculumStore.getSubthemes());
  const [allCPs, setAllCPs] = useState<CPItem[]>(() => curriculumStore.getCPs());
  const [allATPs, setAllATPs] = useState<ATPItem[]>(() => curriculumStore.getATPs());
  const [allTPs, setAllTPs] = useState<TPItem[]>(() => curriculumStore.getTPs());

  // Subscribe to changes in curriculum store
  useEffect(() => {
    const unsub = curriculumStore.subscribe(() => {
      setAllThemes(curriculumStore.getThemes());
      setAllSubthemes(curriculumStore.getSubthemes());
      setAllCPs(curriculumStore.getCPs());
      setAllATPs(curriculumStore.getATPs());
      setAllTPs(curriculumStore.getTPs());
    });
    return () => unsub();
  }, []);

  // Step 1: Selected Theme & Search
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    const active = curriculumStore.getThemes().find((t) => t.status === 'ACTIVE');
    return active ? active.id : (curriculumStore.getThemes()[0]?.id || '');
  });
  const [themeSearchQuery, setThemeSearchQuery] = useState<string>('');

  // Step 2: Selected Subtheme
  const [selectedSubthemeId, setSelectedSubthemeId] = useState<string>('');
  const [isAddingQuickSubtheme, setIsAddingQuickSubtheme] = useState<boolean>(false);
  const [quickSubthemeText, setQuickSubthemeText] = useState<string>('');

  // Age group configuration
  const [ageGroup, setAgeGroup] = useState<string>('Usia 5-6 Tahun (Kelompok B)');

  // Step 3: Selected CP, ATP, TP
  const [selectedCpId, setSelectedCpId] = useState<string>('cp-03');
  const [selectedAtpId, setSelectedAtpId] = useState<string>('atp-03-1');
  const [selectedTpId, setSelectedTpId] = useState<string>('tp-lit-01');

  // Step 4: AI Recommendations & Curated Activities
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<LessonPlanRecommendationResult | null>(null);
  const [availableActivities, setAvailableActivities] = useState<ThematicCuratedActivity[]>([]);

  // Step 5: Selected Activity & Custom Adjustments
  const [chosenActivity, setChosenActivity] = useState<ThematicCuratedActivity | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMaterials, setCustomMaterials] = useState<string>('');
  const [customQuestions, setCustomQuestions] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active Themes filter
  const filteredThemes = useMemo(() => {
    return allThemes
      .filter((t) => t.status !== 'ARCHIVED')
      .filter((t) =>
        t.name.toLowerCase().includes(themeSearchQuery.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(themeSearchQuery.toLowerCase())
      );
  }, [allThemes, themeSearchQuery]);

  const currentTheme = useMemo(() => {
    return allThemes.find((t) => t.id === selectedThemeId) || allThemes[0];
  }, [allThemes, selectedThemeId]);

  // Subthemes for current theme
  const currentSubthemes = useMemo(() => {
    if (!currentTheme) return [];
    return allSubthemes.filter(
      (st) => (st.themeId === currentTheme.id || st.themeId === currentTheme.name) && st.status !== 'ARCHIVED'
    );
  }, [allSubthemes, currentTheme]);

  const currentSubtheme = useMemo(() => {
    return (
      currentSubthemes.find((st) => st.id === selectedSubthemeId) ||
      currentSubthemes[0] ||
      null
    );
  }, [currentSubthemes, selectedSubthemeId]);

  // Ensure selectedSubthemeId is valid on theme change
  useEffect(() => {
    if (currentSubthemes.length > 0) {
      if (!selectedSubthemeId || !currentSubthemes.some((s) => s.id === selectedSubthemeId)) {
        setSelectedSubthemeId(currentSubthemes[0].id);
      }
    } else {
      setSelectedSubthemeId('');
    }
  }, [selectedThemeId, currentSubthemes]);

  // Ensure smart CP/ATP/TP defaults based on theme
  useEffect(() => {
    if (!currentTheme) return;
    const thmName = currentTheme.name.toLowerCase();
    if (thmName.includes('tanaman') || thmName.includes('alam') || thmName.includes('air') || thmName.includes('benda') || thmName.includes('sains')) {
      setSelectedCpId('cp-03');
      setSelectedAtpId('atp-03-1');
      setSelectedTpId('tp-lit-01');
    } else if (thmName.includes('keluarga') || thmName.includes('diri') || thmName.includes('budaya') || thmName.includes('agama')) {
      setSelectedCpId('cp-01');
      setSelectedAtpId('atp-01-1');
      setSelectedTpId('tp-nam-01');
    } else {
      setSelectedCpId('cp-02');
      setSelectedAtpId('atp-02-1');
      setSelectedTpId('tp-jd-01');
    }
  }, [selectedThemeId]);

  // Load recommendations when entering Step 4
  const fetchRecommendations = async () => {
    if (!currentTheme) return;
    setIsLoadingAI(true);
    const isKelA = ageGroup.includes('4-5') || ageGroup.toLowerCase().includes('kelompok a');
    const subName = currentSubtheme ? currentSubtheme.name : 'Umum';

    try {
      // 1. Get curated activities instantly
      const curated = getCuratedActivitiesForTheme(currentTheme.name, subName, isKelA);
      setAvailableActivities(curated);

      if (curated.length > 0) {
        selectAndInitActivity(curated[0]);
      }

      // 2. Fetch AI recommendation for deeper contextual alignment
      const schoolProfile = schoolStore.getSchoolProfile();
      const res = await fetchLessonPlanRecommendation({
        theme: currentTheme.name,
        subtheme: subName,
        ageGroup,
        schoolContext: {
          name: schoolProfile.schoolName || 'PAUD Terpadu',
          location: schoolProfile.locationCategory || 'Suburban / Desa Semi-Kota',
          culture: schoolProfile.culturalContext || 'Kearifan lokal Nusantara, gotong royong',
          looseParts: schoolProfile.availableMediaTypes || ['Bahan alam', 'Loose parts daur ulang'],
        },
      });

      setAiResult(res);
      if (res.curatedActivityOptions && res.curatedActivityOptions.length > 0) {
        setAvailableActivities(res.curatedActivityOptions);
        selectAndInitActivity(res.curatedActivityOptions[0]);
      }
    } catch (err) {
      console.warn('Error fetching recommendations:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const selectAndInitActivity = (act: ThematicCuratedActivity) => {
    setChosenActivity(act);
    setCustomTitle(act.title);
    setCustomMaterials([...act.primaryMaterials, ...act.localLooseParts].join(', '));
    setCustomQuestions(act.provocationQuestions.join('\n'));
    setTeacherNotes(`Modality: ${act.modality}. Fokus: ${act.documentationFocus}`);
  };

  // Add quick subtheme
  const handleAddQuickSubtheme = () => {
    if (!quickSubthemeText.trim() || !currentTheme) return;
    try {
      const created = curriculumStore.addSubtheme(currentTheme.id, quickSubthemeText.trim());
      setSelectedSubthemeId(created.id);
      setQuickSubthemeText('');
      setIsAddingQuickSubtheme(false);
      showToast(`Subtema "${created.name}" berhasil ditambahkan.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan subtema.');
    }
  };

  // Step 6: Save & Connect to Assessment
  const handleSaveAndStartObservation = (immediatelyObserve: boolean = false) => {
    if (!chosenActivity || !currentTheme) return;

    // Resolve CP, ATP, TP
    const matchedCp = allCPs.find((c) => c.id === selectedCpId) || allCPs[0];
    const matchedTp = allTPs.find((t) => t.id === selectedTpId) || allTPs[0];

    // Format new activity preset for curriculumStore
    const newPresetId = `act-${Date.now()}`;
    const newPreset: ActivityPreset = {
      id: newPresetId,
      title: customTitle.trim() || chosenActivity.title,
      category: matchedCp?.elementId || 'DASAR_LITERASI_STEAM',
      description: chosenActivity.description,
      iconName: 'Sparkles',
      cp: matchedCp ? `${matchedCp.code} - ${matchedCp.title}` : chosenActivity.pedagogicalRationale,
      tp: matchedTp ? `${matchedTp.code} - ${matchedTp.title}` : chosenActivity.whyRelevantToTP,
      elementId: matchedCp?.elementId,
      cpId: matchedCp?.id,
      tpId: matchedTp?.id,
      themeId: currentTheme.id,
      subthemeId: currentSubtheme?.id,
      theme: currentTheme.name,
      subtheme: currentSubtheme?.name,
      ageGroup,
      duration: chosenActivity.duration,
      materials: customMaterials.split(',').map((s) => s.trim()).filter(Boolean),
      instructions: chosenActivity.steps,
      status: 'ACTIVE',
      source: 'AI_PEDAGOGICAL_CHAIN',
      ownerType: 'TEACHER',
      provocationQuestions: customQuestions.split('\n').map((s) => s.trim()).filter(Boolean),
      pedagogicalRationale: chosenActivity.pedagogicalRationale,
      tarlAdjustments: chosenActivity.tarlAdjustments,
      materialAlternatives: chosenActivity.materialAlternatives,
      modality: chosenActivity.modality,
      documentationFocus: chosenActivity.documentationFocus,
      indicators: chosenActivity.observableIndicators.map((ind, idx) => ({
        id: `ind-${Date.now()}-${idx}`,
        aspect: ind.aspect,
        aspectId: ind.aspect,
        aspectLabel: ind.aspectLabel,
        text: ind.observableBehavior,
        rating: 'BELUM_DINILAI',
        rubric: ind.rubric,
      })),
    };

    // Save to curriculumStore
    curriculumStore.addActivity(newPreset);
    showToast(`Kegiatan "${newPreset.title}" berhasil disimpan ke bank kegiatan.`);

    if (immediatelyObserve) {
      // Directly trigger observation modal with this activity selected!
      onStartObservationWithActivity(newPreset.id, newPreset.title);
    } else {
      // Just step completed notification
      setCurrentStep(6);
    }
  };

  const stepsList = [
    { num: 1, label: 'Pilih Tema' },
    { num: 2, label: 'Pilih Subtema' },
    { num: 3, label: 'Konfirmasi CP & TP' },
    { num: 4, label: 'Saran AI (3-5 Opsi)' },
    { num: 5, label: 'Pilih & Sesuaikan' },
    { num: 6, label: 'Siap Asesmen' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden animate-fadeIn" id="lightweight-lesson-planner">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Perencanaan Kegiatan PAUD Berbantuan AI</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Rancang Kegiatan Bermakna & Terhubung ke Asesmen
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
            Bukan RPP digital panjang. Cukup tentukan tema, pilih salah satu dari 3-5 ide kegiatan bermutu tinggi, sesuaikan bahan lokal, dan langsung gunakan untuk mencatat observasi.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-start md:self-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        )}
      </div>

      {/* Progressive Disclosure Step Wizard */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-[620px]">
          {stepsList.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <React.Fragment key={step.num}>
                <button
                  onClick={() => {
                    // Only allow navigating back or to current
                    if (step.num <= currentStep) {
                      setCurrentStep(step.num);
                    }
                  }}
                  disabled={step.num > currentStep}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white text-emerald-700'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {/* ===================== LANGKAH 1: PILIH TEMA ===================== */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">1</span>
                  Pilih Tema Pembelajaran PAUD
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tersedia 16 referensi tema PAUD terstruktur Kurikulum Merdeka yang siap digunakan.
                </p>
              </div>

              {/* Theme Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={themeSearchQuery}
                  onChange={(e) => setThemeSearchQuery(e.target.value)}
                  placeholder="Cari tema (misal: Tanaman, Budaya)..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Age selector */}
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                Kelompok Usia Sasaran:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAgeGroup('Usia 4-5 Tahun (Kelompok A)')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    ageGroup.includes('4-5')
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Kelompok A (4-5 Tahun)
                </button>
                <button
                  onClick={() => setAgeGroup('Usia 5-6 Tahun (Kelompok B)')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    ageGroup.includes('5-6')
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Kelompok B (5-6 Tahun)
                </button>
              </div>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredThemes.map((thm) => {
                const isSelected = thm.id === selectedThemeId;
                const subsCount = allSubthemes.filter((s) => s.themeId === thm.id && s.status !== 'ARCHIVED').length;

                return (
                  <button
                    key={thm.id}
                    onClick={() => setSelectedThemeId(thm.id)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {subsCount} subtema
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {thm.name}
                      </h4>
                      {thm.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {thm.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step 1 Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedThemeId}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Lanjut: Pilih Subtema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 2: PILIH SUBTEMA ===================== */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                Pilih Subtema untuk Tema: <span className="text-emerald-700 underline">{currentTheme?.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Subtema memfokuskan alur pembelajaran agar kontekstual dan dekat dengan pengalaman anak.
              </p>
            </div>

            {/* Subthemes Pills */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Subtema Tersedia:</span>
                <button
                  onClick={() => setIsAddingQuickSubtheme(!isAddingQuickSubtheme)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Tambah Subtema Kustom</span>
                </button>
              </div>

              {isAddingQuickSubtheme && (
                <div className="flex gap-2 p-3 bg-white rounded-2xl border border-emerald-300 animate-slideDown">
                  <input
                    type="text"
                    value={quickSubthemeText}
                    onChange={(e) => setQuickSubthemeText(e.target.value)}
                    placeholder="Ketik nama subtema baru untuk tema ini..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuickSubtheme()}
                  />
                  <button
                    onClick={handleAddQuickSubtheme}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {currentSubthemes.map((sub) => {
                  const isSelected = sub.id === selectedSubthemeId;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubthemeId(sub.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <span className="text-xs font-bold leading-snug">{sub.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-200 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {currentSubthemes.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada subtema untuk tema ini. Silakan klik tombol "+ Tambah Subtema Kustom" di atas.
                </div>
              )}
            </div>

            {/* Step 2 Footer */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Tema</span>
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedSubthemeId}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Lanjut: Konfirmasi CP & TP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 3: KONFIRMASI CP & TP ===================== */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                Konfirmasi Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih rumusan CP dan TP resmi yang ingin dijadikan fokus tujuan pada kegiatan bermain ini.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CP Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Capaian Pembelajaran (CP) Fase Fondasi:
                </label>
                <div className="space-y-2">
                  {allCPs.map((cp) => {
                    const isSelected = cp.id === selectedCpId;
                    return (
                      <button
                        key={cp.id}
                        onClick={() => setSelectedCpId(cp.id)}
                        className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {cp.code}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{cp.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {cp.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TP Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Tujuan Pembelajaran (TP) Konkret:
                </label>
                <div className="space-y-2">
                  {allTPs
                    .filter((tp) => tp.cpId === selectedCpId)
                    .map((tp) => {
                      const isSelected = tp.id === selectedTpId;
                      return (
                        <button
                          key={tp.id}
                          onClick={() => setSelectedTpId(tp.id)}
                          className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                              {tp.code}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                          </div>
                          <h4 className="font-bold text-xs text-slate-900">{tp.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {tp.description}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Step 3 Footer */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                onClick={() => {
                  setCurrentStep(4);
                  fetchRecommendations();
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Hasilkan 3-5 Ide Kegiatan AI</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 4: PILIH DARI 3-5 SARAN KEGIATAN AI ===================== */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                  Rekomendasi 3-5 Ide Kegiatan Beragam Modalitas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tema: <strong className="text-slate-800">{currentTheme?.name}</strong> • Subtema: <strong className="text-slate-800">{currentSubtheme?.name}</strong> • {ageGroup}
                </p>
              </div>

              <button
                onClick={fetchRecommendations}
                disabled={isLoadingAI}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
                <span>Hasilkan Variasi Baru</span>
              </button>
            </div>

            {isLoadingAI ? (
              <div className="py-16 text-center space-y-3 bg-slate-50 rounded-3xl border border-slate-200">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-800">Menghasilkan Ide Kegiatan Bermakna & Loose Parts...</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Menyelaraskan tema, diferensiasi TaRL, dan pertanyaan pemantik berbobot tanpa lembar kerja hafalan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableActivities.map((act, idx) => {
                  const isSelected = chosenActivity?.id === act.id;

                  return (
                    <div
                      key={act.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {act.modality}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            ⏱ {act.duration}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">
                            {act.title}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {act.description}
                          </p>
                        </div>

                        {/* Relevansi ke TP */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                          <strong className="text-emerald-800 font-bold block">Relevansi dengan TP:</strong>
                          <p className="leading-relaxed">{act.whyRelevantToTP}</p>
                        </div>

                        {/* Pertanyaan Pemantik Sample */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pertanyaan Pemantik (Contoh):
                          </span>
                          <p className="text-xs text-slate-700 italic">
                            "{act.provocationQuestions[0] || 'Ceritakan apa yang kamu temukan?'}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {act.primaryMaterials.length + act.localLooseParts.length} jenis media alami
                        </span>
                        <button
                          onClick={() => {
                            selectAndInitActivity(act);
                            setCurrentStep(5);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pilih Ide Ini & Lanjut</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 4 Footer */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke CP & TP</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 5: GURU MEMILIH & PENYESUAIAN RINGAN ===================== */}
        {currentStep === 5 && chosenActivity && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">5</span>
                Penyesuaian Ringan Kegiatan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuaikan bahan lokal yang tersedia di sekolah Anda dan tambahkan pertanyaan pemantik jika diperlukan.
              </p>
            </div>

            {/* Summary Banner of Selected Activity */}
            <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-200/90 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-full uppercase">
                    {chosenActivity.modality}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Durasi: {chosenActivity.duration}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Ganti Ide Lain
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Judul Kegiatan Pembelajaran:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <p className="text-xs text-slate-700 leading-relaxed">
                {chosenActivity.description}
              </p>
            </div>

            {/* Editable sections: Materials, Provocations, TaRL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Media & Loose Parts */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Media & Loose Parts Lokal (Bisa Diedit):
                </label>
                <textarea
                  rows={4}
                  value={customMaterials}
                  onChange={(e) => setCustomMaterials(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  placeholder="Pisahkan dengan tanda koma..."
                />
                <span className="text-[11px] text-slate-400 block">
                  Tip: Manfaatkan daun gugur, batu kali, kardus kemasan, atau potongan kain perca.
                </span>
              </div>

              {/* Provocation Questions */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  Pertanyaan Pemantik (Satu per baris):
                </label>
                <textarea
                  rows={4}
                  value={customQuestions}
                  onChange={(e) => setCustomQuestions(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  placeholder="Ketik pertanyaan pemantik per baris..."
                />
                <span className="text-[11px] text-slate-400 block">
                  Tip: Ajukan pertanyaan terbuka (HOTS) yang merangsang anak bereksplorasi sendiri.
                </span>
              </div>
            </div>

            {/* TaRL 3-Tier Differentiation Preview */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Panduan Diferensiasi Sesuai Tingkat Kemampuan (TaRL):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] space-y-1">
                  <strong className="text-amber-900 font-bold block">1. Perlu Dukungan:</strong>
                  <p className="text-amber-800 leading-relaxed">{chosenActivity.tarlAdjustments.perluDukungan}</p>
                </div>
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200/80 text-[11px] space-y-1">
                  <strong className="text-blue-900 font-bold block">2. Berkembang (Sesuai Usia):</strong>
                  <p className="text-blue-800 leading-relaxed">{chosenActivity.tarlAdjustments.berkembang}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-[11px] space-y-1">
                  <strong className="text-emerald-900 font-bold block">3. Pengayaan (Tantangan):</strong>
                  <p className="text-emerald-800 leading-relaxed">{chosenActivity.tarlAdjustments.pengayaan}</p>
                </div>
              </div>
            </div>

            {/* Step 5 Footer & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pilih Ide Lain</span>
              </button>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleSaveAndStartObservation(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Simpan ke Bank Rencana</span>
                </button>

                <button
                  onClick={() => handleSaveAndStartObservation(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Gunakan & Catat Observasi Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 6: SIAP ASESMEN / SUKSES ===================== */}
        {currentStep === 6 && (
          <div className="py-12 text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Kegiatan Berhasil Dirancang & Disimpan!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Kegiatan "<strong className="text-slate-800">{customTitle}</strong>" sudah otomatis masuk ke daftar kegiatan kurikulum aktif dan rubrik pengamatannya siap dinilai.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Rancang Kegiatan Lain
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
