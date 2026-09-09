import { SemesterNumber } from '../types';

/**
 * Normalisasi nilai semester dari berbagai format string/number ke 1 atau 2 secara aman dan ketat.
 * Mendukung:
 * - 1, "1", "Semester 1", "Semester I", "Ganjil", "Semester Ganjil"
 * - 2, "2", "Semester 2", "Semester II", "Genap", "Semester Genap"
 */
export function normalizeSemester(val: any): SemesterNumber {
  if (val === 1 || val === '1') return 1;
  if (val === 2 || val === '2') return 2;

  if (typeof val === 'string') {
    const clean = val.trim().toLowerCase();
    
    // Semester 2 matches
    if (
      clean === '2' ||
      clean === 'ii' ||
      clean === 'semester 2' ||
      clean === 'semester ii' ||
      clean === 'semester genap' ||
      clean === 'genap' ||
      clean.includes('genap') ||
      clean.endsWith('2') ||
      clean.endsWith('ii')
    ) {
      return 2;
    }

    // Semester 1 matches
    if (
      clean === '1' ||
      clean === 'i' ||
      clean === 'semester 1' ||
      clean === 'semester i' ||
      clean === 'semester ganjil' ||
      clean === 'ganjil' ||
      clean.includes('ganjil') ||
      clean.endsWith('1') ||
      clean.endsWith('i')
    ) {
      return 1;
    }
  }

  // Default fallback safe value
  return 1;
}

/**
 * Format label semester standar untuk UI dan laporan
 */
export function formatSemesterLabel(semester: SemesterNumber | any): string {
  const norm = normalizeSemester(semester);
  return norm === 1 ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)';
}

export function formatSemesterShort(semester: SemesterNumber | any): string {
  const norm = normalizeSemester(semester);
  return norm === 1 ? 'Semester I' : 'Semester II';
}
