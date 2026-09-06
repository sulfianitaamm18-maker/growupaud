import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Package,
  BookOpen,
  Sparkles,
  PlayCircle,
  AlertCircle,
  Building2,
  UserCheck,
  Layers,
} from 'lucide-react';
import { scheduleStore } from '../../services/scheduleStore';
import { schoolStore } from '../../services/schoolStore';
import { useAuth } from '../../context/AuthContext';
import { ScheduleItem } from '../../types';

interface TodayScheduleWidgetProps {
  onStartObservationForActivity: (activityTitle: string, theme?: string, subtheme?: string) => void;
  onOpenScheduleModal: () => void;
}

export const TodayScheduleWidget: React.FC<TodayScheduleWidgetProps> = ({
  onStartObservationForActivity,
  onOpenScheduleModal,
}) => {
  const { userProfile } = useAuth();
  const currentUser = userProfile;
  const schoolProfile = schoolStore.getSchoolProfile();

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [onlyMySchedule, setOnlyMySchedule] = useState<boolean>(true);

  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = dayNamesIndo[new Date().getDay()] || 'Senin';
  const effectiveDay = todayDayName === 'Minggu' ? 'Senin' : todayDayName;

  const [selectedDay, setSelectedDay] = useState<string>(effectiveDay);

  useEffect(() => {
    setSchedules(scheduleStore.getSchedules());
    const unsub = scheduleStore.subscribe(() => {
      setSchedules(scheduleStore.getSchedules());
    });
    return () => unsub();
  }, []);

  // Filter schedules strictly for Teacher's assigned teaching duties
  const todaySchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.dayOfWeek !== selectedDay) return false;

      // If viewing all school schedules
      if (!onlyMySchedule || !currentUser) return true;

      // If filtering strictly for current teacher's teaching assignment:
      // Match by teacherId, teacherName, or class
      const teacherNameMatch =
        s.teacherName &&
        currentUser.name &&
        (s.teacherName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
          currentUser.name.toLowerCase().includes(s.teacherName.toLowerCase()));

      const teacherIdMatch = s.teacherId && s.teacherId === currentUser.id;

      const classMatch =
        s.targetClass &&
        currentUser.className &&
        (s.targetClass.toLowerCase().includes(currentUser.className.toLowerCase()) ||
          currentUser.className.toLowerCase().includes(s.targetClass.toLowerCase()));

      const isGeneralSchoolSchedule = !s.teacherName && !s.teacherId && (!s.targetClass || s.targetClass === 'Semua Kelas');

      return teacherNameMatch || teacherIdMatch || classMatch || isGeneralSchoolSchedule;
    });
  }, [schedules, selectedDay, onlyMySchedule, currentUser]);

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4" id="today-schedule-widget">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Jadwal Mengajar Harian (Disusun Admin)
              </h2>
              {selectedDay === todayDayName && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Hari Ini
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>{schoolProfile.name || 'PAUD'}</span>
              <span>•</span>
              <span>Tugas Mengajar: <strong>{currentUser?.name || 'Guru'}</strong> ({currentUser?.className || 'Semua Kelas'})</span>
            </p>
          </div>
        </div>

        {/* Day Selector Pills & Scope Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.className && (
            <button
              onClick={() => setOnlyMySchedule(!onlyMySchedule)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                onlyMySchedule
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {onlyMySchedule ? `Hanya Kelas ${currentUser.className}` : 'Tampilkan Semua Kelas'}
            </button>
          )}

          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                  selectedDay === day
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Items List */}
      {todaySchedules.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Tidak ada jadwal mengajar untuk hari {selectedDay}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {onlyMySchedule
              ? `Belum ada jadwal khusus kelas ${currentUser?.className || 'Anda'} yang diinput Admin untuk hari ${selectedDay}. Anda dapat mengganti filter ke "Semua Kelas" atau mulai observasi bebas.`
              : `Admin sekolah belum menambahkan jadwal kegiatan untuk hari ${selectedDay}.`}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {onlyMySchedule && (
              <button
                onClick={() => setOnlyMySchedule(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
              >
                Lihat Semua Jadwal Sekolah
              </button>
            )}
            <button
              onClick={() => onStartObservationForActivity('Kegiatan Bebas Terbimbing')}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
            >
              + Mulai Observasi Bebas
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {todaySchedules.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-emerald-400 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    {item.startTime || item.time}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {item.targetClass || 'Semua Kelas'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {item.activityTitle}
                  </h3>
                  {item.theme && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      Tema: {item.theme} {item.subtheme ? `• ${item.subtheme}` : ''}
                    </p>
                  )}
                </div>

                {item.tp && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 bg-white/80 p-2 rounded-lg border border-slate-100">
                    <strong className="text-slate-700">Tujuan:</strong> {item.tp}
                  </p>
                )}

                {(item.materials || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Package className="w-3 h-3 text-slate-400" />
                    {item.materials?.slice(0, 3).map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-medium"
                      >
                        {m}
                      </span>
                    ))}
                    {(item.materials?.length || 0) > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{(item.materials?.length || 0) - 3} lainnya
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  {item.teacherName ? `Guru: ${item.teacherName}` : `Guru: ${currentUser?.name || 'Pengampu'}`}
                </span>

                <button
                  onClick={() =>
                    onStartObservationForActivity(item.activityTitle, item.theme, item.subtheme)
                  }
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>+ Nilai Kegiatan Ini</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

