import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
  ListChecks,
  Settings,
  Edit2,
  FolderTree,
  Sliders,
  Layers,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import {
  curriculumStore,
  DEFAULT_RUBRIC,
} from '../../services/curriculumStore';
import {
  ActivityPreset,
  IndicatorItem,
  DevelopmentalAspect,
  CPItem,
  TPItem,
  RubricDefinition,
} from '../../types';
import { ASPECT_LABELS } from '../../data/initialData';

interface CurriculumManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurriculumManagerModal: React.FC<CurriculumManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'CP_TP' | 'THEMES' | 'ACTIVITIES'>('ACTIVITIES');

  // Store data state
  const [activities, setActivities] = useState<ActivityPreset[]>([]);
  const [cps, setCps] = useState<CPItem[]>([]);
  const [tps, setTps] = useState<TPItem[]>([]);
  const elements = curriculumStore.getElements();
  const themes = curriculumStore.getThemes();
  const subthemes = curriculumStore.getSubthemes();
  const aspects = curriculumStore.getAspects();

  // Selection state
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  // Relational Curriculum Selection State
  const [selectedElementId, setSelectedElementId] = useState<string>('ELEM-NAM');
  const [selectedCpId, setSelectedCpId] = useState<string>('cp-01');
  const [selectedTpId, setSelectedTpId] = useState<string>('tp-01-1');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('thm-1');
  const [selectedSubthemeId, setSelectedSubthemeId] = useState<string>('subthm-1-1');

  const availableCps = cps.filter((c) => c.elementId === selectedElementId || !c.elementId);
  const availableTps = tps.filter((t) => t.cpId === selectedCpId || !t.cpId);
  const availableSubthemes = subthemes.filter((s) => s.themeId === selectedThemeId);

  // New Activity Form State
  const [showAddActivityForm, setShowAddActivityForm] = useState<boolean>(false);
  const [newActivityTitle, setNewActivityTitle] = useState<string>('');
  const [newActivityCategory, setNewActivityCategory] = useState<string>('Motorik & Sosial');
  const [newActivityDesc, setNewActivityDesc] = useState<string>('Aktivitas kelompok pembelajaran terstruktur.');
  const [newActivityOwner, setNewActivityOwner] = useState<'NATIONAL' | 'SCHOOL' | 'TEACHER'>('TEACHER');

  // New Indicator Form State
  const [newIndicatorText, setNewIndicatorText] = useState<string>('');
  const [newIndicatorAspect, setNewIndicatorAspect] = useState<DevelopmentalAspect>('KOGNITIF');
  const [newIndicatorRubric, setNewIndicatorRubric] = useState<RubricDefinition>({ ...DEFAULT_RUBRIC });

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit Rubric Modal State
  const [editingRubricIndicatorId, setEditingRubricIndicatorId] = useState<string | null>(null);
  const [tempRubric, setTempRubric] = useState<RubricDefinition>({ ...DEFAULT_RUBRIC });

  // Toast message
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load from store & subscribe
  useEffect(() => {
    if (!isOpen) return;

    const syncState = () => {
      const actList = curriculumStore.getActivities();
      setActivities(actList);
      const cpList = curriculumStore.getCPs();
      const tpList = curriculumStore.getTPs();
      setCps(cpList);
      setTps(tpList);

      if (!selectedActivityId && actList.length > 0) {
        setSelectedActivityId(actList[0].id);
      }
      if (cpList.length > 0) {
        setSelectedCpId(cpList[0].id);
      }
      if (tpList.length > 0) {
        setSelectedTpId(tpList[0].id);
      }
    };

    syncState();
    const unsubscribe = curriculumStore.subscribe(syncState);
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentActivity =
    activities.find((a) => a.id === selectedActivityId) || activities[0];

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) return;

    const selCp = cps.find((c) => c.id === selectedCpId);
    const selTp = tps.find((t) => t.id === selectedTpId);

    const created = curriculumStore.addActivity({
      title: newActivityTitle.trim(),
      category: newActivityCategory,
      description: newActivityDesc,
      iconName: 'Activity',
      elementId: selectedElementId,
      cpId: selectedCpId,
      tpId: selectedTpId,
      themeId: selectedThemeId,
      subthemeId: selectedSubthemeId,
      cp: selCp ? `${selCp.code}: ${selCp.title}` : 'Capaian Pembelajaran Kurikulum Merdeka',
      tp: selTp ? `${selTp.code}: ${selTp.title}` : 'Tujuan Pembelajaran Kurikulum Merdeka',
      ownerType: newActivityOwner,
      status: 'ACTIVE',
      indicators: [
        {
          id: `ind-${Date.now()}-1`,
          text: `Anak menunjukkan antusiasme awal dalam kegiatan ${newActivityTitle.trim()}`,
          aspect: newIndicatorAspect,
          elementId: selectedElementId,
          cpId: selectedCpId,
          tpId: selectedTpId,
          rubric: { ...DEFAULT_RUBRIC },
          rating: 'BELUM_DINILAI',
        },
      ],
    });

    setSelectedActivityId(created.id);
    setNewActivityTitle('');
    setShowAddActivityForm(false);
    showToast(`Kegiatan "${created.title}" berhasil disimpan ke Centralized Bank Kegiatan!`);
  };

  const handleDeleteActivity = (id: string) => {
    const act = activities.find((a) => a.id === id);
    curriculumStore.deleteActivity(id);
    setDeleteConfirmId(null);

    const remaining = activities.filter((a) => a.id !== id);
    if (remaining.length > 0) {
      setSelectedActivityId(remaining[0].id);
    }
    showToast(`Kegiatan "${act?.title || ''}" berhasil dihapus.`);
  };

  const handleAddIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndicatorText.trim() || !currentActivity) return;

    curriculumStore.addIndicatorToActivity(currentActivity.id, {
      text: newIndicatorText.trim(),
      aspect: newIndicatorAspect,
      rubric: { ...newIndicatorRubric },
      ownerType: 'TEACHER',
      status: 'ACTIVE',
    });

    setNewIndicatorText('');
    showToast('Indikator & Rubrik baru berhasil ditambahkan ke kegiatan ini!');
  };

  const handleDeleteIndicator = (indicatorId: string) => {
    if (!currentActivity) return;
    curriculumStore.deleteIndicatorFromActivity(currentActivity.id, indicatorId);
    showToast('Indikator berhasil dihapus.');
  };

  const handleSaveRubricEdit = (indicatorId: string) => {
    if (!currentActivity) return;
    const targetInd = currentActivity.indicators.find((i) => i.id === indicatorId);
    if (!targetInd) return;

    curriculumStore.updateIndicatorInActivity(currentActivity.id, {
      ...targetInd,
      rubric: { ...tempRubric },
    });

    setEditingRubricIndicatorId(null);
    showToast('Deskripsi Rubrik BB, MB, BSH, BSB berhasil diperbarui!');
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Centralized Curriculum & Assessment Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-extrabold uppercase border border-emerald-500/40">
                  Sprint 2A Single Source
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Kelola CP, TP, Tema, Bank Kegiatan, Indikator, dan Rubrik Penilaian (BB, MB, BSH, BSB) terpusat.
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

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('ACTIVITIES')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'ACTIVITIES'
                  ? 'bg-white border-slate-200 text-indigo-900 shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Bank Kegiatan & Indikator ({activities.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CP_TP')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'CP_TP'
                  ? 'bg-white border-slate-200 text-indigo-900 shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Capaian (CP) & Tujuan Pembelajaran (TP)</span>
            </button>
            <button
              onClick={() => setActiveTab('THEMES')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'THEMES'
                  ? 'bg-white border-slate-200 text-indigo-900 shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-4 h-4 text-purple-600" />
              <span>Tema, Subtema & Aspek</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800">
          {/* Success Toast */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {successMsg}
              </span>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-600 hover:text-emerald-800 font-extrabold"
              >
                Tutup
              </button>
            </div>
          )}

          {/* TAB 1: BANK KEGIATAN & INDIKATOR */}
          {activeTab === 'ACTIVITIES' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bank Kegiatan & Indikator Asesmen Terpusat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kegiatan yang ditambahkan di sini otomatis tersedia di Modul Observasi dan Rapor AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddActivityForm(!showAddActivityForm)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddActivityForm ? 'Tutup Form' : 'Tambah Kegiatan Baru'}</span>
                </button>
              </div>

                  {/* Add Activity Form */}
                  {showAddActivityForm && (
                    <form
                      onSubmit={handleCreateActivity}
                      className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-4 animate-fadeIn"
                    >
                      <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                        Form Tambah Kegiatan Baru (Relasional Kurikulum)
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nama Kegiatan:
                          </label>
                          <input
                            type="text"
                            required
                            value={newActivityTitle}
                            onChange={(e) => setNewActivityTitle(e.target.value)}
                            placeholder="Contoh: Menyiram Tanaman & Memilah Daun"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Kategori Kegiatan:
                          </label>
                          <select
                            value={newActivityCategory}
                            onChange={(e) => setNewActivityCategory(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="Motorik & Sosial">Motorik & Sosial</option>
                            <option value="STEAM & Kognitif">STEAM & Kognitif</option>
                            <option value="Motorik Halus & Seni">Motorik Halus & Seni</option>
                            <option value="Literasi & Bahasa">Literasi & Bahasa</option>
                            <option value="Eksplorasi Alam">Eksplorasi Alam</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Kepemilikan (Owner Type):
                          </label>
                          <select
                            value={newActivityOwner}
                            onChange={(e) => setNewActivityOwner(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                          >
                            <option value="TEACHER">Guru (Buat Sendiri)</option>
                            <option value="SCHOOL">Bank Sekolah</option>
                            <option value="NATIONAL">Bank Nasional</option>
                          </select>
                        </div>
                      </div>

                      {/* Cascading Relational Curriculum Selection: Element -> CP -> TP */}
                      <div className="p-3.5 bg-white rounded-xl border border-indigo-200/80 space-y-3">
                        <p className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider">
                          Relasi Kurikulum Merdeka (Elemen → CP → TP):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              1. Pilih Elemen:
                            </label>
                            <select
                              value={selectedElementId}
                              onChange={(e) => {
                                const elemId = e.target.value;
                                setSelectedElementId(elemId);
                                const filteredCps = cps.filter((c) => c.elementId === elemId || !c.elementId);
                                if (filteredCps.length > 0) {
                                  setSelectedCpId(filteredCps[0].id);
                                  const filteredTps = tps.filter((t) => t.cpId === filteredCps[0].id);
                                  if (filteredTps.length > 0) setSelectedTpId(filteredTps[0].id);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium"
                            >
                              {elements.map((elem) => (
                                <option key={elem.id} value={elem.id}>
                                  {elem.name} ({elem.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              2. Pilih Capaian Pembelajaran (CP):
                            </label>
                            <select
                              value={selectedCpId}
                              onChange={(e) => {
                                const cpId = e.target.value;
                                setSelectedCpId(cpId);
                                const filteredTps = tps.filter((t) => t.cpId === cpId);
                                if (filteredTps.length > 0) setSelectedTpId(filteredTps[0].id);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium"
                            >
                              {availableCps.map((cp) => (
                                <option key={cp.id} value={cp.id}>
                                  {cp.code}: {cp.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              3. Pilih Tujuan Pembelajaran (TP):
                            </label>
                            <select
                              value={selectedTpId}
                              onChange={(e) => setSelectedTpId(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium"
                            >
                              {availableTps.map((tp) => (
                                <option key={tp.id} value={tp.id}>
                                  {tp.code}: {tp.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Relational Theme & Subtheme Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Pilih Tema Pembelajaran:
                          </label>
                          <select
                            value={selectedThemeId}
                            onChange={(e) => {
                              const thmId = e.target.value;
                              setSelectedThemeId(thmId);
                              const sub = subthemes.filter((s) => s.themeId === thmId);
                              if (sub.length > 0) setSelectedSubthemeId(sub[0].id);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            {themes.map((thm) => (
                              <option key={thm.id} value={thm.id}>
                                {thm.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Pilih Subtema Pembelajaran:
                          </label>
                          <select
                            value={selectedSubthemeId}
                            onChange={(e) => setSelectedSubthemeId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            {availableSubthemes.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Deskripsi Ringkas Kegiatan:
                        </label>
                        <input
                          type="text"
                          value={newActivityDesc}
                          onChange={(e) => setNewActivityDesc(e.target.value)}
                          placeholder="Uraian singkat instruksi pembelajaran..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddActivityForm(false)}
                          className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                        >
                          Simpan Kegiatan
                        </button>
                      </div>
                    </form>
                  )}

              {/* Main List & Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Activity List */}
                <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 max-h-[480px] overflow-y-auto">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Daftar Kegiatan ({activities.length})
                    </p>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Centralized
                    </span>
                  </div>

                  {activities.map((act) => {
                    const isSelected = act.id === selectedActivityId;
                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedActivityId(act.id)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all relative group ${
                          isSelected
                            ? 'bg-indigo-100/90 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs leading-snug">{act.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {act.category}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                                {act.ownerType || 'NATIONAL'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(act.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus kegiatan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Confirm Delete Dialog Inline */}
                        {deleteConfirmId === act.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2 animate-fadeIn"
                          >
                            <p className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              <span>Hapus kegiatan "{act.title}"?</span>
                            </p>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(act.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold"
                              >
                                Ya, Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Side: Selected Activity Details & Indicators */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 space-y-5">
                  {currentActivity ? (
                    <>
                      {/* Selected Activity Overview */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                              {currentActivity.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {currentActivity.title}
                            </h4>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                            {currentActivity.indicators.length} Indikator Terdaftar
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{currentActivity.description}</p>
                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2">
                          <p>
                            <strong className="text-slate-700">CP:</strong> {currentActivity.cp}
                          </p>
                          <p>
                            <strong className="text-slate-700">TP:</strong> {currentActivity.tp}
                          </p>
                        </div>
                      </div>

                      {/* Indicator List for Selected Activity */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <ListChecks className="w-4 h-4 text-emerald-600" />
                            <span>Indikator Perkembangan & Rubrik (BB, MB, BSH, BSB)</span>
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Klik <Sliders className="w-3 h-3 inline text-indigo-600" /> untuk edit rubrik
                          </p>
                        </div>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {currentActivity.indicators.map((ind, idx) => {
                            const rubric = ind.rubric || DEFAULT_RUBRIC;
                            const isEditingThisRubric = editingRubricIndicatorId === ind.id;

                            return (
                              <div
                                key={ind.id || idx}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase">
                                      {ind.aspect}
                                    </span>
                                    <p className="font-semibold text-slate-800">{ind.text}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingThisRubric) {
                                          setEditingRubricIndicatorId(null);
                                        } else {
                                          setEditingRubricIndicatorId(ind.id);
                                          setTempRubric({ ...rubric });
                                        }
                                      }}
                                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 border border-indigo-200 flex items-center gap-1 font-bold text-[10px]"
                                      title="Edit Deskripsi Rubrik BB, MB, BSH, BSB"
                                    >
                                      <Sliders className="w-3 h-3" />
                                      <span>Rubrik</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteIndicator(ind.id)}
                                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                      title="Hapus Indikator"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Rubric Description Summary / Edit Form */}
                                {!isEditingThisRubric ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] bg-white p-2 rounded-lg border border-slate-200/60 text-slate-600">
                                    <p>
                                      <strong className="text-red-700 font-bold">BB:</strong> {rubric.BB}
                                    </p>
                                    <p>
                                      <strong className="text-amber-700 font-bold">MB:</strong> {rubric.MB}
                                    </p>
                                    <p>
                                      <strong className="text-emerald-700 font-bold">BSH:</strong> {rubric.BSH}
                                    </p>
                                    <p>
                                      <strong className="text-blue-700 font-bold">BSB:</strong> {rubric.BSB}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 animate-fadeIn">
                                    <p className="text-[11px] font-bold text-indigo-900">
                                      Edit Deskripsi Rubrik Penilaian Indikator:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                      <div>
                                        <label className="font-bold text-red-700">BB (Belum Berkembang):</label>
                                        <textarea
                                          rows={2}
                                          value={tempRubric.BB}
                                          onChange={(e) => setTempRubric({ ...tempRubric, BB: e.target.value })}
                                          className="w-full p-2 border border-slate-300 rounded-lg text-[10px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="font-bold text-amber-700">MB (Mulai Berkembang):</label>
                                        <textarea
                                          rows={2}
                                          value={tempRubric.MB}
                                          onChange={(e) => setTempRubric({ ...tempRubric, MB: e.target.value })}
                                          className="w-full p-2 border border-slate-300 rounded-lg text-[10px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="font-bold text-emerald-700">BSH (Berkembang Sesuai Harapan):</label>
                                        <textarea
                                          rows={2}
                                          value={tempRubric.BSH}
                                          onChange={(e) => setTempRubric({ ...tempRubric, BSH: e.target.value })}
                                          className="w-full p-2 border border-slate-300 rounded-lg text-[10px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="font-bold text-blue-700">BSB (Berkembang Sangat Baik):</label>
                                        <textarea
                                          rows={2}
                                          value={tempRubric.BSB}
                                          onChange={(e) => setTempRubric({ ...tempRubric, BSB: e.target.value })}
                                          className="w-full p-2 border border-slate-300 rounded-lg text-[10px]"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingRubricIndicatorId(null)}
                                        className="px-3 py-1 rounded bg-slate-100 text-slate-700 font-bold text-[10px]"
                                      >
                                        Batal
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveRubricEdit(ind.id)}
                                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px]"
                                      >
                                        Simpan Rubrik
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add New Indicator Form */}
                        <form
                          onSubmit={handleAddIndicator}
                          className="pt-3 border-t border-slate-200 space-y-2"
                        >
                          <p className="text-xs font-bold text-slate-700">
                            + Tambah Indikator Baru ke Kegiatan Ini:
                          </p>
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <select
                              value={newIndicatorAspect}
                              onChange={(e) => setNewIndicatorAspect(e.target.value as DevelopmentalAspect)}
                              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                            >
                              <option value="KOGNITIF">KOGNITIF</option>
                              <option value="MOTORIK_KASAR">MOTORIK KASAR</option>
                              <option value="MOTORIK_HALUS">MOTORIK HALUS</option>
                              <option value="BAHASA">LITERASI & STEAM</option>
                              <option value="NAM">NAM (Nilai Agama)</option>
                              <option value="JATI_DIRI">JATI DIRI</option>
                            </select>
                            <input
                              type="text"
                              required
                              value={newIndicatorText}
                              onChange={(e) => setNewIndicatorText(e.target.value)}
                              placeholder="Tuliskan indikator pengamatan baru..."
                              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Indikator</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 py-10 text-center">
                      Pilih kegiatan di sebelah kiri untuk melihat dan mengedit indikatornya.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CP & TP */}
          {activeTab === 'CP_TP' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP) Terstruktur
                </h3>
                <p className="text-xs text-slate-500">
                  Data CP dan TP Kurikulum Merdeka/KMA yang terhubung langsung dengan kode ID unik.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CP List */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Daftar Capaian Pembelajaran (CP)</span>
                  </h4>
                  <div className="space-y-3">
                    {cps.map((cp) => (
                      <div key={cp.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-indigo-700">{cp.code} ({cp.elementId})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">{cp.source}</span>
                        </div>
                        <p className="font-bold text-slate-800">{cp.title}</p>
                        <p className="text-slate-600 text-[11px]">{cp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TP List */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Tujuan Pembelajaran (TP) Terhubung</span>
                  </h4>
                  <div className="space-y-3">
                    {tps.map((tp) => (
                      <div key={tp.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-700">{tp.code}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Ref: {tp.cpId}</span>
                        </div>
                        <p className="font-bold text-slate-800">{tp.title}</p>
                        <p className="text-slate-600 text-[11px]">{tp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THEMES & ASPECTS */}
          {activeTab === 'THEMES' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Struktur Tema, Subtema & Aspek Perkembangan PAUD
                </h3>
                <p className="text-xs text-slate-500">
                  Satu sumber kebenaran nomenklatur aspek perkembangan dan tema pembelajaran.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Themes & Subthemes */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-purple-600" />
                    <span>Tema & Subtema Pembelajaran</span>
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {themes.map((thm) => {
                      const relatedSub = subthemes.filter((s) => s.themeId === thm.id);
                      return (
                        <div key={thm.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                          <p className="font-bold text-slate-900">{thm.name}</p>
                          <p className="text-slate-500 text-[11px]">{thm.description}</p>
                          <div className="pl-3 border-l-2 border-purple-300 space-y-1 pt-1">
                            {relatedSub.map((sub) => (
                              <p key={sub.id} className="text-[11px] text-purple-800 font-medium">
                                • {sub.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aspects */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>6 Aspek Perkembangan Resmi GrowUPAUD</span>
                  </h4>
                  <div className="space-y-2">
                    {aspects.map((asp) => (
                      <div key={asp.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{asp.name}</p>
                          <p className="text-[11px] text-slate-500">{asp.description}</p>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: asp.color }}
                        >
                          {asp.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Seluruh perubahan tersimpan otomatis ke Centralized Store & LocalStorage.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
