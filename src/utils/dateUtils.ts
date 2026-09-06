import { ObservationRecord } from '../types';

export function parseObsDate(dateStr?: string, obsDateISO?: string): Date | null {
  if (obsDateISO) {
    const d = new Date(obsDateISO + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  if (!dateStr) return null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  // Try JS Date
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Try Indonesian "9 Agustus 2026"
  const indonesianMonths: Record<string, number> = {
    januari: 0,
    februari: 1,
    maret: 2,
    april: 3,
    mei: 4,
    juni: 5,
    juli: 6,
    agustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = indonesianMonths[parts[1].toLowerCase()];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isObservationToday(obs: ObservationRecord): boolean {
  const d = parseObsDate(obs.date, obs.observationDateISO);
  if (!d) return false;
  return isSameDay(d, new Date());
}

export function isObservationThisWeek(obs: ObservationRecord): boolean {
  const d = parseObsDate(obs.date, obs.observationDateISO);
  if (!d) return false;
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return d >= startOfWeek && d <= endOfWeek;
}

export function getWeeklyDayCounts(observations: ObservationRecord[]): { day: string; count: number }[] {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const counts = [0, 0, 0, 0, 0];

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  observations.forEach((obs) => {
    const d = parseObsDate(obs.date, obs.observationDateISO);
    if (!d) return;
    if (d >= monday && d <= sunday) {
      const obsDay = d.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
      if (obsDay >= 1 && obsDay <= 5) {
        counts[obsDay - 1] += 1;
      }
    }
  });

  return days.map((dayName, idx) => ({ day: dayName, count: counts[idx] }));
}
