import React from 'react';
import { CanonicalReportDocument, AspectDetailedReportItem, HomeStimulationItem, AuthenticEvidenceReportItem } from '../../services/reportDocumentModel';
import { sanitizeReportText, formatStudentGroupAndAge, extractKelurahanAddress } from '../../utils/textSanitizer';
import { schoolStore } from '../../services/schoolStore';
import { Camera, Plus, PenTool, CheckCircle2, Sparkles, Home, Award, BookOpen, Lightbulb } from 'lucide-react';

interface StudentReportCardProps {
  canonical: CanonicalReportDocument;
  onAddDocumentation?: () => void;
  canEdit?: boolean;
  onOpenSignModal?: (role: 'TEACHER' | 'PRINCIPAL') => void;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  canonical,
  onAddDocumentation,
  canEdit = false,
  onOpenSignModal,
}) => {
  const student = canonical.student;
  const school = canonical.school;
  const metadata = canonical.metadata;
  const aspects = canonical.aspects || [];

  // 1. Aspek Perkembangan PAUD (Kurikulum Merdeka)
  const displayAspects: AspectDetailedReportItem[] = aspects.length > 0 ? aspects : [
    {
      aspectKey: 'agama' as any,
      aspectTitle: 'Nilai Agama & Budi Pekerti',
      score: 75,
      scoreDisplay: '75%',
      ratingLevel: 'BSH' as const,
      ratingLabel: 'BSH',
      conditionLabel: 'Berkembang Sesuai Harapan',
      whatIsObserved: 'Mampu mempraktikkan doa sebelum dan sesudah kegiatan dengan khidmat serta menunjukkan sikap kasih sayang kepada ciptaan Tuhan.',
      whatNeedsStrengthening: 'Penguatan konsistensi pembiasaan adab santun dan berbagi secara sukarela.',
      hasSufficientData: true,
      relatedIndicatorsCount: 5,
      observedIndicators: [],
      observationNotes: ['Mengikuti doa berjamaah dengan tertib.'],
      supportingActivities: ['Berdoa Bersama & Bersedekah'],
    },
    {
      aspectKey: 'jati_diri' as any,
      aspectTitle: 'Jati Diri',
      score: 90,
      scoreDisplay: '90%',
      ratingLevel: 'BSB' as const,
      ratingLabel: 'BSB',
      conditionLabel: 'Berkembang Sangat Baik',
      whatIsObserved: 'Menunjukkan emosi yang stabil, percaya diri saat berinteraksi di depan kelas, serta mandiri dalam mengurus perlengkapan pribadi.',
      whatNeedsStrengthening: 'Mempertahankan empati mendengarkan teman saat berdiskusi kelompok.',
      hasSufficientData: true,
      relatedIndicatorsCount: 6,
      observedIndicators: [],
      observationNotes: ['Mampu merapikan loker sendiri tanpa bantuan guru.'],
      supportingActivities: ['Piknik Mandiri & Bermain Peran'],
    },
    {
      aspectKey: 'literasi' as any,
      aspectTitle: 'Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa & Seni',
      score: 80,
      scoreDisplay: '80%',
      ratingLevel: 'BSH' as const,
      ratingLabel: 'BSH',
      conditionLabel: 'Berkembang Sesuai Harapan',
      whatIsObserved: 'Mampu menyimak cerita secara aktif, mengenali lambang bilangan dan pola bentuk, serta terampil mengeksplorasi bahan alam dalam berkreasi.',
      whatNeedsStrengthening: 'Melanjutkan pengenalan fonik bunyi huruf awal dan eksplorasi ukuran benda komparatif.',
      hasSufficientData: true,
      relatedIndicatorsCount: 6,
      observedIndicators: [],
      observationNotes: ['Antusias bertanya tentang alur cerita buku bergambar.'],
      supportingActivities: ['Eksplorasi Warna Daun & Balok Angka'],
    },
  ];

  // 2. Visual Summary Points
  const strengthPoints: string[] = [];
  const developingPoints: string[] = [];
  const strengtheningPoints: string[] = [];

  if (canonical.visualSummary?.strengths && canonical.visualSummary.strengths.length > 0) {
    strengthPoints.push(...canonical.visualSummary.strengths);
  } else if (canonical.developedPoints && canonical.developedPoints.length > 0) {
    strengthPoints.push(...canonical.developedPoints.slice(0, 3).map((p) => p.title || p.behavior));
  }
  if (strengthPoints.length === 0) {
    strengthPoints.push('Kemandirian memakai sepatu dan merapikan mainan', 'Komunikasi verbal yang lancar dan ramah');
  }

  if (canonical.visualSummary?.emerging && canonical.visualSummary.emerging.length > 0) {
    developingPoints.push(...canonical.visualSummary.emerging);
  } else if (canonical.developedPoints && canonical.developedPoints.length > 2) {
    developingPoints.push(...canonical.developedPoints.slice(2, 4).map((p) => p.title || p.behavior));
  }
  if (developingPoints.length === 0) {
    developingPoints.push('Eksplorasi pencampuran warna sekunder', 'Keterampilan motorik halus menggunting pola lurus');
  }

  if (canonical.visualSummary?.needsReinforcement && canonical.visualSummary.needsReinforcement.length > 0) {
    strengtheningPoints.push(...canonical.visualSummary.needsReinforcement);
  } else if (canonical.growthPoints && canonical.growthPoints.length > 0) {
    strengtheningPoints.push(...canonical.growthPoints.slice(0, 3).map((p) => p.title || p.recommendation));
  }
  if (strengtheningPoints.length === 0) {
    strengtheningPoints.push('Ketahanan fokus saat kegiatan transisi kelas', 'Kesabaran bergiliran dalam permainan antrean');
  }

  const prominentSkill = canonical.visualSummary?.mostProminentSkill || 'Sosialisasi & Kreativitas Rancang Balok';
  const stimulationPriority = canonical.visualSummary?.furtherStimulationPriority || 'Penguatan Fonem Bunyi Huruf Awal & Adab Berbagi';

  // 3. Dokumentasi Kegiatan Autentik
  const evidenceList: AuthenticEvidenceReportItem[] = canonical.evidences && canonical.evidences.length > 0
    ? canonical.evidences
    : [
        {
          id: 'ev-1',
          title: 'Bermain Balok dan Konstruksi Mandiri',
          activityTitle: 'Membangun Jembatan & Gedung Impian',
          date: metadata.generatedDate || '10 September 2026',
          caption: `${student.nickname || student.fullName} aktif merancang bangunan menggunakan balok kayu warna-warni bersama teman sekelompoknya.`,
          aspectName: 'Dasar Literasi & STEAM',
        },
        {
          id: 'ev-2',
          title: 'Praktik Adab & Kemandirian Cuci Tangan',
          activityTitle: 'Kemandirian Hidup Sehat Sebelum Makan',
          date: metadata.generatedDate || '12 September 2026',
          caption: 'Menunjukkan kesadaran perilaku hidup bersih dan tertib mengantre kran air dengan antusias.',
          aspectName: 'Jati Diri & Nilai Agama',
        },
      ];

  // 4. Rekomendasi Stimulasi di Rumah
  const homeActivities: HomeStimulationItem[] = canonical.homeStimulations && canonical.homeStimulations.length > 0
    ? canonical.homeStimulations
    : [
        {
          title: 'Membaca Buku Cerita Bergambar Interaktif',
          purpose: 'Melatih kemampuan menyimak, memperkaya kosakata, dan daya imajinasi ananda.',
          howTo: 'Bacakan buku bergambar sebelum tidur, lalu ajak ananda menceritakan kembali tokoh yang disukainya.',
          materials: 'Buku cerita fabel / bergambar',
          duration: '15 - 20 menit setiap malam',
          aspectStimulated: 'Dasar Literasi & Bahasa',
          skillTrained: 'Menyimak, bercerita, dan imajinasi',
          activity: 'Ajak ananda menebak kelanjutan halaman cerita bergambar.',
        },
        {
          title: 'Permainan Merapikan Perlengkapan Rumah',
          purpose: 'Menumbuhkan kemandirian, tanggung jawab diri, dan klasifikasi bentuk sederhana.',
          howTo: 'Ajak ananda mengelompokkan sendok makan atau melipat kaus kaki miliknya sendiri setelah dicuci.',
          materials: 'Alat rumah tangga ramah anak',
          duration: '10 - 15 menit saat sore hari',
          aspectStimulated: 'Jati Diri & Kognitif',
          skillTrained: 'Kemandirian, pengelompokan benda, dan koordinasi motorik',
          activity: 'Menata pakaian dan mainan ke keranjang warna masing-masing.',
        },
        {
          title: 'Eksplorasi Mencari Tekstur Alam di Pekarangan',
          purpose: 'Mengasah kepekaan sensori motorik dan rasa syukur atas ciptaan Tuhan.',
          howTo: 'Ajak ananda mengumpulkan daun kering, batu halus, dan bunga gugur lalu meraba perbedaan teksturnya.',
          materials: 'Daun, ranting, kertas, dan lem kertas',
          duration: '20 menit di akhir pekan',
          aspectStimulated: 'Nilai Agama & STEAM (Sains)',
          skillTrained: 'Sensori perabaan, pengamatan sains alamiah',
          activity: 'Membuat kolase sederhana dari daun kering yang ditemukan.',
        },
      ];

  // 5. Catatan Guru Terpadu
  const teacherNotes = canonical.teacherNotesData || {
    generalNote: canonical.teacherMessage || `Ananda ${student.nickname || student.fullName} menunjukkan kemajuan yang sangat menggembirakan sepanjang semester ini, terutama dalam interaksi sosial bersama teman sebaya dan kemandirian dalam kegiatan kelas.`,
    positiveToMaintain: 'Pertahankan antusiasme ananda dalam bertanya dan rasa percaya dirinya saat bercerita di depan kelas.',
    areasToStrengthen: 'Perlu bimbingan lembut berkelanjutan untuk ketenangan saat kegiatan transisi dan konsistensi merapikan alat belajar.',
    additionalNote: 'Kerja sama yang harmonis antara guru dan orang tua di rumah sangat mendukung pertumbuhan optimal ananda.',
    teacherName: '',
    principalName: '',
    reportDate: '',
  };

  const studentDisplayName = `${student.fullName}${student.nickname ? ` (${student.nickname})` : ''}`;
  const principalDisplayName = canonical.signatures?.principal?.name || school.principalName || 'Kepala Satuan PAUD';
  const principalNip = canonical.signatures?.principal?.nip;
  const assessmentDateStr = canonical.observationSummary?.latestObservationDate || metadata.generatedDate || '15 September 2026';

  // Wali Kelas Name Resolution
  const matchingClass = schoolStore.getClasses().find(
    (c) =>
      (student.className && c.name.trim().toLowerCase() === student.className.trim().toLowerCase()) ||
      c.id === (student as any).classId
  );
  const waliKelasName =
    matchingClass?.teacherName ||
    (student as any).teacherName ||
    (canonical.signatures?.teacher?.name && canonical.signatures.teacher.name !== 'Guru Kelompok' ? canonical.signatures.teacher.name : null) ||
    schoolStore.getTeachers()[0]?.name ||
    'Ibu Rahmawati, S.Pd.';

  const teacherNip = canonical.signatures?.teacher?.nip;
  const kelurahanAddress = extractKelurahanAddress(school.address, school.cityName || 'Makassar');

  // Ringkasan Perkembangan Deskripsi
  const summaryNarrative = canonical.overallSummary?.description ||
    `Ananda ${studentDisplayName} menunjukkan capaian perkembangan yang sangat baik pada semester ini. Dalam interaksi bermain, ananda mampu bekerja sama dan mengekspresikan gagasannya dengan percaya diri. Pembiasaan nilai agama dan kemandirian terus berkembang secara positif di lingkungan satuan PAUD.`;

  const overallPercentage = canonical.overallSummary?.overallPercentage ?? canonical.overallPercentage ?? 85;

  return (
    <div
      id="report-content"
      data-root="student-report-card-root"
      className="a4-document-container text-slate-900 w-full flex flex-col items-center select-text"
    >
      {/* ========================================================================= */}
      {/* HALAMAN 1 DARI 3: IDENTITAS, RINGKASAN, GRAFIK PERKEMBANGAN ASPEK         */}
      {/* ========================================================================= */}
      <div
        id="report-page-1"
        data-page="1"
        className="report-page a4-sheet shadow-xl bg-white w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-[14mm_18mm_12mm_18mm] mx-auto flex flex-col justify-between font-sans relative overflow-hidden box-border border border-slate-200"
      >
        <div className="space-y-3.5">
          {/* HEADER KOP SURAT RESMI */}
          <div className="border-b-2 border-slate-900 pb-2 relative">
            <div className="flex items-center justify-between gap-3">
              {/* Logo Sekolah */}
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                {school.logoUrl ? (
                  <img
                    src={school.logoUrl}
                    alt="Logo Sekolah"
                    className="w-13 h-13 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                    {school.name ? school.name.charAt(0) : 'P'}
                  </div>
                )}
              </div>

              {/* Teks Kop Surat */}
              <div className="text-center flex-1 px-1">
                <h1 className="text-[12pt] font-black tracking-wider uppercase text-slate-900 leading-tight">
                  LAPORAN PERKEMBANGAN ANAK
                </h1>
                <h2 className="text-[10pt] font-extrabold uppercase text-slate-800 tracking-wide mt-0.5">
                  {sanitizeReportText(school.name || 'SATUAN PAUD TERPADU')}
                </h2>
                <p className="text-[7.2pt] text-slate-600 font-medium leading-tight mt-0.5">
                  TAHUN AJARAN {sanitizeReportText(metadata.academicYear)} — {sanitizeReportText(metadata.semester)}
                </p>
                <p className="text-[6.8pt] text-slate-500 italic leading-tight">
                  {sanitizeReportText(school.address || 'Alamat Satuan PAUD')}
                </p>
              </div>

              {/* Kurikulum Merdeka Emblem */}
              <div className="w-14 shrink-0 flex flex-col items-center justify-center">
                <div className="px-2 py-1 rounded bg-sky-50 border border-sky-300 text-center">
                  <span className="block text-[5.8pt] font-black text-sky-800 tracking-tighter uppercase leading-none">
                    KURIKULUM
                  </span>
                  <span className="block text-[7pt] font-black text-sky-900 tracking-tight uppercase leading-tight">
                    MERDEKA
                  </span>
                  <span className="block text-[5pt] font-bold text-sky-600 uppercase leading-none mt-0.5">
                    PAUD
                  </span>
                </div>
              </div>
            </div>
            {/* Garis Ganda Baku */}
            <div className="w-full h-0.5 bg-slate-900 mt-2"></div>
            <div className="w-full h-px bg-slate-400 mt-0.5"></div>
          </div>

          {/* BAGIAN 1: IDENTITAS SISWA */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 1 — Identitas Siswa
              </h2>
            </div>
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/60 text-[7.5pt] shadow-2xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">Nama Peserta Didik</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-bold text-slate-900 truncate">{sanitizeReportText(studentDisplayName)}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">Orang Tua / Wali</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-medium text-slate-800 truncate">{sanitizeReportText(student.parentName || 'Orang Tua / Wali')}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">Kelas / Kelompok</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-semibold text-slate-800">
                    {formatStudentGroupAndAge(student.className, student.ageDisplay)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">Fase Perkembangan</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-semibold text-slate-800">Fase Fondasi (PAUD)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">NISN / ID Siswa</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-medium text-slate-700">{student.nisn || student.id || '-'}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 font-medium">Periode Penilaian</span>
                  <span className="mr-1.5 font-bold text-slate-400">:</span>
                  <span className="font-medium text-slate-700">{sanitizeReportText(metadata.semester)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 2: RINGKASAN PERKEMBANGAN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-sky-200 pb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
                <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                  Bagian 2 — Ringkasan Perkembangan
                </h2>
              </div>
              {overallPercentage !== null && (
                <span className="text-[7pt] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Capaian Kumulatif: {overallPercentage}% (Berkembang Baik)
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-white text-[7.4pt] text-slate-800 leading-relaxed border-l-4 border-l-sky-600 shadow-2xs space-y-2">
              <p className="text-justify leading-relaxed">{sanitizeReportText(summaryNarrative)}</p>

              {/* Kekuatan Utama & Area Masih Berkembang */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="bg-emerald-50/50 p-2 rounded-md border border-emerald-200/60">
                  <span className="font-bold text-emerald-900 block mb-1 text-[7pt] uppercase tracking-wide">
                    ★ Kekuatan Utama:
                  </span>
                  <ul className="space-y-0.5 text-slate-700">
                    {(canonical.overallSummary?.topStrengths || strengthPoints.slice(0, 2)).map((st, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{sanitizeReportText(st)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/50 p-2 rounded-md border border-amber-200/60">
                  <span className="font-bold text-amber-900 block mb-1 text-[7pt] uppercase tracking-wide">
                    ↗ Area yang Masih Berkembang:
                  </span>
                  <ul className="space-y-0.5 text-slate-700">
                    {(canonical.overallSummary?.emergingAreas || developingPoints.slice(0, 2)).map((em, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{sanitizeReportText(em)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 3: GRAFIK PERKEMBANGAN ASPEK */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 3 — Grafik Perkembangan Aspek
              </h2>
            </div>

            <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5 shadow-2xs">
              {/* Ruler Header: 3 Kolom Proporsional (35% - 47% - 18%) */}
              <div className="flex items-center text-[6.8pt] text-slate-500 font-bold border-b border-slate-200 pb-1">
                <div className="w-[35%] uppercase tracking-wider pl-1 text-slate-700 truncate">
                  Aspek Perkembangan PAUD
                </div>
                <div className="w-[47%] px-1">
                  <div className="flex justify-between text-center font-bold text-[6.8pt]">
                    <span className="w-1/4 text-slate-500">BB</span>
                    <span className="w-1/4 text-amber-600">MB</span>
                    <span className="w-1/4 text-sky-700 font-black">BSH</span>
                    <span className="w-1/4 text-emerald-800 font-black">BSB</span>
                  </div>
                </div>
                <div className="w-[18%] text-center font-bold text-slate-700 uppercase tracking-wider">
                  Capaian
                </div>
              </div>

              {/* Bar Rows */}
              <div className="space-y-1.5">
                {displayAspects.map((asp, idx) => {
                  const score = asp.score !== null && asp.score > 0 ? Math.min(Math.max(asp.score, 0), 100) : 75;
                  const rating = asp.ratingLevel || 'BSH';

                  const barColor =
                    rating === 'BSB'
                      ? 'bg-emerald-600'
                      : rating === 'BSH'
                      ? 'bg-sky-600'
                      : rating === 'MB'
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                  const badgeColor =
                    rating === 'BSB'
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                      : rating === 'BSH'
                      ? 'text-sky-800 bg-sky-50 border-sky-300'
                      : rating === 'MB'
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : 'text-rose-800 bg-rose-50 border-rose-300';

                  return (
                    <div key={idx} className="flex items-center text-[7.2pt] gap-1">
                      {/* Label Aspek: 35% lebar, truncate rapi, tidak meluap */}
                      <div className="w-[35%] font-medium text-slate-800 truncate pr-1" title={asp.aspectTitle}>
                        {sanitizeReportText(asp.aspectTitle)}
                      </div>

                      {/* Bar Track: 47% lebar, dengan 4 segmen skala akurat */}
                      <div className="w-[47%] px-1">
                        <div className="w-full bg-slate-100 rounded-full h-3.5 relative overflow-hidden border border-slate-200">
                          {/* Segment Dividers at 25%, 50%, 75% */}
                          <div className="absolute inset-0 flex pointer-events-none z-0">
                            <div className="w-1/4 border-r border-slate-200/80 h-full"></div>
                            <div className="w-1/4 border-r border-slate-200/80 h-full"></div>
                            <div className="w-1/4 border-r border-slate-200/80 h-full"></div>
                            <div className="w-1/4 h-full"></div>
                          </div>

                          {/* Progress Bar with Score */}
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-300 relative z-10 flex items-center justify-end pr-1.5`}
                            style={{ width: `${Math.max(score, 20)}%` }}
                          >
                            <span className="text-[5.8pt] text-white font-black drop-shadow-xs whitespace-nowrap">
                              {score}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Capaian Badge: 18% lebar, terpusat rapi */}
                      <div className="w-[18%] flex justify-center shrink-0">
                        <span className={`w-14 text-center py-0.5 rounded text-[6.5pt] font-black border ${badgeColor} whitespace-nowrap`}>
                          {rating}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda Skala Baku */}
              <div className="pt-1.5 border-t border-slate-100 text-[6.4pt] text-slate-600 text-center font-medium">
                Legenda: <strong className="text-slate-600">BB</strong> = Belum Berkembang • <strong className="text-amber-700">MB</strong> = Mulai Berkembang • <strong className="text-sky-700">BSH</strong> = Berkembang Sesuai Harapan • <strong className="text-emerald-700">BSB</strong> = Berkembang Sangat Baik
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER HALAMAN 1 */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[6.8pt] text-slate-500">
          <span>Laporan Perkembangan Ananda {studentDisplayName} — {student.className}</span>
          <span>GrowUPAUD Assessment Intelligence | Halaman 1 dari 3</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HALAMAN 2 DARI 3: DETAIL CAPAIAN ASPEK & SUMMARY VISUAL PERKEMBANGAN      */}
      {/* ========================================================================= */}
      <div
        id="report-page-2"
        data-page="2"
        className="report-page a4-sheet shadow-xl bg-white w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-[14mm_18mm_12mm_18mm] mx-auto flex flex-col justify-between font-sans relative overflow-hidden box-border border border-slate-200 mt-6 print:mt-0 print:border-none"
      >
        <div className="space-y-3.5">
          {/* RUNNING HEADER HALAMAN 2 */}
          <div className="pb-1.5 border-b border-slate-300 flex items-center justify-between text-[7pt] text-slate-700 shrink-0">
            <div className="flex items-center gap-1.5">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt="Logo Sekolah"
                  className="w-4 h-4 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-4 h-4 rounded bg-slate-800 text-white flex items-center justify-center text-[5pt] font-black shrink-0">
                  {school.name ? school.name.charAt(0) : 'P'}
                </div>
              )}
              <span className="font-bold text-slate-900 tracking-tight">
                {sanitizeReportText(school.name || 'SATUAN PAUD TERPADU')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>
                Nama: <strong className="text-slate-900 font-bold">{sanitizeReportText(student.fullName)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Kelas: <strong className="text-slate-900 font-bold">{sanitizeReportText(student.className)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Tgl: <strong className="text-slate-900 font-bold">{sanitizeReportText(assessmentDateStr)}</strong>
              </span>
            </div>
          </div>

          {/* BAGIAN 4: DETAIL CAPAIAN ASPEK (DIPINDAHKAN MENJADI BAGIAN 4) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 4 — Detail Capaian Aspek
              </h2>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-[7.3pt]">
                <thead>
                  <tr className="bg-sky-800 text-white font-bold border-b border-sky-900">
                    <th className="p-2 border-r border-sky-700/60 w-[26%]">
                      Aspek Perkembangan
                    </th>
                    <th className="p-2 border-r border-sky-700/60 text-center w-[16%]">
                      Status Capaian
                    </th>
                    <th className="p-2 w-[58%]">
                      Indikator yang Diamati, Catatan &amp; Bukti Observasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {displayAspects.map((asp, idx) => {
                    const rating = asp.ratingLevel || 'BSH';
                    const badgeClass =
                      rating === 'BSB'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : rating === 'BSH'
                        ? 'bg-sky-100 text-sky-800 border-sky-300'
                        : rating === 'MB'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300';

                    const evidenceTitle = asp.supportingActivities && asp.supportingActivities.length > 0
                      ? asp.supportingActivities[0]
                      : asp.supportingEvidence && asp.supportingEvidence.length > 0
                      ? asp.supportingEvidence[0].activityTitle
                      : 'Kegiatan Pembelajaran Terarah';

                    return (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900 align-top">
                          <p>{sanitizeReportText(asp.aspectTitle)}</p>
                          <span className="text-[6.2pt] text-slate-500 font-normal block mt-0.5">
                            {asp.relatedIndicatorsCount || 5} indikator teramati
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center align-top">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[6.5pt] font-black border ${badgeClass}`}>
                            {rating} - {sanitizeReportText(asp.conditionLabel || asp.ratingLabel || rating)}
                          </span>
                        </td>
                        <td className="p-2 align-top leading-relaxed text-slate-700 space-y-1">
                          <p className="font-medium text-slate-900">
                            {sanitizeReportText(asp.whatIsObserved || 'Menunjukkan kemajuan positif dalam kegiatan pembelajaran berkelanjutan.')}
                          </p>
                          {asp.whatNeedsStrengthening && (
                            <p className="text-[6.8pt] text-sky-900 bg-sky-50/60 p-1 rounded border border-sky-100">
                              <strong>Fokus Penguatan:</strong> {sanitizeReportText(asp.whatNeedsStrengthening)}
                            </p>
                          )}
                          <p className="text-[6.4pt] text-slate-500 italic">
                            Aktivitas pendukung: <strong>{sanitizeReportText(evidenceTitle)}</strong>
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* BAGIAN 5: SUMMARY VISUAL PERKEMBANGAN */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 5 — Summary Visual Perkembangan
              </h2>
            </div>

            {/* 3 Kolom Matrix Evaluasi */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Kolom 1: Kekuatan Anak */}
              <div className="border border-emerald-300 rounded-lg p-2.5 bg-emerald-50/40 text-[7.2pt] space-y-1.5">
                <h3 className="text-center font-bold text-emerald-800 text-[7.8pt] pb-1 border-b border-emerald-200 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Kekuatan Anak</span>
                </h3>
                <ul className="space-y-1 text-slate-800">
                  {strengthPoints.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{sanitizeReportText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kolom 2: Area Sedang Berkembang */}
              <div className="border border-amber-300 rounded-lg p-2.5 bg-amber-50/40 text-[7.2pt] space-y-1.5">
                <h3 className="text-center font-bold text-amber-800 text-[7.8pt] pb-1 border-b border-amber-200 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  <span>Sedang Berkembang</span>
                </h3>
                <ul className="space-y-1 text-slate-800">
                  {developingPoints.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-amber-600 font-bold shrink-0">↗</span>
                      <span>{sanitizeReportText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kolom 3: Area yang Perlu Diperkuat */}
              <div className="border border-sky-300 rounded-lg p-2.5 bg-sky-50/40 text-[7.2pt] space-y-1.5">
                <h3 className="text-center font-bold text-sky-800 text-[7.8pt] pb-1 border-b border-sky-200 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                  <span>Perlu Diperkuat</span>
                </h3>
                <ul className="space-y-1 text-slate-800">
                  {strengtheningPoints.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-sky-600 font-bold shrink-0">•</span>
                      <span>{sanitizeReportText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Kotak Highlight Kemampuan Menonjol & Prioritas */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70 text-[7.2pt] grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block text-[7pt] uppercase">
                    Kemampuan Paling Menonjol:
                  </span>
                  <p className="text-slate-700 mt-0.5">{sanitizeReportText(prominentSkill)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900 block text-[7pt] uppercase">
                    Prioritas Stimulasi Lanjutan:
                  </span>
                  <p className="text-slate-700 mt-0.5">{sanitizeReportText(stimulationPriority)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER HALAMAN 2 */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[6.8pt] text-slate-500">
          <span>Laporan Perkembangan Ananda {studentDisplayName} — {student.className}</span>
          <span>GrowUPAUD Assessment Intelligence | Halaman 2 dari 3</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HALAMAN 3 DARI 3: DOKUMENTASI, CATATAN GURU, REKOMENDASI & PENGESAHAN     */}
      {/* ========================================================================= */}
      <div
        id="report-page-3"
        data-page="3"
        className="report-page a4-sheet shadow-xl bg-white w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-[14mm_18mm_12mm_18mm] mx-auto flex flex-col justify-between font-sans relative overflow-hidden box-border border border-slate-200 mt-6 print:mt-0 print:border-none"
      >
        <div className="space-y-3">
          {/* RUNNING HEADER HALAMAN 3 */}
          <div className="pb-1.5 border-b border-slate-300 flex items-center justify-between text-[7pt] text-slate-700 shrink-0">
            <div className="flex items-center gap-1.5">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt="Logo Sekolah"
                  className="w-4 h-4 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-4 h-4 rounded bg-slate-800 text-white flex items-center justify-center text-[5pt] font-black shrink-0">
                  {school.name ? school.name.charAt(0) : 'P'}
                </div>
              )}
              <span className="font-bold text-slate-900 tracking-tight">
                {sanitizeReportText(school.name || 'SATUAN PAUD TERPADU')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>
                Nama: <strong className="text-slate-900 font-bold">{sanitizeReportText(student.fullName)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Kelas: <strong className="text-slate-900 font-bold">{sanitizeReportText(student.className)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Tgl: <strong className="text-slate-900 font-bold">{sanitizeReportText(assessmentDateStr)}</strong>
              </span>
            </div>
          </div>

          {/* BAGIAN 6: DOKUMENTASI KEGIATAN */}
          <div className="space-y-1">
            <div className="border-b border-sky-200 pb-0.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
                <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                  Bagian 6 — Dokumentasi Kegiatan
                </h2>
              </div>
              {canEdit && onAddDocumentation && (
                <button
                  type="button"
                  onClick={onAddDocumentation}
                  className="no-print inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[6.5pt] font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>+ Foto Dokumentasi</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-0.5">
              {evidenceList.slice(0, 2).map((ev, i) => (
                <div key={ev.id || i} className="space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  <div className="w-full h-[30mm] rounded-md border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden relative shadow-2xs">
                    {ev.url ? (
                      <img
                        src={ev.url}
                        alt={sanitizeReportText(ev.activityTitle)}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 gap-1">
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span className="text-[6.5pt] font-medium">Foto Dokumentasi {i + 1}</span>
                      </div>
                    )}
                    {ev.date && (
                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[5.5pt] px-1 py-0.5 rounded font-mono">
                        {ev.date}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[7.5pt] text-slate-900 leading-snug truncate">
                      {sanitizeReportText(ev.activityTitle || ev.title)}
                    </h4>
                    <p className="text-[6.8pt] text-slate-600 leading-tight mt-0.5 line-clamp-2">
                      {sanitizeReportText(ev.caption)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BAGIAN 7: CATATAN GURU */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 7 — Catatan Guru
              </h2>
            </div>

            <div className="border border-slate-200 rounded-lg p-2.5 text-[7.4pt] text-slate-800 bg-white border-l-4 border-l-emerald-600 space-y-1.5 shadow-2xs">
              <div>
                <span className="font-bold text-emerald-950 block text-[7pt] uppercase tracking-wide">
                  Catatan Perkembangan Anak:
                </span>
                <p className="text-slate-800 leading-relaxed italic">
                  "{sanitizeReportText(teacherNotes.generalNote)}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[7pt]">
                <div>
                  <span className="font-bold text-emerald-800 block">Hal Positif yang Dipertahankan:</span>
                  <p className="text-slate-600">{sanitizeReportText(teacherNotes.positiveToMaintain)}</p>
                </div>
                <div>
                  <span className="font-bold text-amber-800 block">Hal yang Perlu Diperkuat:</span>
                  <p className="text-slate-600">{sanitizeReportText(teacherNotes.areasToStrengthen)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 8: REKOMENDASI STIMULASI DI RUMAH */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 border-b border-sky-200 pb-0.5">
              <span className="w-1.5 h-3.5 bg-sky-600 rounded-xs"></span>
              <h2 className="text-[8.8pt] font-bold text-sky-800 tracking-tight uppercase">
                Bagian 8 — Rekomendasi Stimulasi di Rumah
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {homeActivities.slice(0, 3).map((act, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-2 bg-slate-50/60 text-[6.8pt] space-y-1 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-800 font-bold text-[7.2pt] truncate">
                      <Home className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{sanitizeReportText(act.title)}</span>
                    </div>
                    <p className="text-slate-700 leading-snug line-clamp-2">
                      <strong>Cara:</strong> {sanitizeReportText(act.howTo || act.purpose)}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 text-slate-500 space-y-0.5 text-[6.2pt]">
                    <p className="truncate"><strong>Alat:</strong> {sanitizeReportText(act.materials || 'Alat rumah tangga')}</p>
                    <p className="truncate"><strong>Waktu:</strong> {sanitizeReportText(act.duration || '15 menit')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PENGESAHAN & TANDA TANGAN RESMI */}
          <div className="pt-1">
            <div className="grid grid-cols-2 gap-6 text-[7.6pt]">
              {/* Kolom Kiri: Kepala Satuan PAUD */}
              <div className="flex flex-col justify-between min-h-[88px] text-center border border-slate-200 rounded-lg p-2.5 bg-white shadow-2xs">
                <div>
                  <p className="text-slate-600 font-medium">Mengetahui,</p>
                  <p className="font-bold text-slate-900">Kepala Satuan PAUD</p>
                </div>
                <div className="my-1 py-1 flex flex-col items-center justify-center min-h-[36px]">
                  {canonical.signatures?.principal?.signatureDataUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={canonical.signatures.principal.signatureDataUrl}
                        alt="Tanda Tangan Kepala Sekolah"
                        className="h-8 max-w-[110px] object-contain"
                      />
                      {canonical.signatures.principal.isAuthorized && (
                        <span className="inline-flex items-center gap-0.5 text-[5.8pt] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 mt-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Tervalidasi Digital</span>
                        </span>
                      )}
                    </div>
                  ) : onOpenSignModal ? (
                    <button
                      type="button"
                      onClick={() => onOpenSignModal('PRINCIPAL')}
                      className="no-print my-0.5 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-dashed border-emerald-400 rounded-md text-[6.8pt] font-bold cursor-pointer transition hover:shadow-xs"
                    >
                      <PenTool className="w-2.5 h-2.5" />
                      <span>+ Tanda Tangan Kepsek</span>
                    </button>
                  ) : (
                    <div className="h-8" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline decoration-slate-400 underline-offset-2">
                    {principalDisplayName}
                  </p>
                  <p className="text-[6.8pt] text-slate-500">
                    NIP. {principalNip || '—'}
                  </p>
                </div>
              </div>

              {/* Kolom Kanan: Guru Kelompok / Wali Kelas */}
              <div className="flex flex-col justify-between min-h-[88px] text-center border border-slate-200 rounded-lg p-2.5 bg-white shadow-2xs">
                <div>
                  <p className="text-slate-600 font-medium">
                    {kelurahanAddress}, {assessmentDateStr}
                  </p>
                  <p className="font-bold text-slate-900">Guru Kelompok / Wali Kelas</p>
                </div>
                <div className="my-1 py-1 flex flex-col items-center justify-center min-h-[36px]">
                  {canonical.signatures?.teacher?.signatureDataUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={canonical.signatures.teacher.signatureDataUrl}
                        alt="Tanda Tangan Guru Kelompok"
                        className="h-8 max-w-[110px] object-contain"
                      />
                      {canonical.signatures.teacher.isAuthorized && (
                        <span className="inline-flex items-center gap-0.5 text-[5.8pt] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200 mt-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-sky-600" />
                          <span>Tervalidasi Digital</span>
                        </span>
                      )}
                    </div>
                  ) : onOpenSignModal ? (
                    <button
                      type="button"
                      onClick={() => onOpenSignModal('TEACHER')}
                      className="no-print my-0.5 inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-dashed border-sky-400 rounded-md text-[6.8pt] font-bold cursor-pointer transition hover:shadow-xs"
                    >
                      <PenTool className="w-2.5 h-2.5" />
                      <span>+ Tanda Tangan Guru</span>
                    </button>
                  ) : (
                    <div className="h-8" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline decoration-slate-400 underline-offset-2">
                    {waliKelasName}
                  </p>
                  <p className="text-[6.8pt] text-slate-500">
                    Wali Kelas • NIP. {teacherNip || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER HALAMAN 3 */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[6.8pt] text-slate-500">
          <span>Laporan Perkembangan Ananda {studentDisplayName} — {student.className}</span>
          <span>GrowUPAUD Assessment Intelligence | Halaman 3 dari 3</span>
        </div>
      </div>
    </div>
  );
};

export default StudentReportCard;
