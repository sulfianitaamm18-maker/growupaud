import { ObservationRecord } from '../types';
import { observationService } from './observationService';
import { auth } from '../lib/firebase';

const LEGACY_STORAGE_KEY = 'growupaud_observations_v1';

class ObservationStore {
  private observations: ObservationRecord[] = [];
  private listeners: Set<() => void> = new Set();
  private unsubscribeFirestore: (() => void) | null = null;
  private currentSchoolId: string = 'main-school';
  private currentUserRole: string = 'TEACHER';
  private currentParentStudentIds: string[] = [];
  private currentAuthUid: string = '';

  constructor() {
    // Initialized empty - NO fallback to INITIAL_OBSERVATIONS
    this.observations = [];
  }

  /**
   * Audit legacy localStorage observations without using them as active state.
   */
  public getLegacyLocalStorageCount(): number {
    try {
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.length;
        }
      }
    } catch (e) {
      // ignore
    }
    return 0;
  }

  /**
   * Stop active Firestore listener and clear observation memory state
   */
  public stopSubscription(): void {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    this.currentAuthUid = '';
    this.observations = [];
    this.notify();
  }

  /**
   * Initialize or update real-time Firestore synchronization for active user context.
   */
  public initForContext(
    schoolId: string = 'main-school',
    role?: string,
    parentStudentIds?: string[]
  ) {
    if (!auth.currentUser) {
      this.stopSubscription();
      return;
    }

    const currentUid = auth.currentUser.uid;
    const normalizedRole = role || 'TEACHER';
    const studentIdsKey = (parentStudentIds || []).slice().sort().join(',');
    const currentStudentIdsKey = this.currentParentStudentIds.slice().sort().join(',');

    // Hindari tear-down listener Firestore yang sedang aktif jika konteks tidak berubah
    if (
      this.unsubscribeFirestore &&
      this.currentSchoolId === schoolId &&
      this.currentUserRole === normalizedRole &&
      this.currentAuthUid === currentUid &&
      currentStudentIdsKey === studentIdsKey
    ) {
      return;
    }

    this.currentSchoolId = schoolId;
    this.currentUserRole = normalizedRole;
    this.currentParentStudentIds = parentStudentIds || [];
    this.currentAuthUid = currentUid;

    // Clean up existing listener
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }

    // Subscribe to Firestore observations
    this.unsubscribeFirestore = observationService.subscribeToObservations(
      this.currentSchoolId,
      this.currentUserRole,
      this.currentParentStudentIds,
      (records) => {
        this.observations = records;
        console.log('[OBSERVATIONS]\nSUCCESS');
        this.notify();
      },
      (err) => {
        console.warn('ObservationStore Firestore subscription error:', err);
        console.log('[OBSERVATIONS]\nERROR: ' + (err?.message || 'subscription error'));
      }
    );
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public getObservations(): ObservationRecord[] {
    return this.observations;
  }

  public getObservationById(id: string): ObservationRecord | undefined {
    return this.observations.find((o) => o.id === id);
  }

  public getObservationsByStudent(studentId: string): ObservationRecord[] {
    return this.observations.filter((o) => o.studentId === studentId);
  }

  public async addObservation(
    obs: Omit<ObservationRecord, 'id'> & { id?: string }
  ): Promise<ObservationRecord> {
    const created = await observationService.addObservation(obs, this.currentSchoolId);

    // Optimistically update local array if real-time listener hasn't received it yet
    if (!this.observations.some((o) => o.id === created.id)) {
      this.observations = [created, ...this.observations];
      this.notify();
    }

    return created;
  }

  public async updateObservation(updated: ObservationRecord): Promise<void> {
    await observationService.updateObservation(updated);
    this.observations = this.observations.map((o) => (o.id === updated.id ? updated : o));
    this.notify();
  }

  public async deleteObservation(id: string): Promise<void> {
    await observationService.deleteObservation(id);
    this.observations = this.observations.filter((o) => o.id !== id);
    this.notify();
  }
}

export const observationStore = new ObservationStore();
