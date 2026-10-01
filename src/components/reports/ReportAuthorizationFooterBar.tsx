import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  RotateCcw,
  Stamp,
  Lock,
  UserCheck,
  Share2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DigitalSignatureData,
  ReportAuthorizationRecord,
} from '../../services/digitalSignatureService';

interface ReportAuthorizationFooterBarProps {
  authorization: ReportAuthorizationRecord | null;
  teacherName: string;
  principalName: string;
  canAuthorize: boolean;
  onOpenSignModal: (role: 'TEACHER' | 'PRINCIPAL') => void;
  onRevokeSignature: (role: 'TEACHER' | 'PRINCIPAL') => void;
  onTogglePublish?: (isPublished: boolean) => void;
}

export const ReportAuthorizationFooterBar: React.FC<ReportAuthorizationFooterBarProps> = ({
  authorization,
  teacherName,
  principalName,
  canAuthorize,
  onOpenSignModal,
  onRevokeSignature,
  onTogglePublish,
}) => {
  const teacherSig = authorization?.teacherSignature;
  const principalSig = authorization?.principalSignature;

  const isTeacherSigned = Boolean(teacherSig?.isAuthorized);
  const isPrincipalSigned = Boolean(principalSig?.isAuthorized);

  const isFullyAuthorized = isTeacherSigned && isPrincipalSigned;
  const isPartiallyAuthorized = (isTeacherSigned || isPrincipalSigned) && !isFullyAuthorized;
  const isPublished = Boolean(authorization?.isPublished || (authorization?.status === 'FULLY_AUTHORIZED'));

  return (
    <div
      id="report-authorization-footer-bar"
      className="w-full bg-slate-900 border-t border-slate-800 text-white p-4 sm:p-5 shrink-0 shadow-lg no-print print:hidden"
    >
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isFullyAuthorized
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isPartiallyAuthorized
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isFullyAuthorized ? (
                <ShieldCheck className="w-4 h-4" />
              ) : isPartiallyAuthorized ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  Otorisasi Resmi Laporan Perkembangan Anak
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isFullyAuthorized
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      : isPartiallyAuthorized
                      ? 'bg-sky-950/80 text-sky-300 border-sky-700'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  }`}
                >
                  {isFullyAuthorized
                    ? '✓ Otorisasi Lengkap (Siap Dibagikan)'
                    : isPartiallyAuthorized
                    ? 'Sebagian Diotorisasi'
                    : 'Menunggu Otorisasi'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isFullyAuthorized
                  ? 'Laporan telah disahkan secara resmi oleh Guru Wali Kelas dan Kepala Sekolah. Dokumen sah untuk dibagikan kepada orang tua.'
                  : isPartiallyAuthorized
                  ? 'Salah satu pihak telah menandatangani. Lengkapi pengesahan agar dokumen memiliki kekuatan verifikasi penuh.'
                  : 'Berikan tanda tangan digital resmi sebelum laporan dicetak atau dibagikan kepada orang tua.'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Status Publikasi Badge & Action */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-[10px] font-bold text-slate-200">
                {isPublished ? 'Rilis: Terpublikasi ke Ortu' : 'Rilis: Draf Internal'}
              </span>
            </div>

            {canAuthorize && onTogglePublish && (
              <button
                type="button"
                onClick={() => onTogglePublish(!isPublished)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isPublished
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500'
                }`}
                title={isPublished ? 'Tarik kembali dari akses orang tua' : 'Rilis dan publikasikan ke portal orang tua'}
              >
                {isPublished ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tarik Publikasi</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Publikasikan ke Orang Tua</span>
                  </>
                )}
              </button>
            )}

            <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Kurikulum Merdeka</span>
            </span>
          </div>
        </div>

        {/* 2 Authorization Signature Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Guru Wali Kelas Column */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isTeacherSigned
                ? 'bg-slate-800/80 border-sky-500/40'
                : 'bg-slate-800/40 border-slate-700/80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
                  <PenTool className="w-3 h-3" />
                  Guru Wali Kelas
                </span>
                <p className="text-xs font-bold text-slate-100">
                  {teacherSig?.signerName || teacherName || 'Guru Wali Kelas'}
                </p>
                {teacherSig?.nip && (
                  <p className="text-[10px] text-slate-400 font-mono">NIP: {teacherSig.nip}</p>
                )}
              </div>

              {isTeacherSigned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Terverifikasi
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 italic">Belum Tanda Tangan</span>
              )}
            </div>

            {/* Signature Preview or Prompt */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
              {isTeacherSigned ? (
                <div className="flex items-center gap-3">
                  {teacherSig?.signatureDataUrl ? (
                    <div className="h-10 px-2 bg-white rounded-md border border-slate-600 flex items-center">
                      <img
                        src={teacherSig.signatureDataUrl}
                        alt="Tanda Tangan Guru"
                        className="h-8 max-w-[110px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300 font-mono">
                      Segel Digital: {teacherSig?.verificationCode}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 leading-tight">
                    <p className="text-slate-200 font-semibold">{teacherSig?.authorizedAt}</p>
                    <p className="font-mono text-[9px] text-sky-400">
                      ID: {teacherSig?.verificationCode}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Klik tombol untuk menandatangani secara digital.
                </p>
              )}

              {canAuthorize && (
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {isTeacherSigned ? (
                    <button
                      type="button"
                      onClick={() => onRevokeSignature('TEACHER')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Batalkan Otorisasi"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Batal</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenSignModal('TEACHER')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Tanda Tangani (Guru)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Kepala Sekolah Column */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isPrincipalSigned
                ? 'bg-slate-800/80 border-emerald-500/40'
                : 'bg-slate-800/40 border-slate-700/80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Stamp className="w-3 h-3" />
                  Kepala Sekolah
                </span>
                <p className="text-xs font-bold text-slate-100">
                  {principalSig?.signerName || principalName || 'Kepala Sekolah'}
                </p>
                {principalSig?.nip && (
                  <p className="text-[10px] text-slate-400 font-mono">NIP: {principalSig.nip}</p>
                )}
              </div>

              {isPrincipalSigned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Disahkan Resmi
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 italic">Belum Pengesahan</span>
              )}
            </div>

            {/* Signature Preview or Prompt */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
              {isPrincipalSigned ? (
                <div className="flex items-center gap-3">
                  {principalSig?.signatureDataUrl ? (
                    <div className="h-10 px-2 bg-white rounded-md border border-slate-600 flex items-center">
                      <img
                        src={principalSig.signatureDataUrl}
                        alt="Tanda Tangan Kepala Sekolah"
                        className="h-8 max-w-[110px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300 font-mono">
                      Segel Digital: {principalSig?.verificationCode}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 leading-tight">
                    <p className="text-slate-200 font-semibold">{principalSig?.authorizedAt}</p>
                    <p className="font-mono text-[9px] text-emerald-400">
                      ID: {principalSig?.verificationCode}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Klik tombol untuk mengesahkan laporan secara resmi.
                </p>
              )}

              {canAuthorize && (
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {isPrincipalSigned ? (
                    <button
                      type="button"
                      onClick={() => onRevokeSignature('PRINCIPAL')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Batalkan Pengesahan"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Batal</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenSignModal('PRINCIPAL')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Stamp className="w-3.5 h-3.5" />
                      <span>Sahkan (Kepala Sekolah)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
