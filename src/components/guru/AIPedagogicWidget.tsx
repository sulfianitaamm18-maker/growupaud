import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lightbulb,
  Layers,
  HelpCircle,
  Package,
  Compass,
  RefreshCw,
  Check,
  Edit3,
  BookOpen,
  PlusCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { schoolStore } from '../../services/schoolStore';
import { curriculumStore } from '../../services/curriculumStore';
import {
  fetchLessonPlanRecommendation,
  LessonPlanRecommendationResult,
} from '../../services/aiService';
import { ActivityPreset } from '../../types';

interface AIPedagogicWidgetProps {
  onApplyToActivity?: (activity: Partial<ActivityPreset>) => void;
  onApplyActivity?: (activityTitle: string) => void;
  onOpenPlanner?: () => void;
}

export const AIPedagogicWidget: React.FC<AIPedagogicWidgetProps> = ({
  onApplyToActivity,
  onApplyActivity,
  onOpenPlanner,
}) => {
  const [themesList, setThemesList] = useState(() => curriculumStore.getThemes());
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    const list = curriculumStore.getThemes();
    return list.length > 0 ? list[0].name : 'Alam Semesta';
  });
  const [activeSubtheme, setActiveSubtheme] = useState<string>(() => {
    const subs = curriculumStore.getSubthemes(activeTheme);
    return subs.length > 0 ? subs[0].name : 'Tanaman di Kebun Sekolah';
  });
  const [ageGroup, setAgeGroup] = useState<string>('Usia 5-6 Tahun (Kelompok B)');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<LessonPlanRecommendationResult | null>(null);

  // Editable mode state for "Sesuaikan Sendiri"
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedIdeaTitle, setEditedIdeaTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [editedMaterials, setEditedMaterials] = useState<string>('');
  const [editedQuestions, setEditedQuestions] = useState<string>('');
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Subscribe to real-time curriculum changes from Admin
  useEffect(() => {
    const unsub = curriculumStore.subscribe(() => {
      const updatedThemes = curriculumStore.getThemes();
      setThemesList(updatedThemes);
    });
    return () => unsub();
  }, []);

  const themes = themesList;
  const subthemes = curriculumStore.getSubthemes(activeTheme);
  const schoolProfile = schoolStore.getSchoolProfile();

  const loadRecommendation = async () => {
    setIsLoading(true);
    setAppliedSuccess(false);
    try {
      const rec = await fetchLessonPlanRecommendation({
        theme: activeTheme,
        subtheme: activeSubtheme,
        ageGroup,
        schoolContext: {
          name: schoolProfile.schoolName || schoolProfile.name || 'PAUD Terpadu',
          location: schoolProfile.locationCategory || schoolProfile.locationContext || 'Suburban / Desa Semi-Kota',
          culture: schoolProfile.culturalContext || schoolProfile.cultureContext || 'Kearifan lokal Nusantara, gotong royong',
          looseParts: schoolProfile.availableMediaTypes || schoolProfile.availableMedia || [
            'Bahan alam (daun, batu, biji, ranting)',
            'Loose parts daur ulang (kardus, tutup botol)',
          ],
        },
      });

      setRecommendation(rec);
      if (rec.activityIdeas && rec.activityIdeas[0]) {
        setEditedIdeaTitle(rec.activityIdeas[0].title);
        setEditedDescription(rec.activityIdeas[0].description);
        setEditedMaterials(rec.mediaAndMaterials.join(', '));
        setEditedQuestions(rec.provocationQuestions.join('\n'));
      }
    } catch (err) {
      console.error('Failed to load lesson plan recommendation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendation();
  }, [activeTheme, activeSubtheme, ageGroup]);

  const handleApply = () => {
    if (!recommendation) return;

    const mainIdea = recommendation.activityIdeas?.[0];
    const newActivity: Partial<ActivityPreset> = {
      id: `act-${Date.now()}`,
      title: editedIdeaTitle || mainIdea?.title || 'Kegiatan Bermakna PAUD',
      description: editedDescription || mainIdea?.description || '',
      theme: activeTheme,
      subtheme: activeSubtheme,
      cp: recommendation.recommendedCP?.title || 'Dasar-Dasar Literasi, Matematika, Sains & Seni',
      tp: recommendation.recommendedTP?.title || 'Eksplorasi Lingkungan',
      indicators: recommendation.recommendedIndicators?.map((ind, idx) => ({
        id: `ind-${idx + 1}`,
        aspect: ind.aspect,
        text: ind.text,
        rubric: ind.rubric,
      })) || [],
    };

    // Save to curriculumStore
    try {
      curriculumStore.addActivity(newActivity as ActivityPreset);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 4000);
      if (onApplyToActivity) {
        onApplyToActivity(newActivity);
      }
      if (onApplyActivity) {
        onApplyActivity(newActivity.title || 'Kegiatan Bermakna PAUD');
      }
    } catch (err) {
      console.error('Failed to apply activity:', err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Rekomendasi Pedagogis AI untuk Guru
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Saran AI • Guru Pengambil Keputusan
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Menyelaraskan tema aktif dengan Deep Learning, TaRL, CRT, dan pemanfaatan bahan alam/loose parts lokal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenPlanner && (
            <button
              onClick={onOpenPlanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Alur Rancang 6-Langkah</span>
            </button>
          )}

          <button
            onClick={loadRecommendation}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Menganalisis...' : 'Regenerate Saran'}
          </button>
        </div>
      </div>

      {/* Context Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
        <div>
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block mb-1">
            Tema Aktif
          </span>
          <select
            value={activeTheme}
            onChange={(e) => {
              setActiveTheme(e.target.value);
              const subs = curriculumStore.getSubthemes(e.target.value);
              if (subs.length > 0) setActiveSubtheme(subs[0].name);
            }}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {themes.map((t) => (
              <option key={t.id || t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block mb-1">
            Subtema
          </span>
          <select
            value={activeSubtheme}
            onChange={(e) => setActiveSubtheme(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {subthemes.map((st) => (
              <option key={st.id || st.name} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block mb-1">
            Kelompok Usia
          </span>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="Usia 4-5 Tahun (Kelompok A)">Usia 4-5 Tahun (Kelompok A)</option>
            <option value="Usia 5-6 Tahun (Kelompok B)">Usia 5-6 Tahun (Kelompok B)</option>
          </select>
        </div>
      </div>

      {/* Main Recommendation Content */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-300">
            AI sedang meramu saran kegiatan kontekstual berbasis budaya lokal dan loose parts...
          </p>
        </div>
      ) : recommendation ? (
        <div className="space-y-4">
          {/* Chain Hierarchy: CP -> ATP -> TP */}
          {(recommendation.recommendedCP || recommendation.recommendedATP || recommendation.recommendedTP) && (
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rantai Pedagogis: Capaian & Tujuan Pembelajaran (Kurikulum Merdeka PAUD)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {recommendation.recommendedCP && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Elemen CP:</span>
                    <p className="text-slate-200 font-semibold text-[11px] leading-tight">
                      {recommendation.recommendedCP.title}
                    </p>
                  </div>
                )}
                {recommendation.recommendedATP && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Alur (ATP):</span>
                    <p className="text-slate-200 font-semibold text-[11px] leading-tight">
                      {recommendation.recommendedATP.title}
                    </p>
                  </div>
                )}
                {recommendation.recommendedTP && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Tujuan (TP):</span>
                    <p className="text-emerald-300 font-semibold text-[11px] leading-tight">
                      {recommendation.recommendedTP.title}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Idea Card */}
          <div className="bg-white/10 rounded-2xl p-4.5 border border-white/15 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Ide Kegiatan Bermakna
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedIdeaTitle}
                    onChange={(e) => setEditedIdeaTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-400 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                  />
                ) : (
                  <h4 className="font-bold text-sm text-white">
                    {editedIdeaTitle || recommendation.activityIdeas?.[0]?.title}
                  </h4>
                )}
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 shrink-0 transition"
              >
                <Edit3 className="w-3 h-3" />
                {isEditing ? 'Selesai Edit' : 'Sesuaikan Sendiri'}
              </button>
            </div>

            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-emerald-400 rounded-lg p-2.5 text-xs text-slate-200"
              />
            ) : (
              <p className="text-xs text-slate-200 leading-relaxed">
                {editedDescription || recommendation.activityIdeas?.[0]?.description}
              </p>
            )}

            {/* Steps */}
            {recommendation.activityIdeas?.[0]?.steps && (
              <div className="space-y-1 bg-black/20 p-3 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-300 block mb-1">
                  Langkah-Langkah Kegiatan:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                  {recommendation.activityIdeas[0].steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* 3 Pillars Grid: Loose Parts, Provocation Questions, TaRL Adjustments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Loose parts / bahan alam */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <h5 className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Bahan Alam & Loose Parts
              </h5>
              {isEditing ? (
                <textarea
                  value={editedMaterials}
                  onChange={(e) => setEditedMaterials(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-emerald-400 rounded-lg p-2 text-xs text-slate-200"
                />
              ) : (
                <ul className="space-y-1 text-xs text-slate-300">
                  {recommendation.mediaAndMaterials?.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2. Pertanyaan Pemantik (Deep Learning) */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <h5 className="font-bold text-xs text-teal-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Pertanyaan Pemantik Guru
              </h5>
              {isEditing ? (
                <textarea
                  value={editedQuestions}
                  onChange={(e) => setEditedQuestions(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-emerald-400 rounded-lg p-2 text-xs text-slate-200"
                />
              ) : (
                <ul className="space-y-1 text-xs text-slate-300">
                  {recommendation.provocationQuestions?.map((q, idx) => (
                    <li key={idx} className="italic">
                      "{q}"
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 3. Penyesuaian TaRL */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <h5 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Diferensiasi TaRL
              </h5>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div>
                  <strong className="text-rose-300">Pemula: </strong>
                  <span>{recommendation.tarlAdjustments?.beginner}</span>
                </div>
                <div>
                  <strong className="text-amber-300">Menengah: </strong>
                  <span>{recommendation.tarlAdjustments?.intermediate}</span>
                </div>
                <div>
                  <strong className="text-emerald-300">Mahir: </strong>
                  <span>{recommendation.tarlAdjustments?.advanced}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pedagogical Note / CRT */}
          {recommendation.pedagogicalNotes && (
            <div className="bg-emerald-950/60 border border-emerald-600/30 p-3 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
              <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan Filosofi PAUD: </strong>
                {recommendation.pedagogicalNotes}
              </span>
            </div>
          )}

          {/* Action Buttons: Kendali Penuh Guru (Terima, Ubah, Tolak / Alternatif) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadRecommendation}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-white/10 hover:border-rose-500/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Tolak saran saat ini dan cari alternatif kegiatan lain"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Ganti Ide (Tolak & Cari Alternatif)</span>
              </button>
              <span className="text-[10px] text-slate-400 hidden lg:inline">
                • AI hanya memberi saran, Guru pemegang kendali penuh.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Selesai Sesuaikan' : 'Ubah / Sesuaikan'}</span>
              </button>

              <button
                onClick={handleApply}
                disabled={appliedSuccess}
                className={`px-4.5 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  appliedSuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Berhasil Diterapkan ke Rencana!
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Terapkan ke Rencana Kegiatan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
