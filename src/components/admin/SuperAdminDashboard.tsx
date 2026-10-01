import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  PlusCircle,
  Edit3,
  Save,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  Calendar,
  Home,
  Sliders,
  Sparkles,
  UserPlus,
  BarChart3,
  ChevronRight,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Database,
  Shield,
  HeartHandshake,
  Trash2,
  Compass,
  Archive,
  ArrowUpRight,
} from 'lucide-react';
import {
  SchoolProfile,
  TeacherProfile,
  ClassRoom,
  ParentProfile,
  StudentProfile,
  ActivityPreset,
  ObservationRecord,
  DevelopmentalAspect,
  UserProfile,
} from '../../types';
import {
  ASPECT_LABELS,
  ASPECT_COLORS,
} from '../../data/initialData';
import { schoolStore } from '../../services/schoolStore';
import { curriculumStore } from '../../services/curriculumStore';
import { observationStore } from '../../services/observationStore';
import { userStore } from '../../services/userStore';

const UserManagementView = React.lazy(() =>
  import('./UserManagementView').then((m) => ({ default: m.UserManagementView }))
);
import { useAuth } from '../../context/AuthContext';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import {
  formatStudentAge,
  parseAgeToComponents,
  validateAgeInput,
} from '../../utils/ageUtils';

import { AdminCurriculumView } from './AdminCurriculumView';
import { AcademicYearManagementView } from './AcademicYearManagementView';
import { StudentLifecycleManagementView } from './StudentLifecycleManagementView';
import { StudentArchiveView } from './StudentArchiveView';
import { AuditLogView } from './AuditLogView';

type AdminTab =
  | 'BERANDA'
  | 'SEKOLAH'
  | 'TAHUN_AJARAN'
  | 'SIKLUS_SISWA'
  | 'ARSIP'
  | 'PENGGUNA'
  | 'ANAK'
  | 'KURIKULUM'
  | 'AUDIT_LOG'
  | 'PENGATURAN';

type AnakSubTab = 'SISWA' | 'KELAS';

