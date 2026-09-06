import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Upload,
  Edit3,
  Loader2,
  FileCheck,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Layers,
  Info,
} from 'lucide-react';
import { StudentProfile, ObservationRecord, UserProfile } from '../../types';
import { schoolStore } from '../../services/schoolStore';
import { calculateStudentReportData } from '../../utils/reportCalculator';
import { canViewReport } from '../../utils/authorization';
import type { GeneratedPdfResult } from '../../services/pdfReportGenerator';
import { StudentReportCard } from './StudentReportCard';
import { QuickAddDocumentationModal } from '../common/QuickAddDocumentationModal';

export interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  observations?: ObservationRecord[];
  currentUser?: UserProfile;
  students?: StudentProfile[];
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  student,
  observations = [],
  currentUser,
  students = [],
}) => {
  const [viewMode, setViewMode] = useState<'html' | 'pdf'>('html');
  const [isEditingKop, setIsEditingKop] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  // PDF Master State
  const [pdfResult, setPdfResult] = useState<GeneratedPdfResult | null>(null);
  const [isRenderingPdfMaster, setIsRenderingPdfMaster] = useState(false);

  // Fetch school profile from store
  const schoolProfile = useMemo(() => {
    return schoolStore.getSchoolProfile();
  }, []);

  const [customSchoolName, setCustomSchoolName] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Calculated Report Data (Canonical Report Document)
  const reportData = useMemo(() => {
    return calculateStudentReportData(student, observations, schoolProfile, {
      schoolName: customSchoolName || undefined,
      schoolAddress: customAddress || undefined,
      logoUrl: logoUrl || undefined,
    });
  }, [student, observations, schoolProfile, customSchoolName, customAddress, logoUrl]);

  const canonical = reportData.canonicalDoc;

  // Generate Master PDF when Modal Opens or Data Changes
  useEffect(() => {
    let isMounted = true;
    if (isOpen && student && canonical) {
      setIsRenderingPdfMaster(true);
      import('../../services/pdfReportGenerator')
        .then(({ buildStudentReportPdfDocument }) => {
          return buildStudentReportPdfDocument({
            student,
            reportData,
            schoolProfile: {
              ...schoolProfile,
              schoolName: canonical.school.name,
              address: canonical.school.address,
            },
            logoDataUrl: logoUrl,
            canonicalDoc: canonical,
          });
        })
        .then((res) => {
          if (isMounted) {
            setPdfResult(res);
            setIsRenderingPdfMaster(false);
          }
        })
        .catch((err) => {
          console.error('Failed to pre-render master PDF:', err);
          if (isMounted) {
            setIsRenderingPdfMaster(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, student, canonical, logoUrl, schoolProfile, reportData]);

  if (!isOpen || !student || !canonical) return null;

  // Authorization check
  const isAuthorized =
    currentUser && students && students.length > 0
      ? canViewReport(currentUser, student.id, students)
      : true;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Akses Ditolak</h3>
          <p className="text-xs text-slate-600">
            Anda tidak memiliki izin untuk mengakses laporan siswa ini.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const activeSchoolName = canonical.school.name;
  const activeSubtitle = customSubtitle || canonical.metadata.documentSubtitle;
  const activeAddress = canonical.school.address;

  const handlePrint = () => {
    if (viewMode === 'pdf' && pdfResult?.blobUrl) {
      const iframe = document.getElementById('pdf-master-frame') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
        return;
      }
    }
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!student) return;
    setIsGeneratingPdf(true);
    setSuccessMessage(null);
    try {
      if (viewMode === 'html') {
        const fileName = `${canonical.metadata.fileBaseName}.pdf`;
        const { exportReportToPdfFromHtml } = await import('../../utils/pdfExport');
        await exportReportToPdfFromHtml({
          containerElementId: 'report-content',
          fileName,
          canonicalDoc: canonical,
        });
      } else if (pdfResult) {
        pdfResult.engine.save(pdfResult.fileName);
      } else {
        const { generateStudentReportPdf } = await import('../../services/pdfReportGenerator');
        await generateStudentReportPdf({
          student,
          reportData,
          schoolProfile: {
            ...schoolProfile,
            schoolName: activeSchoolName,
            address: activeAddress,
          },
          logoDataUrl: logoUrl,
          canonicalDoc: canonical,
        });
      }
      setSuccessMessage(`Laporan PDF A4 Ananda ${student.name} berhasil diunduh.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Gagal membuat file PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!student || !canonical) return;
    setIsGeneratingDocx(true);
    setSuccessMessage(null);
    try {
      const { generateStudentReportDocx } = await import('../../services/docxReportGenerator');
      await generateStudentReportDocx({ canonicalDoc: canonical });
      setSuccessMessage(`Laporan Word A4 (.docx) Ananda ${student.name} berhasil diunduh.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Word DOCX Generation Error:', err);
      alert('Gagal membuat file Word (.docx). Silakan coba lagi.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.1, 1.25));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.1, 0.45));
  const handleResetZoom = () => setZoomScale(0.85);

  const isTeacherOrAdmin = currentUser?.role === 'GURU' || currentUser?.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800 shadow-md no-print">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Pratinjau Laporan Perkembangan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30 uppercase">
                  A4 Standar (3 Halaman)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Ananda {canonical.student.fullName} ({canonical.student.className}) •{' '}
                {canonical.metadata.semester}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'html'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Lembar Cetak</span>
              </button>
              <button
                onClick={() => setViewMode('pdf')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'pdf'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Master</span>
              </button>
            </div>

            {/* Zoom Controls (Active in HTML view) */}
            {viewMode === 'html' && (
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 mr-1 text-slate-300">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Perkecil Tampilan"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-2 text-slate-200">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Perbesar Tampilan"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1 hover:text-white hover:bg-slate-700 rounded-lg transition-colors ml-0.5 border-l border-slate-700 cursor-pointer"
                  title="Reset Skala (85%)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsAddingDoc(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Dokumentasi</span>
              </button>
            )}

            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsEditingKop(!isEditingKop)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isEditingKop
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Kop Surat</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak (A4)</span>
            </button>

            <button
              onClick={handleDownloadDocx}
              disabled={isGeneratingDocx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isGeneratingDocx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Word (.docx)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 text-xs flex items-center justify-between no-print animate-fadeIn">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Kop Surat Inline Editor */}
        {isEditingKop && (
          <div className="p-4 bg-slate-800/90 border-b border-slate-700 text-white grid grid-cols-1 md:grid-cols-4 gap-3 text-xs no-print animate-fadeIn">
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                Nama Satuan PAUD:
              </label>
              <input
                type="text"
                value={customSchoolName}
                onChange={(e) => setCustomSchoolName(e.target.value)}
                placeholder={activeSchoolName}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                Sub-judul / Semester:
              </label>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder={activeSubtitle}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                Alamat Sekolah:
              </label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder={activeAddress}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                Upload Logo Sekolah:
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-600 rounded-lg cursor-pointer text-slate-300 text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">{logoUrl ? 'Ganti Logo' : 'Pilih Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="px-2 py-1.5 text-rose-400 hover:bg-slate-900 rounded-lg border border-slate-600"
                    title="Hapus Logo"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: Document Preview Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950/90 flex flex-col items-center custom-scrollbar">
          {viewMode === 'pdf' ? (
            <div className="w-full h-full min-h-[78vh] flex flex-col items-center justify-center">
              {isRenderingPdfMaster ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm font-semibold">Menyiapkan Dokumen Master PDF A4...</p>
                  <p className="text-xs text-slate-500">
                    Menghitung presisi tata letak vektor & tipografi Kurikulum Merdeka
                  </p>
                </div>
              ) : pdfResult?.blobUrl ? (
                <iframe
                  id="pdf-master-frame"
                  src={pdfResult.blobUrl}
                  title="PDF Master Preview"
                  className="w-full max-w-[850px] h-[78vh] rounded-xl border border-slate-700 shadow-2xl bg-white"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-2">
                  <p className="text-sm">Pratinjau PDF siap diunduh.</p>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Unduh PDF Sekarang
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="origin-top"
            >
              <StudentReportCard
                canonical={canonical}
                canEdit={isTeacherOrAdmin}
                onAddDocumentation={() => setIsAddingDoc(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Documentation Modal */}
      {isAddingDoc && (
        <QuickAddDocumentationModal
          isOpen={isAddingDoc}
          onClose={() => setIsAddingDoc(false)}
          student={student}
          currentUser={currentUser}
          onSaved={() => {
            setSuccessMessage('Dokumentasi foto berhasil ditambahkan ke laporan.');
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
