import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  ClipboardCheck,
  ChevronLeft,
  X,
  Info,
} from 'lucide-react';
import { DevelopmentalAspect, IndicatorItem, CPItem, TPItem } from '../../../types';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../../data/initialData';

interface AIIndicatorPlannerStepProps {
  learningObjective: string;
  activityTitle: string;
  activityDescription?: string;
  activityMaterials: string;
  ageGroup: string;
  themeName?: string;
  subthemeName?: string;
  selectedCPs?: CPItem[];
  selectedTPs?: TPItem[];
  currentIndicators: IndicatorItem[];
  nonFocusAspects: Array<{
    aspect: DevelopmentalAspect;
    aspectLabel: string;
    reason: string;
  }>;
  pedagogicalAdvice?: string;
  isLoading: boolean;
  onRegenerate: () => void;
  onChangeActivityTitle: (title: string) => void;
  onChangeMaterials: (materials: string) => void;
  onUpdateIndicator: (id: string, text: string, behavior?: string) => void;
  onDeleteIndicator: (id: string) => void;
  onAddCustomIndicator: (aspect: DevelopmentalAspect, text: string, behavior: string) => void;
  onPromoteNonFocusAspect: (aspect: DevelopmentalAspect) => void;
  onSave: (immediatelyObserve: boolean) => void;
  onBack: () => void;
}

