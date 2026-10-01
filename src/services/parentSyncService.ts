import { auth } from '../lib/firebase';

export interface ParentSyncItem {
  studentId: string;
  studentName: string;
  parentName: string;
  className: string;
  username: string;
  displayPassword: string;
  status: 'BERHASIL' | 'SUDAH ADA' | 'BELUM_LENGKAP' | 'GAGAL' | 'BELUM_DISINKRONKAN';
  message: string;
  missingFields?: string[];
  parentUid?: string;
}

export interface ParentSyncSummary {
  totalStudents: number;
  created?: number;
  alreadyExisting?: number;
  incomplete?: number;
  failed?: number;
  readyToSync?: number;
}

export interface ParentSyncStatusResponse {
  success: boolean;
  summary: {
    totalStudents: number;
    alreadyExisting: number;
    incomplete: number;
    readyToSync: number;
  };
  items: ParentSyncItem[];
}

export interface ParentSyncExecuteResponse {
  success: boolean;
  summary: {
    totalStudents: number;
    created: number;
    alreadyExisting: number;
    incomplete: number;
    failed: number;
  };
  items: ParentSyncItem[];
}

export const parentSyncService = {
  async getStatus(): Promise<ParentSyncStatusResponse> {
    if (!auth.currentUser) {
      throw new Error('Sesi otentikasi tidak ditemukan.');
    }
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/admin/parent-sync/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal memuat status sinkronisasi akun orang tua.');
    }

    return res.json();
  },

  async executeSync(): Promise<ParentSyncExecuteResponse> {
    if (!auth.currentUser) {
      throw new Error('Sesi otentikasi tidak ditemukan.');
    }
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/admin/parent-sync/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal menjalankan sinkronisasi akun orang tua.');
    }

    return res.json();
  },
};
