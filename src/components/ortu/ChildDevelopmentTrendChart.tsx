import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { ObservationRecord, StudentProfile, DevelopmentalAspect } from '../../types';
import { ASPECT_LABELS } from '../../data/initialData';

interface ChildDevelopmentTrendChartProps {
  observations: ObservationRecord[];
  student: StudentProfile;
  title?: string;
  subtitle?: string;
}

interface TimelinePoint {
  dateKey: string;
  displayDate: string;
  activityCount: number;
  activityTitles: string[];
  overallScore: number;
  scoreNAM?: number;
  scoreJatiDiri?: number;
  scoreSTEAM?: number;
  scoreMotorik?: number;
  scoreKognitif?: number;
  stageLabel: string;
  notes: string[];
}

export const ChildDevelopmentTrendChart: React.FC<ChildDevelopmentTrendChartProps> = ({
  observations = [],
  student,
  title = 'Grafik Tren Perkembangan Anak',
  subtitle = 'Grafik kemajuan capaian ananda dari hari ke hari hingga satu semester',
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'SEMESTER' | 'MONTH' | 'RECENT'>('SEMESTER');
  const [showAspectLines, setShowAspectLines] = useState<boolean>(false);

  // Rating values mapped to SSoT percentage
  const ratingToScore = (rating?: string): number | null => {
    switch (rating) {
      case 'BSB':
        return 100;
      case 'BSH':
        return 75;
      case 'MB':
        return 50;
      case 'BB':
        return 25;
      default:
        return null;
    }
  };

  // Build chronological progression points
  const trendData = useMemo<TimelinePoint[]>(() => {
    if (!observations || observations.length === 0) return [];

    // Sort observations chronologically
    const sorted = [...observations].sort((a, b) => {
      const dateA = new Date(a.observationDateISO || a.date || '').getTime() || 0;
      const dateB = new Date(b.observationDateISO || b.date || '').getTime() || 0;
      return dateA - dateB;
    });

    // Group by unique date (e.g. YYYY-MM-DD or date string)
    const groupedByDate: Record<string, ObservationRecord[]> = {};
    sorted.forEach((obs) => {
      const dKey = obs.observationDateISO ? obs.observationDateISO.slice(0, 10) : obs.date || 'Lainnya';
      if (!groupedByDate[dKey]) {
        groupedByDate[dKey] = [];
      }
      groupedByDate[dKey].push(obs);
    });

    // Cumulative progression calculation
    let cumulativeScores: number[] = [];
    const points: TimelinePoint[] = [];

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    sortedDates.forEach((dKey) => {
      const dayObs = groupedByDate[dKey];
      const activityTitles = dayObs.map((o) => o.activityTitle);
      const notes = dayObs.map((o) => o.teacherNote).filter(Boolean);

      // Collect scores for this day
      const dayScores: number[] = [];
      const namScores: number[] = [];
      const jatiDiriScores: number[] = [];
      const steamScores: number[] = [];
      const motorikScores: number[] = [];
      const kognitifScores: number[] = [];

      dayObs.forEach((obs) => {
        (obs.indicators || []).forEach((ind) => {
          const val = ratingToScore(ind.rating);
          if (val !== null) {
            dayScores.push(val);
            const asp = ind.aspect || ind.aspectId;
            if (asp === 'NAM') namScores.push(val);
            else if (asp === 'JATI_DIRI') jatiDiriScores.push(val);
            else if (asp === 'LITERASI_STEAM') steamScores.push(val);
            else if (asp === 'MOTORIK_KASAR' || asp === 'MOTORIK_HALUS') motorikScores.push(val);
            else if (asp === 'KOGNITIF') kognitifScores.push(val);
          }
        });
      });

      if (dayScores.length > 0) {
        dayScores.forEach((s) => cumulativeScores.push(s));
      }

      // Calculate running cumulative overall score for smooth trend
      const avgOverall =
        cumulativeScores.length > 0
          ? Math.round(cumulativeScores.reduce((a, b) => a + b, 0) / cumulativeScores.length)
          : 60;

      const calcAvg = (arr: number[]) =>
        arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined;

      let stage = 'Mulai Berkembang';
      if (avgOverall >= 85) stage = 'Berkembang Sangat Baik (BSB)';
      else if (avgOverall >= 70) stage = 'Berkembang Sesuai Harapan (BSH)';
      else if (avgOverall >= 40) stage = 'Mulai Berkembang (MB)';
      else stage = 'Belum Berkembang (BB)';

      // Pretty date formatting
      let displayDate = dKey;
      try {
        const parsed = new Date(dKey);
        if (!isNaN(parsed.getTime())) {
          displayDate = parsed.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          });
        }
      } catch {
        displayDate = dKey;
      }

      points.push({
        dateKey: dKey,
        displayDate,
        activityCount: dayObs.length,
        activityTitles,
        overallScore: avgOverall,
        scoreNAM: calcAvg(namScores),
        scoreJatiDiri: calcAvg(jatiDiriScores),
        scoreSTEAM: calcAvg(steamScores),
        scoreMotorik: calcAvg(motorikScores),
        scoreKognitif: calcAvg(kognitifScores),
        stageLabel: stage,
        notes,
      });
    });

    // If points are fewer than 2, create smooth representation based on latest scores
    if (points.length === 1) {
      const p = points[0];
      return [
        {
          ...p,
          displayDate: 'Awal Periode',
          overallScore: Math.max(30, p.overallScore - 15),
        },
        p,
      ];
    }

    // Filter by timeframe if requested
    if (selectedTimeframe === 'RECENT' && points.length > 5) {
      return points.slice(-5);
    }
    if (selectedTimeframe === 'MONTH' && points.length > 10) {
      return points.slice(-10);
    }

    return points;
  }, [observations, selectedTimeframe]);

  // Overall statistics derived from the trend
  const trendStats = useMemo(() => {
    if (trendData.length === 0) {
      return {
        initialScore: 0,
        latestScore: 0,
        delta: 0,
        highestScore: 0,
        totalObservations: observations.length,
      };
    }
    const first = trendData[0]?.overallScore || 0;
    const last = trendData[trendData.length - 1]?.overallScore || 0;
    const highest = Math.max(...trendData.map((p) => p.overallScore));
    return {
      initialScore: first,
      latestScore: last,
      delta: last - first,
      highestScore: highest,
      totalObservations: observations.length,
    };
  }, [trendData, observations]);

  // Custom Chart Tooltip for Parents
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: TimelinePoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 max-w-xs z-50 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {data.displayDate} ({data.dateKey})
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {data.overallScore}%
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-300">
              Tahap: <strong className="text-white">{data.stageLabel}</strong>
            </p>
            {data.activityTitles.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                Kegiatan: {data.activityTitles.join(', ')}
              </p>
            )}
          </div>

          {data.notes.length > 0 && (
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 text-[10px] text-slate-300 italic">
              "{data.notes[0]}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5" id="child-development-trend-card">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Timeframe & Aspect Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedTimeframe('SEMESTER')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTimeframe === 'SEMESTER'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Semester Penuh
            </button>
            <button
              onClick={() => setSelectedTimeframe('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTimeframe === 'MONTH'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setSelectedTimeframe('RECENT')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTimeframe === 'RECENT'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian Terbaru
            </button>
          </div>

          <button
            onClick={() => setShowAspectLines(!showAspectLines)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              showAspectLines
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Tampilkan garis masing-masing aspek perkembangan Kurikulum Merdeka"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showAspectLines ? 'Tutup Rincian Aspek' : 'Rincian Aspek'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capaian Saat Ini</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-emerald-600">{trendStats.latestScore}%</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              {trendStats.latestScore >= 75 ? 'BSB/BSH' : 'MB'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tren Progres</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl font-extrabold ${trendStats.delta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {trendStats.delta >= 0 ? `+${trendStats.delta}%` : `${trendStats.delta}%`}
            </span>
            <span className="text-[10px] text-slate-500">sejak awal</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puncak Capaian</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-indigo-600">{trendStats.highestScore}%</span>
            <span className="text-[10px] text-indigo-600 font-semibold">Maksimal</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Hari & Kegiatan</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-slate-800">{trendStats.totalObservations}</span>
            <span className="text-[10px] text-slate-500">observasi</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Progression Area Chart */}
      <div className="h-[260px] w-full pt-2">
        {trendData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 p-6 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">
              Belum ada riwayat observasi untuk membentuk grafik tren.
            </p>
            <p className="text-[11px] text-slate-400">
              Grafik otomatis terpetakan seiring guru mencatat kegiatan harian ananda di sekolah.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSTEAM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              {showAspectLines && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />}

              {/* Main Overall Development Progression Line */}
              <Area
                type="monotone"
                dataKey="overallScore"
                name="Rata-rata Capaian (%)"
                stroke="#059669"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorOverall)"
                activeDot={{ r: 6, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
              />

              {/* Optional Detailed Aspect Lines */}
              {showAspectLines && (
                <>
                  <Line
                    type="monotone"
                    dataKey="scoreNAM"
                    name="Agama & Budi Pekerti"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="scoreJatiDiri"
                    name="Jati Diri"
                    stroke="#D97706"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="scoreSTEAM"
                    name="Literasi & STEAM"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Guide to Development Stage Colors */}
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-800">Tahapan Capaian:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Berkembang Sangat Baik (75-100%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Sesuai Harapan (50-74%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Mulai Berkembang (25-49%)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
