import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Save,
  CheckCircle2,
  Tag,
  FolderPlus,
  Compass,
  FileText,
  AlertCircle,
  HelpCircle,
  Search,
  Power,
  PowerOff,
  Sparkles,
  X,
  Check,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { curriculumStore } from '../../services/curriculumStore';
import { ATPItem, ActivityPreset, DevelopmentalAspect, ThemeItem, SubthemeItem } from '../../types';
import { ASPECT_LABELS } from '../../data/initialData';

export const AdminCurriculumView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'TEMA' | 'CP_ATP_TP' | 'KEGIATAN'>('TEMA');

  // Stores data
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [themeSubthemes, setThemeSubthemes] = useState<Record<string, SubthemeItem[]>>({});
  const [atps, setAtps] = useState<ATPItem[]>([]);
  const [activities, setActivities] = useState<ActivityPreset[]>([]);

  // Search & Filter for Themes
  const [themeSearch, setThemeSearch] = useState<string>('');
  const [themeStatusFilter, setThemeStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Modal / Alert for Safety check
  const [safetyAlert, setSafetyAlert] = useState<{ title: string; message: string } | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form states for Tema / Subtema
  const [newThemeName, setNewThemeName] = useState<string>('');
  const [newThemeDesc, setNewThemeDesc] = useState<string>('');
  const [newThemeInitialSubthemes, setNewThemeInitialSubthemes] = useState<string>('');
  const [isAddingThemeExpanded, setIsAddingThemeExpanded] = useState<boolean>(false);

  // Inline editing state for Theme & Subtheme
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingThemeName, setEditingThemeName] = useState<string>('');
  const [editingThemeDesc, setEditingThemeDesc] = useState<string>('');

  const [editingSubthemeId, setEditingSubthemeId] = useState<string | null>(null);
  const [editingSubthemeName, setEditingSubthemeName] = useState<string>('');

  // Form state for ATP
  const [isAddingATP, setIsAddingATP] = useState<boolean>(false);
  const [atpCode, setAtpCode] = useState<string>('');
  const [atpTitle, setAtpTitle] = useState<string>('');
  const [atpPhase, setAtpPhase] = useState<string>('Fase Fondasi (4-6 Tahun)');
  const [atpStepOrder, setAtpStepOrder] = useState<number>(1);
  const [atpCpCode, setAtpCpCode] = useState<string>('CP-03');
  const [atpDescription, setAtpDescription] = useState<string>('');

  const refreshData = () => {
    const ths = curriculumStore.getThemes();
    setThemes(ths);

    const map: Record<string, SubthemeItem[]> = {};
    ths.forEach((t) => {
      map[t.id] = curriculumStore.getSubthemes(t.id);
    });
    setThemeSubthemes(map);

    setAtps(curriculumStore.getATPs());
    setActivities(curriculumStore.getActivities());
  };

  useEffect(() => {
    refreshData();
    const unsub = curriculumStore.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Add new Theme
  const handleAddTheme = () => {
    if (!newThemeName.trim()) return;
    try {
      const subs = newThemeInitialSubthemes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      curriculumStore.addTheme(
        {
          name: newThemeName.trim(),
          description: newThemeDesc.trim() || `Tema ${newThemeName.trim()}`,
          status: 'ACTIVE',
        },
        subs.length > 0 ? subs : ['Pengenalan Lingkungan']
      );
      setNewThemeName('');
      setNewThemeDesc('');
      setNewThemeInitialSubthemes('');
      setIsAddingThemeExpanded(false);
      showToast(`Tema "${newThemeName}" berhasil ditambahkan.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan tema.');
    }
  };

  const handleToggleThemeStatus = (theme: ThemeItem) => {
    curriculumStore.toggleThemeStatus(theme.id);
    const updatedStatus = theme.status === 'ACTIVE' ? 'dinonaktifkan (diarsipkan)' : 'diaktifkan kembali';
    showToast(`Tema "${theme.name}" berhasil ${updatedStatus}.`);
  };

  const handleStartEditTheme = (theme: ThemeItem) => {
    setEditingThemeId(theme.id);
    setEditingThemeName(theme.name);
    setEditingThemeDesc(theme.description || '');
  };

  const handleSaveEditTheme = (theme: ThemeItem) => {
    if (!editingThemeName.trim()) return;
    curriculumStore.updateTheme({
      ...theme,
      name: editingThemeName.trim(),
      description: editingThemeDesc.trim(),
    });
    setEditingThemeId(null);
    showToast(`Tema "${editingThemeName}" berhasil diperbarui.`);
  };

  // Delete Theme with In-Use Safety Check
  const handleDeleteTheme = (theme: ThemeItem) => {
    const inUse = curriculumStore.isThemeInUse(theme.id);
    if (inUse) {
      setSafetyAlert({
        title: `Tema "${theme.name}" Sedang Digunakan`,
        message: `Tema ini sedang terhubung dengan kegiatan pembelajaran aktif atau riwayat observasi anak di sistem. Menghapusnya secara permanen akan memutus relasi data penilaian. Disarankan untuk menonaktifkannya (arsipkan) saja agar guru tidak memilihnya lagi, namun arsip penilaian masa lalu tetap aman.`,
      });
      return;
    }

    if (confirm(`Hapus tema "${theme.name}" secara permanen beserta seluruh subtemanya?`)) {
      curriculumStore.deleteTheme(theme.id);
      showToast(`Tema "${theme.name}" berhasil dihapus.`);
    }
  };

  // Subtheme handlers
  const handleAddSubtheme = (themeId: string, subName: string) => {
    if (!subName.trim()) return;
    try {
      curriculumStore.addSubtheme(themeId, subName.trim());
      showToast(`Subtema "${subName}" berhasil ditambahkan.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan subtema.');
    }
  };

  const handleToggleSubthemeStatus = (subtheme: SubthemeItem) => {
    curriculumStore.toggleSubthemeStatus(subtheme.id);
    const updatedStatus = subtheme.status === 'ACTIVE' ? 'dinonaktifkan' : 'diaktifkan';
    showToast(`Subtema "${subtheme.name}" berhasil ${updatedStatus}.`);
  };

  const handleStartEditSubtheme = (sub: SubthemeItem) => {
    setEditingSubthemeId(sub.id);
    setEditingSubthemeName(sub.name);
  };

  const handleSaveEditSubtheme = (sub: SubthemeItem) => {
    if (!editingSubthemeName.trim()) return;
    curriculumStore.updateSubtheme({
      ...sub,
      name: editingSubthemeName.trim(),
    });
    setEditingSubthemeId(null);
    showToast(`Subtema "${editingSubthemeName}" berhasil diperbarui.`);
  };

  const handleDeleteSubtheme = (themeId: string, sub: SubthemeItem) => {
    const inUse = curriculumStore.isSubthemeInUse(sub.id);
    if (inUse) {
      setSafetyAlert({
        title: `Subtema "${sub.name}" Sedang Digunakan`,
        message: `Subtema ini telah tercatat dalam rancangan kegiatan guru atau observasi siswa. Silakan nonaktifkan (arsipkan) subtema ini daripada menghapusnya agar riwayat asesmen tetap utuh.`,
      });
      return;
    }
    if (confirm(`Hapus subtema "${sub.name}"?`)) {
      curriculumStore.deleteSubtheme(themeId, sub.id);
      showToast(`Subtema "${sub.name}" berhasil dihapus.`);
    }
  };

  // Save new ATP
  const handleSaveATP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atpCode.trim() || !atpTitle.trim()) return;

    const newATP: ATPItem = {
      id: `atp-${Date.now()}`,
      cpId: atpCpCode,
      cpCode: atpCpCode,
      code: atpCode.trim(),
      title: atpTitle.trim(),
      phase: atpPhase,
      stepOrder: Number(atpStepOrder),
      description: atpDescription.trim(),
      status: 'ACTIVE',
    };

    curriculumStore.addATP(newATP);
    setIsAddingATP(false);
    setAtpCode('');
    setAtpTitle('');
    setAtpDescription('');
    showToast(`ATP "${newATP.code} - ${newATP.title}" berhasil disimpan.`);
  };

  // Filtered themes
  const filteredThemes = themes.filter((t) => {
    const matchesStatus =
      themeStatusFilter === 'ALL'
        ? true
        : themeStatusFilter === 'ACTIVE'
        ? t.status === 'ACTIVE'
        : t.status === 'ARCHIVED';

    if (!matchesStatus) return false;

    if (!themeSearch.trim()) return true;
    const q = themeSearch.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchDesc = (t.description || '').toLowerCase().includes(q);
    const subList = themeSubthemes[t.id] || [];
    const matchSub = subList.some((s) => s.name.toLowerCase().includes(q));
    return matchName || matchDesc || matchSub;
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="admin-curriculum-view">
      {/* Safety Alert Modal */}
      {safetyAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">{safetyAlert.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{safetyAlert.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSafetyAlert(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Manajemen Kurikulum PAUD & Alur Pembelajaran
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola Tema, Subtema, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), dan Bank Kegiatan. Terhubung langsung ke Dashboard Guru.
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('TEMA')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'TEMA'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tema & Subtema ({themes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('CP_ATP_TP')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'CP_ATP_TP'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CP, ATP & TP
          </button>
          <button
            onClick={() => setActiveSubTab('KEGIATAN')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'KEGIATAN'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank Kegiatan ({activities.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TEMA & SUBTEMA */}
      {activeSubTab === 'TEMA' && (
        <div className="space-y-6">
          {/* Top Control Bar: Search, Status Filter & Add Theme Button */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Cari tema atau subtema..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setThemeStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      themeStatusFilter === st
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Aktif' : 'Diarsipkan'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsAddingThemeExpanded(!isAddingThemeExpanded)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingThemeExpanded ? 'Tutup Form' : 'Tambah Tema Baru'}</span>
            </button>
          </div>

          {/* Add Theme Expanded Form */}
          {isAddingThemeExpanded && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-600" />
                  Tambah Tema & Subtema Baru
                </h3>
                <button
                  onClick={() => setIsAddingThemeExpanded(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Tema *
                  </label>
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="Contoh: Energi Ramah Lingkungan, Kesenian Wayang..."
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Deskripsi / Tujuan Pembelajaran Kontekstual
                  </label>
                  <input
                    type="text"
                    value={newThemeDesc}
                    onChange={(e) => setNewThemeDesc(e.target.value)}
                    placeholder="Contoh: Mengembangkan rasa ingin tahu tentang sumber energi sekitar..."
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Subtema Awal (Pisahkan dengan tanda koma)
                </label>
                <input
                  type="text"
                  value={newThemeInitialSubthemes}
                  onChange={(e) => setNewThemeInitialSubthemes(e.target.value)}
                  placeholder="Contoh: Cahaya Matahari, Kincir Angin, Hemat Listrik di Rumah"
                  className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Subtema tambahan dapat ditambahkan kapan saja dari kartu tema masing-masing.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddingThemeExpanded(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddTheme}
                  disabled={!newThemeName.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Simpan Tema
                </button>
              </div>
            </div>
          )}

          {/* Themes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredThemes.map((theme) => {
              const subList = themeSubthemes[theme.id] || [];
              const isEditing = editingThemeId === theme.id;
              const relatedActivities = activities.filter(
                (a) =>
                  a.theme === theme.name ||
                  (a.themeId && a.themeId === theme.id)
              );

              return (
                <div
                  key={theme.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-4 ${
                    theme.status === 'ARCHIVED'
                      ? 'border-slate-200 bg-slate-50/70 opacity-85'
                      : 'border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  {/* Theme Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingThemeName}
                            onChange={(e) => setEditingThemeName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-emerald-400 rounded-lg focus:outline-none"
                            placeholder="Nama tema..."
                          />
                          <input
                            type="text"
                            value={editingThemeDesc}
                            onChange={(e) => setEditingThemeDesc(e.target.value)}
                            className="w-full px-3 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Deskripsi tema..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEditTheme(theme)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingThemeId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                            <h4 className="font-bold text-sm text-slate-900">{theme.name}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                theme.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {theme.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan'}
                            </span>
                            {relatedActivities.length > 0 && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                                {relatedActivities.length} Kegiatan
                              </span>
                            )}
                          </div>
                          {theme.description && (
                            <p className="text-xs text-slate-500 mt-1 pl-6 leading-relaxed">
                              {theme.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditTheme(theme)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit nama tema"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleThemeStatus(theme)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            theme.status === 'ACTIVE'
                              ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={
                            theme.status === 'ACTIVE'
                              ? 'Nonaktifkan/Arsipkan Tema'
                              : 'Aktifkan Kembali Tema'
                          }
                        >
                          {theme.status === 'ACTIVE' ? (
                            <PowerOff className="w-3.5 h-3.5" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTheme(theme)}
                          className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus tema"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subthemes list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Subtema ({subList.length})
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {subList.map((st) => {
                        const isSubEditing = editingSubthemeId === st.id;
                        return (
                          <div
                            key={st.id}
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl border font-medium transition ${
                              st.status === 'ACTIVE'
                                ? 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                                : 'bg-slate-100 text-slate-400 border-dashed border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                st.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />

                            {isSubEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingSubthemeName}
                                  onChange={(e) => setEditingSubthemeName(e.target.value)}
                                  className="px-1.5 py-0.5 text-xs bg-white border border-emerald-400 rounded-md focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEditSubtheme(st)}
                                  className="text-emerald-700 hover:text-emerald-900"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingSubthemeId(null)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className={st.status === 'ARCHIVED' ? 'line-through' : ''}>
                                  {st.name}
                                </span>
                                <button
                                  onClick={() => handleStartEditSubtheme(st)}
                                  className="text-slate-300 hover:text-slate-600"
                                  title="Ubah nama"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleSubthemeStatus(st)}
                                  className={`text-xs ${
                                    st.status === 'ACTIVE'
                                      ? 'text-slate-300 hover:text-amber-600'
                                      : 'text-amber-500 hover:text-emerald-600'
                                  }`}
                                  title={
                                    st.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan kembali'
                                  }
                                >
                                  •
                                </button>
                                <button
                                  onClick={() => handleDeleteSubtheme(theme.id, st)}
                                  className="text-slate-300 hover:text-rose-600"
                                  title="Hapus subtema"
                                >
                                  ×
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add subtheme inline */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder={`Tambah subtema untuk ${theme.name}...`}
                      id={`sub-input-${theme.id}`}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val.trim()) {
                            handleAddSubtheme(theme.id, val.trim());
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(
                          `sub-input-${theme.id}`
                        ) as HTMLInputElement;
                        if (el && el.value.trim()) {
                          handleAddSubtheme(theme.id, el.value.trim());
                          el.value = '';
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredThemes.length === 0 && (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
              Tidak ada tema yang cocok dengan filter pencarian "{themeSearch}".
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CP, ATP & TP */}
      {activeSubTab === 'CP_ATP_TP' && (
        <div className="space-y-6">
          {/* Top Actions: Add ATP */}
          <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Alur Tujuan Pembelajaran (ATP) - Fase Fondasi PAUD
              </h3>
              <p className="text-xs text-slate-500">
                Tersusun hierarkis menghubungkan Capaian Pembelajaran (CP) ke Tujuan Pembelajaran (TP) konkret.
              </p>
            </div>
            <button
              onClick={() => setIsAddingATP(!isAddingATP)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {isAddingATP ? 'Tutup Form' : '+ Tambah ATP Baru'}
            </button>
          </div>

          {/* Form Add ATP */}
          {isAddingATP && (
            <form onSubmit={handleSaveATP} className="bg-white p-6 rounded-3xl border border-emerald-300 shadow-md space-y-4">
              <h4 className="font-bold text-sm text-emerald-950">Formulir Input Alur Tujuan Pembelajaran (ATP)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kode ATP</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: ATP-LIT-02"
                    value={atpCode}
                    onChange={(e) => setAtpCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Urutan Alur (Step)</label>
                  <input
                    type="number"
                    min={1}
                    value={atpStepOrder}
                    onChange={(e) => setAtpStepOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Capaian Pembelajaran (CP)</label>
                  <select
                    value={atpCpCode}
                    onChange={(e) => setAtpCpCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="CP-01">CP-01: Nilai Agama & Budi Pekerti</option>
                    <option value="CP-02">CP-02: Jati Diri & Regulasi Diri</option>
                    <option value="CP-03">CP-03: Dasar Literasi, Matematika, Sains & Seni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Judul / Sasaran ATP</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mengembangkan Kemampuan Klasifikasi & Eksplorasi Sains Sederhana"
                  value={atpTitle}
                  onChange={(e) => setAtpTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Pedagogis</label>
                <textarea
                  rows={2}
                  placeholder="Rincian alur perkembangan anak dari perjumpaan awal hingga kemandirian pemecahan masalah..."
                  value={atpDescription}
                  onChange={(e) => setAtpDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingATP(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Simpan ATP
                </button>
              </div>
            </form>
          )}

          {/* ATP Cards List */}
          <div className="space-y-3">
            {atps.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                      {item.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Step #{item.stepOrder} • {item.phase}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Hapus ATP "${item.title}"?`)) {
                      curriculumStore.deleteATP(item.id);
                      showToast(`ATP ${item.code} berhasil dihapus.`);
                    }
                  }}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition self-end md:self-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: KEGIATAN */}
      {activeSubTab === 'KEGIATAN' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">
              Daftar Preset Kegiatan Pembelajaran Guru ({activities.length})
            </h3>
            <p className="text-xs text-slate-500">
              Kegiatan ini muncul di dropdown asesmen observasi guru dan jadwal pembelajaran.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((act) => (
              <div key={act.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {act.theme || 'Umum'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">{act.title}</h4>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus kegiatan "${act.title}"?`)) {
                        curriculumStore.deleteActivity(act.id);
                        showToast(`Kegiatan "${act.title}" dihapus.`);
                      }
                    }}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{act.description}</p>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                  <div>
                    <strong>CP:</strong> {act.cp}
                  </div>
                  <div>
                    <strong>TP:</strong> {act.tp}
                  </div>
                  <div>
                    <strong>Indikator:</strong> {(act.indicators || []).length} aspek terdaftar
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
