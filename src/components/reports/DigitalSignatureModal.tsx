import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  Upload,
  CheckCircle2,
  X,
  Stamp,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  digitalSignatureService,
  DigitalSignatureData,
} from '../../services/digitalSignatureService';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  academicYear: string;
  semester: string;
  schoolName: string;
  defaultRole?: 'TEACHER' | 'PRINCIPAL';
  initialTeacherName?: string;
  initialPrincipalName?: string;
  onAuthorized: (data: DigitalSignatureData) => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  academicYear,
  semester,
  schoolName,
  defaultRole = 'TEACHER',
  initialTeacherName = '',
  initialPrincipalName = '',
  onAuthorized,
}) => {
  const [role, setRole] = useState<'TEACHER' | 'PRINCIPAL'>(defaultRole);
  const [method, setMethod] = useState<'DRAW' | 'STAMP' | 'UPLOAD'>('DRAW');
  const [signerName, setSignerName] = useState(
    defaultRole === 'PRINCIPAL' ? initialPrincipalName : initialTeacherName
  );
  const [signerTitle, setSignerTitle] = useState(
    defaultRole === 'PRINCIPAL' ? 'Kepala Sekolah' : 'Guru Wali Kelas'
  );
  const [nip, setNip] = useState('');
  const [locationDate, setLocationDate] = useState(() => {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Jakarta, ${today}`;
  });
  const [isAgreementChecked, setIsAgreementChecked] = useState(true);
  const [penColor, setPenColor] = useState<string>('#0f172a'); // Deep slate/navy
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Update names when role switches
  useEffect(() => {
    if (role === 'PRINCIPAL') {
      setSignerName(initialPrincipalName || 'Kepala Sekolah');
      setSignerTitle('Kepala Sekolah');
    } else {
      setSignerName(initialTeacherName || 'Guru Wali Kelas');
      setSignerTitle('Guru Wali Kelas');
    }
  }, [role, initialTeacherName, initialPrincipalName]);

  // Initialize Canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (isOpen && method === 'DRAW') {
      const timer = setTimeout(() => {
        clearCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, method, clearCanvas]);

  // Pointer event handlers for Canvas
  const getCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.4;
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!signerName.trim()) {
      alert('Mohon masukkan nama pejabat / guru penandatangan.');
      return;
    }

    if (!isAgreementChecked) {
      alert('Mohon centang pernyataan otorisasi resmi.');
      return;
    }

    const verificationCode = digitalSignatureService.generateVerificationCode(role, studentId);
    const authorizedTimestamp = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let finalDataUrl: string | null = null;
    let signatureType: 'DRAWN' | 'STAMP' | 'UPLOADED' = 'DRAWN';

    if (method === 'DRAW') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        finalDataUrl = canvas.toDataURL('image/png');
        signatureType = 'DRAWN';
      } else {
        // Fallback to digital stamp if nothing was drawn
        finalDataUrl = digitalSignatureService.generateDigitalStampDataUrl(
          signerName,
          signerTitle,
          schoolName,
          verificationCode,
          authorizedTimestamp
        );
        signatureType = 'STAMP';
      }
    } else if (method === 'STAMP') {
      finalDataUrl = digitalSignatureService.generateDigitalStampDataUrl(
        signerName,
        signerTitle,
        schoolName,
        verificationCode,
        authorizedTimestamp
      );
      signatureType = 'STAMP';
    } else if (method === 'UPLOAD') {
      if (!uploadedImage) {
        alert('Mohon pilih berkas gambar tanda tangan terlebih dahulu.');
        return;
      }
      finalDataUrl = uploadedImage;
      signatureType = 'UPLOADED';
    }

    const payload: DigitalSignatureData = {
      role,
      signerName: signerName.trim(),
      signerTitle: signerTitle.trim(),
      nip: nip.trim() || undefined,
      signatureDataUrl: finalDataUrl,
      signatureType,
      verificationCode,
      authorizedAt: authorizedTimestamp,
      locationAndDate: locationDate.trim(),
      isAuthorized: true,
    };

    onAuthorized(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                Otorisasi & Tanda Tangan Digital Resmi
              </h3>
              <p className="text-[11px] text-slate-400">
                Pengesahan Dokumen Laporan Perkembangan Ananda {studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar text-xs">
          {/* Role Switcher */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Pilih Otorisator / Jabatan Pengesah:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('TEACHER')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  role === 'TEACHER'
                    ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-xs ring-1 ring-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    role === 'TEACHER' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                  }`}
                >
                  {role === 'TEACHER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>Guru Wali Kelas</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('PRINCIPAL')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  role === 'PRINCIPAL'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    role === 'PRINCIPAL' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}
                >
                  {role === 'PRINCIPAL' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>Kepala Sekolah</span>
              </button>
            </div>
          </div>

          {/* Form Identitas Pejabat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Contoh: Hj. Siti Rahmawati, S.Pd."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                NIP / NUPTK / No. Induk Guru (Opsional):
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19820315 200801 2 004"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Lokasi & Tanggal Pengesahan:
              </label>
              <input
                type="text"
                value={locationDate}
                onChange={(e) => setLocationDate(e.target.value)}
                placeholder="Contoh: Jakarta, 14 September 2026"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Signature Method Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">Metode Tanda Tangan:</label>
              {method === 'DRAW' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Warna Tinta:</span>
                  <button
                    type="button"
                    onClick={() => setPenColor('#0f172a')}
                    className={`w-4 h-4 rounded-full bg-slate-900 border ${
                      penColor === '#0f172a' ? 'ring-2 ring-emerald-500' : 'border-slate-300'
                    }`}
                    title="Hitam / Navy"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#1e40af')}
                    className={`w-4 h-4 rounded-full bg-blue-800 border ${
                      penColor === '#1e40af' ? 'ring-2 ring-emerald-500' : 'border-slate-300'
                    }`}
                    title="Biru Resmi"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mb-3">
              <button
                type="button"
                onClick={() => setMethod('DRAW')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  method === 'DRAW'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gambar Langsung</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('STAMP')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  method === 'STAMP'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stamp className="w-3.5 h-3.5 text-sky-600" />
                <span>Segel Digital Resmi</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('UPLOAD')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  method === 'UPLOAD'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-purple-600" />
                <span>Upload Berkas</span>
              </button>
            </div>

            {/* Tab 1: Interactive Canvas Drawing */}
            {method === 'DRAW' && (
              <div className="relative">
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden relative cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={160}
                    className="w-full h-[150px] touch-none block"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />
                  {/* Baseline guidance */}
                  <div className="absolute bottom-8 left-8 right-8 border-b border-dashed border-slate-300 pointer-events-none flex justify-between">
                    <span className="text-[9px] text-slate-400">Tanda Tangan Di Atas Garis</span>
                    <span className="text-[9px] text-slate-400">✕</span>
                  </div>
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                      Gunakan jari, stylus, atau kursor mouse untuk menandatangani
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-slate-500">
                    {hasDrawn ? '✓ Goresan terdeteksi' : 'Belum ada goresan'}
                  </span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Bersihkan Pad</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Instant Official Cryptographic Seal */}
            {method === 'STAMP' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs max-w-[280px]">
                  <img
                    src={digitalSignatureService.generateDigitalStampDataUrl(
                      signerName || (role === 'PRINCIPAL' ? 'Kepala Sekolah' : 'Guru Kelas'),
                      signerTitle,
                      schoolName,
                      'SAMPLE-VERIF',
                      locationDate
                    )}
                    alt="Pratinjau Segel Digital"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-[11px] text-slate-600 max-w-sm">
                  Segel digital akan dicantumkan secara resmi pada lembar pengesahan laporan,
                  dilengkapi kode verifikasi autentik dan waktu pengesahan.
                </p>
              </div>
            )}

            {/* Tab 3: Upload Signature File */}
            {method === 'UPLOAD' && (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 bg-slate-50 hover:bg-emerald-50/30 transition-all cursor-pointer">
                  {uploadedImage ? (
                    <div className="space-y-2 text-center">
                      <img
                        src={uploadedImage}
                        alt="Tanda Tangan Terunggah"
                        className="max-h-24 mx-auto object-contain"
                      />
                      <p className="text-[11px] font-bold text-emerald-700">
                        Klik untuk mengganti berkas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center text-slate-500">
                      <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                      <p className="font-bold text-slate-700 text-xs">Pilih Berkas Tanda Tangan</p>
                      <p className="text-[10px] text-slate-400">
                        Format PNG transparan disarankan (maks. 2MB)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Legal Compliance Declaration */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="legal-agreement"
              checked={isAgreementChecked}
              onChange={(e) => setIsAgreementChecked(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="legal-agreement"
              className="text-[10.5px] text-emerald-900 leading-snug cursor-pointer select-none"
            >
              <strong>Pernyataan Otorisasi Resmi:</strong> Saya menyatakan bahwa seluruh data capaian
              perkembangan anak pada semester ini telah diverifikasi secara autentik dan sah untuk
              disampaikan kepada orang tua / wali murid.
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sahkan & Otorisasi Laporan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
