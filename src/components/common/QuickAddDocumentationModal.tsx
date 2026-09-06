import React, { useState } from 'react';
import {
  X,
  Upload,
  Camera,
  Calendar,
  Sparkles,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';
import { StudentProfile, UserProfile, ObservationRecord, EvidenceItem } from '../../types';
import { observationStore } from '../../services/observationStore';
import { schoolStore } from '../../services/schoolStore';
import { compressImageFile } from '../../utils/imageUtils';

interface QuickAddDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  currentUser?: UserProfile;
  onSaved?: () => void;
}

export const QuickAddDocumentationModal: React.FC<QuickAddDocumentationModalProps> = ({
  isOpen,
  onClose,
  student,
  currentUser,
  onSaved,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState<string>('');
  const [observationDate, setObservationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [caption, setCaption] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const quickPresets = [
    'Merapikan alat bermain',
    'Membuat karya dari bahan alam',
    'Bermain peran & kolaborasi kelompok',
    'Mengeksplorasi buku cerita bergambar',
    'Aktivitas motorik luar ruangan',
    'Menyusun balok rancang bangun',
  ];

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1024, 0.82);
      setPhotoDataUrl(compressedDataUrl);
      setErrorMsg(null);
      if (!activityTitle) {
        setActivityTitle('Kegiatan Pembelajaran & Bermain');
      }
      if (!caption) {
        setCaption(
          `Ananda ${student.nickname || student.name.split(' ')[0]} berpartisipasi aktif dan mandiri dalam kegiatan.`
        );
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses gambar. Pastikan format file berupa foto JPG/PNG.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) {
      setErrorMsg('Silakan pilih atau ambil foto kegiatan terlebih dahulu.');
      return;
    }
    if (!activityTitle.trim()) {
      setErrorMsg('Silakan isi nama/konteks kegiatan.');
      return;
    }
    if (!caption.trim()) {
      setErrorMsg('Silakan isi keterangan singkat (maksimal 1 kalimat).');
      return;
    }

    if (!currentUser || !currentUser.id) {
      setErrorMsg('Sesi pengguna tidak valid atau belum terautentikasi. Silakan login kembali.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const schoolProfile = schoolStore.getSchoolProfile();
    const formattedDate = new Date(observationDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const newEvidence: EvidenceItem = {
      id: `ev-${Date.now()}`,
      type: 'PHOTO',
      url: photoDataUrl,
      title: activityTitle.trim(),
      caption: caption.trim(),
      date: formattedDate,
      createdAt: new Date().toISOString(),
    };

    const newRecord: Omit<ObservationRecord, 'id'> & { id?: string } = {
      schoolId: student.schoolId || schoolProfile.id || currentUser.schoolId || 'main-school',
      studentId: student.id,
      studentName: student.name,
      classId: student.classId || '',
      className: student.className || 'TK Kelompok B',
      teacherId: currentUser.id,
      teacherName: currentUser.name || currentUser.displayName || 'Guru Wali Kelas',
      activityId: `act-custom-${Date.now()}`,
      activityTitle: activityTitle.trim(),
      date: formattedDate,
      observationDateISO: observationDate,
      cp: 'Mengembangkan kemandirian dan rasa ingin tahu anak usia dini.',
      tp: 'Menunjukkan kemampuan berpartisipasi aktif dalam kegiatan bermain.',
      indicators: [
        {
          id: `ind-${Date.now()}`,
          text: activityTitle.trim(),
          aspect: 'JATI_DIRI',
          rating: 'BSH',
        },
      ],
      evidences: [newEvidence],
      teacherNote: caption.trim(),
      status: 'REPORT_READY',
      academicYear: schoolProfile.academicYear || '2026/2027',
      semester: schoolProfile.semester || 'Semester I (Ganjil)',
    };

    try {
      await observationStore.addObservation(newRecord);
      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving documentation evidence:', err);
      setErrorMsg(`Gagal menyimpan dokumentasi: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Tambah Dokumentasi Foto Nyata</h3>
              <p className="text-[11px] text-slate-400">
                Ananda {student.name} • {student.className}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs">
              {errorMsg}
            </div>
          )}

          {/* Photo Uploader */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Foto Kegiatan / Karya Anak (Nyata)</span>
              <span className="text-[10px] text-slate-400 font-normal">Wajib diunggah</span>
            </label>

            {photoDataUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 group">
                <img
                  src={photoDataUrl}
                  alt="Pratinjau Foto"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs cursor-pointer hover:bg-slate-100 shadow-md">
                    Ganti Foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-md"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    Klik untuk Ambil atau Unggah Foto
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Format JPG, PNG (Langsung teroptimasi)
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Quick Activity Selection */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nama / Konteks Kegiatan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Merapikan alat bermain, Membuat karya dari balok..."
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-medium"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivityTitle(preset)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 font-semibold transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Tanggal Pengamatan
            </label>
            <input
              type="date"
              required
              value={observationDate}
              onChange={(e) => setObservationDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 font-medium"
            />
          </div>

          {/* Short 1-Sentence Caption */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Keterangan Singkat (Maksimal 1 Kalimat)</span>
              <span className="text-[10px] text-slate-400 font-normal">Mudah dipahami orang tua</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Ananda mulai terbiasa mengembalikan alat bermain setelah kegiatan secara mandiri."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-medium resize-none leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan & Tampilkan di Laporan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
