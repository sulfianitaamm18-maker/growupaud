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
  generateDevelopmentIndicators,
} from '../../services/aiService';
import { ThematicCuratedActivity, getCuratedActivitiesForTheme } from '../../services/thematicActivityCurator';
import { ActivityPreset, ThemeItem, SubthemeItem, CPItem, ATPItem, TPItem, DevelopmentalAspect, IndicatorItem } from '../../types';
import { ASPECT_LABELS } from '../../data/initialData';
import { AIIndicatorPlannerStep } from './planner/AIIndicatorPlannerStep';

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

  // Deduplicated CPs and TPs to prevent duplicate key rendering
  const uniqueCPs = useMemo(() => {
    const map = new Map<string, CPItem>();
    allCPs.forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [allCPs]);

  const uniqueTPs = useMemo(() => {
    const map = new Map<string, TPItem>();
    allTPs.forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [allTPs]);

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

  // Step 3: Selected CP and TP (Support 1 or more CPs and 1 or more TPs)
  const [selectedCpIds, setSelectedCpIds] = useState<string[]>(['cp-03']);
  const [selectedTpIds, setSelectedTpIds] = useState<string[]>(['tp-lit-01']);
  const [customTpText, setCustomTpText] = useState<string>('');

  // Step 4: AI Recommendations & Curated Activities
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<LessonPlanRecommendationResult | null>(null);
  const [availableActivities, setAvailableActivities] = useState<ThematicCuratedActivity[]>([]);
  const [staticCuratedActivities, setStaticCuratedActivities] = useState<ThematicCuratedActivity[]>([]);
  const [aiGeneratedActivities, setAiGeneratedActivities] = useState<ThematicCuratedActivity[]>([]);
  const [activitySourceMode, setActivitySourceMode] = useState<'AI_RECOMMENDATION' | 'STATIC_CURATED'>('AI_RECOMMENDATION');

  // Step 5: Selected Activity & Custom Adjustments
  const [chosenActivity, setChosenActivity] = useState<ThematicCuratedActivity | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMaterials, setCustomMaterials] = useState<string>('');
  const [customQuestions, setCustomQuestions] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>('');

  // AI Development Indicators state (6 aspects)
  const [currentIndicators, setCurrentIndicators] = useState<IndicatorItem[]>([]);
  const [nonFocusAspects, setNonFocusAspects] = useState<Array<{
    aspect: DevelopmentalAspect;
    aspectLabel: string;
    reason: string;
  }>>([]);
  const [pedagogicalAdvice, setPedagogicalAdvice] = useState<string>('');
  const [isLoadingIndicators, setIsLoadingIndicators] = useState<boolean>(false);

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

  // Ensure smart CP/TP defaults based on theme
  useEffect(() => {
    if (!currentTheme) return;
    const thmName = currentTheme.name.toLowerCase();
    if (thmName.includes('tanaman') || thmName.includes('alam') || thmName.includes('air') || thmName.includes('benda') || thmName.includes('sains')) {
      setSelectedCpIds(['cp-03']);
      setSelectedTpIds(['tp-lit-01']);
    } else if (thmName.includes('keluarga') || thmName.includes('diri') || thmName.includes('budaya') || thmName.includes('agama')) {
      setSelectedCpIds(['cp-01']);
      setSelectedTpIds(['tp-nam-01']);
    } else {
      setSelectedCpIds(['cp-02']);
      setSelectedTpIds(['tp-jd-01']);
    }
  }, [selectedThemeId]);

  // Load recommendations when entering Step 4
  const fetchRecommendations = async () => {
    if (!currentTheme) return;
    setIsLoadingAI(true);
    const isKelA = ageGroup.includes('4-5') || ageGroup.toLowerCase().includes('kelompok a');
    const subName = currentSubtheme ? currentSubtheme.name : 'Umum';

    try {
      // 1. Get curated activities instantly with selected CP & TP bindings
      const curated = getCuratedActivitiesForTheme(
        currentTheme.name,
        subName,
        isKelA,
        selectedCpIds,
        selectedTpIds
      );
      setStaticCuratedActivities(curated);

      // Initially set curated while AI loads
      setAvailableActivities(curated);
      if (curated.length > 0) {
        selectAndInitActivity(curated[0]);
      }

      // 2. Fetch AI recommendation for deeper contextual alignment
      const schoolProfile = schoolStore.getSchoolProfile();
      const chosenCps = allCPs.filter((c) => selectedCpIds.includes(c.id));
      const chosenTps = allTPs.filter((t) => selectedTpIds.includes(t.id));
      const res = await fetchLessonPlanRecommendation({
        theme: currentTheme.name,
        subtheme: subName,
        selectedCPs: chosenCps,
        selectedCPIds: selectedCpIds,
        selectedTPs: chosenTps,
        selectedTpIds: selectedTpIds,
        ageGroup,
        schoolContext: {
          name: schoolProfile.schoolName || 'PAUD Terpadu',
          location: schoolProfile.locationCategory || 'Suburban / Desa Semi-Kota',
          culture: schoolProfile.culturalContext || 'Kearifan lokal Nusantara, gotong royong',
          looseParts: schoolProfile.availableMediaTypes || ['Bahan alam', 'Loose parts daur ulang'],
        },
      });

      setAiResult(res);

      // PRIORITIZE AI RECOMMENDATION: When AI succeeds, use its dynamic contextual activities!
      if (res.activityIdeas && res.activityIdeas.length > 0) {
        const mappedAIActivities: ThematicCuratedActivity[] = res.activityIdeas.map((act, i) => {
          const matchedCurated = curated[i] || curated[0];
          return {
            id: act.activityId || `act-ai-${i + 1}`,
            title: act.title,
            duration: act.duration || '45-60 Menit',
            description: act.description,
            modality: (act as any).modality || matchedCurated?.modality || 'Eksplorasi Lingkungan',
            steps: Array.isArray(act.steps) && act.steps.length > 0 ? act.steps : matchedCurated?.steps || [],
            pedagogicalRationale: (act as any).pedagogicalRationale || matchedCurated?.pedagogicalRationale || 'Bermain bermakna berbasis loose parts dan deep learning.',
            whyRelevantToTP: (act as any).whyRelevantToTP || `Mendukung ketercapaian ${act.linkedTPIds?.join(', ') || selectedTpIds.join(', ')} dalam tema ${currentTheme.name}`,
            provocationQuestions: Array.isArray(act.provocationQuestions) && act.provocationQuestions.length > 0 ? act.provocationQuestions : matchedCurated?.provocationQuestions || ['Apa yang ingin kamu buat hari ini?'],
            primaryMaterials: Array.isArray(act.materials) ? act.materials : (typeof act.materials === 'string' ? [act.materials] : matchedCurated?.primaryMaterials || ['Bahan alam']),
            localLooseParts: (act as any).localLooseParts || matchedCurated?.localLooseParts || ['Loose parts lokal'],
            materialAlternatives: matchedCurated?.materialAlternatives || [],
            tarlAdjustments: act.tarlAdjustments ? {
              perluDukungan: act.tarlAdjustments.beginner,
              berkembang: act.tarlAdjustments.intermediate,
              pengayaan: act.tarlAdjustments.advanced,
            } : matchedCurated?.tarlAdjustments || { perluDukungan: '', berkembang: '', pengayaan: '' },
            observableIndicators: (act.assessmentIndicators && act.assessmentIndicators.length > 0)
              ? act.assessmentIndicators.map((ind: any) => ({
                  aspect: ind.aspect as DevelopmentalAspect,
                  aspectLabel: ASPECT_LABELS[ind.aspect as DevelopmentalAspect] || 'Literasi & STEAM',
                  observableBehavior: ind.text,
                  rubric: ind.rubric || { BB: '', MB: '', BSH: '', BSB: '' },
                }))
              : matchedCurated?.observableIndicators || [],
            documentationFocus: (act as any).documentationFocus || matchedCurated?.documentationFocus || 'Dokumentasi eksplorasi anak secara autentik',
            linkedCPIds: act.linkedCPIds && act.linkedCPIds.length > 0 ? act.linkedCPIds : selectedCpIds,
            linkedTPIds: act.linkedTPIds && act.linkedTPIds.length > 0 ? act.linkedTPIds : selectedTpIds,
            linkedObjectiveIds: act.linkedObjectiveIds,
          };
        });
        setAiGeneratedActivities(mappedAIActivities);
        setAvailableActivities(mappedAIActivities);
        setActivitySourceMode('AI_RECOMMENDATION');
        selectAndInitActivity(mappedAIActivities[0]);
      } else if (res.curatedActivityOptions && res.curatedActivityOptions.length > 0) {
        setAvailableActivities(res.curatedActivityOptions);
        setActivitySourceMode('STATIC_CURATED');
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

  const runGenerateIndicators = async (
    activityOverride?: ThematicCuratedActivity,
    customTitleOverride?: string,
    customMaterialsOverride?: string
  ) => {
    setIsLoadingIndicators(true);
    const act = activityOverride || chosenActivity;
    const title = customTitleOverride !== undefined ? customTitleOverride : (customTitle || act?.title || 'Bermain Eksplorasi');
    const materials = customMaterialsOverride !== undefined ? customMaterialsOverride : customMaterials;

    const chosenTps = allTPs.filter((t) => selectedTpIds.includes(t.id));
    const tpText = customTpText.trim() || (
      chosenTps.length > 0
        ? chosenTps.map((t) => `${t.code} - ${t.title}: ${t.description}`).join('; ')
        : 'Mengeksplorasi kegiatan bermain bermakna'
    );
    const actContext = `${materials ? `Bahan: ${materials}. ` : ''}${act?.description || ''}`.trim();

    try {
      const response = await generateDevelopmentIndicators({
        learningObjective: tpText,
        activity: title,
        ageGroup,
        activityContext: actContext,
        theme: currentTheme?.name,
        subtheme: currentSubtheme?.name,
      });

      const formattedIndicators: IndicatorItem[] = response.indicators.map((ind, idx) => ({
        id: `ind-${Date.now()}-${idx}`,
        aspect: ind.aspect,
        aspectId: ind.aspect,
        aspectLabel: ind.aspectLabel || (ind.aspect ? ASPECT_LABELS[ind.aspect] : 'Perkembangan'),
        text: ind.text,
        observableBehavior: ind.observableBehavior,
        isRelevant: true,
        rubric: ind.rubric,
        learningObjective: tpText,
        activityContext: actContext,
        ageGroup,
        rating: 'BELUM_DINILAI',
      }));

      setCurrentIndicators(formattedIndicators);
      setNonFocusAspects(response.nonFocusAspects || []);
      setPedagogicalAdvice(response.pedagogicalAdvice || '');
    } catch (err) {
      console.warn('Error generating development indicators:', err);
    } finally {
      setIsLoadingIndicators(false);
    }
  };

  const handleUpdateIndicator = (id: string, text: string, behavior?: string) => {
    setCurrentIndicators((prev) =>
      prev.map((ind) =>
        ind.id === id ? { ...ind, text, observableBehavior: behavior || ind.observableBehavior } : ind
      )
    );
  };

  const handleDeleteIndicator = (id: string) => {
    setCurrentIndicators((prev) => prev.filter((ind) => ind.id !== id));
  };

  const handleAddCustomIndicator = (aspect: DevelopmentalAspect, text: string, behavior: string) => {
    const newInd: IndicatorItem = {
      id: `ind-custom-${Date.now()}`,
      aspect,
      aspectId: aspect,
      aspectLabel: ASPECT_LABELS[aspect] || aspect,
      text,
      observableBehavior: behavior,
      isRelevant: true,
      rubric: {
        BB: 'Belum menunjukkan kemampuan secara mandiri.',
        MB: 'Mulai menunjukkan kemampuan dengan dorongan guru.',
        BSH: 'Mampu menunjukkan kemampuan secara mandiri dan teratur.',
        BSB: 'Sangat terampil, percaya diri, dan mampu membimbing teman.',
      },
      learningObjective: customTpText.trim() || 'Tujuan pembelajaran kegiatan',
      ageGroup,
      rating: 'BELUM_DINILAI',
    };
    setCurrentIndicators((prev) => [...prev, newInd]);
  };

  const handlePromoteNonFocusAspect = (aspect: DevelopmentalAspect) => {
    setNonFocusAspects((prev) => prev.filter((item) => item.aspect !== aspect));
    handleAddCustomIndicator(
      aspect,
      `Anak menunjukkan kemampuan pada aspek ${ASPECT_LABELS[aspect]} selama kegiatan "${customTitle || chosenActivity?.title || 'bermain'}"`,
      `Perilaku terkait ${ASPECT_LABELS[aspect]} teramati secara nyata.`
    );
  };

  // Step 6: Save & Connect to Assessment
  const handleSaveAndStartObservation = (immediatelyObserve: boolean = false) => {
    if (!chosenActivity || !currentTheme) return;

    // Resolve CP, ATP, TP
    const chosenCps = allCPs.filter((c) => selectedCpIds.includes(c.id));
    const matchedCp = chosenCps[0] || allCPs[0];
    const chosenTps = allTPs.filter((t) => selectedTpIds.includes(t.id));
    const matchedTp = chosenTps[0] || allTPs[0];

    // Format new activity preset for curriculumStore
    const newPresetId = `act-${Date.now()}`;
    const newPreset: ActivityPreset = {
      id: newPresetId,
      title: customTitle.trim() || chosenActivity.title,
      category: matchedCp?.elementId || 'DASAR_LITERASI_STEAM',
      description: chosenActivity.description,
      iconName: 'Sparkles',
      cp: chosenCps.length > 0 ? chosenCps.map(c => `${c.code} - ${c.title}`).join('; ') : (matchedCp ? `${matchedCp.code} - ${matchedCp.title}` : chosenActivity.pedagogicalRationale),
      tp: customTpText.trim() || (chosenTps.length > 0 ? chosenTps.map(t => `${t.code} - ${t.title}`).join('; ') : chosenActivity.whyRelevantToTP),
      elementId: matchedCp?.elementId,
      cpId: matchedCp?.id,
      tpId: matchedTp?.id,
      linkedCPIds: selectedCpIds,
      selectedCPs: chosenCps,
      linkedTPIds: selectedTpIds,
      selectedTPs: chosenTps,
      linkedObjectiveIds: chosenActivity.linkedObjectiveIds || [],
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
      indicators: currentIndicators.length > 0
        ? currentIndicators
        : chosenActivity.observableIndicators.map((ind, idx) => ({
            id: `ind-${Date.now()}-${idx}`,
            aspect: ind.aspect,
            aspectId: ind.aspect,
            aspectLabel: ind.aspectLabel,
            text: ind.observableBehavior,
            rating: 'BELUM_DINILAI',
            rubric: ind.rubric,
          })),
      nonFocusAspects: nonFocusAspects,
      pedagogicalAdvice: pedagogicalAdvice,
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
    { num: 3, label: 'Tujuan Pembelajaran' },
    { num: 4, label: 'Saran Kegiatan' },
    { num: 5, label: 'Indikator AI 6 Aspek' },
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
                Guru dapat memilih 1 atau lebih CP sekaligus (termasuk lintas elemen), serta 1 atau lebih TP konkret yang menjadi fokus tujuan kegiatan ini.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CP Selection (Multi-CP Support) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Capaian Pembelajaran (CP) - Pilih 1 atau Lebih:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {selectedCpIds.length} CP Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCpIds.length === allCPs.length) {
                          setSelectedCpIds(['cp-03']);
                        } else {
                          setSelectedCpIds(allCPs.map((c) => c.id));
                        }
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      {selectedCpIds.length === allCPs.length ? 'Pilih Utama' : 'Pilih Semua CP'}
                    </button>
                  </div>
                </div>

                {/* Selected CPs badge preview */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 mr-1 self-center">CP Terpilih:</span>
                  {Array.from(new Set(selectedCpIds)).map((cId, idx) => {
                    const found = uniqueCPs.find((c) => c.id === cId);
                    return (
                      <span
                        key={`sel-cp-${cId}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold shadow-2xs"
                      >
                        <span>{found?.code || cId}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedCpIds.length <= 1) {
                              showToast('Minimal 1 Capaian Pembelajaran (CP) harus tetap dipilih.');
                              return;
                            }
                            setSelectedCpIds((prev) => prev.filter((id) => id !== cId));
                          }}
                          className="hover:text-red-200 text-white font-bold ml-0.5"
                          title="Hapus pilihan CP ini"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {uniqueCPs.map((cp, idx) => {
                    const isSelected = selectedCpIds.includes(cp.id);
                    return (
                      <button
                        key={`btn-cp-${cp.id}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedCpIds((prev) => {
                            if (prev.includes(cp.id)) {
                              if (prev.length <= 1) {
                                showToast('Minimal 1 Capaian Pembelajaran (CP) harus tetap dipilih.');
                                return prev;
                              }
                              return prev.filter((id) => id !== cp.id);
                            } else {
                              // When adding a new CP, also ensure at least one of its TPs is available
                              const matchingTp = allTPs.find((t) => t.cpId === cp.id);
                              if (matchingTp && !selectedTpIds.includes(matchingTp.id)) {
                                setSelectedTpIds((tpPrev) => [...tpPrev, matchingTp.id]);
                              }
                              return [...prev, cp.id];
                            }
                          });
                        }}
                        className={`w-full p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-300 bg-slate-50 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              {cp.code}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              Terpilih
                            </span>
                          )}
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

              {/* TP Selection (Multi-TP Support Across Selected CPs) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Tujuan Pembelajaran (TP) Konkret (Pilih 1 atau Lebih):
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                      {selectedTpIds.length} TP Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const availableTps = allTPs.filter((tp) => selectedCpIds.includes(tp.cpId)).map((t) => t.id);
                        setSelectedTpIds((prev) => {
                          const allSelected = availableTps.every((id) => prev.includes(id));
                          if (allSelected) {
                            const remaining = prev.filter((id) => !availableTps.includes(id));
                            return remaining.length > 0 ? remaining : [availableTps[0]];
                          } else {
                            return Array.from(new Set([...prev, ...availableTps]));
                          }
                        });
                      }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      Pilih Semua TP Terkait
                    </button>
                  </div>
                </div>

                {/* Selected TPs badge preview */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 mr-1 self-center">Fokus Terpilih:</span>
                  {Array.from(new Set(selectedTpIds)).map((tId, idx) => {
                    const found = uniqueTPs.find((t) => t.id === tId);
                    return (
                      <span
                        key={`sel-tp-${tId}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-bold shadow-2xs"
                      >
                        <span>{found?.code || tId}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTpIds.length <= 1) {
                              showToast('Minimal 1 TP harus tetap dipilih.');
                              return;
                            }
                            setSelectedTpIds((prev) => prev.filter((id) => id !== tId));
                          }}
                          className="hover:text-red-200 text-white font-bold ml-0.5"
                          title="Hapus pilihan TP ini"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {uniqueTPs
                    .filter((tp) => selectedCpIds.includes(tp.cpId))
                    .map((tp, idx) => {
                      const isSelected = selectedTpIds.includes(tp.id);
                      const parentCp = uniqueCPs.find((c) => c.id === tp.cpId);
                      return (
                        <button
                          key={`btn-tp-${tp.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedTpIds((prev) => {
                              if (prev.includes(tp.id)) {
                                if (prev.length <= 1) {
                                  showToast('Minimal 1 Tujuan Pembelajaran (TP) harus dipilih.');
                                  return prev;
                                }
                                return prev.filter((id) => id !== tp.id);
                              } else {
                                return [...prev, tp.id];
                              }
                            });
                          }}
                          className={`w-full p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-teal-600 text-white'
                                    : 'border border-slate-300 bg-slate-50 text-transparent'
                                }`}
                              >
                                ✓
                              </div>
                              <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                                {tp.code}
                              </span>
                              {parentCp && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {parentCp.code}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">
                                Terpilih
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-slate-900">{tp.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {tp.description}
                          </p>
                        </button>
                      );
                    })}
                </div>

                {/* Custom / Customized TP Input */}
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Atau Tambahkan Catatan/Penyesuaian Kalimat TP Khusus:
                  </label>
                  <input
                    type="text"
                    value={customTpText}
                    onChange={(e) => setCustomTpText(e.target.value)}
                    placeholder="Contoh: Anak dapat mengeksplorasi dan menyusun bahan alam menjadi karya kreatif..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">
                    Opsional. Jika diisi, kalimat ini akan disandingkan dengan {selectedTpIds.length} TP terpilih saat menghasilkan indikator AI.
                  </p>
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

            {/* Kesesuaian Pembelajaran & Hierarki Kurikulum (Traceability Banner) */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 rounded-2xl border border-emerald-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Kesesuaian Pembelajaran (Hierarki Terpilih Guru):
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200">
                  {selectedCpIds.length} CP • {selectedTpIds.length} TP
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 shadow-2xs">
                  🌸 {currentTheme?.name} {currentSubtheme?.name ? `(${currentSubtheme.name})` : ''}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                {uniqueCPs
                  .filter((c) => selectedCpIds.includes(c.id))
                  .map((cp, idx) => (
                    <span
                      key={`preview-cp-${cp.id}-${idx}`}
                      className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px]"
                      title={`${cp.code}: ${cp.description}`}
                    >
                      {cp.code}
                    </span>
                  ))}
                <span className="text-slate-400 font-bold">→</span>
                {uniqueTPs
                  .filter((t) => selectedTpIds.includes(t.id))
                  .map((tp, idx) => (
                    <span
                      key={`preview-tp-${tp.id}-${idx}`}
                      className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300 font-bold text-[11px]"
                      title={`${tp.code}: ${tp.description}`}
                    >
                      {tp.code}
                    </span>
                  ))}
              </div>

              {/* Specific Learning Objectives if provided by AI */}
              {aiResult?.learningObjectives && aiResult.learningObjectives.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                    Tujuan Pembelajaran Spesifik (Ditranslasikan dari CP & TP):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.learningObjectives.map((obj) => (
                      <span
                        key={obj.objectiveId}
                        className="px-2.5 py-1 bg-white text-slate-800 border border-emerald-200 rounded-lg text-[10px] font-medium shadow-2xs leading-tight"
                      >
                        <strong className="text-emerald-700 font-bold mr-1">{obj.objectiveId}:</strong>
                        {obj.objectiveText || (obj as any).description}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Source Mode Switcher & Clarification Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                {activitySourceMode === 'AI_RECOMMENDATION' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rekomendasi Kontekstual AI (Gemini)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs border border-blue-300">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Preset Kurasi Tematik GrowUPAUD</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-500">
                  {activitySourceMode === 'AI_RECOMMENDATION'
                    ? 'Dirancang dinamis sesuai subtema, diferensiasi TaRL, dan loose parts lokal.'
                    : 'Disusun tim kurator pedagogis PAUD Fase Fondasi.'}
                </span>
              </div>

              {/* Toggle buttons if both are available */}
              {aiGeneratedActivities.length > 0 && staticCuratedActivities.length > 0 && (
                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAvailableActivities(aiGeneratedActivities);
                      setActivitySourceMode('AI_RECOMMENDATION');
                      selectAndInitActivity(aiGeneratedActivities[0]);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      activitySourceMode === 'AI_RECOMMENDATION'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    AI Contextual ({aiGeneratedActivities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvailableActivities(staticCuratedActivities);
                      setActivitySourceMode('STATIC_CURATED');
                      selectAndInitActivity(staticCuratedActivities[0]);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      activitySourceMode === 'STATIC_CURATED'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Preset Kurasi ({staticCuratedActivities.length})
                  </button>
                </div>
              )}
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
                {availableActivities.map((act) => {
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

                        {/* Kesesuaian ke CP & TP */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-700 space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              CP:
                            </span>
                            {Array.from(new Set(act.linkedCPIds && act.linkedCPIds.length > 0 ? act.linkedCPIds : selectedCpIds)).map((cId, idx) => {
                              const cpObj = uniqueCPs.find((c) => c.id === cId);
                              return (
                                <span
                                  key={`act-cp-${act.id}-${cId}-${idx}`}
                                  className="px-1.5 py-0.5 rounded-md bg-white text-emerald-900 border border-emerald-200 text-[10px] font-bold"
                                  title={cpObj?.title}
                                >
                                  {cpObj?.code || cId}
                                </span>
                              );
                            })}
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 ml-1">
                              TP:
                            </span>
                            {Array.from(new Set(act.linkedTPIds && act.linkedTPIds.length > 0 ? act.linkedTPIds : selectedTpIds)).map((tId, idx) => {
                              const tpObj = uniqueTPs.find((t) => t.id === tId);
                              return (
                                <span
                                  key={`act-tp-${act.id}-${tId}-${idx}`}
                                  className="px-1.5 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300 text-[10px] font-bold shadow-2xs"
                                  title={tpObj?.title}
                                >
                                  {tpObj?.code || tId}
                                </span>
                              );
                            })}
                            {act.linkedObjectiveIds && act.linkedObjectiveIds.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold ml-1">
                                Obj: {act.linkedObjectiveIds.join(', ')}
                              </span>
                            )}
                          </div>
                          <div>
                            <strong className="text-emerald-800 font-bold block mb-0.5">Relevansi Pedagogis:</strong>
                            <p className="leading-relaxed">{act.whyRelevantToTP}</p>
                          </div>
                        </div>

                        {/* Integrasi Literasi Naratif / Alami (Anti-Worksheet) */}
                        {act.literacyIntegration && (
                          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                              📖 Integrasi Bahasa & Literasi Alami (Tanpa Lembar Kerja):
                            </span>
                            <p className="leading-relaxed text-amber-950 font-medium">
                              {act.literacyIntegration}
                            </p>
                          </div>
                        )}

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
                            runGenerateIndicators(act, act.title, [...act.primaryMaterials, ...act.localLooseParts].join(', '));
                            setCurrentStep(5);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pilih & Analisis Indikator AI</span>
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
                <span>Kembali ke TP</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 5: INDIKATOR PERKEMBANGAN 6 ASPEK & RUBRIK AI ===================== */}
        {currentStep === 5 && chosenActivity && (
          <AIIndicatorPlannerStep
            learningObjective={
              customTpText.trim() ||
              (allTPs
                .filter((t) => selectedTpIds.includes(t.id))
                .map((t) => `${t.code} - ${t.title}`)
                .join('; ')) ||
              'Mengeksplorasi kegiatan pembelajaran PAUD'
            }
            activityTitle={customTitle}
            activityDescription={chosenActivity.description}
            activityMaterials={customMaterials}
            ageGroup={ageGroup}
            themeName={currentTheme?.name}
            subthemeName={currentSubtheme?.name}
            selectedCPs={allCPs.filter((c) => selectedCpIds.includes(c.id))}
            selectedTPs={allTPs.filter((t) => selectedTpIds.includes(t.id))}
            currentIndicators={currentIndicators}
            nonFocusAspects={nonFocusAspects}
            pedagogicalAdvice={pedagogicalAdvice}
            isLoading={isLoadingIndicators}
            onRegenerate={() => runGenerateIndicators()}
            onChangeActivityTitle={(val) => setCustomTitle(val)}
            onChangeMaterials={(val) => setCustomMaterials(val)}
            onUpdateIndicator={handleUpdateIndicator}
            onDeleteIndicator={handleDeleteIndicator}
            onAddCustomIndicator={handleAddCustomIndicator}
            onPromoteNonFocusAspect={handlePromoteNonFocusAspect}
            onSave={handleSaveAndStartObservation}
            onBack={() => setCurrentStep(4)}
          />
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
