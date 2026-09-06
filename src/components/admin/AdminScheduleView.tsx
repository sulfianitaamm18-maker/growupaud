import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Users,
  BookOpen,
  Package,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';
import { scheduleStore } from '../../services/scheduleStore';
import { curriculumStore } from '../../services/curriculumStore';
import { schoolStore } from '../../services/schoolStore';
import { ScheduleItem } from '../../types';

export const AdminScheduleView: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Modal create/edit schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Form states
  const [dayOfWeek, setDayOfWeek] = useState<string>('Senin');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:30');
  const [activityTitle, setActivityTitle] = useState<string>('');
  const [theme, setTheme] = useState<string>('Alam Semesta');
  const [subtheme, setSubtheme] = useState<string>('Tanaman di Kebun Sekolah');
  const [targetClass, setTargetClass] = useState<string>('Kelompok B (5-6 Tahun)');
  const [tp, setTp] = useState<string>('Mengeksplorasi ragam daun dan membuat kolase bahan alam');
  const [materials, setMaterials] = useState<string>('Daun kering, ranting, lem, kertas');
  const [teacherName, setTeacherName] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const classes = schoolStore.getClasses();
  const teachers = schoolStore.getTeachers();
  const themes = curriculumStore.getThemes();
  const subthemes = curriculumStore.getSubthemes(theme);

  const refreshSchedules = () => {
    setSchedules(scheduleStore.getSchedules());
  };

  useEffect(() => {
    refreshSchedules();
    const unsub = scheduleStore.subscribe(refreshSchedules);
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingScheduleId(null);
    setActivityTitle('');
    setTeacherName(teachers.length > 0 ? teachers[0].name : '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingScheduleId(item.id);
    setDayOfWeek(item.dayOfWeek || 'Senin');
    setStartTime(item.startTime || item.time?.split('-')[0]?.trim() || '08:00');
    setEndTime(item.endTime || item.time?.split('-')[1]?.trim() || '09:30');
    setActivityTitle(item.activityTitle);
    setTheme(item.theme || 'Alam Semesta');
    setSubtheme(item.subtheme || '');
    setTargetClass(item.targetClass || item.className || 'Kelompok B (5-6 Tahun)');
    setTp(item.tp || '');
    setMaterials((item.materials || []).join(', '));
    setTeacherName(item.teacherName || '');
    setIsModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    const materialsArray = materials
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const scheduleData: ScheduleItem = {
      id: editingScheduleId || `sched-${Date.now()}`,
      dayOfWeek,
      time: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      activityTitle: activityTitle.trim(),
      category: 'PEMBELAJARAN',
      location: 'Ruang Kelas / Sentra',
      theme,
      subtheme,
      targetClass,
      tp,
      materials: materialsArray,
      teacherName: teacherName || undefined,
      status: 'PLANNED',
    };

    if (editingScheduleId) {
      scheduleStore.updateSchedule(scheduleData);
      showToast(`Jadwal "${activityTitle}" berhasil diperbarui.`);
    } else {
      scheduleStore.addSchedule(scheduleData);
      showToast(`Jadwal "${activityTitle}" berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (item: ScheduleItem) => {
    if (confirm(`Hapus jadwal kegiatan "${item.activityTitle}"?`)) {
      scheduleStore.deleteSchedule(item.id);
      showToast(`Jadwal "${item.activityTitle}" dihapus.`);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (selectedDayFilter !== 'ALL' && s.dayOfWeek !== selectedDayFilter) return false;
    if (selectedClassFilter !== 'ALL' && s.targetClass !== selectedClassFilter) return false;
    return true;
  });

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div className="space-y-6 animate-fadeIn" id="admin-schedule-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Penjadwalan Kegiatan Pembelajaran
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur jadwal kegiatan terstruktur untuk setiap kelas dan hari. Jadwal yang dibuat admin akan otomatis tampil di Dashboard Guru secara real-time.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Buat Jadwal Baru
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          Filter Hari:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedDayFilter('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              selectedDayFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Hari
          </button>
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDayFilter(d)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedDayFilter === d
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Jadwal</h3>
          <p className="text-xs text-slate-500">
            Tidak ada jadwal untuk filter yang dipilih. Buat jadwal kegiatan pembelajaran baru.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
          >
            + Buat Jadwal Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Top Badge: Day, Time & Target Class */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {item.dayOfWeek} • {item.startTime} - {item.endTime}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.targetClass || 'Semua Kelas'}
                  </span>
                </div>

                {/* Title & Theme */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    {item.activityTitle}
                  </h4>
                  {item.theme && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      Tema: {item.theme} {item.subtheme ? `• ${item.subtheme}` : ''}
                    </p>
                  )}
                </div>

                {/* TP */}
                {item.tp && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">TP:</strong> {item.tp}
                  </p>
                )}

                {/* Materials & Loose Parts */}
                {(item.materials || []).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Package className="w-3 h-3 text-emerald-600" />
                      Media & Loose Parts
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.materials?.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher */}
                {item.teacherName && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Guru: <strong>{item.teacherName}</strong></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                {editingScheduleId ? 'Edit Jadwal Pembelajaran' : 'Buat Jadwal Pembelajaran Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hari</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Kelas</label>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Kelompok A (4-5 Tahun)">Kelompok A (4-5 Tahun)</option>
                  <option value="Kelompok B (5-6 Tahun)">Kelompok B (5-6 Tahun)</option>
                  <option value="Semua Kelas">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Kegiatan Pembelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mengelompokkan Daun & Kolase Bahan Alam"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tema</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {themes.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subtema</label>
                  <select
                    value={subtheme}
                    onChange={(e) => setSubtheme(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {subthemes.map((st) => (
                      <option key={st.id || st.name} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tujuan Pembelajaran (TP)</label>
                <textarea
                  rows={2}
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="Tujuan pembelajaran yang ingin dicapai..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Media & Loose Parts (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="Daun kering, ranting, lem, kardus bekas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Guru Pengampu</label>
                <select
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
