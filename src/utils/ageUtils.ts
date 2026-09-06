import { StudentProfile } from '../types';

export interface StudentAgeContext {
  ageYears: number | null;
  ageMonths: number | null;
  ageLabel: string;
  ageDisplay: string;
  phaseName: string;
  ageGroup: string;
  pedagogicalContext: string;
  isAgeFilled: boolean;
}

/**
 * Format student age into a friendly Indonesian string.
 * Example: "5 tahun 3 bulan", "4 tahun", "8 bulan", or "Umur belum diisi"
 */
export function formatStudentAge(
  student?: Partial<StudentProfile> | {
    age?: string | null;
    ageYears?: number | null;
    ageMonths?: number | null;
    ageLabel?: string | null;
  } | null
): string {
  if (!student) return 'Umur belum diisi';

  // 1. Check structured ageYears & ageMonths
  const y = typeof student.ageYears === 'number' && !isNaN(student.ageYears) ? student.ageYears : null;
  const m = typeof student.ageMonths === 'number' && !isNaN(student.ageMonths) ? student.ageMonths : null;

  if (y !== null && m !== null) {
    if (y > 0 && m > 0) return `${y} tahun ${m} bulan`;
    if (y > 0 && m === 0) return `${y} tahun`;
    if (y === 0 && m > 0) return `${m} bulan`;
    if (y === 0 && m === 0) return '0 bulan';
  }

  if (y !== null && m === null) {
    return `${y} tahun`;
  }

  // 2. Check ageLabel
  if (student.ageLabel && typeof student.ageLabel === 'string' && student.ageLabel.trim().length > 0) {
    return student.ageLabel.trim();
  }

  // 3. Check legacy age string
  if (student.age && typeof student.age === 'string' && student.age.trim().length > 0) {
    const raw = student.age.trim();
    if (raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined' || raw === '-') {
      return 'Umur belum diisi';
    }
    return raw;
  }

  return 'Umur belum diisi';
}

/**
 * Parse an existing age string or numbers into { years, months } for form editing.
 */
export function parseAgeToComponents(
  ageVal?: string | number | null,
  ageMonthsVal?: number | null,
  defaultYears = 5,
  defaultMonths = 0
): { years: number; months: number } {
  // If already numerical years passed
  if (typeof ageVal === 'number' && !isNaN(ageVal)) {
    return {
      years: Math.max(0, Math.min(12, ageVal)),
      months: typeof ageMonthsVal === 'number' && !isNaN(ageMonthsVal)
        ? Math.max(0, Math.min(11, ageMonthsVal))
        : 0,
    };
  }

  if (!ageVal || typeof ageVal !== 'string') {
    return { years: defaultYears, months: defaultMonths };
  }

  const clean = ageVal.toLowerCase();
  let years = defaultYears;
  let months = defaultMonths;

  const yearMatch = clean.match(/(\d+)\s*(?:thn|tahun|th)/i);
  const monthMatch = clean.match(/(\d+)\s*(?:bln|bulan|bl)/i);

  if (yearMatch && yearMatch[1]) {
    const parsedY = parseInt(yearMatch[1], 10);
    if (!isNaN(parsedY) && parsedY >= 0 && parsedY <= 12) {
      years = parsedY;
    }
  } else {
    // Single number test e.g. "5"
    const singleNum = clean.match(/^(\d+)$/);
    if (singleNum && singleNum[1]) {
      const parsedSingle = parseInt(singleNum[1], 10);
      if (!isNaN(parsedSingle) && parsedSingle >= 0 && parsedSingle <= 12) {
        years = parsedSingle;
      }
    }
  }

  if (monthMatch && monthMatch[1]) {
    const parsedM = parseInt(monthMatch[1], 10);
    if (!isNaN(parsedM) && parsedM >= 0 && parsedM <= 11) {
      months = parsedM;
    }
  } else if (typeof ageMonthsVal === 'number' && !isNaN(ageMonthsVal)) {
    months = Math.max(0, Math.min(11, ageMonthsVal));
  }

  return { years, months };
}

/**
 * Validate age input for form submissions.
 */
export function validateAgeInput(years: number, months: number): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (isNaN(years) || years < 0) {
    return { isValid: false, errorMessage: 'Tahun umur harus angka 0 atau lebih.' };
  }
  if (years > 10) {
    return { isValid: false, errorMessage: 'Umur anak PAUD maksimal 10 tahun.' };
  }
  if (isNaN(months) || months < 0 || months > 11) {
    return { isValid: false, errorMessage: 'Bulan umur harus bernilai antara 0 sampai 11.' };
  }
  if (years === 0 && months === 0) {
    return { isValid: false, errorMessage: 'Umur anak tidak boleh 0 tahun 0 bulan.' };
  }
  return { isValid: true };
}

/**
 * Helper to build comprehensive developmental age context for AI prompt & pedagogical reports.
 */
export function getStudentAgeContext(
  student?: Partial<StudentProfile> | null
): StudentAgeContext {
  const formattedAge = formatStudentAge(student);
  const isAgeFilled = formattedAge !== 'Umur belum diisi';

  const { years, months } = isAgeFilled
    ? parseAgeToComponents(student?.ageYears ?? student?.age, student?.ageMonths)
    : { years: null, months: null };

  let phaseName = 'Fase Fondasi PAUD';
  let ageGroup = 'Usia PAUD';
  let pedagogicalContext = 'Pengembangan tahapan pondasi tumbuh kembang anak usia dini.';

  if (years !== null) {
    if (years < 4) {
      phaseName = 'Kelompok Bermain (KB)';
      ageGroup = '2–4 Tahun';
      pedagogicalContext =
        'Fokus pada eksplorasi sensori-motorik, pembiasaan interaksi sosial awal, pengenalan emosi dasar, dan kemandirian sederhana dengan pendampingan intensif.';
    } else if (years === 4) {
      phaseName = 'Fase Fondasi — TK Kelompok A';
      ageGroup = '4–5 Tahun';
      pedagogicalContext =
        'Anak mulai menunjukkan inisiatif, meniru peran sosial, mengekspresikan gagasan sederhana, koordinasi motorik berkembang pesat, dan mulai belajar menyelesaikan tugas mandiri dengan contoh awal.';
    } else if (years >= 5) {
      phaseName = 'Fase Fondasi — TK Kelompok B';
      ageGroup = '5–6 Tahun';
      pedagogicalContext =
        'Anak semakin mampu berpikir kritis pra-operasional, memecahkan masalah sederhana, bekerja sama dalam kelompok, konsentrasi lebih terarah, dan memiliki kemandirian yang semakin mantap.';
    }
  }

  return {
    ageYears: years,
    ageMonths: months,
    ageLabel: formattedAge,
    ageDisplay: formattedAge,
    phaseName,
    ageGroup,
    pedagogicalContext,
    isAgeFilled,
  };
}
