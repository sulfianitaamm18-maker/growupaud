import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart2,
} from 'lucide-react';
import { ObservationRecord, StudentProfile, DevelopmentalAspect } from '../../types';
import { getWeeklyDayCounts } from '../../utils/dateUtils';
import { calculateStudentAspectScores, calculateOverallScore } from '../../utils/studentMetrics';

interface GuruAnalyticsChartsProps {
  observations?: ObservationRecord[];
  students?: StudentProfile[];
}

export const GuruAnalyticsCharts: React.FC<GuruAnalyticsChartsProps> = React.memo(({
  observations = [],
  students = [],
}) => {
  // Real active class name
  const classLabel = useMemo(() => {
    if (students.length > 0 && students[0].classGroup) {
      return `Kelas ${students[0].classGroup}`;
    }
    return 'Kelas Anda';
  }, [students]);

  // 1. Weekly Observation Data (Monday to Friday)
  const weeklyObsData = useMemo(() => {
    return getWeeklyDayCounts(observations);
  }, [observations]);

  const totalWeeklyObs = useMemo(() => {
    return weeklyObsData.reduce((sum, d) => sum + d.count, 0);
  }, [weeklyObsData]);

  // 2. Semester Achievement (BSH & BSB vs BB & MB)
  const semesterCompletionInfo = useMemo(() => {
    let tercapaiCount = 0;
    let prosesCount = 0;

    observations.forEach((obs) => {
      (obs.indicators || []).forEach((ind) => {
        if (ind.rating === 'BSH' || ind.rating === 'BSB') {
          tercapaiCount += 1;
        } else if (ind.rating === 'BB' || ind.rating === 'MB') {
          prosesCount += 1;
        }
      });
    });

    const total = tercapaiCount + prosesCount;
    if (total === 0) {
      return {
        hasData: false,
        tercapaiPct: 0,
        prosesPct: 0,
        chartData: [{ name: 'Belum ada data', value: 100, color: '#E2E8F0' }],
      };
    }

    const tercapaiPct = Math.round((tercapaiCount / total) * 100);
    const prosesPct = 100 - tercapaiPct;

    return {
      hasData: true,
      tercapaiPct,
      prosesPct,
      chartData: [
        { name: 'Tercapai (BSH/BSB)', value: tercapaiPct, color: '#10B981' },
        { name: 'Proses Stimulasi', value: prosesPct, color: '#E2E8F0' },
      ],
    };
  }, [observations]);

  // 3. Aspect Average Data (6 Developmental Aspects) using Single Source of Truth
  const aspectInfo = useMemo(() => {
    const scores = calculateStudentAspectScores(observations);
    const overall = calculateOverallScore(scores);

    const aspectDefs: { key: string; label: string; aspect: DevelopmentalAspect }[] = [
      { key: 'NAM', label: 'Nilai Agama & Moral', aspect: 'NAM' },
      { key: 'Jati Diri', label: 'Sosial Emosional', aspect: 'JATI_DIRI' },
      { key: 'STEAM', label: 'Literasi & STEAM', aspect: 'LITERASI_STEAM' },
      { key: 'Motorik K.', label: 'Motorik Kasar', aspect: 'MOTORIK_KASAR' },
      { key: 'Motorik H.', label: 'Motorik Halus', aspect: 'MOTORIK_HALUS' },
      { key: 'Kognitif', label: 'Kognitif', aspect: 'KOGNITIF' },
    ];

    const chartData = aspectDefs.map((def) => ({
      aspect: def.key,
      score: scores[def.aspect] ?? 0,
      label: def.label,
    }));

    return {
      chartData,
      overallAverage: overall ?? 0,
      hasData: overall !== null,
    };
  }, [observations]);

  // 4. Evidence Breakdown
  const evidenceInfo = useMemo(() => {
    let foto = 0;
    let video = 0;
    let voice = 0;
    let karya = 0;

    observations.forEach((obs) => {
      (obs.evidences || []).forEach((ev) => {
        const type = (ev.type || '').toUpperCase();
        if (type === 'FOTO') foto += 1;
        else if (type === 'VIDEO') video += 1;
        else if (type === 'VOICE') voice += 1;
        else if (type === 'KARYA') karya += 1;
        else foto += 1; // default
      });
    });

    const total = foto + video + voice + karya;

    const chartData = [
      { name: 'Foto Kegiatan', count: foto, color: '#10B981' },
      { name: 'Video Bukti', count: video, color: '#3B82F6' },
      { name: 'Voice Note', count: voice, color: '#8B5CF6' },
      { name: 'Karya Anak', count: karya, color: '#F59E0B' },
    ].filter((item) => total === 0 || item.count > 0);

    return {
      total,
      chartData,
      hasData: total > 0,
    };
  }, [observations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            <span>Statistik & Visualisasi Asesmen Kurikulum Merdeka</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau intensitas observasi, rata-rata capaian aspek, bukti autentik, dan progres semester
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Data Real-time {classLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chart 1: Jumlah Observasi Mingguan */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Observasi Mingguan
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {totalWeeklyObs} Total
            </span>
          </div>
          <div className="h-44 min-h-[176px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
              <BarChart data={weeklyObsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} name="Observasi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-center">
            {totalWeeklyObs > 0
              ? `Total ${totalWeeklyObs} catatan observasi minggu ini`
              : 'Belum ada observasi minggu ini'}
          </p>
        </div>

        {/* Chart 2: Ketercapaian Asesmen Semester */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Capaian Semester
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {semesterCompletionInfo.hasData
                ? `${semesterCompletionInfo.tercapaiPct}% Tercapai`
                : 'Belum ada data'}
            </span>
          </div>
          <div className="h-44 min-h-[176px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
              <PieChart>
                <Pie
                  data={semesterCompletionInfo.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {semesterCompletionInfo.chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-extrabold text-slate-800">
                {semesterCompletionInfo.hasData ? `${semesterCompletionInfo.tercapaiPct}%` : '0%'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {semesterCompletionInfo.hasData ? 'BSH / BSB' : 'Belum Ada'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-center">
            {semesterCompletionInfo.hasData
              ? `${semesterCompletionInfo.prosesPct}% dalam proses stimulasi`
              : 'Belum ada data capaian'}
          </p>
        </div>

        {/* Chart 3: Perkembangan Tiap Aspek */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Capaian 6 Aspek
            </h3>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {aspectInfo.hasData ? `Rerata ${aspectInfo.overallAverage}%` : 'Belum ada data'}
            </span>
          </div>
          <div className="h-44 min-h-[176px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
              <BarChart
                layout="vertical"
                data={aspectInfo.chartData}
                margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis dataKey="aspect" type="category" tick={{ fontSize: 10, fill: '#334155' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="score" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Capaian (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-center">
            {aspectInfo.hasData
              ? `Rata-rata perkembangan aspek anak: ${aspectInfo.overallAverage}%`
              : 'Belum ada data aspek'}
          </p>
        </div>

        {/* Chart 4: Jumlah Dokumentasi */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bukti Autentik
            </h3>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              {evidenceInfo.total} Bukti
            </span>
          </div>
          <div className="h-44 min-h-[176px] w-full">
            {evidenceInfo.hasData ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
                <PieChart>
                  <Pie
                    data={evidenceInfo.chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={54}
                    dataKey="count"
                    nameKey="name"
                    label={({ count }) => `${count}`}
                  >
                    {evidenceInfo.chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                Belum ada bukti autentik
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-center">
            {evidenceInfo.hasData
              ? 'Foto kegiatan, video & voice note terdata'
              : 'Belum ada bukti yang diunggah'}
          </p>
        </div>
      </div>
    </div>
  );
});