export const AIIndicatorPlannerStep: React.FC<AIIndicatorPlannerStepProps> = ({
  learningObjective,
  activityTitle,
  activityDescription,
  activityMaterials,
  ageGroup,
  themeName,
  subthemeName,
  selectedCPs,
  selectedTPs,
  currentIndicators,
  nonFocusAspects,
  pedagogicalAdvice,
  isLoading,
  onRegenerate,
  onChangeActivityTitle,
  onChangeMaterials,
  onUpdateIndicator,
  onDeleteIndicator,
  onAddCustomIndicator,
  onPromoteNonFocusAspect,
  onSave,
  onBack,
}) => {
  // Local state for editing an indicator inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editBehavior, setEditBehavior] = useState<string>('');

  // Expand state for rubrics
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});

  // Local state for manual indicator modal / form
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newAspect, setNewAspect] = useState<DevelopmentalAspect>('MOTORIK_HALUS');
  const [newText, setNewText] = useState<string>('');
  const [newBehavior, setNewBehavior] = useState<string>('');

  const toggleRubric = (id: string) => {
    setExpandedRubrics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (ind: IndicatorItem) => {
    setEditingId(ind.id);
    setEditText(ind.text);
    setEditBehavior(ind.observableBehavior || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    onUpdateIndicator(editingId, editText.trim(), editBehavior.trim());
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddCustomIndicator(newAspect, newText.trim(), newBehavior.trim() || newText.trim());
    setNewText('');
    setNewBehavior('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="ai-indicator-planner-step">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              5
            </span>
            <span>Indikator Perkembangan (6 Aspek GrowUPAUD) & Rubrik</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            AI memetakan indikator perilaku spesifik dan teramati berdasarkan TP, kegiatan bermain, dan tahap usia anak.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Analisis Ulang AI</span>
        </button>
      </div>

      {/* Principle Disclaimer Box */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Prinsip Asesmen Autentik GrowUPAUD:
          </p>
          <p className="text-amber-800/90 leading-relaxed">
            AI hanya merekomendasikan indikator pada <strong>aspek yang benar-benar relevan</strong> dengan kegiatan. Anda bebas mengubah kalimat indikator, menghapus, atau menambahkan indikator baru sesuai pengamatan nyata Anda. <em>Keputusan akhir tetap di tangan guru.</em>
          </p>
        </div>
      </div>

      {/* Kesesuaian Pembelajaran & Hierarki Kurikulum */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Kesesuaian Pembelajaran: Tema → Subtema → CP → TP → Kegiatan → Indikator
            </span>
          </div>
          <span className="bg-emerald-100/80 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
            {ageGroup}
          </span>
        </div>

        {/* Hierarchy Breadcrumbs / Flow */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 shadow-2xs">
            🌸 {themeName || 'Tema'} {subthemeName ? `(${subthemeName})` : ''}
          </span>
          <span className="text-slate-400 font-bold">→</span>
          {selectedCPs && selectedCPs.length > 0 ? (
            selectedCPs.map((cp, idx) => (
              <span
                key={`step-cp-${cp.id || idx}-${idx}`}
                className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]"
                title={cp.description}
              >
                {cp.code}
              </span>
            ))
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
              CP Terpilih
            </span>
          )}
          <span className="text-slate-400 font-bold">→</span>
          {selectedTPs && selectedTPs.length > 0 ? (
            selectedTPs.map((tp, idx) => (
              <span
                key={`step-tp-${tp.id || idx}-${idx}`}
                className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[11px]"
                title={tp.description}
              >
                {tp.code}
              </span>
            ))
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[11px]">
              TP Terpilih
            </span>
          )}
          <span className="text-slate-400 font-bold">→</span>
          {learningObjective && (
            <>
              <span
                className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[11px] max-w-[280px] truncate shadow-2xs"
                title={learningObjective}
              >
                🎯 Tujuan: {learningObjective}
              </span>
              <span className="text-slate-400 font-bold">→</span>
            </>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[11px] shadow-2xs">
            🎲 Kegiatan: {activityTitle || 'Bermain'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Judul Kegiatan:
            </label>
            <input
              type="text"
              value={activityTitle}
              onChange={(e) => onChangeActivityTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              placeholder="Judul kegiatan bermain..."
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Media & Loose Parts:
            </label>
            <input
              type="text"
              value={activityMaterials}
              onChange={(e) => onChangeMaterials(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              placeholder="Bahan alam, loose parts..."
            />
          </div>
        </div>

        {/* TP Context Info */}
        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            🎯 Rumusan TP Terkait:
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700">
            {learningObjective || 'Mengeksplorasi kegiatan pembelajaran PAUD'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center space-y-3 bg-slate-50 rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            Menganalisis 6 Aspek Perkembangan & Menyusun Indikator Teramati...
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Menyelaraskan tujuan pembelajaran dengan kriteria rubrik autentik (BB, MB, BSH, BSB) ramah guru PAUD.
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: ASPEK RELEVAN (FOKUS KEGIATAN INI) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aspek Perkembangan Relevan ({currentIndicators.length} Indikator)</span>
              </h4>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Indikator Manual</span>
              </button>
            </div>

            {currentIndicators.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                Belum ada indikator relevan. Klik tombol <strong>"Analisis Ulang AI"</strong> atau <strong>"Tambah Indikator Manual"</strong> di atas.
              </div>
            ) : (
              <div className="space-y-3">
                {currentIndicators.map((ind, idx) => {
                  const aspectLabel = ind.aspectLabel || (ind.aspect ? ASPECT_LABELS[ind.aspect] : 'Perkembangan');
                  const aspectColor = ind.aspect ? (ASPECT_COLORS[ind.aspect] || '#10B981') : '#10B981';
                  const isEditingThis = editingId === ind.id;
                  const isRubricExpanded = !!expandedRubrics[ind.id];
                  const rubric = ind.rubric || {
                    BB: 'Belum menunjukkan kemampuan secara mandiri.',
                    MB: 'Mulai menunjukkan kemampuan dengan dorongan guru.',
                    BSH: 'Mampu menunjukkan kemampuan secara mandiri dan teratur.',
                    BSB: 'Sangat terampil, percaya diri, dan mampu membimbing teman.',
                  };

                  return (
                    <div
                      key={ind.id || `ind-${idx}`}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition overflow-hidden p-4 space-y-3"
                    >
                      {isEditingThis ? (
                        <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Kalimat Indikator:
                            </label>
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Perilaku Teramati (Observable Behavior):
                            </label>
                            <textarea
                              rows={2}
                              value={editBehavior}
                              onChange={(e) => setEditBehavior(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                            >
                              Simpan Perubahan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold text-white uppercase tracking-wider shadow-2xs"
                                style={{ backgroundColor: aspectColor }}
                              >
                                {ind.aspect}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {aspectLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(ind)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                                title="Edit Indikator"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteIndicator(ind.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                title="Hapus Indikator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-slate-900 leading-snug">
                            {ind.text}
                          </p>

                          {ind.observableBehavior && (
                            <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-700 flex items-start gap-2">
                              <span className="font-bold text-emerald-800 shrink-0">
                                Perilaku Teramati:
                              </span>
                              <span className="leading-relaxed">
                                {ind.observableBehavior}
                              </span>
                            </div>
                          )}

                          {/* Rubric Toggle */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleRubric(ind.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <span>Panduan Rubrik 4 Level (BB, MB, BSH, BSB)</span>
                              {isRubricExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Expanded Rubric Preview */}
                          {isRubricExpanded && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px] animate-fadeIn">
                              <div className="p-2.5 rounded-xl bg-red-50/90 border border-red-200 text-red-950 space-y-0.5">
                                <strong className="font-black text-red-700 block">BB (Belum Berkembang)</strong>
                                <p className="leading-relaxed">{rubric.BB}</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-0.5">
                                <strong className="font-black text-amber-700 block">MB (Mulai Berkembang)</strong>
                                <p className="leading-relaxed">{rubric.MB}</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-0.5">
                                <strong className="font-black text-emerald-700 block">BSH (Berkembang Sesuai Harapan)</strong>
                                <p className="leading-relaxed">{rubric.BSH}</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 space-y-0.5">
                                <strong className="font-black text-blue-700 block">BSB (Berkembang Sangat Baik)</strong>
                                <p className="leading-relaxed">{rubric.BSB}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: ASPEK NON-FOKUS (SOPAN & TRANSPARAN) */}
          {nonFocusAspects && nonFocusAspects.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span>Aspek Non-Fokus (Sengaja Tidak Dinilai pada Kegiatan Ini)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {nonFocusAspects.map((nfa) => (
                  <div
                    key={nfa.aspect}
                    className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {nfa.aspect}
                        </span>
                        <span className="font-bold text-slate-700">
                          {nfa.aspectLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        {nfa.reason}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onPromoteNonFocusAspect(nfa.aspect)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Jadikan Fokus Tambahan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedagogical Advice */}
          {pedagogicalAdvice && (
            <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-xs text-teal-950 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-teal-900">Catatan Pedagogis AI:</strong>
                <p className="leading-relaxed text-teal-800/90 mt-0.5">{pedagogicalAdvice}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual Indicator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-black text-sm text-slate-900">
                Tambah Indikator Baru Manual
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Aspek Perkembangan (6 Aspek):
                </label>
                <select
                  value={newAspect}
                  onChange={(e) => setNewAspect(e.target.value as DevelopmentalAspect)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="NAM">1. Nilai Agama & Moral (NAM)</option>
                  <option value="JATI_DIRI">2. Jati Diri / Sosial Emosional (JATI_DIRI)</option>
                  <option value="LITERASI_STEAM">3. Literasi & STEAM (LITERASI_STEAM)</option>
                  <option value="MOTORIK_KASAR">4. Motorik Kasar (MOTORIK_KASAR)</option>
                  <option value="MOTORIK_HALUS">5. Motorik Halus (MOTORIK_HALUS)</option>
                  <option value="KOGNITIF">6. Kognitif & Berpikir (KOGNITIF)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kalimat Indikator:
                </label>
                <input
                  type="text"
                  required
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Contoh: Anak mampu mengelompokkan bahan alam berdasarkan warna..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Perilaku Teramati (Observable Behavior):
                </label>
                <textarea
                  rows={2}
                  value={newBehavior}
                  onChange={(e) => setNewBehavior(e.target.value)}
                  placeholder="Contoh: Terlihat memisahkan daun kering dan daun basah ke wadah berbeda..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Tambahkan ke Rencana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Pilihan Kegiatan</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => onSave(false)}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Simpan ke Bank Rencana</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Gunakan & Catat Observasi Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
