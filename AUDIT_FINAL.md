# GrowUPAUD – Audit & Hardening Baseline `(2)`
Tanggal audit: 6 September 2026

## Perbaikan yang diterapkan
- Menambahkan role OPERATOR ke tipe pengguna, autentikasi, dashboard, header, dan manajemen pengguna.
- Operator dapat menggunakan jalur provisioning server, sementara pembuatan profil privileged langsung oleh client tetap ditutup.
- Parent hanya mengambil siswa berdasarkan `students.parentIds`; fallback berdasarkan `user.studentIds`, `linkedStudentIds`, dan `childId` dihapus dari otorisasi.
- Parent feedback dibatasi berdasarkan `parentId == request.auth.uid`; parent tidak dapat mengubah/menghapus pesan.
- Parent dashboard tidak lagi melakukan query kelas.
- Observasi parent diambil berdasarkan student IDs yang telah diperoleh dari relasi authoritative.
- Endpoint AI membutuhkan Firebase ID token, role yang diizinkan, rate limit, dan validasi `studentId` untuk analisis anak.
- Guru hanya dapat menjalankan analisis anak yang ditugaskan melalui `teacherIds` atau kelas.
- Gemini API key tidak digunakan dari frontend.
- Fallback analisis foto tidak lagi mengklaim perilaku anak yang tidak terbukti.
- Generator laporan tidak lagi mengisi kemampuan anak, area perkembangan, caption foto, atau pesan guru dengan klaim positif fiktif ketika bukti tidak tersedia.
- Auth-user audit difilter berdasarkan sekolah untuk akun non-super-admin.
- Pembuatan akun memvalidasi relasi parent-anak dan melakukan rollback Firebase Auth bila pembuatan profil Firestore gagal.
- Startup password mutation `ADMIN_NEW_PASSWORD` dihapus.
- Hard-coded filtering terhadap nama akun tertentu dihapus.

## Status akun yang ditargetkan
Sistem provisioning mendukung:
- 5 Guru
- 80 Orang Tua
- 1 Kepala Sekolah
- 1 Operator

Pembuatan akun dilakukan melalui endpoint admin/server, bukan self-registration privileged dari client.

## Batas verifikasi
`npm install` pada lingkungan audit mengalami timeout, sehingga `npm run lint` dan `npm run build` belum dapat dinyatakan PASS secara independen. Jalankan keduanya di lingkungan development/deployment setelah dependency tersedia.
