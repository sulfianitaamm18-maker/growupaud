import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/Header';
import {
  ObservationRecord,
  ParentFeedback,
  StudentProfile,
  UserProfile,
} from './types';
import { canViewReport } from './utils/authorization';
import {
  Sprout,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

import { schoolStore } from './services/schoolStore';
import { observationStore } from './services/observationStore';
import { feedbackService } from './services/feedbackService';
import { enrichStudentWithObservations } from './utils/studentMetrics';

// Lazy loaded role-specific dashboards and heavy modals
const GuruDashboard = React.lazy(() =>
  import('./components/guru/GuruDashboard').then((m) => ({ default: m.GuruDashboard }))
);
const OrangTuaDashboard = React.lazy(() =>
  import('./components/ortu/OrangTuaDashboard').then((m) => ({ default: m.OrangTuaDashboard }))
);
const KepalaSekolahDashboard = React.lazy(() =>
  import('./components/kepsek/KepalaSekolahDashboard').then((m) => ({ default: m.KepalaSekolahDashboard }))
);
const SuperAdminDashboard = React.lazy(() =>
  import('./components/admin/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard }))
);
const ActivityAssessmentModal = React.lazy(() =>
  import('./components/guru/ActivityAssessmentModal').then((m) => ({ default: m.ActivityAssessmentModal }))
);
const ReportPreviewModal = React.lazy(() =>
  import('./components/reports/ReportPreviewModal').then((m) => ({ default: m.ReportPreviewModal }))
);

function DashboardLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500">Memuat dashboard...</p>
    </div>
  );
}

