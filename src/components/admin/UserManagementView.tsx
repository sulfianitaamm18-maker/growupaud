import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Edit3,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  X,
  AlertCircle,
  Shield,
  GraduationCap,
  Building2,
  HeartHandshake,
  RefreshCw,
  Plus,
  Trash2,
  Wrench,
  ShieldAlert,
  Link as LinkIcon,
  BookOpen,
  Sparkles,
  FileSpreadsheet,
  Copy,
  Check,
} from 'lucide-react';
import { userStore } from '../../services/userStore';
import { schoolStore } from '../../services/schoolStore';
import { auth, formatAuthEmail, updatePassword } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, StudentProfile, ClassRoom } from '../../types';
import { ParentSyncManagementView } from './ParentSyncManagementView';

interface UserManagementViewProps {
  initialSubTab?: 'ALL_USERS' | 'PARENT_SYNC';
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ initialSubTab = 'ALL_USERS' }) => {
  const { userProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'ALL_USERS' | 'PARENT_SYNC'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl font-bold space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold">AKSES DITOLAK</h3>
        <p className="text-xs text-rose-700 font-medium">
          Halaman Manajemen Pengguna hanya dapat diakses oleh Admin Sekolah.
        </p>
      </div>
    );
  }

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const schoolId = userProfile?.schoolId || 'main-school';
    return userStore.getCachedUserProfiles(schoolId) || [];
  });
  const [students, setStudents] = useState<StudentProfile[]>(() => schoolStore.getStudents());
  const [classes, setClasses] = useState<ClassRoom[]>(() => schoolStore.getClasses());
  const [isLoadingData, setIsLoadingData] = useState<boolean>(() => {
    const schoolId = userProfile?.schoolId || 'main-school';
    const cached = userStore.getCachedUserProfiles(schoolId);
    return !(cached && cached.length > 0);
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isInitialFetchDone = useRef<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active selected user for Edit, Reset Password, or Delete
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Explicit Class Assignment Modal State (Requirement 6: separated from activation)
  const [isAssignClassModalOpen, setIsAssignClassModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<UserProfile | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [confirmReplaceTeacher, setConfirmReplaceTeacher] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'TEACHER' as 'PRINCIPAL' | 'TEACHER' | 'PARENT',
    isActive: true,
    selectedStudentIds: [] as string[],
    selectedClassName: '',
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'TEACHER' as UserRole,
    isActive: true,
    selectedStudentIds: [] as string[],
    selectedClassName: '',
  });

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [issuedTempPassword, setIssuedTempPassword] = useState<string | null>(null);
  const [copiedTemp, setCopiedTemp] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Audit & Sync State (Requirement 10 & 3: Identification and Repair of Auth users without Firestore profile)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [authStatusList, setAuthStatusList] = useState<
    Array<{
      uid: string;
      email: string;
      displayName: string;
      authExists: boolean;
      profileExists: boolean;
      profile: UserProfile | null;
    }>
  >([]);
  const [isLoadingAuthStatus, setIsLoadingAuthStatus] = useState(false);
  const [syncTarget, setSyncTarget] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);
  const [syncForm, setSyncForm] = useState({
    name: '',
    username: '',
    role: 'TEACHER' as 'PRINCIPAL' | 'TEACHER' | 'PARENT',
    selectedClassName: '',
    selectedStudentIds: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    const schoolId = userProfile.schoolId || 'main-school';
    const cached = userStore.getCachedUserProfiles(schoolId);

    if (!isInitialFetchDone.current) {
      isInitialFetchDone.current = true;
      if (!cached || cached.length === 0) {
        loadData(false, false);
      } else {
        console.log(`[USER MANAGEMENT] Initialized from cache with ${cached.length} users`);
      }
    }

    const unsubSchool = schoolStore.subscribe(() => {
      setStudents(schoolStore.getStudents());
      setClasses(schoolStore.getClasses());
    });
    return () => {
      unsubSchool();
    };
  }, [userProfile.id, userProfile.schoolId]);

  const loadData = async (isSilent: boolean = false, forceRefresh: boolean = false) => {
    const schoolId = userProfile.schoolId || 'main-school';
    if (!isSilent) {
      setIsLoadingData(true);
    }
    setFetchError(null);
    console.log('[USER MANAGEMENT]\nFETCH START');

    try {
      const list = await userStore.getAllUserProfiles(schoolId, forceRefresh);
      const safeList = Array.isArray(list) ? list : [];
      console.log(`[USER MANAGEMENT]\nFETCH SUCCESS\ncount = ${safeList.length}`);
      
      setUsers(safeList);
      schoolStore.syncTeachersAndParentsFromUsers(safeList, false);
      setStudents(schoolStore.getStudents());
      setClasses(schoolStore.getClasses());

      console.log(`[USER MANAGEMENT]\nSTATE UPDATE\nusers = ${safeList.length}\nloading = false`);
      console.log('[USER MANAGEMENT]\nRENDER READY');
    } catch (e: any) {
      console.error('[USER MANAGEMENT]\nFETCH ERROR', e);
      setFetchError(
        e?.message || 'Tidak dapat memuat data pengguna sekolah. Periksa izin akses atau koneksi Firestore.'
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ------------------------------------
  // ADD USER HANDLER
  // ------------------------------------
  const handleOpenAddModal = (presetRole?: 'PRINCIPAL' | 'TEACHER' | 'PARENT') => {
    const defaultClasses = schoolStore.getClasses();
    setAddForm({
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: presetRole || 'TEACHER',
      isActive: true,
      selectedStudentIds: [],
      selectedClassName: defaultClasses[0]?.name || '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = addForm.name.trim();
    const username = addForm.username.trim().toLowerCase();
    const password = addForm.password;
    const confirmPassword = addForm.confirmPassword;

    // 1. Basic empty check
    if (!name || !username || !password || !confirmPassword) {
      setFormError('Nama lengkap, username, password, dan konfirmasi password wajib diisi.');
      return;
    }

    // 2. Password match check (Validation 7)
    if (password !== confirmPassword) {
      setFormError('Konfirmasi password tidak cocok.');
      return;
    }

    // 3. Password length check
    if (password.length < 6) {
      setFormError('Password minimal 6 karakter.');
      return;
    }

    // 4. Check duplicate username (Validation 6)
    const existingInList = users.find((u) => u.username.toLowerCase() === username);
    const existingInStore = await userStore.getUserProfileByUsername(username);
    if (existingInList || existingInStore) {
      setFormError('Username sudah digunakan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const school = schoolStore.getSchoolProfile();
      // Atomic creation: creates Firebase Auth account and users/{uid} document simultaneously
      await userStore.adminCreateUser({
        username,
        password,
        name,
        role: addForm.role,
        schoolId: userProfile.schoolId || school.id || 'main-school',
        schoolName: school.schoolName || 'Sekolah PAUD',
        className: addForm.role === 'TEACHER' ? addForm.selectedClassName : undefined,
        selectedStudentIds: addForm.selectedStudentIds,
        isActive: addForm.isActive,
      });

      await loadData(true);
      showToast('Pengguna dan profil Firestore berhasil dibuat melalui backend Firebase Admin SDK.');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('adminCreateUser failed:', err);
      setFormError(err.message || 'Gagal membuat pengguna melalui server Firebase Admin SDK.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------
  // AUDIT & SYNC HANDLERS (Requirement 10 & 3)
  // ------------------------------------
  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setIsLoadingAuthStatus(true);
    try {
      const list = await userStore.getAuthUsersStatus();
      setAuthStatusList(list);
    } catch (e: any) {
      showToast('Gagal memuat audit akun: ' + (e.message || 'Error'));
    } finally {
      setIsLoadingAuthStatus(false);
    }
  };

  const handleOpenSyncModal = (target: { uid: string; email: string; displayName: string }) => {
    setSyncTarget(target);
    const cleanUsername = (target.email ? target.email.split('@')[0] : target.displayName || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    const defaultClasses = schoolStore.getClasses();
    setSyncForm({
      name: target.displayName || cleanUsername,
      username: cleanUsername,
      role: 'TEACHER',
      selectedClassName: defaultClasses[0]?.name || '',
      selectedStudentIds: [],
      isActive: true,
    });
    setFormError(null);
    setIsSyncModalOpen(true);
  };

  const handleExecuteSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncTarget) return;
    setIsSubmitting(true);
    setFormError(null);

    const name = syncForm.name.trim();
    const username = syncForm.username.trim().toLowerCase();
    if (!name || !username) {
      setFormError('Nama lengkap dan username wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    try {
      const school = schoolStore.getSchoolProfile();
      await userStore.adminSyncProfile({
        uid: syncTarget.uid,
        username,
        name,
        role: syncForm.role,
        schoolId: userProfile.schoolId || school.id || 'main-school',
        schoolName: school.schoolName || 'Sekolah PAUD',
        className: syncForm.role === 'TEACHER' ? syncForm.selectedClassName : undefined,
        selectedStudentIds: syncForm.selectedStudentIds,
        isActive: syncForm.isActive,
      });

      showToast(`Profil Firestore berhasil disinkronkan untuk UID ${syncTarget.uid}`);
      setIsSyncModalOpen(false);
      await loadData(true);

      // Refresh audit list if open
      try {
        const updatedList = await userStore.getAuthUsersStatus();
        setAuthStatusList(updatedList);
      } catch {}
    } catch (err: any) {
      console.error('Failed syncing profile:', err);
      setFormError(err.message || 'Gagal menyinkronkan profil pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------
  // EDIT USER HANDLER
  // ------------------------------------
  const handleOpenEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || user.displayName || '',
      role: user.role,
      isActive: user.isActive,
      selectedStudentIds: user.linkedStudentIds || user.studentIds || (user.childId ? [user.childId] : []),
      selectedClassName: user.className || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    const name = editForm.name.trim();
    if (!name) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    // Self admin role protection check (Requirement 10)
    if (selectedUser.id === userProfile.id && editForm.role !== userProfile.role) {
      setFormError('Anda tidak dapat mengubah peran akun Anda sendiri.');
      return;
    }
    if (selectedUser.id === userProfile.id && !editForm.isActive) {
      setFormError('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }

    setIsSubmitting(true);
    try {
      await userStore.updateUserProfile(selectedUser.id, {
        name,
        displayName: name,
        role: editForm.role,
        isActive: editForm.isActive,
        childId: editForm.selectedStudentIds[0] || undefined,
        studentIds: editForm.selectedStudentIds,
        linkedStudentIds: editForm.selectedStudentIds,
        className: editForm.role === 'TEACHER' || editForm.role === 'GURU' ? editForm.selectedClassName : undefined,
      });

      // Update student parentIds if parent
      if ((editForm.role === 'PARENT' || editForm.role === 'ORANG_TUA') && editForm.selectedStudentIds.length > 0) {
        for (const studentId of editForm.selectedStudentIds) {
          const student = students.find((s) => s.id === studentId);
          if (student) {
            const existingParentIds = student.parentIds || [];
            if (!existingParentIds.includes(selectedUser.id)) {
              await schoolStore.updateStudent({
                ...student,
                parentIds: [...existingParentIds, selectedUser.id],
              });
            }
          }
        }
      }

      await loadData(true);
      showToast(`Data akun "${name}" berhasil diperbarui.`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------
  // STATUS TOGGLE / INDIVIDUAL ACTIVATION HANDLER
  // ------------------------------------
  const handleToggleStatus = async (user: UserProfile) => {
    // Role protection: Admin cannot deactivate self (Requirement 10)
    if (user.id === userProfile.id) {
      showToast('Anda tidak dapat menonaktifkan akun Admin Anda sendiri.');
      return;
    }

    try {
      if (!user.isActive && (user.role === 'TEACHER' || (user.role as any) === 'GURU')) {
        // Individual controlled activation via backend endpoint (Strictly isolated, no batching, no side effects)
        const res = await userStore.activateTeacher(user.id);
        await loadData(true);
        showToast(res.message || `Akun guru "@${user.username}" berhasil diaktifkan.`);
      } else {
        const newStatus = !user.isActive;
        await userStore.setUserActiveStatus(user.id, newStatus);
        await loadData(true);
        showToast(`Status akun "@${user.username}" diubah menjadi ${newStatus ? 'AKTIF' : 'NONAKTIF'}.`);
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      showToast(err.message || 'Gagal mengubah status akun.');
    }
  };

  // ------------------------------------
  // CLASS ASSIGNMENT HANDLERS (SEPARATE FROM ACTIVATION)
  // ------------------------------------
  const handleOpenAssignClassModal = (teacher: UserProfile) => {
    setAssigningTeacher(teacher);
    setTargetClassId(teacher.classId || '');
    setConfirmReplaceTeacher(false);
    setIsAssignClassModalOpen(true);
  };

  const handleSaveClassAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher) return;

    // If targetClassId is empty, it means remove class assignment
    if (!targetClassId) {
      setIsSubmitting(true);
      try {
        const oldClass = classes.find((c) => c.teacherId === assigningTeacher.id || c.id === assigningTeacher.classId);
        if (oldClass) {
          await schoolStore.updateClass({
            ...oldClass,
            teacherId: '-',
            teacherName: 'Belum Ditugaskan',
          });
        }
        await userStore.updateUserProfile(assigningTeacher.id, {
          classId: '',
          className: '',
        });
        showToast(`Penugasan kelas untuk guru "${assigningTeacher.name}" berhasil dihapus.`);
        setIsAssignClassModalOpen(false);
        setAssigningTeacher(null);
        await loadData(true);
      } catch (err: any) {
        showToast(err.message || 'Gagal mengubah penugasan kelas.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const targetClass = classes.find((c) => c.id === targetClassId);
    if (!targetClass) return;

    // Check if class already has another teacher
    const isOtherTeacher =
      targetClass.teacherId &&
      targetClass.teacherId !== '-' &&
      targetClass.teacherId !== assigningTeacher.id;

    if (isOtherTeacher && !confirmReplaceTeacher) {
      showToast(`Kelas "${targetClass.name}" sudah memiliki wali kelas. Harap centang konfirmasi penggantian.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const previousTeacherId = targetClass.teacherId;

      // 1. Update Class document
      await schoolStore.updateClass({
        ...targetClass,
        teacherId: assigningTeacher.id,
        teacherName: assigningTeacher.name || assigningTeacher.displayName || assigningTeacher.username,
      });

      // 2. If assigning teacher had another class, clear it
      const oldTeacherClass = classes.find(
        (c) => c.id !== targetClass.id && (c.teacherId === assigningTeacher.id || c.id === assigningTeacher.classId)
      );
      if (oldTeacherClass) {
        await schoolStore.updateClass({
          ...oldTeacherClass,
          teacherId: '-',
          teacherName: 'Belum Ditugaskan',
        });
      }

      // 3. Update target teacher profile
      await userStore.updateUserProfile(assigningTeacher.id, {
        classId: targetClass.id,
        className: targetClass.name,
      });

      // 4. If replacing another teacher, clear the old teacher's class assignment
      if (
        previousTeacherId &&
        previousTeacherId !== '-' &&
        previousTeacherId !== assigningTeacher.id
      ) {
        await userStore.updateUserProfile(previousTeacherId, {
          classId: '',
          className: '',
        });
      }

      showToast(`Guru "${assigningTeacher.name}" berhasil ditugaskan ke "${targetClass.name}".`);
      setIsAssignClassModalOpen(false);
      setAssigningTeacher(null);
      setTargetClassId('');
      setConfirmReplaceTeacher(false);
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan penugasan kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------
  // RESET PASSWORD HANDLER
  // ------------------------------------
  const handleOpenResetModal = (user: UserProfile) => {
    setSelectedUser(user);
    setNewPassword('');
    setIssuedTempPassword(null);
    setCopiedTemp(false);
    setFormError(null);
    setIsResetPassModalOpen(true);
  };

  const handleIssueTemporaryPassword = async () => {
    if (!selectedUser) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
        try {
          await (auth as any).authStateReady();
        } catch {
          // ignore
        }
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setFormError('Sesi otentikasi tidak ditemukan. Silakan login kembali.');
        setIsSubmitting(false);
        return;
      }

      const idToken = await currentUser.getIdToken(true);
      const response = await fetch('/api/admin/issue-temporary-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: selectedUser.id
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIssuedTempPassword(data.temporaryPassword);
        showToast(`Kata sandi sementara berhasil diterbitkan untuk @${selectedUser.username}.`);
      } else {
        setFormError(data.message || 'Gagal menerbitkan kata sandi sementara.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan server/jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    if (!newPassword || newPassword.length < 6) {
      setFormError('Password baru minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
        try {
          await (auth as any).authStateReady();
        } catch {
          // ignore
        }
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setFormError('Sesi otentikasi tidak ditemukan. Silakan login kembali.');
        setIsSubmitting(false);
        return;
      }

      // Skenario A: Admin mengubah password dirinya sendiri
      if (selectedUser.id === currentUser.uid) {
        try {
          await updatePassword(currentUser, newPassword);
          showToast(`Password akun Anda (@${selectedUser.username}) berhasil diperbarui.`);
          setIsResetPassModalOpen(false);
          setNewPassword('');
          setIsSubmitting(false);
          return;
        } catch (selfAuthErr: any) {
          console.warn('Direct updatePassword fallback to backend API:', selfAuthErr?.code || selfAuthErr?.message);
        }
      }

      // Skenario B: Admin mengubah/reset password pengguna lain (atau fallback Skenario A)
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: selectedUser.id,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`Password untuk @${selectedUser.username} berhasil diperbarui.`);
        setIsResetPassModalOpen(false);
        setNewPassword('');
      } else {
        setFormError(
          data.message || 'Gagal merubah password. Pastikan kredensial Firebase Admin SDK terkonfigurasi di server.'
        );
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan jaringan/server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (u: UserProfile) => {
    if (u.id === userProfile.id) {
      showToast('Anda tidak dapat menghapus akun Admin Anda sendiri.');
      return;
    }
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await userStore.deleteUserProfile(userToDelete.id);
      await loadData(true);
      showToast(`Akun "${userToDelete.name || userToDelete.displayName || userToDelete.username}" berhasil dihapus.`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      showToast('Gagal menghapus pengguna: ' + (err.message || 'Terjadi kesalahan.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for role badge display
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold text-[10px]">
            <Shield className="w-3 h-3 text-emerald-400" />
            ADMIN
          </span>
        );
      case 'TEACHER':
      case 'GURU':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
            <GraduationCap className="w-3 h-3 text-emerald-600" />
            GURU
          </span>
        );
      case 'PRINCIPAL':
      case 'KEPALA_SEKOLAH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
            <Building2 className="w-3 h-3 text-amber-600" />
            KEPALA SEKOLAH
          </span>
        );
      case 'PARENT':
      case 'ORANG_TUA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
            <HeartHandshake className="w-3 h-3 text-blue-600" />
            ORANG TUA
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">{role}</span>;
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());

    let matchRole = true;
    if (roleFilter === 'ADMIN') {
      matchRole = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    } else if (roleFilter === 'TEACHER') {
      matchRole = u.role === 'TEACHER' || u.role === 'GURU';
    } else if (roleFilter === 'PRINCIPAL') {
      matchRole = u.role === 'PRINCIPAL' || u.role === 'KEPALA_SEKOLAH';
    } else if (roleFilter === 'PARENT') {
      matchRole = u.role === 'PARENT' || u.role === 'ORANG_TUA';
    }

    return matchQuery && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Sub-Nav Tabs: Manajemen Pengguna vs Sinkronisasi Akun Orang Tua */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('ALL_USERS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ALL_USERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Semua Pengguna</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PARENT_SYNC')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'PARENT_SYNC'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Sinkronisasi Akun Orang Tua</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${activeSubTab === 'PARENT_SYNC' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
            64 Data Anak
          </span>
        </button>
      </div>

      {activeSubTab === 'PARENT_SYNC' ? (
        <ParentSyncManagementView />
      ) : (
        <>
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Manajemen Akun Pengguna Sekolah</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola akun login untuk Admin, Kepala Sekolah, Guru, dan Orang Tua murid.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => loadData(false, true)}
                  disabled={isLoadingData}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Segarkan Data Pengguna"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-indigo-600' : ''}`} />
                  <span className="hidden sm:inline">Segarkan</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('PARENT_SYNC')}
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Sinkronisasi akun orang tua otomatis dari 64 data anak"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Sinkronkan Akun Orang Tua</span>
                </button>
                <button
                  onClick={handleOpenAuditModal}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Periksa dan sinkronkan akun Firebase Auth dengan profil Firestore"
                >
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Audit &amp; Sinkronkan Akun</span>
                </button>
                <a
                  href="/DAFTAR_AKUN_PENGGUNA_GROWUPAUD.xlsx"
                  download="DAFTAR_AKUN_PENGGUNA_GROWUPAUD.xlsx"
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Unduh file Excel daftar seluruh akun pengguna terdaftar"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Audit Excel (.xlsx)</span>
                </a>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Pengguna Baru</span>
                </button>
              </div>
            </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Peran (Role)</option>
            <option value="ADMIN">Admin</option>
            <option value="PRINCIPAL">Kepala Sekolah</option>
            <option value="TEACHER">Guru</option>
            <option value="PARENT">Orang Tua</option>
          </select>
        </div>

        {/* STATE 1: LOADING STATE (Requirement 25) */}
        {isLoadingData ? (
          <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Memuat data pengguna dari Firestore...</p>
          </div>
        ) : fetchError ? (
          /* STATE 4: ERROR STATE */
          <div className="p-8 text-center bg-rose-50/80 border border-rose-200 text-rose-900 rounded-2xl space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-rose-900">Gagal Memuat Data Pengguna</h4>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{fetchError}</p>
            <button
              onClick={() => loadData(false, true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* STATE 3: EMPTY STATES (Requirement 24) */
          <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-3">
            {roleFilter === 'TEACHER' ? (
              <>
                <p className="text-xs font-bold text-slate-700">Belum ada guru.</p>
                <button
                  onClick={() => handleOpenAddModal('TEACHER')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru</span>
                </button>
              </>
            ) : roleFilter === 'PRINCIPAL' ? (
              <>
                <p className="text-xs font-bold text-slate-700">Belum ada kepala sekolah.</p>
                <button
                  onClick={() => handleOpenAddModal('PRINCIPAL')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kepala Sekolah</span>
                </button>
              </>
            ) : roleFilter === 'PARENT' ? (
              <>
                <p className="text-xs font-bold text-slate-700">Belum ada orang tua.</p>
                <button
                  onClick={() => handleOpenAddModal('PARENT')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Orang Tua</span>
                </button>
              </>
            ) : roleFilter === 'ADMIN' ? (
              <p className="text-xs font-bold text-slate-700">Belum ada admin.</p>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-700">Belum ada akun pengguna terdaftar.</p>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              </>
            )}
          </div>
        ) : (
          /* USERS TABLE & RESPONSIVE CARDS (Requirement 23) */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role / Peran</th>
                  <th className="py-3 px-4">Anak (Orang Tua)</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.map((u) => {
                  const userStudentIds = Array.from(
                    new Set([
                      ...(u.linkedStudentIds || []),
                      ...(u.studentIds || []),
                      ...(u.childId ? [u.childId] : []),
                    ])
                  );
                  const matchedStudents = students.filter((s) => userStudentIds.includes(s.id));

                  const isSelf = u.id === userProfile.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar && u.avatar.trim().length > 0 ? u.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'user')}`}
                            alt={u.name || 'User'}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'user')}`;
                            }}
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{u.name || u.displayName}</span>
                            {isSelf && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 font-bold">@{u.username}</td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4">
                        {u.role === 'PARENT' || u.role === 'ORANG_TUA' ? (
                          matchedStudents.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {matchedStudents.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200"
                                >
                                  {s.name || s.nickname}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">Belum dihubungkan</span>
                          )
                        ) : u.role === 'TEACHER' || u.role === 'GURU' ? (
                          u.className ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                              {u.className}
                            </span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">Belum ada kelas</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-extrabold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenResetModal(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <>
                              {(u.role === 'TEACHER' || (u.role as any) === 'GURU') && (
                                <button
                                  onClick={() => handleOpenAssignClassModal(u)}
                                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                                  title="Pilih atau ubah kelas wali untuk guru ini"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Pilih Kelas
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  u.isActive
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>

                              <button
                                onClick={() => handleOpenDeleteModal(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold transition-all cursor-pointer"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== MODAL TAMBAH PENGGUNA (Requirement 1 & 11) ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Pengguna Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sinta Wijaya, S.Pd"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Sekolah *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: bu.sinta"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Konfirmasi Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi password di atas"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Roles: ONLY PRINCIPAL, TEACHER, PARENT (Requirement 1 & 11) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran / Role *</label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({ ...addForm, role: e.target.value as 'PRINCIPAL' | 'TEACHER' | 'PARENT' })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                >
                  <option value="TEACHER">Guru</option>
                  <option value="PRINCIPAL">Kepala Sekolah</option>
                  <option value="PARENT">Orang Tua</option>
                </select>
              </div>

              {/* Field Khusus Guru: Penugasan Kelas */}
              {addForm.role === 'TEACHER' && classes.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tugaskan ke Kelas (Opsional)</label>
                  <select
                    value={addForm.selectedClassName}
                    onChange={(e) => setAddForm({ ...addForm, selectedClassName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Belum Ditugaskan --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field Khusus Orang Tua: Hubungkan Anak */}
              {addForm.role === 'PARENT' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 text-xs">
                      Pilih Anak (Peserta Didik) *
                    </label>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {addForm.selectedStudentIds.length} anak terpilih
                    </span>
                  </div>

                  {students.length === 0 ? (
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Belum ada data siswa terdaftar di sekolah ini.
                    </p>
                  ) : (
                    <>
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !addForm.selectedStudentIds.includes(val)) {
                            setAddForm({
                              ...addForm,
                              selectedStudentIds: [...addForm.selectedStudentIds, val],
                            });
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                      >
                        <option value="">-- Tambah / Pilih Anak dari Daftar Siswa --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id} disabled={addForm.selectedStudentIds.includes(s.id)}>
                            {s.name || s.nickname} ({s.className || 'Kelas'}) {addForm.selectedStudentIds.includes(s.id) ? '✓ (Sudah Dipilih)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Live Visual Feedback: Selected Student Name badges */}
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Anak Terpilih:
                        </p>
                        {addForm.selectedStudentIds.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic bg-white p-2 rounded-lg border border-dashed border-slate-200">
                            Belum ada anak yang dipilih. Silakan pilih anak dari dropdown di atas.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {addForm.selectedStudentIds.map((id) => {
                              const s = students.find((item) => item.id === id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 font-bold text-xs border border-blue-300 shadow-2xs"
                                >
                                  <span>Anak: {s ? (s.name || s.nickname) : id} {s?.className ? `(${s.className})` : ''}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAddForm({
                                        ...addForm,
                                        selectedStudentIds: addForm.selectedStudentIds.filter((item) => item !== id),
                                      })
                                    }
                                    className="w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 text-blue-800 flex items-center justify-center text-[10px] cursor-pointer"
                                    title="Hapus anak ini"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addActiveStatus"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="addActiveStatus" className="font-bold text-slate-700">
                  Status Akun Aktif
                </label>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDIT PENGGUNA ==================== */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Akun Pengguna (@{selectedUser.username})</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran / Role *</label>
                <select
                  disabled={selectedUser.id === userProfile.id}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="TEACHER">Guru</option>
                  <option value="PRINCIPAL">Kepala Sekolah</option>
                  <option value="PARENT">Orang Tua</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {selectedUser.id === userProfile.id && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Role Admin Anda sendiri tidak dapat diubah dari sini.
                  </p>
                )}
              </div>

              {(editForm.role === 'PARENT' || editForm.role === 'ORANG_TUA') && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 text-xs">
                      Pilih Anak (Peserta Didik) *
                    </label>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {editForm.selectedStudentIds.length} anak terpilih
                    </span>
                  </div>

                  {students.length === 0 ? (
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Belum ada data siswa terdaftar di sekolah ini.
                    </p>
                  ) : (
                    <>
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !editForm.selectedStudentIds.includes(val)) {
                            setEditForm({
                              ...editForm,
                              selectedStudentIds: [...editForm.selectedStudentIds, val],
                            });
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white"
                      >
                        <option value="">-- Tambah / Pilih Anak dari Daftar Siswa --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id} disabled={editForm.selectedStudentIds.includes(s.id)}>
                            {s.name || s.nickname} ({s.className || 'Kelas'}) {editForm.selectedStudentIds.includes(s.id) ? '✓ (Sudah Dipilih)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Live Visual Feedback: Selected Student Name badges */}
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Anak Terpilih:
                        </p>
                        {editForm.selectedStudentIds.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic bg-white p-2 rounded-lg border border-dashed border-slate-200">
                            Belum ada anak yang dipilih. Silakan pilih anak dari dropdown di atas.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {editForm.selectedStudentIds.map((id) => {
                              const s = students.find((item) => item.id === id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-900 font-bold text-xs border border-indigo-300 shadow-2xs"
                                >
                                  <span>Anak: {s ? (s.name || s.nickname) : id} {s?.className ? `(${s.className})` : ''}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm({
                                        ...editForm,
                                        selectedStudentIds: editForm.selectedStudentIds.filter((item) => item !== id),
                                      })
                                    }
                                    className="w-4 h-4 rounded-full bg-indigo-200 hover:bg-indigo-300 text-indigo-800 flex items-center justify-center text-[10px] cursor-pointer"
                                    title="Hapus anak ini"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActiveStatus"
                  disabled={selectedUser.id === userProfile.id}
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="editActiveStatus" className="font-bold text-slate-700">
                  Status Akun Aktif
                </label>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL RESET PASSWORD ==================== */}
      {isResetPassModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>Reset Password (@{selectedUser.username})</span>
              </h3>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ubah password akun <strong>{selectedUser.name}</strong> (@{selectedUser.username}). Perubahan password dikirim secara aman via HTTPS ke endpoint Server Firebase Admin SDK.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {issuedTempPassword ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Kata Sandi Sementara Diterbitkan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(issuedTempPassword);
                      setCopiedTemp(true);
                      setTimeout(() => setCopiedTemp(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedTemp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{copiedTemp ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono text-sm font-bold text-slate-800 tracking-wider text-center select-all">
                  {issuedTempPassword}
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Berikan kata sandi sementara ini kepada pengguna secara langsung. Sesuai prosedur keamanan, kata sandi telah aktif di Firebase Authentication dan dicatat pada Audit Log.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassModalOpen(false);
                      setIssuedTempPassword(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">Opsi Penerbitan Otomatis</p>
                    <p className="text-[11px] text-amber-700">Buat password acak yang kuat &amp; aman.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleIssueTemporaryPassword}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Memproses...' : 'Terbitkan Otomatis'}</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Atau Masukkan Manual</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password Baru Manual *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="pt-3 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsResetPassModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Memproses...' : 'Simpan Password Baru'}</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL KONFIRMASI HAPUS PENGGUNA ==================== */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Konfirmasi Hapus Pengguna</span>
              </h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-2 text-rose-900">
              <p className="text-sm font-semibold">
                Apakah Anda yakin ingin menghapus akun pengguna ini?
              </p>
              <div className="bg-white/80 p-3 rounded-xl border border-rose-200/60 text-xs space-y-1">
                <p><span className="font-bold text-slate-700">Nama:</span> {userToDelete.name || userToDelete.displayName || '-'}</p>
                <p><span className="font-bold text-slate-700">Username:</span> @{userToDelete.username}</p>
                <p><span className="font-bold text-slate-700">Peran:</span> {userToDelete.role}</p>
                <p><span className="font-bold text-slate-700">UID:</span> <span className="font-mono text-[10px] text-slate-500">{userToDelete.id}</span></p>
              </div>
              <p className="text-xs text-rose-700">
                Tindakan ini akan menghapus dokumen profil pengguna dari sistem. Data anak, kelas, dan observasi tidak akan terhapus.
              </p>
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Pengguna'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL AUDIT STATUS AKUN ==================== */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <span>Audit Status Akun (Firebase Auth vs Firestore)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Identifikasi akun yang telah terdaftar di Firebase Authentication namun belum memiliki dokumen profil di Firestore.
                </p>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingAuthStatus ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Memeriksa seluruh akun dari server...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {authStatusList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Tidak ada akun pengguna yang ditemukan.
                    </div>
                  ) : (
                    authStatusList.map((item) => (
                      <div
                        key={item.uid}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">
                              {item.displayName || item.profile?.name || (item.email ? item.email.split('@')[0] : 'Pengguna')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.email}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400">
                            UID: <span className="text-slate-600 font-semibold">{item.uid}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Auth Terdaftar
                            </span>
                            {item.profileExists ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Profil Firestore OK ({item.profile?.role})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Profil Belum Ada di Firestore
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {!item.profileExists ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSyncModal(item)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Sinkronkan Profil</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSyncModal(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                            >
                              Perbarui Sinkronisasi
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Profil yang disinkronkan akan dibuat pada koleksi <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">users/{'{UID}'}</code> menggunakan UID Firebase Auth yang sebenarnya.
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL SINKRONKAN PROFIL PENGGUNA ==================== */}
      {isSyncModalOpen && syncTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <span>Sinkronkan Profil Pengguna</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Buat dokumen <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">users/{syncTarget.uid}</code> untuk akun ini.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setSyncTarget(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteSync} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 font-mono text-[11px]">
                <p className="text-slate-500">Firebase Auth UID:</p>
                <p className="font-bold text-slate-800 break-all">{syncTarget.uid}</p>
                <p className="text-slate-500 mt-1">Email / Username Terdeteksi:</p>
                <p className="font-bold text-indigo-700">{syncTarget.email || syncForm.username}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={syncForm.name}
                  onChange={(e) => setSyncForm({ ...syncForm, name: e.target.value })}
                  placeholder="Contoh: Ibu Masnah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Aplikasi *</label>
                <input
                  type="text"
                  required
                  value={syncForm.username}
                  onChange={(e) => setSyncForm({ ...syncForm, username: e.target.value.toLowerCase().trim() })}
                  placeholder="Contoh: ibu.masnah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran (Role) *</label>
                <select
                  value={syncForm.role}
                  onChange={(e) =>
                    setSyncForm({
                      ...syncForm,
                      role: e.target.value as 'PRINCIPAL' | 'TEACHER' | 'PARENT',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none font-bold text-slate-700"
                >
                  <option value="TEACHER">GURU</option>
                  <option value="PRINCIPAL">KEPALA SEKOLAH</option>
                  <option value="PARENT">ORANG TUA</option>
                </select>
              </div>

              {syncForm.role === 'TEACHER' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas yang Diampu</label>
                  <select
                    value={syncForm.selectedClassName}
                    onChange={(e) => setSyncForm({ ...syncForm, selectedClassName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none text-slate-700"
                  >
                    <option value="">-- Pilih Kelas (Opsional) --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {syncForm.role === 'PARENT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hubungkan dengan Anak/Murid</label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                    {students.length === 0 ? (
                      <p className="text-slate-400 italic">Belum ada data murid.</p>
                    ) : (
                      students.map((st) => {
                        const isChecked = syncForm.selectedStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSyncForm({
                                    ...syncForm,
                                    selectedStudentIds: [...syncForm.selectedStudentIds, st.id],
                                  });
                                } else {
                                  setSyncForm({
                                    ...syncForm,
                                    selectedStudentIds: syncForm.selectedStudentIds.filter(
                                      (id) => id !== st.id
                                    ),
                                  });
                                }
                              }}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="font-medium text-slate-800">{st.name}</span>
                            <span className="text-slate-400 text-[10px]">({st.className})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncModalOpen(false);
                    setSyncTarget(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyinkronkan...' : 'Simpan & Sinkronkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ---------------------------------------------------- */}
      {/* MODAL: ASSIGN CLASS (SEPARATE FROM ACTIVATION)      */}
      {/* ---------------------------------------------------- */}
      {isAssignClassModalOpen && assigningTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Penugasan Kelas Guru</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Pilih kelas untuk guru secara eksplisit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignClassModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Guru:</span>
                <span className="font-bold text-slate-800">{assigningTeacher.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Username:</span>
                <span className="font-mono text-slate-700">@{assigningTeacher.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Kelas Saat Ini:</span>
                <span className="font-bold text-emerald-700">{assigningTeacher.className || 'Belum Ditugaskan'}</span>
              </div>
            </div>

            <form onSubmit={handleSaveClassAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Kelas *</label>
                <select
                  value={targetClassId}
                  onChange={(e) => {
                    setTargetClassId(e.target.value);
                    setConfirmReplaceTeacher(false);
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                >
                  <option value="">-- Tanpa Kelas (Kosongkan) --</option>
                  {classes.map((c) => {
                    const hasTeacher = c.teacherId && c.teacherId !== '-' && c.teacherId !== assigningTeacher.id;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {hasTeacher ? `(Wali: ${c.teacherName || 'Guru lain'})` : c.teacherId === assigningTeacher.id ? '(Kelas guru ini)' : '(Belum ada wali)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Explicit Confirmation Banner if class already has a teacher */}
              {(() => {
                const targetCls = classes.find((c) => c.id === targetClassId);
                const isOther =
                  targetCls &&
                  targetCls.teacherId &&
                  targetCls.teacherId !== '-' &&
                  targetCls.teacherId !== assigningTeacher.id;

                if (!isOther) return null;

                return (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="font-semibold leading-relaxed">
                        Kelas <strong>{targetCls.name}</strong> sudah memiliki wali kelas: <strong>{targetCls.teacherName || targetCls.teacherId}</strong>. Apakah Anda ingin mengganti wali kelas?
                      </p>
                    </div>
                    <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={confirmReplaceTeacher}
                        onChange={(e) => setConfirmReplaceTeacher(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-amber-400"
                      />
                      <span>Ya, saya konfirmasi ganti wali kelas.</span>
                    </label>
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAssignClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    Boolean(
                      (() => {
                        const targetCls = classes.find((c) => c.id === targetClassId);
                        const isOther =
                          targetCls &&
                          targetCls.teacherId &&
                          targetCls.teacherId !== '-' &&
                          targetCls.teacherId !== assigningTeacher.id;
                        return isOther && !confirmReplaceTeacher;
                      })()
                    )
                  }
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
