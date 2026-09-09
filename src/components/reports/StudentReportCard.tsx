import React from 'react';
import { CanonicalReportDocument } from '../../services/reportDocumentModel';
import { ReportHeader } from './sections/ReportHeader';
import { ReportFooter } from './sections/ReportFooter';
import { HomeStimulationSection } from './sections/HomeStimulationSection';
import { DevelopmentAspectsTable } from './sections/DevelopmentAspectsTable';
import { sanitizeReportText } from '../../utils/textSanitizer';
import { Camera, CheckCircle2, AlertCircle, Quote, Plus } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface StudentReportCardProps {
  canonical: CanonicalReportDocument;
  onAddDocumentation?: () => void;
  canEdit?: boolean;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  canonical,
  onAddDocumentation,
  canEdit = false,
}) => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [isChartReady, setIsChartReady] = React.useState(false);

  React.useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const checkSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setIsChartReady(true);
      }
    };

    checkSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setIsChartReady(true);
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      const timer = setTimeout(checkSize, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const radarChartData = canonical.aspects.map((asp) => ({
    subject: asp.aspectTitle,
    score: asp.score ?? 50,
    fullMark: 100,
  }));

  return (
    <div className="a4-document-container text-slate-900 w-full flex justify-center">
      {/* ========================================================================= */}
      {/* SINGLE CONTINUOUS A4 CONTAINER (FLOWS NATURALLY FROM TOP TO BOTTOM)       */}
      {/* ========================================================================= */}
      <div
        id="report-content"
        data-root="student-report-card-root"
        className="report-page a4-sheet shadow-2xl rounded-xs border border-slate-300 bg-white p-[16mm] w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] mx-auto flex flex-col space-y-3.5 font-sans"
      >
        {/* Official Kop Surat & Identitas Siswa */}
        <ReportHeader canonical={canonical} pageNumber={1} />

        {/* Section I: Gambaran Menyeluruh */}
        <div className="space-y-1 shrink-0">
          <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center gap-2 border-l-4 border-emerald-600">
            <h3 className="text-[8.5pt] font-black uppercase text-emerald-950 tracking-wider">
              I. PERKEMBANGAN ANANDA (GAMBARAN MENYELURUH)
            </h3>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-2.5 text-[8.2pt] text-emerald-950 leading-relaxed indicator-card break-inside-avoid">
            <p>{sanitizeReportText(canonical.overallSummary.description)}</p>
          </div>
        </div>

        {/* Section II: Radar Chart & Ringkasan 6 Aspek */}
        <div className="space-y-1 shrink-0">
          <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center justify-between border-l-4 border-indigo-600">
            <h3 className="text-[8.5pt] font-black uppercase text-indigo-950 tracking-wider">
              II. GRAFIK PERKEMBANGAN & RINGKASAN 6 ASPEK PAUD
            </h3>
          </div>

          <div className="border border-slate-200 rounded-md p-2 grid grid-cols-12 gap-2 bg-white items-center indicator-card break-inside-avoid">
            {/* Radar Chart */}
            <div ref={chartContainerRef} className="col-span-6 h-44 min-h-[176px] w-full min-w-0 flex items-center justify-center">
              {isChartReady ? (
                <ResponsiveContainer width="100%" height={176} minWidth={120} minHeight={160} debounce={50}>
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="2 2" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#334155', fontSize: 7, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 6 }}
                    />
                    <Radar
                      name="Skor Capaian"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fill="#6366f1"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400">
                  Memuat visualisasi...
                </div>
              )}
            </div>

            {/* 3 Quick Overview Cards */}
            <div className="col-span-6 space-y-1.5 text-[7pt]">
              <div className="p-1.5 rounded-md bg-emerald-50 border border-emerald-200 indicator-card break-inside-avoid">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-950 text-[7.5pt]">
                    ★ Paling Berkembang: {sanitizeReportText(canonical.quickSummary.topDeveloped.aspect)}
                  </span>
                  <span className="text-[6.2pt] font-extrabold px-1 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    {sanitizeReportText(canonical.quickSummary.topDeveloped.status)}
                  </span>
                </div>
                <p className="text-emerald-900 text-[6.8pt] mt-0.5 line-clamp-2">
                  {sanitizeReportText(canonical.quickSummary.topDeveloped.detail)}
                </p>
              </div>

              <div className="p-1.5 rounded-md bg-amber-50 border border-amber-200 indicator-card break-inside-avoid">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-950 text-[7.5pt]">
                    Sedang Berkembang: {sanitizeReportText(canonical.quickSummary.emerging.aspect)}
                  </span>
                  <span className="text-[6.2pt] font-extrabold px-1 py-0.5 rounded bg-amber-200 text-amber-900">
                    {sanitizeReportText(canonical.quickSummary.emerging.status)}
                  </span>
                </div>
                <p className="text-amber-900 text-[6.8pt] mt-0.5 line-clamp-2">
                  {sanitizeReportText(canonical.quickSummary.emerging.detail)}
                </p>
              </div>

              <div className="p-1.5 rounded-md bg-sky-50 border border-sky-200 indicator-card break-inside-avoid">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sky-950 text-[7.5pt]">
                    Perlu Stimulasi: {sanitizeReportText(canonical.quickSummary.needsStimulation.aspect)}
                  </span>
                  <span className="text-[6.2pt] font-extrabold px-1 py-0.5 rounded bg-sky-200 text-sky-900">
                    {sanitizeReportText(canonical.quickSummary.needsStimulation.status)}
                  </span>
                </div>
                <p className="text-sky-900 text-[6.8pt] mt-0.5 line-clamp-2">
                  {sanitizeReportText(canonical.quickSummary.needsStimulation.detail)}
                </p>
              </div>

              <div className="pt-0.5 text-[6.2pt] text-slate-500 text-center font-medium">
                Kamus: BB (Belum) • MB (Mulai) • BSH (Sesuai) • BSB (Sangat Baik)
              </div>
            </div>
          </div>
        </div>

        {/* Section III: Yang Sudah Berkembang (Kekuatan Utama Ananda) */}
        <div className="space-y-1.5 shrink-0">
          <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center gap-2 border-l-4 border-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <h3 className="text-[8.5pt] font-black uppercase text-emerald-950 tracking-wider">
              III. YANG SUDAH BERKEMBANG (KEKUATAN UTAMA ANANDA)
            </h3>
          </div>
          <div className="space-y-1 text-[7.5pt]">
            {canonical.developedPoints.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-50/50 border border-emerald-100 indicator-card break-inside-avoid"
              >
                <span className="text-emerald-700 font-black">✓</span>
                <div>
                  <strong className="text-slate-900 font-bold">{sanitizeReportText(item.title)}: </strong>
                  <span className="text-slate-700">{sanitizeReportText(item.behavior)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section IV: Masih Perlu Dikembangkan (Fokus Pendampingan) */}
        {/* Mengalir alami tanpa page-break paksa */}
        <div className="space-y-1.5 shrink-0">
          <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center gap-2 border-l-4 border-amber-500">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <h3 className="text-[8.5pt] font-black uppercase text-amber-950 tracking-wider">
              IV. MASIH PERLU DIKEMBANGKAN (FOKUS PENDAMPINGAN)
            </h3>
          </div>
          <div className="space-y-1 text-[7.5pt]">
            {canonical.growthPoints.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 p-1.5 rounded bg-amber-50/50 border border-amber-100 indicator-card break-inside-avoid"
              >
                <span className="text-amber-600 font-black">•</span>
                <div>
                  <strong className="text-slate-900 font-bold">{sanitizeReportText(item.title)}: </strong>
                  <span className="text-slate-700">{sanitizeReportText(item.recommendation)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Bukti Autentik Foto Kegiatan */}
        <div className="space-y-1.5 shrink-0 photo-container break-inside-avoid">
          <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center justify-between border-l-4 border-purple-600">
            <h3 className="text-[8.5pt] font-black uppercase text-purple-950 tracking-wider">
              DOKUMENTASI PENGAMATAN & BUKTI KEGIATAN
            </h3>
            {canEdit && onAddDocumentation && (
              <button
                type="button"
                onClick={onAddDocumentation}
                className="no-print inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 text-[7pt] font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Foto</span>
              </button>
            )}
          </div>

          {canonical.evidences && canonical.evidences.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {canonical.evidences.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  className="bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1 flex flex-col evidence-card break-inside-avoid"
                >
                  {ev.url ? (
                    <img
                      src={ev.url}
                      alt={sanitizeReportText(ev.activityTitle)}
                      className="w-full h-[30mm] object-cover rounded border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-[30mm] rounded bg-slate-200 flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-[7.5pt] truncate">
                        {sanitizeReportText(ev.activityTitle)}
                      </span>
                      <span className="text-[6.5pt] text-slate-500 shrink-0">
                        {sanitizeReportText(ev.date)}
                      </span>
                    </div>
                    <p className="text-[7pt] text-slate-700 leading-tight">
                      {sanitizeReportText(ev.caption)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-0.5 indicator-card break-inside-avoid">
              <p className="font-bold text-slate-800 text-[7.8pt]">
                Dokumentasi Pengamatan Guru
              </p>
              <p className="text-[7.2pt] text-slate-600">
                Ananda aktif, responsif, dan ceria dalam mengikuti seluruh rangkaian kegiatan pembelajaran di kelas.
              </p>
            </div>
          )}
        </div>

        {/* Section V: Perkembangan Spesifik 6 Aspek */}
        <DevelopmentAspectsTable canonical={canonical} />

        {/* Section VI: Stimulasi Sederhana di Rumah */}
        {/* Mengalir alami tanpa page-break paksa */}
        <HomeStimulationSection canonical={canonical} />

        {/* Pesan Wali Kelas */}
        {canonical.teacherMessage && (
          <div className="bg-amber-50/70 border border-amber-200 px-3.5 py-2.5 rounded-md space-y-1 shrink-0 indicator-card break-inside-avoid">
            <h3 className="text-[8.5pt] font-bold text-amber-950 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-amber-600" />
              <span>Pesan Wali Kelas untuk Ananda & Keluarga:</span>
            </h3>
            <p className="text-[8pt] text-amber-900 leading-relaxed italic">
              "{sanitizeReportText(canonical.teacherMessage)}"
            </p>
          </div>
        )}

        {/* Catatan Dokumen Resmi */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[7.2pt] text-slate-600 leading-relaxed shrink-0 indicator-card break-inside-avoid">
          <p className="font-bold text-slate-800 mb-0.5">Informasi Dokumen:</p>
          <p>
            Laporan ini disusun berdasarkan asesmen autentik dan portofolio harian guru sesuai pedoman Kurikulum Merdeka PAUD.
            Bertujuan memberikan gambaran utuh dan positif untuk mendukung tumbuh kembang optimal anak bersama keluarga.
          </p>
        </div>

        {/* Lembar Pengesahan 3 Pihak */}
        <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-center text-[7.5pt] shrink-0 signature-block break-inside-avoid">
          <div className="space-y-14">
            <p className="text-slate-600 font-semibold">
              Mengetahui,
              <br />
              {sanitizeReportText(canonical.signatures.parent.label)}
            </p>
            <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 inline-block min-w-[110px]">
              ( {sanitizeReportText(canonical.signatures.parent.name)} )
            </p>
          </div>

          <div className="space-y-14">
            <p className="text-slate-600 font-semibold">
              {sanitizeReportText(canonical.signatures.teacher.locationAndDate)}
              <br />
              {sanitizeReportText(canonical.signatures.teacher.label)}
            </p>
            <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 inline-block min-w-[110px]">
              ( {sanitizeReportText(canonical.signatures.teacher.name)} )
            </p>
          </div>

          <div className="space-y-14">
            <p className="text-slate-600 font-semibold">
              Mengetahui,
              <br />
              {sanitizeReportText(canonical.signatures.principal.label)}
            </p>
            <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 inline-block min-w-[110px]">
              ( {sanitizeReportText(canonical.signatures.principal.name)} )
            </p>
          </div>
        </div>

        {/* Single Official Running Footer */}
        <ReportFooter canonical={canonical} pageNumber={1} totalPages={1} />
      </div>
    </div>
  );
};