function MainApp() {
  const { userProfile, isAuthenticated, loading, logout } = useAuth();

  // Dynamic school profile
  const activeSchool = schoolStore.getSchoolProfile();

  // Active authenticated user profile
  const currentUser: UserProfile = useMemo(() => {
    if (userProfile) {
      return {
        ...userProfile,
        schoolName: activeSchool.schoolName,
      };
    }
    // Fallback minimal structure if not logged in
    return {
      id: '',
      username: '',
      name: '',
      role: 'TEACHER',
      email: '',
      avatar: '',
      schoolId: activeSchool.id || '',
      schoolName: activeSchool.schoolName,
      isActive: false,
    };
  }, [userProfile, activeSchool]);

  // Global State for Observations, Feedbacks, and Students
  const [observations, setObservations] = useState<ObservationRecord[]>(() =>
    observationStore.getObservations()
  );
  const [feedbacks, setFeedbacks] = useState<ParentFeedback[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>(() =>
    schoolStore.getStudents()
  );

  // Subscribe to observationStore and schoolStore for real-time synchronization
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !userProfile) return;

    const schoolId = userProfile.schoolId || activeSchool?.id || 'main-school';
    const role = userProfile.role || currentUser.role;
    const rawParentIds = [
      ...(userProfile.parentStudentIds || []),
      ...(userProfile.studentIds || []),
      ...(userProfile.linkedStudentIds || []),
      ...(userProfile.studentId ? [userProfile.studentId] : []),
      ...(userProfile.childId ? [userProfile.childId] : []),
    ];
    const parentStudentIds = Array.from(new Set(rawParentIds.filter(Boolean)));

    schoolStore.refreshFromFirestore(schoolId, role, parentStudentIds);
    observationStore.initForContext(schoolId, role, parentStudentIds);

    // Subscribe to real-time parent feedbacks from Firestore (school-isolated)
    const unsubFeedbacks = feedbackService.subscribeFeedbacks(
      schoolId,
      undefined,
      (data) => {
        setFeedbacks(data);
      },
      (err) => {
        console.warn('Real-time feedbacks subscription warning:', err);
      }
    );

    console.log('[DASHBOARD]\nREADY');

    const unsubObs = observationStore.subscribe(() => {
      setObservations(observationStore.getObservations());
    });
    const unsubSchool = schoolStore.subscribe(() => {
      setStudents(schoolStore.getStudents());
    });

    return () => {
      unsubFeedbacks();
      unsubObs();
      unsubSchool();
    };
  }, [loading, isAuthenticated, userProfile, activeSchool?.id, currentUser.role]);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);
  const [selectedStudentForObs, setSelectedStudentForObs] = useState<string | undefined>(undefined);
  const [editingObservation, setEditingObservation] = useState<ObservationRecord | null>(null);
  const [initialActivityIdForObs, setInitialActivityIdForObs] = useState<string | undefined>(undefined);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentProfile | null>(null);

  // Handlers
  const handleOpenNewObservation = (
    studentId?: string,
    observationToEdit?: ObservationRecord,
    initialActivityId?: string
  ) => {
    setEditingObservation(observationToEdit || null);
    setSelectedStudentForObs(studentId || observationToEdit?.studentId || students[0]?.id);
    setInitialActivityIdForObs(initialActivityId);
    setIsAssessmentModalOpen(true);
  };

  const handleSaveObservation = async (newRecord: ObservationRecord) => {
    const schoolId = activeSchool.id || currentUser.schoolId || userProfile?.schoolId || 'main-school';
    const recordWithTeacher: ObservationRecord = {
      ...newRecord,
      schoolId: schoolId,
      teacherId: currentUser.id || newRecord.teacherId,
      teacherName: currentUser.name || newRecord.teacherName,
    };

    if (editingObservation) {
      await observationStore.updateObservation(recordWithTeacher);
    } else {
      await observationStore.addObservation(recordWithTeacher);

      // Update student observations count & latest observation date in persistent schoolStore
      const currentStudents = schoolStore.getStudents();
      currentStudents.forEach((std) => {
        if (std.id === recordWithTeacher.studentId) {
          const updatedStd: StudentProfile = {
            ...std,
            observationsCount: (std.observationsCount || 0) + 1,
            latestObservationDate: recordWithTeacher.date,
          };
          schoolStore.updateStudent(updatedStd);
        }
      });
    }
  };

  const handleAddFeedback = async (newFeedback: ParentFeedback) => {
    const schoolId = userProfile?.schoolId || activeSchool?.id || 'main-school';
    setFeedbacks((prev) => [newFeedback, ...prev]);
    try {
      await feedbackService.addFeedback(newFeedback, schoolId, currentUser?.id);
    } catch (err) {
      console.error('Failed to persist feedback to Firestore:', err);
    }
  };

  const handleOpenReportPreview = (student: StudentProfile) => {
    if (student && canViewReport(currentUser, student.id, students)) {
      setSelectedStudentForReport(student);
      setIsReportModalOpen(true);
    }
  };

  // Dynamically enrich student profiles with calculated metrics derived strictly from real Firestore observations
  const enrichedStudents = useMemo(() => {
    return students.map((s) => enrichStudentWithObservations(s, observations));
  }, [students, observations]);

  // Filtered Students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrichedStudents;
    const q = searchQuery.toLowerCase();
    return enrichedStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nickname.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [enrichedStudents, searchQuery]);

  // Filtered Observations based on search query
  const filteredObservations = useMemo(() => {
    if (!searchQuery.trim()) return observations;
    const q = searchQuery.toLowerCase();
    return observations.filter(
      (o) =>
        o.studentName.toLowerCase().includes(q) ||
        o.activityTitle.toLowerCase().includes(q) ||
        o.cp.toLowerCase().includes(q) ||
        o.tp.toLowerCase().includes(q) ||
        o.teacherNote.toLowerCase().includes(q)
    );
  }, [observations, searchQuery]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4 font-sans">
        <div className="text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-pulse">
            <Sprout className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Memuat Sesi GrowUPAUD...</h2>
            <p className="text-xs text-slate-400">Verifikasi otentikasi akun sekolah</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Authenticated -> Show Login Page
  if (!isAuthenticated || !userProfile) {
    return <LoginPage />;
  }

  // Inactive Account Warning Screen
  if (!currentUser.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4 font-sans">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Akun Anda Tidak Aktif</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Akses login Anda saat ini dinonaktifkan oleh Admin Sekolah. Silakan hubungi Administrator untuk mengaktifkan kembali akun Anda.
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Kembali ke Halaman Login</span>
          </button>
        </div>
      </div>
    );
  }

  const role = currentUser.role;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Main Top Header */}
      <Header
        currentUser={currentUser}
        onOpenNewObservation={
          role === 'GURU' || role === 'TEACHER' ? () => handleOpenNewObservation() : undefined
        }
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={logout}
      />

      {/* Search results notice when searching */}
      {searchQuery.trim() !== '' && (
        <div className="bg-indigo-900 text-white py-2 px-4 text-xs font-semibold shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span>
              🔍 Hasil pencarian untuk "{searchQuery}": {filteredStudents.length}{' '}
              anak ditemukan &amp; {filteredObservations.length} observasi relevan.
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="underline text-indigo-300 hover:text-white"
            >
              Reset Pencarian
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace - Role Locked */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<DashboardLoadingFallback />}>
          {(role === 'GURU' || role === 'TEACHER') && (
            <GuruDashboard
              onOpenNewObservation={handleOpenNewObservation}
              observations={filteredObservations}
              students={enrichedStudents}
              onOpenReportPreview={handleOpenReportPreview}
            />
          )}

          {(role === 'ORANG_TUA' || role === 'PARENT') && (
            <OrangTuaDashboard
              currentUser={currentUser}
              students={enrichedStudents}
              observations={observations}
              onOpenReportPreview={handleOpenReportPreview}
              feedbacks={feedbacks}
              onAddFeedback={handleAddFeedback}
            />
          )}

          {(role === 'KEPALA_SEKOLAH' || role === 'PRINCIPAL') && (
            <KepalaSekolahDashboard
              students={filteredStudents}
              observations={filteredObservations}
              onOpenReportPreview={handleOpenReportPreview}
            />
          )}

          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && <SuperAdminDashboard />}
        </Suspense>
      </main>

      {/* Sleek Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Grow<span className="text-emerald-400">UP</span>AUD — Growth Monitoring Platform
              </p>
              <p className="text-[11px] text-slate-400">
                AI Assessment Intelligence (GAI) • Activity-Based &amp; Multi-Evidence Assessment (PAUD Kurikulum Merdeka)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sistem Akun Sekolah</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Firebase Auth Secured</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>GAI Engine 2026</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Modals with Suspense */}
      <Suspense fallback={null}>
        {isAssessmentModalOpen && (
          <ActivityAssessmentModal
            isOpen={isAssessmentModalOpen}
            onClose={() => {
              setIsAssessmentModalOpen(false);
              setEditingObservation(null);
              setInitialActivityIdForObs(undefined);
            }}
            onSaveObservation={handleSaveObservation}
            selectedStudentId={selectedStudentForObs}
            initialActivityId={initialActivityIdForObs}
            students={enrichedStudents}
            currentUser={currentUser}
            initialObservation={editingObservation}
          />
        )}

        {isReportModalOpen && (
          <ReportPreviewModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            student={selectedStudentForReport}
            observations={observations}
            currentUser={currentUser}
            students={enrichedStudents}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
