import { ScheduleItem } from '../types';

const SCHEDULE_STORAGE_KEY = 'growupaud_schedules_v1';

export const INITIAL_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-01',
    schoolId: 'main-school',
    dayOfWeek: 'Senin',
    date: new Date().toISOString().split('T')[0],
    time: '07:30 - 08:00 WIB',
    activityTitle: 'Penyambutan Anak & Morning Circle (Doa & Gerak Lagu)',
    category: 'PEMBELAJARAN',
    location: 'Halaman & Ruang Kelas',
    theme: 'Aku Sayang Bumi',
    subtheme: 'Tanaman di Sekitarku',
    targetAspects: ['NAM', 'JATI_DIRI', 'MOTORIK_KASAR'],
    notes: 'Pembiasaan doa pembuka, salam ramah, dan gerak peregangan tubuh.',
    status: 'DONE',
  },
  {
    id: 'sch-02',
    schoolId: 'main-school',
    dayOfWeek: 'Senin',
    date: new Date().toISOString().split('T')[0],
    time: '08:00 - 09:15 WIB',
    activityTitle: 'Kegiatan Inti: Eksplorasi Daun & Ranting (Bahan Alam & Loose Parts)',
    category: 'PEMBELAJARAN',
    location: 'Kebun Tanaman Sekolah / Sudut Alam',
    theme: 'Aku Sayang Bumi',
    subtheme: 'Tanaman di Sekitarku',
    targetAspects: ['LITERASI_STEAM', 'MOTORIK_HALUS', 'KOGNITIF'],
    notes: 'Mengelompokkan bentuk daun, mencap tekstur dengan pewarna alami, dan mengamati urutan ukuran.',
    status: 'NOW',
  },
  {
    id: 'sch-03',
    schoolId: 'main-school',
    dayOfWeek: 'Senin',
    date: new Date().toISOString().split('T')[0],
    time: '09:15 - 09:45 WIB',
    activityTitle: 'Istirahat, Cuci Tangan 6 Langkah & Makan Bersama (Gizi Seimbang)',
    category: 'ISTIRAHAT',
    location: 'Area Makan Anak',
    theme: 'Aku Sayang Bumi',
    subtheme: 'Tanaman di Sekitarku',
    targetAspects: ['NAM', 'JATI_DIRI'],
    notes: 'Melatih kemandirian membuka bekal, makan tertib, dan merapikan sisa makanan.',
    status: 'UPCOMING',
  },
  {
    id: 'sch-04',
    schoolId: 'main-school',
    dayOfWeek: 'Senin',
    date: new Date().toISOString().split('T')[0],
    time: '09:45 - 10:30 WIB',
    activityTitle: 'Kegiatan Penutup: Refleksi Bermain, Apresiasi Karya & Dongeng',
    category: 'PEMBELAJARAN',
    location: 'Ruang Kelas',
    theme: 'Aku Sayang Bumi',
    subtheme: 'Tanaman di Sekitarku',
    targetAspects: ['JATI_DIRI', 'LITERASI_STEAM'],
    notes: 'Anak menceritakan pengalaman bermain hari ini dan menyimpulkan apa yang dipelajari secara bermakna.',
    status: 'UPCOMING',
  },
  {
    id: 'sch-05',
    schoolId: 'main-school',
    dayOfWeek: 'Senin',
    date: new Date().toISOString().split('T')[0],
    time: '10:30 - 11:00 WIB',
    activityTitle: 'Penjemputan & Komunikasi Singkat Wali Murid',
    category: 'PENJEMPUTAN',
    location: 'Gerbang Utama Sekolah',
    theme: 'Aku Sayang Bumi',
    subtheme: 'Tanaman di Sekitarku',
    notes: 'Koordinasi perkembangan anak hari ini secara hangat bersama orang tua.',
    status: 'UPCOMING',
  },
];

class ScheduleStore {
  private schedules: ScheduleItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.schedules = this.loadState();
  }

  private loadState(): ScheduleItem[] {
    try {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load schedules from localStorage:', e);
    }
    return INITIAL_SCHEDULES;
  }

  private saveState(): void {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(this.schedules));
    } catch (e) {
      console.warn('Failed to save schedules to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  public getSchedules(): ScheduleItem[] {
    return this.schedules;
  }

  public getTodaySchedules(): ScheduleItem[] {
    // Return schedules sorted by time
    return [...this.schedules];
  }

  public getScheduleById(id: string): ScheduleItem | undefined {
    return this.schedules.find((s) => s.id === id);
  }

  public addSchedule(item: Omit<ScheduleItem, 'id'> & { id?: string }): ScheduleItem {
    const created: ScheduleItem = {
      ...item,
      id: item.id || `sch-${Date.now()}`,
      status: item.status || 'UPCOMING',
    };
    this.schedules = [...this.schedules, created];
    this.saveState();
    return created;
  }

  public updateSchedule(updated: ScheduleItem): void {
    this.schedules = this.schedules.map((s) => (s.id === updated.id ? updated : s));
    this.saveState();
  }

  public deleteSchedule(id: string): void {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    this.saveState();
  }
}

export const scheduleStore = new ScheduleStore();
