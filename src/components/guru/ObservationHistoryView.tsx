import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  User,
  BookOpen,
  Edit3,
  Trash2,
  Eye,
  Camera,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  Volume2,
  Tag,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { ObservationRecord, StudentProfile, DevelopmentalAspect, RatingLevel } from '../../types';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../data/initialData';
import { ALL_ASPECTS, getAchievementPredicate } from '../../utils/studentMetrics';
import { observationStore } from '../../services/observationStore';

interface ObservationHistoryViewProps {
  observations?: ObservationRecord[];
  students?: StudentProfile[];
  onEditObservation: (record: ObservationRecord) => void;
  onDeleteObservation?: (id: string) => void;
  onAddNewObservation?: () => void;
  onOpenNewObservation?: () => void;
}

export const ObservationHistoryView: React.FC<ObservationHistoryViewProps> = ({
  observations = [],
  students = [],
  onEditObservation,
  onDeleteObservation,
  onAddNewObservation,
  onOpenNewObservation,
}) => {
  const handleAddNew = onAddNewObservation || onOpenNewObservation;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [selectedAspectFilter, setSelectedAspectFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Detail Modal State
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ObservationRecord | null>(null);

  // Delete Confirmation Modal State
  const [recordToDelete, setRecordToDelete] = useState<ObservationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered & Sorted Observations
  const filteredObservations = useMemo(() => {
    let result = [...observations];

    if (selectedStudentFilter !== 'ALL') {
      result = result.filter((o) => o.studentId === selectedStudentFilter);
    }

    if (selectedAspectFilter !== 'ALL') {
      result = result.filter((o) =>
        (o.indicators || []).some(
          (ind) =>
            String(ind.aspect || '').toUpperCase() === selectedAspectFilter ||
            String(ind.developmentalAspect || '').toUpperCase() === selectedAspectFilter
        )
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.studentName?.toLowerCase().includes(q) ||
          o.activityTitle?.toLowerCase().includes(q) ||
          o.teacherNote?.toLowerCase().includes(q) ||
          (o.indicators || []).some((i) => i.text.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const dateA = a.observationDateISO || a.date || '';
      const dateB = b.observationDateISO || b.date || '';
      return sortOrder === 'NEWEST'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });

    return result;
  }, [observations, selectedStudentFilter, selectedAspectFilter, searchQuery, sortOrder]);

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteObservation) {
        onDeleteObservation(recordToDelete.id);
      } else {
        await observationStore.deleteObservation(recordToDelete.id);
      }
      showToast(`Data observasi "${recordToDelete.activityTitle}" untuk ananda ${recordToDelete.studentName} berhasil dihapus.`);
      if (selectedDetailRecord?.id === recordToDelete.id) {
        setSelectedDetailRecord(null);
      }
      setRecordToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete observation:', err);
      showToast('Gagal menghapus observasi. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRatingBadge = (rating?: RatingLevel | string) => {
    switch (rating) {
      case 'BSB':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">BSB (100%)</span>;
      case 'BSH':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-300">BSH (75%)</span>;
      case 'MB':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300">MB (50%)</span>;
      case 'BB':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-300">BB (25%)</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">Belum Teramati</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="observation-history-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-emerald-600" />
              Riwayat Observasi Perkembangan Anak
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Daftar seluruh asesmen autentik harian yang telah diinput guru. Guru dapat melihat detail, mengedit catatan/rating/foto, atau menghapus observasi.
            </p>
          </div>
          {handleAddNew && (
            <button
              onClick={handleAddNew}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition shadow-xs cursor-pointer"
            >
              + Input Observasi Baru
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama anak, kegiatan, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Peserta Didik ({students.length})</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className || 'Kelas'})
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Filter */}
          <div>
            <select
              value={selectedAspectFilter}
              onChange={(e) => setSelectedAspectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Aspek Perkembangan</option>
              {ALL_ASPECTS.map((aspect) => (
                <option key={aspect} value={aspect}>
                  {ASPECT_LABELS[aspect] || aspect}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'NEWEST' ? 'OLDEST' : 'NEWEST'))}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                Urutan: {sortOrder === 'NEWEST' ? 'Terbaru Dahulu' : 'Terlama Dahulu'}
              </span>
              <span className="text-[10px] text-slate-400">({filteredObservations.length} data)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Observations List */}
      {filteredObservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Tidak Ada Riwayat Observasi</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedStudentFilter !== 'ALL' || selectedAspectFilter !== 'ALL'
              ? 'Tidak ditemukan observasi yang sesuai dengan kata kunci atau filter yang dipilih.'
              : 'Belum ada data observasi yang tercatat. Silakan mulai input observasi kegiatan anak.'}
          </p>
          {handleAddNew && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
            >
              + Input Observasi Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredObservations.map((obs) => {
            const ratedCount = (obs.indicators || []).filter(
              (i) => i.rating && i.rating !== 'BELUM_DINILAI'
            ).length;
            const evidenceCount = (obs.evidences || []).length;
            const hasVoice = Boolean(obs.voiceNoteText || obs.voiceNote?.transcript);

            return (
              <div
                key={obs.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar: Student Name & Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                        {obs.studentName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {obs.studentName}
                        </h4>
                        <p className="text-[11px] text-slate-500">{obs.className || 'Kelas PAUD'}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {obs.date || obs.observationDateISO || 'Hari Ini'}
                    </span>
                  </div>

                  {/* Activity Title */}
                  <div>
                    <h5 className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {obs.activityTitle}
                    </h5>
                    {obs.tp && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                        TP: {obs.tp}
                      </p>
                    )}
                  </div>

                  {/* Indicators Preview */}
                  <div className="space-y-1.5 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Indikator Dinilai ({ratedCount})</span>
                      <span className="text-[10px] text-slate-400">
                        Total {obs.indicators?.length || 0} aspek terdaftar
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(obs.indicators || []).slice(0, 3).map((ind, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                        >
                          <span className="font-bold text-slate-700">{ind.aspect || 'ASPEK'}:</span>
                          {getRatingBadge(ind.rating)}
                        </div>
                      ))}
                      {(obs.indicators || []).length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{obs.indicators.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Note Preview */}
                  {obs.teacherNote && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">
                      <span className="font-semibold text-amber-900">Catatan: </span>
                      "{obs.teacherNote}"
                    </p>
                  )}

                  {/* Meta Badges (Photos, Audio, AI) */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {evidenceCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium border border-indigo-200">
                        <Camera className="w-3 h-3" />
                        {evidenceCount} Foto/Karya
                      </span>
                    )}
                    {hasVoice && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md font-medium border border-violet-200">
                        <Volume2 className="w-3 h-3" />
                        Voice Note
                      </span>
                    )}
                    {obs.aiAnalysis && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                        <Sparkles className="w-3 h-3" />
                        Wawasan AI
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => setSelectedDetailRecord(obs)}
                    className="flex items-center gap-1 font-bold text-slate-700 hover:text-emerald-700 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Buka Detail
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditObservation(obs)}
                      className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="Edit catatan, foto, atau rating observasi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setRecordToDelete(obs)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus observasi ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Detail Observasi Perkembangan</h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedDetailRecord.studentName} - {selectedDetailRecord.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
              {/* Info Header Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Kegiatan Pembelajaran
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedDetailRecord.activityTitle}
                    </h4>
                  </div>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                    {selectedDetailRecord.semester || 'Semester I'}
                  </span>
                </div>
                {selectedDetailRecord.cp && (
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-slate-800">CP:</strong> {selectedDetailRecord.cp}
                  </p>
                )}
                {selectedDetailRecord.tp && (
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-slate-800">TP:</strong> {selectedDetailRecord.tp}
                  </p>
                )}
              </div>

              {/* Indicators Table */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Rubrik Indikator Teramati
                </h5>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {(selectedDetailRecord.indicators || []).map((ind, i) => (
                    <div key={i} className="p-3 flex items-start justify-between gap-3 bg-white hover:bg-slate-50/50">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {ASPECT_LABELS[ind.aspect as DevelopmentalAspect] || ind.aspect}
                        </span>
                        <p className="text-xs text-slate-800 font-medium">{ind.text}</p>
                      </div>
                      <div className="shrink-0">{getRatingBadge(ind.rating)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Notes & Voice */}
              <div className="space-y-3">
                {selectedDetailRecord.teacherNote && (
                  <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">
                      Catatan Anekdot / Observasi Guru:
                    </span>
                    <p className="text-xs text-amber-950 whitespace-pre-wrap">
                      {selectedDetailRecord.teacherNote}
                    </p>
                  </div>
                )}
                {(selectedDetailRecord.voiceNoteText || selectedDetailRecord.voiceNote?.transcript) && (
                  <div className="bg-violet-50/60 p-3.5 rounded-2xl border border-violet-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-violet-900 uppercase flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" />
                      Transkrip Rekaman Suara:
                    </span>
                    <p className="text-xs text-violet-950 italic">
                      "{selectedDetailRecord.voiceNoteText || selectedDetailRecord.voiceNote?.transcript}"
                    </p>
                  </div>
                )}
              </div>

              {/* Evidences / Photos */}
              {(selectedDetailRecord.evidences || []).length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    Dokumentasi Foto & Hasil Karya ({selectedDetailRecord.evidences?.length})
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {selectedDetailRecord.evidences?.map((ev, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group relative">
                        {ev.imageUrl ? (
                          <img
                            src={ev.imageUrl}
                            alt={ev.title || 'Foto kegiatan'}
                            referrerPolicy="no-referrer"
                            className="w-full h-28 object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-28 flex items-center justify-center bg-slate-200 text-slate-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="p-1.5 bg-white text-[10px] font-medium text-slate-700 truncate">
                          {ev.title || `Bukti ${idx + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insight Narrative */}
              {selectedDetailRecord.aiAnalysis && (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-2">
                  <h5 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Saran & Wawasan Pedagogis AI (Bantuan Observasi)
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedDetailRecord.aiAnalysis.generatedNarrative}
                  </p>
                  {selectedDetailRecord.aiAnalysis.homeStimulationAdvice && (
                    <div className="pt-2 text-[11px] text-slate-600 border-t border-emerald-200/60">
                      <strong>Saran Stimulasi di Rumah: </strong>
                      {Array.isArray(selectedDetailRecord.aiAnalysis.homeStimulationAdvice)
                        ? selectedDetailRecord.aiAnalysis.homeStimulationAdvice.join('; ')
                        : selectedDetailRecord.aiAnalysis.homeStimulationAdvice}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const toDelete = selectedDetailRecord;
                  setSelectedDetailRecord(null);
                  setRecordToDelete(toDelete);
                }}
                className="px-3.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Observasi
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDetailRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const toEdit = selectedDetailRecord;
                    setSelectedDetailRecord(null);
                    onEditObservation(toEdit);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Observasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Data Observasi?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus observasi kegiatan "
                <strong>{recordToDelete.activityTitle}</strong>" untuk ananda{' '}
                <strong>{recordToDelete.studentName}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-xl mt-2 font-medium">
                Peringatan: Seluruh data terikat (grafik capaian anak, portofolio karya, laporan anak, dan riwayat) akan otomatis diperbarui dan disesuaikan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