export const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();

  // Access Control: Only ADMIN or SUPER_ADMIN
  if (
    !userProfile ||
    (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')
  ) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl font-bold space-y-3 my-8">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold">AKSES DITOLAK</h3>
        <p className="text-xs text-rose-700 font-medium max-w-md mx-auto">
          Halaman Admin Dashboard hanya dapat diakses oleh Admin Sekolah.
        </p>
      </div>
    );
  }

  // 1. Data Store States (Single-School Persistence)
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() =>
    schoolStore.getSchoolProfile()
  );
  const [classes, setClasses] = useState<ClassRoom[]>(() =>
    schoolStore.getClasses()
  );
  const [students, setStudents] = useState<StudentProfile[]>(() =>
    schoolStore.getStudents()
  );
  const [teachers, setTeachers] = useState<TeacherProfile[]>(() =>
    schoolStore.getTeachers()
  );
  const [parents, setParents] = useState<ParentProfile[]>(() =>
    schoolStore.getParents()
  );
  const [activities, setActivities] = useState<ActivityPreset[]>(() =>
    curriculumStore.getActivities()
  );
  const [observations, setObservations] = useState<ObservationRecord[]>(() =>
    observationStore.getObservations()
  );

  // Users from Firestore users collection
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Active Menu Tabs
  const [activeTab, setActiveTab] = useState<AdminTab>('BERANDA');
  const [anakSubTab, setAnakSubTab] = useState<AnakSubTab>('SISWA');
  const [penggunaSubTab, setPenggunaSubTab] = useState<'ALL_USERS' | 'PARENT_SYNC'>('ALL_USERS');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Toast / Success Messages
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Initial Data Fetching directly from Firestore
  const loadAllFirestoreData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const schoolId = userProfile?.schoolId || 'main-school';
      if (!schoolStore.getIsInitialized()) {
        await schoolStore.refreshFromFirestore(schoolId, userProfile?.role);
      }
      const userList = await userStore.getAllUserProfiles(schoolId);
      setAllUsers(userList);
      setSchoolProfile(schoolStore.getSchoolProfile());
      setClasses(schoolStore.getClasses());
      setStudents(schoolStore.getStudents());
      setTeachers(schoolStore.getTeachers());
      setParents(schoolStore.getParents());
    } catch (err: any) {
      setFetchError(
        err.message || 'Data belum dapat dimuat. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllFirestoreData();

    const unsubSchool = schoolStore.subscribe(() => {
      setSchoolProfile(schoolStore.getSchoolProfile());
      setClasses(schoolStore.getClasses());
      setStudents(schoolStore.getStudents());
      setTeachers(schoolStore.getTeachers());
      setParents(schoolStore.getParents());
    });
    const unsubObs = observationStore.subscribe(() => {
      setObservations(observationStore.getObservations());
    });
    const unsubCurr = curriculumStore.subscribe(() => {
      setActivities(curriculumStore.getActivities());
    });

    return () => {
      unsubSchool();
      unsubObs();
      unsubCurr();
    };
  }, []);

  // ----------------------------------------------------
  // MODAL STATES
  // ----------------------------------------------------
  // Modal Tambah / Edit Anak
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(
    null
  );
  const [studentForm, setStudentForm] = useState({
    name: '',
    nickname: '',
    ageYears: 5,
    ageMonths: 0,
    gender: 'L' as 'L' | 'P',
    className: '',
    parentName: '',
    parentContact: '',
  });

  // Modal Tambah / Edit Kelas
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    teacherId: '',
    teacherName: '',
  });

  // Modal Konfirmasi Hapus Kelas
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Form School Profile
  const [profileForm, setProfileForm] = useState<SchoolProfile>(schoolProfile);

  useEffect(() => {
    setProfileForm(schoolProfile);
  }, [schoolProfile]);

  // ----------------------------------------------------
  // REAL FIRESTORE CALCULATIONS & USER SUMMARIES
  // ----------------------------------------------------
  const totalStudents = students.length;
  const totalClasses = classes.length;

  const totalTeachersCount = useMemo(() => {
    return allUsers.filter(
      (u) => (u.role === 'TEACHER' || u.role === 'GURU') && u.isActive !== false
    ).length;
  }, [allUsers]);

  const totalPrincipalsCount = useMemo(() => {
    return allUsers.filter(
      (u) =>
        (u.role === 'PRINCIPAL' || u.role === 'KEPALA_SEKOLAH') &&
        u.isActive !== false
    ).length;
  }, [allUsers]);

  const totalParentsCount = useMemo(() => {
    return allUsers.filter(
      (u) => (u.role === 'PARENT' || u.role === 'ORANG_TUA') && u.isActive !== false
    ).length;
  }, [allUsers]);

  const totalAdminsCount = useMemo(() => {
    return allUsers.filter(
      (u) => (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && u.isActive !== false
    ).length;
  }, [allUsers]);

  // School Profile Completeness Check
  const isProfileComplete = useMemo(() => {
    return Boolean(
      schoolProfile.schoolName?.trim() &&
        schoolProfile.address?.trim() &&
        schoolProfile.phone?.trim() &&
        schoolProfile.email?.trim() &&
        schoolProfile.principalName?.trim() &&
        schoolProfile.academicYear?.trim() &&
        schoolProfile.semester?.trim()
    );
  }, [schoolProfile]);

  // ----------------------------------------------------
  // HANDLERS: PROFILE
  // ----------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await schoolStore.saveSchoolProfile(profileForm);
      setSchoolProfile(profileForm);
      showToast('Profil sekolah berhasil disimpan!');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan profil sekolah.');
    }
  };

  // ----------------------------------------------------
  // HANDLERS: STUDENT
  // ----------------------------------------------------
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      name: '',
      nickname: '',
      ageYears: 5,
      ageMonths: 0,
      gender: 'L',
      className: classes[0]?.name || 'TK-A',
      parentName: '',
      parentContact: '',
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingStudent) return;
    if (!studentForm.name.trim()) return;

    // Validate age inputs
    const ageValidation = validateAgeInput(studentForm.ageYears, studentForm.ageMonths);
    if (!ageValidation.isValid) {
      showToast(ageValidation.errorMessage || 'Format umur tidak valid.');
      return;
    }

    const formattedAgeLabel = `${studentForm.ageYears} tahun ${studentForm.ageMonths} bulan`;

    setIsSavingStudent(true);
    try {
      if (editingStudent) {
        const updated: StudentProfile = {
          ...editingStudent,
          name: studentForm.name.trim(),
          nickname:
            studentForm.nickname.trim() || studentForm.name.trim().split(' ')[0],
          age: formattedAgeLabel,
          ageYears: studentForm.ageYears,
          ageMonths: studentForm.ageMonths,
          ageLabel: formattedAgeLabel,
          gender: studentForm.gender,
          className: studentForm.className,
          parentName: studentForm.parentName.trim() || '-',
          parentContact: studentForm.parentContact.trim() || '-',
        };
        await schoolStore.updateStudent(updated);
        showToast(`Data anak "${updated.name}" berhasil diperbarui.`);
      } else {
        const created = await schoolStore.addStudent({
          name: studentForm.name.trim(),
          nickname:
            studentForm.nickname.trim() || studentForm.name.trim().split(' ')[0],
          age: formattedAgeLabel,
          ageYears: studentForm.ageYears,
          ageMonths: studentForm.ageMonths,
          ageLabel: formattedAgeLabel,
          gender: studentForm.gender,
          className: studentForm.className,
          parentName: studentForm.parentName.trim() || '-',
          parentContact: studentForm.parentContact.trim() || '-',
          avatar: '',
          attendanceRate: 100,
          overallScore: null,
          aspectScores: {
            NAM: null,
            JATI_DIRI: null,
            LITERASI_STEAM: null,
            MOTORIK_KASAR: null,
            MOTORIK_HALUS: null,
            KOGNITIF: null,
          },
          observationsCount: 0,
          reportStatus: 'PROSES',
          latestObservationDate: '-',
          timeline: [],
        });
        showToast(`Data anak "${created.name}" berhasil ditambahkan.`);
      }
      setStudents(schoolStore.getStudents());
      setIsStudentModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data anak.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"?`)) {
      try {
        await schoolStore.deleteStudent(id);
        setStudents(schoolStore.getStudents());
        showToast(`Siswa "${name}" berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message || 'Gagal menghapus data siswa.');
      }
    }
  };

  // ----------------------------------------------------
  // HANDLERS: CLASS
  // ----------------------------------------------------
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassForm({
      name: '',
      teacherId: '',
      teacherName: '',
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) return;

    try {
      if (editingClass) {
        await schoolStore.updateClass({
          ...editingClass,
          name: classForm.name.trim(),
          teacherId: classForm.teacherId,
          teacherName: classForm.teacherName,
        });
        showToast(`Data kelas "${classForm.name}" berhasil diperbarui.`);
      } else {
        const created = await schoolStore.addClass({
          name: classForm.name.trim(),
          teacherId: classForm.teacherId || '-',
          teacherName: classForm.teacherName || 'Belum Ditugaskan',
          academicYear: schoolProfile.academicYear,
          studentsCount: 0,
        });
        showToast(`Kelas baru "${created.name}" berhasil ditambahkan.`);
      }

      setClasses(schoolStore.getClasses());
      setIsClassModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data kelas.');
    }
  };

  const studentsInClassToDelete = useMemo(() => {
    if (!classToDelete) return 0;
    return students.filter((s) =>
      s.className.toLowerCase().includes(classToDelete.name.toLowerCase())
    ).length;
  }, [classToDelete, students]);

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;

    // 1. Authorization check
    if (
      !userProfile ||
      (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN') ||
      userProfile.isActive === false
    ) {
      showToast('Akses ditolak: Hanya Admin aktif yang dapat menghapus kelas.');
      return;
    }

    // 2. Student safety check: Do not delete if class still has students
    if (studentsInClassToDelete > 0) {
      showToast(
        `Kelas masih memiliki ${studentsInClassToDelete} siswa. Pindahkan siswa ke kelas lain terlebih dahulu sebelum menghapus kelas.`
      );
      return;
    }

    try {
      setIsDeletingClass(true);
      await schoolStore.deleteClass(classToDelete.id);
      setClasses(schoolStore.getClasses());
      showToast('Kelas berhasil dihapus.');
      setClassToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data kelas dari Firestore.');
    } finally {
      setIsDeletingClass(false);
    }
  };

  // ----------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------
  const filteredStudentsList = useMemo(() => {
    return students.filter((s) => {
      const matchQuery =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass =
        classFilter === 'ALL' ||
        s.className.toLowerCase().includes(classFilter.toLowerCase());
      return matchQuery && matchClass;
    });
  }, [students, searchQuery, classFilter]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4 my-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">
            Memuat Data Admin Sekolah dari Firestore...
          </h3>
          <p className="text-xs text-slate-500">
            Mengambil data profil, pengguna, kelas, dan siswa
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (fetchError) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl space-y-4 my-6">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold">
            Data belum dapat dimuat. Silakan coba lagi.
          </h3>
          <p className="text-xs text-rose-700">{fetchError}</p>
        </div>
        <button
          onClick={loadAllFirestoreData}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER DASHBOARD ADMIN SEKOLAH */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isProfileComplete
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isProfileComplete ? 'Profil Lengkap' : 'Profil Belum Lengkap'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {schoolProfile.schoolName || 'Belum ada data sekolah'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Tahun Ajaran:{' '}
              <strong className="text-white">
                {schoolProfile.academicYear || '2026/2027'}
              </strong>{' '}
              •{' '}
              <strong className="text-white">
                {schoolProfile.semester || 'Semester I (Ganjil)'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SEKOLAH')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Profil Sekolah</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN NAVIGATION MENU */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('BERANDA')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'BERANDA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('SEKOLAH')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'SEKOLAH'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span>Data Sekolah</span>
        </button>

        <button
          onClick={() => setActiveTab('TAHUN_AJARAN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'TAHUN_AJARAN'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>Tahun Ajaran</span>
        </button>

        <button
          onClick={() => setActiveTab('SIKLUS_SISWA')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'SIKLUS_SISWA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          <span>Kenaikan &amp; Siklus Siswa</span>
        </button>

        <button
          onClick={() => setActiveTab('ARSIP')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ARSIP'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Archive className="w-4 h-4 text-purple-500" />
          <span>Arsip Siswa</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('PENGGUNA');
            setPenggunaSubTab('ALL_USERS');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PENGGUNA' && penggunaSubTab === 'ALL_USERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          <span>Data Pengguna</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('PENGGUNA');
            setPenggunaSubTab('PARENT_SYNC');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PENGGUNA' && penggunaSubTab === 'PARENT_SYNC'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-indigo-500" />
          <span>Sinkronisasi Orang Tua</span>
        </button>

        <button
          onClick={() => setActiveTab('ANAK')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ANAK'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-amber-500" />
          <span>Data Anak</span>
        </button>

        <button
          onClick={() => setActiveTab('KURIKULUM')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'KURIKULUM'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <span>Kurikulum &amp; ATP</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOG')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'AUDIT_LOG'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Log Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('PENGATURAN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PENGATURAN'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Pengaturan</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: DASHBOARD                                     */}
      {/* ==================================================== */}
      {activeTab === 'BERANDA' && (
        <div className="space-y-6">
          {/* PROFILE INCOMPLETE WARNING BANNER */}
          {!isProfileComplete && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Profil sekolah belum lengkap.
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Lengkapi identitas sekolah agar laporan resmi dapat dibuat.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('SEKOLAH')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
              >
                Lengkapi Profil
              </button>
            </div>
          )}

          {/* REAL DATA SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Siswa
                </p>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {totalStudents}
              </h3>
              <p className="text-indigo-600 text-[11px] font-medium mt-1">
                Siswa terdaftar
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Kelas
                </p>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {totalClasses}
              </h3>
              <p className="text-amber-600 text-[11px] font-medium mt-1">
                Kelas aktif
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Guru
                </p>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <GraduationCap className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {totalTeachersCount}
              </h3>
              <p className="text-emerald-600 text-[11px] font-medium mt-1">
                Akun guru aktif
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Orang Tua
                </p>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <HeartHandshake className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {totalParentsCount}
              </h3>
              <p className="text-blue-600 text-[11px] font-medium mt-1">
                Akun ortu aktif
              </p>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Aksi Cepat Admin</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setActiveTab('PENGGUNA')}
                className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>+ Tambah Guru</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('ANAK');
                  setAnakSubTab('KELAS');
                  handleOpenAddClass();
                }}
                className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-amber-600" />
                <span>+ Tambah Kelas</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('ANAK');
                  setAnakSubTab('SISWA');
                  handleOpenAddStudent();
                }}
                className="p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-5 h-5 text-indigo-600" />
                <span>+ Tambah Siswa</span>
              </button>

              <button
                onClick={() => setActiveTab('SEKOLAH')}
                className="p-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Settings className="w-5 h-5 text-slate-600" />
                <span>Lengkapi Profil Sekolah</span>
              </button>
            </div>
          </div>

          {/* EMPTY STATES & SUMMARY PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* USER SUMMARY PANEL */}
            <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Ringkasan Pengguna (Firestore)</span>
                </h3>
                <button
                  onClick={() => setActiveTab('PENGGUNA')}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Kelola Pengguna
                </button>
              </div>

              {totalTeachersCount === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada guru.
                  </p>
                  <button
                    onClick={() => setActiveTab('PENGGUNA')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                  >
                    + Tambah Guru
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Guru</span>
                    <span className="font-bold text-slate-900">
                      {totalTeachersCount} pengguna
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Kepala Sekolah
                    </span>
                    <span className="font-bold text-slate-900">
                      {totalPrincipalsCount} pengguna
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Orang Tua
                    </span>
                    <span className="font-bold text-slate-900">
                      {totalParentsCount} pengguna
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Admin</span>
                    <span className="font-bold text-slate-900">
                      {totalAdminsCount} pengguna
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STUDENT & CLASS SUMMARY PANEL */}
            <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Ringkasan Data Anak & Kelas</span>
                </h3>
                <button
                  onClick={() => setActiveTab('ANAK')}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Kelola Data Anak
                </button>
              </div>

              {totalClasses === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada kelas.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('ANAK');
                      setAnakSubTab('KELAS');
                      handleOpenAddClass();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                  >
                    + Tambah Kelas
                  </button>
                </div>
              ) : totalStudents === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada siswa.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('ANAK');
                      setAnakSubTab('SISWA');
                      handleOpenAddStudent();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                  >
                    + Tambah Siswa
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Total Siswa Terdaftar
                    </span>
                    <span className="font-bold text-indigo-700">
                      {totalStudents} anak
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Total Kelas Aktif
                    </span>
                    <span className="font-bold text-amber-700">
                      {totalClasses} kelas
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: DATA SEKOLAH -> PROFIL SEKOLAH                */}
      {/* ==================================================== */}
      {activeTab === 'SEKOLAH' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Profil & Identitas Satuan PAUD
              </h3>
              <p className="text-xs text-slate-500">
                Identitas sekolah digunakan dalam dokumen dan rapor resmi.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isProfileComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isProfileComplete
                ? '✓ Profil Lengkap'
                : '⚠️ Profil Belum Lengkap'}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Satuan PAUD / TK *
              </label>
              <input
                type="text"
                required
                value={profileForm.schoolName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, schoolName: e.target.value })
                }
                placeholder="Contoh: PAUD Terpadu Kasih Ibu"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kepala Sekolah *
              </label>
              <input
                type="text"
                required
                value={profileForm.principalName}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    principalName: e.target.value,
                  })
                }
                placeholder="Contoh: Ibu Hj. Siti Rahmah, S.Pd"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap *
              </label>
              <textarea
                rows={2}
                required
                value={profileForm.address}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, address: e.target.value })
                }
                placeholder="Alamat lengkap sekolah..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Telepon *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Resmi *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                  placeholder="admin@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Ajaran *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.academicYear}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      academicYear: e.target.value,
                    })
                  }
                  placeholder="2026/2027"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester *
                </label>
                <select
                  value={profileForm.semester}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, semester: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="Semester I (Ganjil)">Semester I (Ganjil)</option>
                  <option value="Semester II (Genap)">Semester II (Genap)</option>
                </select>
              </div>
            </div>

            {/* KONTEKS SEKOLAH UNTUK REKOMENDASI PEDAGOGIS & AI */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Konteks Lingkungan &amp; Budaya Sekolah (Digunakan AI &amp; Pedagogi)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Informasi ini membantu mesin AI menghasilkan saran kegiatan yang sesuai dengan kondisi nyata lingkungan sekolah Anda (Culturally Responsive Teaching &amp; Loose Parts).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Lokasi Satuan PAUD
                </label>
                <select
                  value={profileForm.locationCategory || 'Suburban / Pinggiran Kota'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      locationCategory: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Perkotaan / Pusat Kota">Perkotaan / Pusat Kota</option>
                  <option value="Suburban / Pinggiran Kota">Suburban / Pinggiran Kota</option>
                  <option value="Pedesaan / Agraris">Pedesaan / Agraris</option>
                  <option value="Pesisir / Daerah Pantai">Pesisir / Daerah Pantai</option>
                  <option value="Pegunungan / Dataran Tinggi">Pegunungan / Dataran Tinggi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konteks Budaya Lokal
                </label>
                <input
                  type="text"
                  value={profileForm.culturalContext || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      culturalContext: e.target.value,
                    })
                  }
                  placeholder="Contoh: Kearifan lokal Sunda, gotong royong, kesenian wayang/angklung..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ketersediaan Bahan Alam &amp; Loose Parts (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(profileForm.availableMediaTypes)
                      ? profileForm.availableMediaTypes.join(', ')
                      : profileForm.availableMediaTypes || ''
                  }
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      availableMediaTypes: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Contoh: Daun kering, ranting, batu kali, kardus bekas, tutup botol"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sarana &amp; Prasarana Sekolah
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(profileForm.schoolFacilities)
                      ? profileForm.schoolFacilities.join(', ')
                      : profileForm.schoolFacilities || ''
                  }
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      schoolFacilities: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Contoh: Kebun sekolah, area bermain pasir, sudut baca anak"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil Sekolah</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: DATA PENGGUNA                                 */}
      {/* ==================================================== */}
      {activeTab === 'PENGGUNA' && (
        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-500">Memuat manajemen pengguna...</p>
              </div>
            }
          >
            <UserManagementView initialSubTab={penggunaSubTab} />
          </Suspense>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: DATA ANAK (SISWA & KELAS)                     */}
      {/* ==================================================== */}
      {activeTab === 'ANAK' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnakSubTab('SISWA')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  anakSubTab === 'SISWA'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Siswa ({students.length})
              </button>
              <button
                onClick={() => setAnakSubTab('KELAS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  anakSubTab === 'KELAS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Kelas ({classes.length})
              </button>
            </div>

            {anakSubTab === 'SISWA' ? (
              <button
                onClick={handleOpenAddStudent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah Siswa</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddClass}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>+ Tambah Kelas</span>
              </button>
            )}
          </div>

          {/* SUB TAB: SISWA */}
          {anakSubTab === 'SISWA' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredStudentsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  Belum ada siswa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Panggilan</th>
                        <th className="py-3 px-4">Umur</th>
                        <th className="py-3 px-4">L/P</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Orang Tua</th>
                        <th className="py-3 px-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredStudentsList.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {s.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {s.nickname}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                              {formatStudentAge(s)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold">{s.gender}</td>
                          <td className="py-3.5 px-4 font-bold text-indigo-700">
                            {s.className}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {s.parentName}
                          </td>
                          <td className="py-3.5 px-4 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const parsedAge = parseAgeToComponents(s.ageYears ?? s.age, s.ageMonths);
                                setEditingStudent(s);
                                setStudentForm({
                                  name: s.name,
                                  nickname: s.nickname,
                                  ageYears: parsedAge.years,
                                  ageMonths: parsedAge.months,
                                  gender: s.gender,
                                  className: s.className,
                                  parentName: s.parentName,
                                  parentContact: s.parentContact,
                                });
                                setIsStudentModalOpen(true);
                              }}
                              className="text-xs text-indigo-600 font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.id, s.name)}
                              className="text-xs text-rose-600 font-bold hover:underline"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB TAB: KELAS */}
          {anakSubTab === 'KELAS' && (
            <div className="space-y-4">
              {classes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  Belum ada kelas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {classes.map((cls) => {
                    const countStudentsInClass = students.filter((s) =>
                      s.className.toLowerCase().includes(cls.name.toLowerCase())
                    ).length;

                    return (
                      <div
                        key={cls.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold">
                            {cls.id}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {cls.academicYear}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {cls.name}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1">
                            Wali Kelas:{' '}
                            <strong className="text-slate-800">
                              {cls.teacherName || '-'}
                            </strong>
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            Jumlah Siswa:
                          </span>
                          <span className="font-extrabold text-indigo-700">
                            {countStudentsInClass} Siswa
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingClass(cls);
                              setClassForm({
                                name: cls.name,
                                teacherId: cls.teacherId,
                                teacherName: cls.teacherName,
                              });
                              setIsClassModalOpen(true);
                            }}
                            className="p-1.5 px-3 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors font-bold flex items-center gap-1.5 text-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Kelas</span>
                          </button>
                          <button
                            onClick={() => setClassToDelete(cls)}
                            className="p-1.5 px-3 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors font-bold flex items-center gap-1.5 text-xs cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: KURIKULUM & ATP                                 */}
      {/* ==================================================== */}
      {activeTab === 'KURIKULUM' && <AdminCurriculumView />}

      {/* ==================================================== */}
      {/* TAB 5: PENGATURAN                                    */}
      {/* ==================================================== */}
      {activeTab === 'PENGATURAN' && (
        <div className="space-y-6 max-w-2xl">
          {/* Admin Profile & Photo Card */}
          {userProfile && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Profil &amp; Foto Akun Administrator
                </h3>
                <p className="text-xs text-slate-500">
                  Foto profil Anda saat mengelola aplikasi sekolah.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <ProfilePhotoUploader
                  currentAvatar={userProfile.avatar}
                  userName={userProfile.name}
                  userId={userProfile.id}
                />
              </div>
            </div>
          )}

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Pengaturan Sistem &amp; Tahun Ajaran
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi umum aplikasi GrowUPAUD sekolah.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Ajaran Aktif *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.academicYear}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      academicYear: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester Aktif *
                </label>
                <select
                  value={profileForm.semester}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, semester: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="Semester I (Ganjil)">Semester I (Ganjil)</option>
                  <option value="Semester II (Genap)">Semester II (Genap)</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700">
                Status Sistem &amp; Database
              </h4>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-600">
                  • <strong>Database:</strong> Firebase Firestore (Aktif)
                </p>
                <p className="text-slate-600">
                  • <strong>Otentikasi:</strong> Firebase Auth Secured
                </p>
                <p className="text-slate-600">
                  • <strong>Sistem Sekolah:</strong> Single-School (main-school)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: TAHUN AJARAN                                   */}
      {/* ==================================================== */}
      {activeTab === 'TAHUN_AJARAN' && (
        <AcademicYearManagementView schoolId={schoolProfile.id || 'main-school'} />
      )}

      {/* ==================================================== */}
      {/* TAB: SIKLUS SISWA                                   */}
      {/* ==================================================== */}
      {activeTab === 'SIKLUS_SISWA' && (
        <StudentLifecycleManagementView schoolId={schoolProfile.id || 'main-school'} />
      )}

      {/* ==================================================== */}
      {/* TAB: ARSIP SISWA                                    */}
      {/* ==================================================== */}
      {activeTab === 'ARSIP' && (
        <StudentArchiveView schoolId={schoolProfile.id || 'main-school'} />
      )}

      {/* ==================================================== */}
      {/* TAB: AUDIT LOG                                      */}
      {/* ==================================================== */}
      {activeTab === 'AUDIT_LOG' && (
        <AuditLogView schoolId={schoolProfile.id || 'main-school'} />
      )}

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT ANAK                            */}
      {/* ==================================================== */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </span>
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  placeholder="Contoh: Aisyah Putri Azzahra"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Panggilan
                  </label>
                  <input
                    type="text"
                    value={studentForm.nickname}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        nickname: e.target.value,
                      })
                    }
                    placeholder="Aisyah"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    L/P
                  </label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        gender: e.target.value as 'L' | 'P',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Umur Anak *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={12}
                      required
                      value={studentForm.ageYears}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          ageYears: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full px-3 py-2 pr-14 border border-slate-300 rounded-xl focus:outline-none font-semibold text-slate-800"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                      Tahun
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={11}
                      required
                      value={studentForm.ageMonths}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          ageMonths: Math.max(0, Math.min(11, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                      className="w-full px-3 py-2 pr-14 border border-slate-300 rounded-xl focus:outline-none font-semibold text-slate-800"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                      Bulan
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format tersimpan: <strong className="text-indigo-700">{studentForm.ageYears} tahun {studentForm.ageMonths} bulan</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kelas *
                </label>
                <select
                  value={studentForm.className}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, className: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Orang Tua
                </label>
                <input
                  type="text"
                  value={studentForm.parentName}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, parentName: e.target.value })
                  }
                  placeholder="Bapak Ahmad"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-opacity cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingStudent ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: TAMBAH KELAS                                  */}
      {/* ==================================================== */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <span>
                  {editingClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
                </span>
              </h3>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kelas *
                </label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({ ...classForm, name: e.target.value })
                  }
                  placeholder="Contoh: TK Kelompok A"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Guru Pengampu (Wali Kelas)
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) => {
                    const tch = teachers.find((t) => t.id === e.target.value);
                    setClassForm({
                      ...classForm,
                      teacherId: e.target.value,
                      teacherName: tch ? tch.name : '',
                    });
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="">Pilih Guru Pengampu...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: KONFIRMASI HAPUS KELAS                        */}
      {/* ==================================================== */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>Hapus kelas ini?</span>
              </h3>
              <button
                onClick={() => setClassToDelete(null)}
                disabled={isDeletingClass}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informasi Detail Kelas */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nama Kelas:</span>
                <strong className="text-slate-900 font-bold text-sm">
                  {classToDelete.name}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kode Kelas:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-bold text-[11px]">
                  {classToDelete.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Tahun Ajaran:</span>
                <strong className="text-slate-700">
                  {classToDelete.academicYear || schoolProfile.academicYear}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Wali Kelas:</span>
                <strong className="text-slate-700">
                  {classToDelete.teacherName || '-'}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500 font-medium">Jumlah Siswa:</span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded-md ${
                    studentsInClassToDelete > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {studentsInClassToDelete} Siswa
                </span>
              </div>
            </div>

            {/* Peringatan & Proteksi Siswa */}
            {studentsInClassToDelete > 0 ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-900">
                    Penghapusan Ditolak
                  </p>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Kelas masih memiliki {studentsInClassToDelete} siswa. Pindahkan siswa ke kelas lain terlebih dahulu sebelum menghapus kelas.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Data kelas akan dihapus dan tindakan ini tidak dapat dibatalkan.
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                disabled={isDeletingClass}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              {studentsInClassToDelete === 0 ? (
                <button
                  type="button"
                  onClick={handleConfirmDeleteClass}
                  disabled={isDeletingClass}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingClass ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Kelas</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed flex items-center gap-1.5"
                  title="Pindahkan siswa terlebih dahulu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kelas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
