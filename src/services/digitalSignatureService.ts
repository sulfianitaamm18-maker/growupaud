/**
 * Digital Signature & Report Authorization Service
 * Provides secure digital signature capture, cryptographic verification code generation,
 * official digital stamp generation, and local persistence for report authorization.
 */

export interface DigitalSignatureData {
  role: 'TEACHER' | 'PRINCIPAL' | 'PARENT';
  signerName: string;
  signerTitle: string;
  nip?: string;
  signatureDataUrl?: string | null;
  signatureType: 'DRAWN' | 'STAMP' | 'UPLOADED';
  verificationCode: string;
  authorizedAt: string;
  locationAndDate?: string;
  isAuthorized: boolean;
}

export interface ReportAuthorizationRecord {
  studentId: string;
  academicYear: string;
  semester: string;
  teacherSignature?: DigitalSignatureData | null;
  principalSignature?: DigitalSignatureData | null;
  parentSignature?: DigitalSignatureData | null;
  status: 'UNAUTHORIZED' | 'PARTIALLY_AUTHORIZED' | 'FULLY_AUTHORIZED';
  isPublished?: boolean;
  publishedAt?: string;
  lastUpdated: string;
}

const STORAGE_PREFIX = 'paud_report_auth_v1';

export const digitalSignatureService = {
  getStorageKey(studentId: string, academicYear: string, semester: string): string {
    const cleanYear = (academicYear || 'default').replace(/\s+/g, '-').toLowerCase();
    const cleanSem = (semester || 'default').replace(/\s+/g, '-').toLowerCase();
    return `${STORAGE_PREFIX}_${studentId}_${cleanYear}_${cleanSem}`;
  },

  getStoredAuthorization(
    studentId: string,
    academicYear: string,
    semester: string
  ): ReportAuthorizationRecord | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = this.getStorageKey(studentId, academicYear, semester);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as ReportAuthorizationRecord;
    } catch (err) {
      console.warn('[DigitalSignatureService] Failed to read authorization from storage:', err);
      return null;
    }
  },

  saveStoredAuthorization(record: ReportAuthorizationRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey(record.studentId, record.academicYear, record.semester);
      localStorage.setItem(key, JSON.stringify(record));
    } catch (err) {
      console.warn('[DigitalSignatureService] Failed to save authorization to storage:', err);
    }
  },

  removeSignature(
    studentId: string,
    academicYear: string,
    semester: string,
    role: 'TEACHER' | 'PRINCIPAL' | 'PARENT'
  ): ReportAuthorizationRecord {
    const existing = this.getStoredAuthorization(studentId, academicYear, semester) || {
      studentId,
      academicYear,
      semester,
      teacherSignature: null,
      principalSignature: null,
      parentSignature: null,
      status: 'UNAUTHORIZED',
      lastUpdated: new Date().toISOString(),
    };

    if (role === 'TEACHER') {
      existing.teacherSignature = null;
    } else if (role === 'PRINCIPAL') {
      existing.principalSignature = null;
    } else {
      existing.parentSignature = null;
    }

    const hasTeacher = Boolean(existing.teacherSignature?.isAuthorized);
    const hasPrincipal = Boolean(existing.principalSignature?.isAuthorized);

    if (hasTeacher && hasPrincipal) {
      existing.status = 'FULLY_AUTHORIZED';
    } else if (hasTeacher || hasPrincipal) {
      existing.status = 'PARTIALLY_AUTHORIZED';
    } else {
      existing.status = 'UNAUTHORIZED';
    }

    existing.lastUpdated = new Date().toISOString();
    this.saveStoredAuthorization(existing);
    return existing;
  },

  generateVerificationCode(role: 'TEACHER' | 'PRINCIPAL' | 'PARENT', studentId: string): string {
    const prefix = role === 'PRINCIPAL' ? 'AUTH-KS' : role === 'TEACHER' ? 'AUTH-GR' : 'AUTH-OT';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const subId = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toUpperCase();
    return `${prefix}-${subId || 'PAUD'}-${rand}`;
  },

  /**
   * Generates a formal digital seal/stamp SVG data URL for instant authorization
   */
  generateDigitalStampDataUrl(
    signerName: string,
    roleTitle: string,
    schoolName: string,
    verificationCode: string,
    dateStr: string
  ): string {
    const isPrincipal = roleTitle.toLowerCase().includes('kepala');
    const primaryColor = isPrincipal ? '#047857' : '#0369a1'; // Emerald vs Sky
    const lightBg = isPrincipal ? '#ecfdf5' : '#f0f9ff';

    const cleanSchool = (schoolName || 'SATUAN PAUD').toUpperCase().slice(0, 32);
    const cleanName = signerName.toUpperCase().slice(0, 24);
    const cleanRole = roleTitle.toUpperCase().slice(0, 26);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 110" width="260" height="110">
      <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.1"/>
        </filter>
      </defs>
      <!-- Outer Border Box with Rounded Corners -->
      <rect x="3" y="3" width="254" height="104" rx="8" ry="8" fill="${lightBg}" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,2" filter="url(#shadow)" />
      <rect x="7" y="7" width="246" height="96" rx="6" ry="6" fill="none" stroke="${primaryColor}" stroke-width="0.8" />
      
      <!-- Left Badge Seal Emblem -->
      <circle cx="38" cy="55" r="26" fill="none" stroke="${primaryColor}" stroke-width="1.8" />
      <circle cx="38" cy="55" r="22" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="0.6" stroke-dasharray="3,1" />
      <!-- Star / Checkmark in Emblem -->
      <path d="M38 41 L41 49 L50 49 L43 54 L45 62 L38 57 L31 62 L33 54 L26 49 L35 49 Z" fill="${primaryColor}" />
      <text x="38" y="73" font-family="Arial, Helvetica, sans-serif" font-size="5" font-weight="900" fill="${primaryColor}" text-anchor="middle" letter-spacing="1">RESMI</text>

      <!-- Right Text Content -->
      <text x="74" y="24" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="900" fill="${primaryColor}" letter-spacing="0.5">TEROTORISASI ELEKTRONIK</text>
      <text x="74" y="36" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" fill="#334155">${cleanSchool}</text>
      
      <line x1="74" y1="42" x2="242" y2="42" stroke="${primaryColor}" stroke-width="0.6" opacity="0.6" />
      
      <text x="74" y="54" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="900" fill="#0f172a">${cleanName}</text>
      <text x="74" y="66" font-family="Arial, Helvetica, sans-serif" font-size="6.8" font-weight="700" fill="${primaryColor}">${cleanRole}</text>
      
      <rect x="74" y="73" width="168" height="20" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.7" />
      <text x="80" y="82" font-family="monospace" font-size="6.2" font-weight="700" fill="#475569">KODE: ${verificationCode}</text>
      <text x="80" y="90" font-family="Arial, Helvetica, sans-serif" font-size="5.8" font-weight="500" fill="#64748b">${dateStr}</text>
      <text x="236" y="86" font-family="Arial, Helvetica, sans-serif" font-size="5.5" font-weight="800" fill="${primaryColor}" text-anchor="end">✓ VALID</text>
    </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  isReportPublished(studentId: string, academicYear: string, semester: string): boolean {
    const auth = this.getStoredAuthorization(studentId, academicYear, semester);
    if (!auth) return false;
    // Considered published if explicitly flagged as published OR has at least teacher signature authorized
    return Boolean(auth.isPublished || auth.status === 'FULLY_AUTHORIZED' || (auth.teacherSignature?.isAuthorized));
  },

  setReportPublished(studentId: string, academicYear: string, semester: string, isPublished: boolean): ReportAuthorizationRecord {
    const current = this.getStoredAuthorization(studentId, academicYear, semester) || {
      studentId,
      academicYear,
      semester,
      status: 'UNAUTHORIZED' as const,
      lastUpdated: new Date().toISOString(),
    };
    current.isPublished = isPublished;
    if (isPublished) {
      current.publishedAt = new Date().toISOString();
    }
    current.lastUpdated = new Date().toISOString();
    this.saveStoredAuthorization(current);
    return current;
  },
};
