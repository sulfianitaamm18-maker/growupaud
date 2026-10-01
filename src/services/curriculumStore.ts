import {
  ActivityPreset,
  IndicatorItem,
  ElementItem,
  CPItem,
  ATPItem,
  TPItem,
  ThemeItem,
  SubthemeItem,
  AspectItem,
  SubaspectItem,
  RubricDefinition,
  DevelopmentalAspect,
} from '../types';
import { INITIAL_ACTIVITY_PRESETS } from '../data/initialData';
import {
  extractIndicatorAspect,
  calculateOverallScore,
  RATING_WEIGHTS,
  ALL_ASPECTS,
} from '../utils/studentMetrics';

export { calculateOverallScore };

export const DEFAULT_RUBRIC: RubricDefinition = {
  BB: 'Anak belum menunjukkan kemampuan yang diamati meskipun telah mendapatkan stimulasi.',
  MB: 'Anak mulai menunjukkan kemampuan tetapi masih memerlukan bantuan atau pengingat.',
  BSH: 'Anak mampu menunjukkan kemampuan secara mandiri sesuai tahap perkembangannya.',
  BSB: 'Anak menunjukkan kemampuan secara sangat baik, mandiri, konsisten, dan dapat menerapkannya dalam situasi lain.',
};

export const INITIAL_ELEMENTS: ElementItem[] = [
  {
    id: 'ELEM-NAM',
    curriculumId: 'KM-PAUD',
    code: 'ELEM-1',
    name: 'Nilai Agama dan Budi Pekerti',
    description: 'Anak mengenali, mempraktikkan ajaran agama, serta menunjukkan sikap berakhlak mulia.',
    status: 'ACTIVE',
  },
  {
    id: 'ELEM-JATIDIRI',
    curriculumId: 'KM-PAUD',
    code: 'ELEM-2',
    name: 'Jati Diri',
    description: 'Anak mengenali, mengelola, dan mengekspresikan emosi, serta membangun hubungan sosial dan kesehatan fisik motorik.',
    status: 'ACTIVE',
  },
  {
    id: 'ELEM-LITERASI',
    curriculumId: 'KM-PAUD',
    code: 'ELEM-3',
    name: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
    description: 'Anak memahami informasi, bernalar kritis, serta mengekspresikan imajinasi dan kreativitas.',
    status: 'ACTIVE',
  },
];

export const INITIAL_ASPECTS: AspectItem[] = [
  {
    id: 'NAM',
    code: 'CP-NAM',
    name: 'Nilai Agama & Moral (Budi Pekerti)',
    description: 'Mengenal Tuhan, perilakunya, dan rasa syukur atas ciptaan-Nya.',
    color: '#10B981',
  },
  {
    id: 'JATI_DIRI',
    code: 'CP-JATIDIRI',
    name: 'Jati Diri (Sosial Emosional)',
    description: 'Mengenali emosi diri, berinteraksi sosial, toleransi, dan kemandirian.',
    color: '#3B82F6',
  },
  {
    id: 'LITERASI_STEAM',
    code: 'CP-LITERASI',
    name: 'Literasi, Matematika & STEAM',
    description: 'Kemampuan berbahasa, sains dasar, teknologi, rekayasa, dan seni.',
    color: '#8B5CF6',
  },
  {
    id: 'MOTORIK_KASAR',
    code: 'CP-MOTKASAR',
    name: 'Motorik Kasar',
    description: 'Koordinasi anggota tubuh besar, keseimbangan, kelincahan, dan kekuatan.',
    color: '#F59E0B',
  },
  {
    id: 'MOTORIK_HALUS',
    code: 'CP-MOTHALUS',
    name: 'Motorik Halus',
    description: 'Koordinasi mata-tangan, ketelitian jemari, dan fleksibilitas tangan.',
    color: '#06B6D4',
  },
  {
    id: 'KOGNITIF',
    code: 'CP-KOGNITIF',
    name: 'Kognitif & Berpikir Kritis',
    description: 'Pemecahan masalah, klasifikasi, logika sederhana, dan eksplorasi.',
    color: '#EC4899',
  },
];

export const INITIAL_SUBASPECTS: SubaspectItem[] = [
  { id: 'sub-nam-1', aspectId: 'NAM', name: 'Mengenal Nilai Agama & Ibadah' },
  { id: 'sub-nam-2', aspectId: 'NAM', name: 'Perilaku Akhlak Mulia & Budi Pekerti' },
  { id: 'sub-jd-1', aspectId: 'JATI_DIRI', name: 'Regulasi Emosi & Kemandirian' },
  { id: 'sub-jd-2', aspectId: 'JATI_DIRI', name: 'Interaksi Sosial & Kerja Sama' },
  { id: 'sub-lit-1', aspectId: 'LITERASI_STEAM', name: 'Komunikasi & Minat Membaca' },
  { id: 'sub-lit-2', aspectId: 'LITERASI_STEAM', name: 'Eksplorasi Sains & Teknologi Sederhana' },
  { id: 'sub-mk-1', aspectId: 'MOTORIK_KASAR', name: 'Keseimbangan & Kelincahan Gerak' },
  { id: 'sub-mk-2', aspectId: 'MOTORIK_KASAR', name: 'Koordinasi Gerak Tubuh' },
  { id: 'sub-mh-1', aspectId: 'MOTORIK_HALUS', name: 'Koordinasi Jari & Mata (Ketelitian)' },
  { id: 'sub-mh-2', aspectId: 'MOTORIK_HALUS', name: 'Kreativitas Memanipulasi Benda' },
  { id: 'sub-kog-1', aspectId: 'KOGNITIF', name: 'Pemecahan Masalah & Logika Pola' },
  { id: 'sub-kog-2', aspectId: 'KOGNITIF', name: 'Konsep Angka & Ukuran' },
];

export const INITIAL_THEMES: ThemeItem[] = [
  { id: 'thm-diriku', name: 'Diriku', description: 'Identitas diri, tubuh, panca indera, emosi, dan kebiasaan hidup sehat', status: 'ACTIVE' },
  { id: 'thm-keluargaku', name: 'Keluargaku', description: 'Anggota keluarga, peran, rumah, dan kasih sayang bersama', status: 'ACTIVE' },
  { id: 'thm-lingkunganku', name: 'Lingkunganku', description: 'Rumah, sekolah, tetangga, kebersihan lingkungan, dan fasilitas umum', status: 'ACTIVE' },
  { id: 'thm-tanaman', name: 'Tanaman', description: 'Tanaman sekitar, bagian tanaman, merawat, buah, sayur, dan tanaman lokal', status: 'ACTIVE' },
  { id: 'thm-binatang', name: 'Binatang', description: 'Binatang peliharaan, darat, air, udara, habitat, dan cara merawat', status: 'ACTIVE' },
  { id: 'thm-transportasi', name: 'Transportasi', description: 'Kendaraan darat, air, udara, tradisional, dan keselamatan di jalan', status: 'ACTIVE' },
  { id: 'thm-profesi', name: 'Pekerjaan / Profesi', description: 'Guru, dokter, petani, pedagang, nelayan, polisi, dan profesi sekitar', status: 'ACTIVE' },
  { id: 'thm-alam-semesta', name: 'Alam Semesta', description: 'Matahari, bulan, bintang, siang-malam, cuaca, hujan, dan pelangi', status: 'ACTIVE' },
  { id: 'thm-air-udara-api', name: 'Air, Udara, dan Api', description: 'Manfaat dan sifat air, udara, angin, api, dan keselamatan diri', status: 'ACTIVE' },
  { id: 'thm-negaraku', name: 'Negaraku / Lingkunganku sebagai Bagian dari Indonesia', description: 'Simbol negara, keberagaman nusantara, budaya, makanan, dan kesenian daerah', status: 'ACTIVE' },
  { id: 'thm-budaya-lokal', name: 'Budaya dan Kearifan Lokal', description: 'Permainan tradisional, lagu daerah, cerita rakyat, makanan, dan tradisi lokal', status: 'ACTIVE' },
  { id: 'thm-rekreasi', name: 'Rekreasi', description: 'Tempat rekreasi alam dan buatan, pengalaman wisata, dan keselamatan', status: 'ACTIVE' },
  { id: 'thm-makanan-minuman', name: 'Makanan dan Minuman', description: 'Makanan sehat bergizi, buah, sayur, makanan lokal, dan proses menyiapkan', status: 'ACTIVE' },
  { id: 'thm-air-kehidupan', name: 'Air dan Kehidupan', description: 'Air untuk manusia, tanaman, hewan, hemat air, dan eksperimen air', status: 'ACTIVE' },
  { id: 'thm-benda-sekitar', name: 'Benda di Sekitar Kita', description: 'Bentuk, warna, tekstur, ukuran, fungsi benda, dan perubahan wujud benda', status: 'ACTIVE' },
  { id: 'thm-lingkungan-alam', name: 'Lingkungan Alam', description: 'Tanah, batu, pasir, daun, kayu, sungai, gunung, dan pantai', status: 'ACTIVE' },
];

export const INITIAL_SUBTHEMES: SubthemeItem[] = [
  // 1. Diriku
  { id: 'sub-diriku-1', themeId: 'thm-diriku', name: 'Identitas Diriku', description: 'Nama, jenis kelamin, usia, dan ciri khas diri', status: 'ACTIVE' },
  { id: 'sub-diriku-2', themeId: 'thm-diriku', name: 'Tubuhku', description: 'Mengenal anggota tubuh dan fungsinya', status: 'ACTIVE' },
  { id: 'sub-diriku-3', themeId: 'thm-diriku', name: 'Panca Indera', description: 'Mata, telinga, hidung, lidah, dan kulit', status: 'ACTIVE' },
  { id: 'sub-diriku-4', themeId: 'thm-diriku', name: 'Kesukaanku', description: 'Makanan, mainan, warna, dan aktivitas favorit', status: 'ACTIVE' },
  { id: 'sub-diriku-5', themeId: 'thm-diriku', name: 'Emosiku', description: 'Mengenal rasa senang, sedih, marah, dan tenang', status: 'ACTIVE' },
  { id: 'sub-diriku-6', themeId: 'thm-diriku', name: 'Kebutuhan Diriku', description: 'Pakaian, istirahat, dan rasa aman', status: 'ACTIVE' },
  { id: 'sub-diriku-7', themeId: 'thm-diriku', name: 'Kebiasaan Hidup Sehat', description: 'Cuci tangan, sikat gigi, dan toilet training mandiri', status: 'ACTIVE' },

  // 2. Keluargaku
  { id: 'sub-kel-1', themeId: 'thm-keluargaku', name: 'Anggota Keluarga', description: 'Ayah, ibu, kakak, adik, kakek, dan nenek', status: 'ACTIVE' },
  { id: 'sub-kel-2', themeId: 'thm-keluargaku', name: 'Peran Anggota Keluarga', description: 'Tugas dan saling membantu di rumah', status: 'ACTIVE' },
  { id: 'sub-kel-3', themeId: 'thm-keluargaku', name: 'Rumahku', description: 'Bagian-bagian rumah dan fungsinya', status: 'ACTIVE' },
  { id: 'sub-kel-4', themeId: 'thm-keluargaku', name: 'Kebiasaan di Rumah', description: 'Makan bersama, merapikan mainan, dan tidur tepat waktu', status: 'ACTIVE' },
  { id: 'sub-kel-5', themeId: 'thm-keluargaku', name: 'Kasih Sayang Keluarga', description: 'Saling menyayangi, menghormati, dan bersyukur', status: 'ACTIVE' },

  // 3. Lingkunganku
  { id: 'sub-ling-1', themeId: 'thm-lingkunganku', name: 'Rumah', description: 'Ruangan dan pekarangan rumah', status: 'ACTIVE' },
  { id: 'sub-ling-2', themeId: 'thm-lingkunganku', name: 'Sekolah', description: 'Ruang kelas, taman bermain, dan teman sekolah', status: 'ACTIVE' },
  { id: 'sub-ling-3', themeId: 'thm-lingkunganku', name: 'Lingkungan Sekitar', description: 'Jalanan lingkungan, selokan, dan pepohonan', status: 'ACTIVE' },
  { id: 'sub-ling-4', themeId: 'thm-lingkunganku', name: 'Kebersihan Lingkungan', description: 'Membuang sampah pada tempatnya dan gotong royong', status: 'ACTIVE' },
  { id: 'sub-ling-5', themeId: 'thm-lingkunganku', name: 'Tetangga', description: 'Mengenal tetangga dan saling menyapa ramah', status: 'ACTIVE' },
  { id: 'sub-ling-6', themeId: 'thm-lingkunganku', name: 'Fasilitas Umum', description: 'Taman kota, puskesmas, pasar, dan pos ronda', status: 'ACTIVE' },

  // 4. Tanaman
  { id: 'sub-tan-1', themeId: 'thm-tanaman', name: 'Tanaman di Sekitar Kita', description: 'Pohon peneduh, rumput, dan bunga halaman', status: 'ACTIVE' },
  { id: 'sub-tan-2', themeId: 'thm-tanaman', name: 'Bagian Tanaman', description: 'Akar, batang, daun, bunga, dan buah', status: 'ACTIVE' },
  { id: 'sub-tan-3', themeId: 'thm-tanaman', name: 'Manfaat Tanaman', description: 'Oksigen, keteduhan, makanan, dan keindahan', status: 'ACTIVE' },
  { id: 'sub-tan-4', themeId: 'thm-tanaman', name: 'Menanam dan Merawat', description: 'Menyiram tanaman, memberi tanah subur, dan sinar matahari', status: 'ACTIVE' },
  { id: 'sub-tan-5', themeId: 'thm-tanaman', name: 'Buah dan Sayur', description: 'Mengenal aneka rasa, warna, dan gizi buah sayur', status: 'ACTIVE' },
  { id: 'sub-tan-6', themeId: 'thm-tanaman', name: 'Tanaman Obat', description: 'Kunyit, jahe, serai, dan lidah buaya', status: 'ACTIVE' },
  { id: 'sub-tan-7', themeId: 'thm-tanaman', name: 'Tanaman Lokal', description: 'Tanaman khas daerah dan kebun sekitar', status: 'ACTIVE' },

  // 5. Binatang
  { id: 'sub-bin-1', themeId: 'thm-binatang', name: 'Binatang Peliharaan', description: 'Kucing, kelinci, ikan, dan burung', status: 'ACTIVE' },
  { id: 'sub-bin-2', themeId: 'thm-binatang', name: 'Binatang di Sekitar', description: 'Semut, kupu-kupu, capung, dan ayam', status: 'ACTIVE' },
  { id: 'sub-bin-3', themeId: 'thm-binatang', name: 'Binatang Darat', description: 'Sapi, kambing, gajah, dan kelinci', status: 'ACTIVE' },
  { id: 'sub-bin-4', themeId: 'thm-binatang', name: 'Binatang Air', description: 'Ikan tawar, ikan laut, kepiting, dan udang', status: 'ACTIVE' },
  { id: 'sub-bin-5', themeId: 'thm-binatang', name: 'Binatang Udara', description: 'Burung pipit, lebah, dan capung', status: 'ACTIVE' },
  { id: 'sub-bin-6', themeId: 'thm-binatang', name: 'Habitat Binatang', description: 'Kandang, sarang ranting, kolam, dan hutan', status: 'ACTIVE' },
  { id: 'sub-bin-7', themeId: 'thm-binatang', name: 'Cara Merawat Binatang', description: 'Memberi makan, minum, dan menyayangi binatang', status: 'ACTIVE' },

  // 6. Transportasi
  { id: 'sub-trans-1', themeId: 'thm-transportasi', name: 'Kendaraan Darat', description: 'Sepeda, motor, mobil, dan bus', status: 'ACTIVE' },
  { id: 'sub-trans-2', themeId: 'thm-transportasi', name: 'Kendaraan Air', description: 'Perahu dayung, kapal feri, dan rakit bambu', status: 'ACTIVE' },
  { id: 'sub-trans-3', themeId: 'thm-transportasi', name: 'Kendaraan Udara', description: 'Pesawat terbang dan helikopter', status: 'ACTIVE' },
  { id: 'sub-trans-4', themeId: 'thm-transportasi', name: 'Kendaraan Tradisional', description: 'Delman, becak, dan gerobak', status: 'ACTIVE' },
  { id: 'sub-trans-5', themeId: 'thm-transportasi', name: 'Keselamatan di Jalan', description: 'Memakai helm, zebra cross, dan lampu lalu lintas', status: 'ACTIVE' },

  // 7. Pekerjaan / Profesi
  { id: 'sub-prof-1', themeId: 'thm-profesi', name: 'Guru', description: 'Membimbing belajar dengan penuh kasih', status: 'ACTIVE' },
  { id: 'sub-prof-2', themeId: 'thm-profesi', name: 'Dokter', description: 'Merawat kesehatan dan mengobati orang sakit', status: 'ACTIVE' },
  { id: 'sub-prof-3', themeId: 'thm-profesi', name: 'Petani', description: 'Menanam padi, sayur, dan menjaga ketahanan pangan', status: 'ACTIVE' },
  { id: 'sub-prof-4', themeId: 'thm-profesi', name: 'Pedagang', description: 'Jual beli kebutuhan di pasar dan warung', status: 'ACTIVE' },
  { id: 'sub-prof-5', themeId: 'thm-profesi', name: 'Nelayan', description: 'Menangkap ikan di laut dan menjaga pantai', status: 'ACTIVE' },
  { id: 'sub-prof-6', themeId: 'thm-profesi', name: 'Polisi', description: 'Menjaga keamanan dan ketertiban lalu lintas', status: 'ACTIVE' },
  { id: 'sub-prof-7', themeId: 'thm-profesi', name: 'Pemadam Kebakaran', description: 'Menolong bahaya api dan bencana', status: 'ACTIVE' },
  { id: 'sub-prof-8', themeId: 'thm-profesi', name: 'Pekerjaan di Lingkungan Sekitar', description: 'Tukang kayu, penjahit, pengrajin, dan kurir', status: 'ACTIVE' },

  // 8. Alam Semesta
  { id: 'sub-alam-1', themeId: 'thm-alam-semesta', name: 'Matahari', description: 'Sumber cahaya terang dan kehangatan bumi', status: 'ACTIVE' },
  { id: 'sub-alam-2', themeId: 'thm-alam-semesta', name: 'Bulan', description: 'Bentuk sabit dan purnama di langit malam', status: 'ACTIVE' },
  { id: 'sub-alam-3', themeId: 'thm-alam-semesta', name: 'Bintang', description: 'Titik-titik cahaya indah penghias malam', status: 'ACTIVE' },
  { id: 'sub-alam-4', themeId: 'thm-alam-semesta', name: 'Siang dan Malam', description: 'Perbedaan terang, gelap, dan ritme istirahat', status: 'ACTIVE' },
  { id: 'sub-alam-5', themeId: 'thm-alam-semesta', name: 'Cuaca', description: 'Cerah, berawan, dan berangin', status: 'ACTIVE' },
  { id: 'sub-alam-6', themeId: 'thm-alam-semesta', name: 'Hujan', description: 'Tetesan air langit penyubur bumi', status: 'ACTIVE' },
  { id: 'sub-alam-7', themeId: 'thm-alam-semesta', name: 'Pelangi', description: 'Warna-warni lengkung cahaya setelah hujan', status: 'ACTIVE' },

  // 9. Air, Udara, dan Api
  { id: 'sub-aua-1', themeId: 'thm-air-udara-api', name: 'Manfaat Air', description: 'Minum, mandi, memasak, dan menyiram', status: 'ACTIVE' },
  { id: 'sub-aua-2', themeId: 'thm-air-udara-api', name: 'Sifat Air', description: 'Mengalir, menyesuaikan wadah, dan melarutkan', status: 'ACTIVE' },
  { id: 'sub-aua-3', themeId: 'thm-air-udara-api', name: 'Udara', description: 'Bernapas dan ruang di sekitar kita', status: 'ACTIVE' },
  { id: 'sub-aua-4', themeId: 'thm-air-udara-api', name: 'Angin', description: 'Udara yang bergerak menerbangkan layangan', status: 'ACTIVE' },
  { id: 'sub-aua-5', themeId: 'thm-air-udara-api', name: 'Api dan Keselamatan', description: 'Cahaya api, memasak, dan bahaya kebakaran', status: 'ACTIVE' },

  // 10. Negaraku / Lingkunganku sebagai Bagian dari Indonesia
  { id: 'sub-neg-1', themeId: 'thm-negaraku', name: 'Indonesia', description: 'Tanah air kepulauan nusantara yang indah', status: 'ACTIVE' },
  { id: 'sub-neg-2', themeId: 'thm-negaraku', name: 'Simbol Negara', description: 'Bendera Merah Putih, Garuda Pancasila, dan Lagu Indonesia Raya', status: 'ACTIVE' },
  { id: 'sub-neg-3', themeId: 'thm-negaraku', name: 'Keberagaman', description: 'Bhinneka Tunggal Ika, suku, dan agama berbeda tetap rukun', status: 'ACTIVE' },
  { id: 'sub-neg-4', themeId: 'thm-negaraku', name: 'Budaya Daerah', description: 'Rumah adat, tarian, dan kebiasaan santun', status: 'ACTIVE' },
  { id: 'sub-neg-5', themeId: 'thm-negaraku', name: 'Makanan Lokal', description: 'Kue basah tradisional, getuk, nasi uduk, dan ketupat', status: 'ACTIVE' },
  { id: 'sub-neg-6', themeId: 'thm-negaraku', name: 'Permainan Tradisional', description: 'Gobak sodor, bakiak, dan lompat tali', status: 'ACTIVE' },
  { id: 'sub-neg-7', themeId: 'thm-negaraku', name: 'Kesenian Daerah', description: 'Alat musik bambu, batik, dan anyaman', status: 'ACTIVE' },

  // 11. Budaya dan Kearifan Lokal
  { id: 'sub-bud-1', themeId: 'thm-budaya-lokal', name: 'Permainan Tradisional', description: 'Engklek, congklak batu, dan petak umpet', status: 'ACTIVE' },
  { id: 'sub-bud-2', themeId: 'thm-budaya-lokal', name: 'Lagu Daerah', description: 'Gundul Pacul, Rasa Sayange, dan Ampar-ampar Pisang', status: 'ACTIVE' },
  { id: 'sub-bud-3', themeId: 'thm-budaya-lokal', name: 'Cerita Rakyat', description: 'Dongeng kancil cerdik, legenda lokal, dan nasihat bijak', status: 'ACTIVE' },
  { id: 'sub-bud-4', themeId: 'thm-budaya-lokal', name: 'Kesenian Lokal', description: 'Pentas gerak lagu daerah dan kerajinan tangan', status: 'ACTIVE' },
  { id: 'sub-bud-5', themeId: 'thm-budaya-lokal', name: 'Makanan Tradisional', description: 'Kudapan lokal dari singkong, jagung, dan pisang', status: 'ACTIVE' },
  { id: 'sub-bud-6', themeId: 'thm-budaya-lokal', name: 'Pakaian Tradisional', description: 'Kain sarung, kebaya cilik, dan motif batik', status: 'ACTIVE' },
  { id: 'sub-bud-7', themeId: 'thm-budaya-lokal', name: 'Tradisi Masyarakat', description: 'Gotong royong membersihkan desa dan perayaan hari besar', status: 'ACTIVE' },

  // 12. Rekreasi
  { id: 'sub-rek-1', themeId: 'thm-rekreasi', name: 'Tempat Rekreasi', description: 'Kebun binatang, museum cilik, dan taman bermain', status: 'ACTIVE' },
  { id: 'sub-rek-2', themeId: 'thm-rekreasi', name: 'Lingkungan Alam', description: 'Piknik di bawah pohon, bukit, dan tepian danau', status: 'ACTIVE' },
  { id: 'sub-rek-3', themeId: 'thm-rekreasi', name: 'Pengalaman Berwisata', description: 'Persiapan bekal bersama dan cerita perjalanan', status: 'ACTIVE' },
  { id: 'sub-rek-4', themeId: 'thm-rekreasi', name: 'Keselamatan Saat Rekreasi', description: 'Selalu dekat orang tua/guru dan menjaga kebersihan tempat wisata', status: 'ACTIVE' },

  // 13. Makanan dan Minuman
  { id: 'sub-mak-1', themeId: 'thm-makanan-minuman', name: 'Makanan Sehat', description: 'Karbohidrat, lauk pauk berprotein, dan sayuran', status: 'ACTIVE' },
  { id: 'sub-mak-2', themeId: 'thm-makanan-minuman', name: 'Buah dan Sayur', description: 'Manfaat serat, vitamin, dan warna-warni buah segar', status: 'ACTIVE' },
  { id: 'sub-mak-3', themeId: 'thm-makanan-minuman', name: 'Makanan Lokal', description: 'Nasi liwet, ubi rebus, jagung manis, dan tempe', status: 'ACTIVE' },
  { id: 'sub-mak-4', themeId: 'thm-makanan-minuman', name: 'Proses Menyiapkan Makanan', description: 'Mencuci bahan, mengupas telur, dan menata di piring', status: 'ACTIVE' },
  { id: 'sub-mak-5', themeId: 'thm-makanan-minuman', name: 'Kebiasaan Makan Sehat', description: 'Berdoa sebelum makan, mengunyah perlahan, dan tidak memilih-milih', status: 'ACTIVE' },

  // 14. Air dan Kehidupan
  { id: 'sub-ak-1', themeId: 'thm-air-kehidupan', name: 'Air untuk Manusia', description: 'Melepas dahaga dan menjaga kebersihan tubuh', status: 'ACTIVE' },
  { id: 'sub-ak-2', themeId: 'thm-air-kehidupan', name: 'Air untuk Tanaman', description: 'Menyuburkan akar dan membuat daun tetap hijau segar', status: 'ACTIVE' },
  { id: 'sub-ak-3', themeId: 'thm-air-kehidupan', name: 'Air untuk Hewan', description: 'Minum dan tempat tinggal ikan serta amfibi', status: 'ACTIVE' },
  { id: 'sub-ak-4', themeId: 'thm-air-kehidupan', name: 'Menghemat Air', description: 'Menutup keran setelah digunakan dan tidak membuang air bersih', status: 'ACTIVE' },
  { id: 'sub-ak-5', themeId: 'thm-air-kehidupan', name: 'Eksperimen Sederhana dengan Air', description: 'Mengapung, tenggelam, pencampuran warna, dan kapilaritas tisu', status: 'ACTIVE' },

  // 15. Benda di Sekitar Kita
  { id: 'sub-ben-1', themeId: 'thm-benda-sekitar', name: 'Bentuk Benda', description: 'Lingkaran, segitiga, persegi, dan silinder', status: 'ACTIVE' },
  { id: 'sub-ben-2', themeId: 'thm-benda-sekitar', name: 'Warna', description: 'Warna primer dan pencampuran warna di alam', status: 'ACTIVE' },
  { id: 'sub-ben-3', themeId: 'thm-benda-sekitar', name: 'Tekstur', description: 'Kasar, halus, licin, lengket, dan bergelombang', status: 'ACTIVE' },
  { id: 'sub-ben-4', themeId: 'thm-benda-sekitar', name: 'Ukuran', description: 'Besar-kecil, panjang-pendek, tebal-tipis, dan berat-ringan', status: 'ACTIVE' },
  { id: 'sub-ben-5', themeId: 'thm-benda-sekitar', name: 'Fungsi Benda', description: 'Alat makan, alat tulis, wadah, dan alat main', status: 'ACTIVE' },
  { id: 'sub-ben-6', themeId: 'thm-benda-sekitar', name: 'Benda yang Dapat Berubah', description: 'Es batu mencair, adonan plastisin lunak, dan kertas terlipat', status: 'ACTIVE' },

  // 16. Lingkungan Alam
  { id: 'sub-alam-ling-1', themeId: 'thm-lingkungan-alam', name: 'Tanah', description: 'Tanah gembur, tanah liat, dan cacing penyubur', status: 'ACTIVE' },
  { id: 'sub-alam-ling-2', themeId: 'thm-lingkungan-alam', name: 'Batu', description: 'Batu kali halus, kerikil tajam, dan batu bata', status: 'ACTIVE' },
  { id: 'sub-alam-ling-3', themeId: 'thm-lingkungan-alam', name: 'Pasir', description: 'Pasir kering halus, pasir basah padat, dan sensori raba', status: 'ACTIVE' },
  { id: 'sub-alam-ling-4', themeId: 'thm-lingkungan-alam', name: 'Daun', description: 'Daun hijau segar, daun kering kecokelatan, dan pola urat', status: 'ACTIVE' },
  { id: 'sub-alam-ling-5', themeId: 'thm-lingkungan-alam', name: 'Kayu', description: 'Ranting pohon, kulit kayu bertekstur, dan balok kayu', status: 'ACTIVE' },
  { id: 'sub-alam-ling-6', themeId: 'thm-lingkungan-alam', name: 'Sungai', description: 'Aliran air jernih, gemericik air, dan bebatuan tepi sungai', status: 'ACTIVE' },
  { id: 'sub-alam-ling-7', themeId: 'thm-lingkungan-alam', name: 'Gunung', description: 'Pemandangan hijau sejuk dan pepohonan rimbun', status: 'ACTIVE' },
  { id: 'sub-alam-ling-8', themeId: 'thm-lingkungan-alam', name: 'Pantai', description: 'Deburan ombak, cangkang kerang, dan pasir pesisir', status: 'ACTIVE' },
];

export const INITIAL_CPS: CPItem[] = [
  {
    id: 'cp-01',
    elementId: 'ELEM-NAM',
    code: 'CP-1',
    title: 'Nilai Agama dan Budi Pekerti',
    description: 'Anak mengenali dan mempraktikkan nilai-nilai ajaran agamanya, menunjukkan sikap menyayangi makhluk hidup ciptaan Tuhan, serta berakhlak mulia.',
    source: 'Kurikulum Merdeka PAUD',
    status: 'ACTIVE',
  },
  {
    id: 'cp-02',
    elementId: 'ELEM-JATIDIRI',
    code: 'CP-2',
    title: 'Jati Diri',
    description: 'Anak mengenali, mengelola, dan mengekspresikan emosi secara sehat serta menunjukkan sikap positif, mandiri, bangga terhadap identitasnya, dan menghargai keberagaman.',
    source: 'Kurikulum Merdeka PAUD',
    status: 'ACTIVE',
  },
  {
    id: 'cp-03',
    elementId: 'ELEM-LITERASI',
    code: 'CP-3',
    title: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
    description: 'Anak memahami informasi dari berbagai media, bernalar kritis, menyelidiki lingkungan sekitar, serta mengekspresikan imajinasinya dalam bentuk karya visual, gerak, atau rekayasa loose parts.',
    source: 'Kurikulum Merdeka PAUD',
    status: 'ACTIVE',
  },
];

export const INITIAL_TPS: TPItem[] = [
  // TP ELEMEN NILAI AGAMA & BUDI PEKERTI
  {
    id: 'tp-nam-01',
    cpId: 'cp-01',
    code: 'TP-NAM-01',
    title: 'Membaca doa sebelum dan sesudah kegiatan serta bersyukur atas ciptaan Tuhan',
    description: 'Anak terbiasa berdoa dan mengucapkan rasa syukur dalam setiap aktivitas kesehariannya.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-nam-02',
    cpId: 'cp-01',
    code: 'TP-NAM-02',
    title: 'Menunjukkan sikap kasih sayang dan kepedulian terhadap makhluk hidup (tanaman & binatang)',
    description: 'Anak merawat tanaman, tidak menyakiti binatang, serta menjaga kebersihan lingkungan ciptaan Tuhan.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-nam-03',
    cpId: 'cp-01',
    code: 'TP-NAM-03',
    title: 'Mempraktikkan perilaku baik, sopan santun, dan saling menghargai teman',
    description: 'Anak terbiasa mengucapkan tolong, maaf, terima kasih, dan permisi dalam interaksi harian.',
    status: 'ACTIVE',
  },

  // TP ELEMEN JATI DIRI
  {
    id: 'tp-jd-01',
    cpId: 'cp-02',
    code: 'TP-JD-01',
    title: 'Mengenali dan mengelola emosi diri saat berinteraksi dan bermain bersama teman',
    description: 'Anak mampu mengenali rasa senang, sedih, atau marah serta belajar menenangkan diri dengan bimbingan santun.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-jd-02',
    cpId: 'cp-02',
    code: 'TP-JD-02',
    title: 'Mengeksplorasi koordinasi motorik kasar dan halus secara seimbang, lincah, dan aman',
    description: 'Anak terampil menggerakkan tubuh, melompat, meniti, serta memanipulasi benda kecil dengan jari-jemarinya.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-jd-03',
    cpId: 'cp-02',
    code: 'TP-JD-03',
    title: 'Menunjukkan kemandirian, rasa percaya diri, dan kemampuan bekerja sama dalam kelompok',
    description: 'Anak mampu bergantian alat main, merapikan perlengkapan sendiri, dan bangga menceritakan karyanya.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-jd-04',
    cpId: 'cp-02',
    code: 'TP-JD-04',
    title: 'Mengenal dan bangga terhadap identitas diri, keluarga, dan budaya daerahnya',
    description: 'Anak menghargai kebiasaan keluarga serta antusias mengenal permainan dan kesenian lokal.',
    status: 'ACTIVE',
  },

  // TP ELEMEN LITERASI, MATEMATIKA, SAINS, TEKNOLOGI & SENI
  {
    id: 'tp-lit-01',
    cpId: 'cp-03',
    code: 'TP-LIT-01',
    title: 'Menggunakan simbol, fonik, kosa kata, dan komunikasi lisan untuk menyampaikan ide',
    description: 'Anak mampu menyimak cerita, menceritakan kembali, dan mengenali simbol bunyi bahasa di sekitarnya.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-lit-02',
    cpId: 'cp-03',
    code: 'TP-LIT-02',
    title: 'Menyelidiki karakteristik objek dan fenomena alam melalui eksplorasi sensorik langsung',
    description: 'Anak mengamati perubahan, membandingkan tekstur/warna/bentuk, dan bertanya sebab-akibat sederhana.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-lit-03',
    cpId: 'cp-03',
    code: 'TP-LIT-03',
    title: 'Mengenali konsep bilangan, pola, ukuran, dan perbandingan melalui media konkret',
    description: 'Anak menghitung benda nyata, mengelompokkan, dan mengurutkan ukuran besar-kecil atau panjang-pendek.',
    status: 'ACTIVE',
  },
  {
    id: 'tp-lit-04',
    cpId: 'cp-03',
    code: 'TP-LIT-04',
    title: 'Menghasilkan karya orisinal dan konstruksi menggunakan bahan alam atau loose parts',
    description: 'Anak merancang karya 2D/3D bebas, balok, kolase, atau rekayasa alat sederhana dengan daya ciptanya.',
    status: 'ACTIVE',
  },
];

export const INITIAL_ATPS: ATPItem[] = [
  {
    id: 'atp-01-1',
    cpId: 'cp-01',
    code: 'ATP-NAM-01',
    title: 'Tahap Pembiasaan Doa, Rasa Syukur, dan Akhlak Mulia',
    phase: 'Fase Fondasi (4-6 Tahun)',
    stepOrder: 1,
    description: 'Anak membiasakan berdoa sebelum/sesudah kegiatan, menyayangi ciptaan Tuhan, dan bersikap santun.',
    targetAspects: ['NAM'],
    status: 'ACTIVE',
  },
  {
    id: 'atp-02-1',
    cpId: 'cp-02',
    code: 'ATP-JD-01',
    title: 'Tahap Regulasi Emosi, Motorik Sehat, dan Kolaborasi Sosial',
    phase: 'Fase Fondasi (4-6 Tahun)',
    stepOrder: 1,
    description: 'Anak mengekspresikan emosi secara sehat, berbagi alat main, bergerak aktif seimbang, dan mandiri.',
    targetAspects: ['JATI_DIRI', 'MOTORIK_KASAR', 'MOTORIK_HALUS'],
    status: 'ACTIVE',
  },
  {
    id: 'atp-03-1',
    cpId: 'cp-03',
    code: 'ATP-LIT-01',
    title: 'Tahap Penyelidikan Saintifik, Numerasi Konkret, dan Kreasi Loose Parts',
    phase: 'Fase Fondasi (4-6 Tahun)',
    stepOrder: 1,
    description: 'Anak mengamati pola, menghitung benda konkret, bertanya fenomena alam, dan merancang karya orisinal.',
    targetAspects: ['LITERASI_STEAM', 'KOGNITIF'],
    status: 'ACTIVE',
  },
];

const LOCAL_STORAGE_KEY = 'growupaud_curriculum_store_v3';

interface CurriculumStoreState {
  elements: ElementItem[];
  cps: CPItem[];
  atps: ATPItem[];
  tps: TPItem[];
  themes: ThemeItem[];
  subthemes: SubthemeItem[];
  aspects: AspectItem[];
  subaspects: SubaspectItem[];
  activities: ActivityPreset[];
}

// Convert old presets to include rubrics & correct ownerType
function formatInitialActivities(): ActivityPreset[] {
  return INITIAL_ACTIVITY_PRESETS.map((act) => ({
    ...act,
    ownerType: 'NATIONAL',
    ownerId: 'NAT-001',
    status: 'ACTIVE',
    indicators: act.indicators.map((ind) => ({
      ...ind,
      rubric: DEFAULT_RUBRIC,
      rating: 'BELUM_DINILAI',
      checked: false,
      ownerType: 'NATIONAL',
    })),
  }));
}

class CurriculumStore {
  private state: CurriculumStoreState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): CurriculumStoreState {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('growupaud_curriculum_store_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.activities) && parsed.activities.length > 0) {
          // Merge themes: ensure all 16 initial themes are present while keeping user custom themes
          const existingThemes: ThemeItem[] = Array.isArray(parsed.themes) ? parsed.themes : [];
          const mergedThemes = [...existingThemes];
          INITIAL_THEMES.forEach((initThm) => {
            const exists = mergedThemes.some(
              (t) => t.id === initThm.id || t.name.trim().toLowerCase() === initThm.name.trim().toLowerCase()
            );
            if (!exists) {
              mergedThemes.push(initThm);
            }
          });

          // Merge subthemes: ensure all initial subthemes are present
          const existingSubthemes: SubthemeItem[] = Array.isArray(parsed.subthemes) ? parsed.subthemes : [];
          const mergedSubthemes = [...existingSubthemes];
          INITIAL_SUBTHEMES.forEach((initSub) => {
            const exists = mergedSubthemes.some(
              (s) => s.id === initSub.id || (s.name.trim().toLowerCase() === initSub.name.trim().toLowerCase() && s.themeId === initSub.themeId)
            );
            if (!exists) {
              mergedSubthemes.push(initSub);
            }
          });

          // Helper to deduplicate array by id
          const dedupById = <T extends { id: string }>(items: T[]): T[] => {
            const map = new Map<string, T>();
            items.forEach((item) => {
              if (item && item.id) {
                map.set(item.id, item);
              }
            });
            return Array.from(map.values());
          };

          // Merge TPs, CPs, ATPs if missing
          const rawCPs = parsed.cps && parsed.cps.length >= INITIAL_CPS.length ? parsed.cps : INITIAL_CPS;
          const rawATPs = parsed.atps && parsed.atps.length >= INITIAL_ATPS.length ? parsed.atps : INITIAL_ATPS;
          const rawTPs = parsed.tps && parsed.tps.length >= INITIAL_TPS.length ? parsed.tps : INITIAL_TPS;

          return {
            ...parsed,
            elements: dedupById(parsed.elements || INITIAL_ELEMENTS),
            cps: dedupById(rawCPs),
            atps: dedupById(rawATPs),
            tps: dedupById(rawTPs),
            themes: dedupById(mergedThemes),
            subthemes: dedupById(mergedSubthemes),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load curriculum store from localStorage:', e);
    }

    return {
      elements: INITIAL_ELEMENTS,
      cps: INITIAL_CPS,
      atps: INITIAL_ATPS,
      tps: INITIAL_TPS,
      themes: INITIAL_THEMES,
      subthemes: INITIAL_SUBTHEMES,
      aspects: INITIAL_ASPECTS,
      subaspects: INITIAL_SUBASPECTS,
      activities: formatInitialActivities(),
    };
  }

  private saveState() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save curriculum store to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // Element getters & mutations
  public getElements(): ElementItem[] {
    return this.state.elements || INITIAL_ELEMENTS;
  }

  public getElementById(id: string): ElementItem | undefined {
    return this.getElements().find((e) => e.id === id);
  }

  public addElement(elem: Omit<ElementItem, 'id'> & { id?: string }): ElementItem {
    const created: ElementItem = {
      ...elem,
      id: elem.id || `elem-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.elements = [...this.getElements(), created];
    this.saveState();
    return created;
  }

  public updateElement(updated: ElementItem): void {
    this.state.elements = this.getElements().map((e) => (e.id === updated.id ? updated : e));
    this.saveState();
  }

  public deleteElement(id: string): void {
    this.state.elements = this.getElements().filter((e) => e.id !== id);
    this.saveState();
  }

  // Activity getters & mutations
  public getActivities(): ActivityPreset[] {
    return this.state.activities;
  }

  public getActivityById(id: string): ActivityPreset | undefined {
    return this.state.activities.find((a) => a.id === id);
  }

  public addActivity(newAct: Omit<ActivityPreset, 'id'> & { id?: string }): ActivityPreset {
    const created: ActivityPreset = {
      ...newAct,
      id: newAct.id || `act-${Date.now()}`,
      status: 'ACTIVE',
      ownerType: newAct.ownerType || 'TEACHER',
      indicators: (newAct.indicators || []).map((ind, idx) => ({
        ...ind,
        id: ind.id || `ind-${Date.now()}-${idx}`,
        rubric: ind.rubric || DEFAULT_RUBRIC,
        rating: 'BELUM_DINILAI',
        checked: false,
      })),
    };

    this.state.activities = [...this.state.activities, created];
    this.saveState();
    return created;
  }

  public updateActivity(updated: ActivityPreset): void {
    this.state.activities = this.state.activities.map((a) =>
      a.id === updated.id ? updated : a
    );
    this.saveState();
  }

  public deleteActivity(id: string): void {
    this.state.activities = this.state.activities.filter((a) => a.id !== id);
    this.saveState();
  }

  // Indicator mutations
  public addIndicatorToActivity(
    activityId: string,
    indicatorData: Omit<IndicatorItem, 'id'> & { id?: string }
  ): IndicatorItem {
    const newInd: IndicatorItem = {
      ...indicatorData,
      id: indicatorData.id || `ind-${Date.now()}`,
      rubric: indicatorData.rubric || DEFAULT_RUBRIC,
      rating: 'BELUM_DINILAI',
      checked: false,
      ownerType: indicatorData.ownerType || 'TEACHER',
    };

    this.state.activities = this.state.activities.map((act) => {
      if (act.id === activityId) {
        return {
          ...act,
          indicators: [...act.indicators, newInd],
        };
      }
      return act;
    });

    this.saveState();
    return newInd;
  }

  public updateIndicatorInActivity(
    activityId: string,
    updatedIndicator: IndicatorItem
  ): void {
    this.state.activities = this.state.activities.map((act) => {
      if (act.id === activityId) {
        return {
          ...act,
          indicators: act.indicators.map((ind) =>
            ind.id === updatedIndicator.id ? updatedIndicator : ind
          ),
        };
      }
      return act;
    });
    this.saveState();
  }

  public deleteIndicatorFromActivity(activityId: string, indicatorId: string): void {
    this.state.activities = this.state.activities.map((act) => {
      if (act.id === activityId) {
        return {
          ...act,
          indicators: act.indicators.filter((ind) => ind.id !== indicatorId),
        };
      }
      return act;
    });
    this.saveState();
  }

  // Getters for CP, TP, Themes, Aspects
  public getCPs(): CPItem[] {
    return this.state.cps;
  }

  public getCPById(id: string): CPItem | undefined {
    return this.state.cps.find((cp) => cp.id === id);
  }

  public addCP(cp: Omit<CPItem, 'id'> & { id?: string }): CPItem {
    const created: CPItem = {
      ...cp,
      id: cp.id || `cp-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.cps = [...this.state.cps, created];
    this.saveState();
    return created;
  }

  public updateCP(updated: CPItem): void {
    this.state.cps = this.state.cps.map((cp) => (cp.id === updated.id ? updated : cp));
    this.saveState();
  }

  public deleteCP(id: string): void {
    this.state.cps = this.state.cps.filter((cp) => cp.id !== id);
    this.saveState();
  }

  public getTPs(): TPItem[] {
    return this.state.tps;
  }

  public getTPById(id: string): TPItem | undefined {
    return this.state.tps.find((tp) => tp.id === id);
  }

  public addTP(tp: Omit<TPItem, 'id'> & { id?: string }): TPItem {
    const created: TPItem = {
      ...tp,
      id: tp.id || `tp-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.tps = [...this.state.tps, created];
    this.saveState();
    return created;
  }

  public updateTP(updated: TPItem): void {
    this.state.tps = this.state.tps.map((tp) => (tp.id === updated.id ? updated : tp));
    this.saveState();
  }

  public deleteTP(id: string): void {
    this.state.tps = this.state.tps.filter((tp) => tp.id !== id);
    this.saveState();
  }

  // ATP (Alur Tujuan Pembelajaran)
  public getATPs(): ATPItem[] {
    return this.state.atps || INITIAL_ATPS;
  }

  public getATPById(id: string): ATPItem | undefined {
    return this.getATPs().find((a) => a.id === id);
  }

  public getATPsByCP(cpId: string): ATPItem[] {
    return this.getATPs().filter((a) => a.cpId === cpId);
  }

  public addATP(atp: Omit<ATPItem, 'id'> & { id?: string }): ATPItem {
    const created: ATPItem = {
      ...atp,
      id: atp.id || `atp-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.atps = [...this.getATPs(), created];
    this.saveState();
    return created;
  }

  public updateATP(updated: ATPItem): void {
    this.state.atps = this.getATPs().map((a) => (a.id === updated.id ? updated : a));
    this.saveState();
  }

  public deleteATP(id: string): void {
    this.state.atps = this.getATPs().filter((a) => a.id !== id);
    this.saveState();
  }

  public getThemes(): ThemeItem[] {
    return this.state.themes;
  }

  public addTheme(
    theme: string | (Omit<ThemeItem, 'id'> & { id?: string }),
    initialSubthemes?: string[]
  ): ThemeItem {
    if (typeof theme === 'string') {
      const newTheme: ThemeItem = {
        id: `thm-${Date.now()}`,
        name: theme,
        description: `Tema: ${theme}`,
        status: 'ACTIVE',
      };
      this.state.themes = [...this.state.themes, newTheme];
      if (initialSubthemes && initialSubthemes.length > 0) {
        initialSubthemes.forEach((stName, idx) => {
          this.state.subthemes.push({
            id: `subthm-${Date.now()}-${idx}`,
            themeId: newTheme.id,
            name: stName,
            description: `Subtema ${stName}`,
            status: 'ACTIVE',
          });
        });
      }
      this.saveState();
      return newTheme;
    }

    const created: ThemeItem = {
      ...theme,
      id: theme.id || `thm-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.themes = [...this.state.themes, created];
    this.saveState();
    return created;
  }

  public updateTheme(updated: ThemeItem): void {
    this.state.themes = this.state.themes.map((t) => (t.id === updated.id ? updated : t));
    this.saveState();
  }

  public deleteTheme(idOrName: string): void {
    const theme = this.state.themes.find((t) => t.id === idOrName || t.name === idOrName);
    const targetId = theme ? theme.id : idOrName;
    this.state.themes = this.state.themes.filter((t) => t.id !== targetId && t.name !== idOrName);
    this.state.subthemes = this.state.subthemes.filter((st) => st.themeId !== targetId);
    this.saveState();
  }

  public getSubthemes(themeIdOrName?: string): SubthemeItem[] {
    if (!themeIdOrName) return this.state.subthemes;
    const byId = this.state.subthemes.filter((st) => st.themeId === themeIdOrName);
    if (byId.length > 0) return byId;
    const theme = this.state.themes.find((t) => t.name === themeIdOrName || t.id === themeIdOrName);
    if (theme) {
      return this.state.subthemes.filter((st) => st.themeId === theme.id);
    }
    return [];
  }

  public addSubtheme(
    subthemeOrTheme: string | (Omit<SubthemeItem, 'id'> & { id?: string }),
    subthemeName?: string
  ): SubthemeItem {
    if (typeof subthemeOrTheme === 'string') {
      const themeIdOrName = subthemeOrTheme;
      const theme = this.state.themes.find((t) => t.id === themeIdOrName || t.name === themeIdOrName);
      const targetThemeId = theme ? theme.id : themeIdOrName;
      const created: SubthemeItem = {
        id: `subthm-${Date.now()}`,
        themeId: targetThemeId,
        name: subthemeName || 'Subtema Baru',
        description: `Subtema ${subthemeName || ''}`,
        status: 'ACTIVE',
      };
      this.state.subthemes = [...this.state.subthemes, created];
      this.saveState();
      return created;
    }

    const created: SubthemeItem = {
      ...subthemeOrTheme,
      id: subthemeOrTheme.id || `subthm-${Date.now()}`,
      status: 'ACTIVE',
    };
    this.state.subthemes = [...this.state.subthemes, created];
    this.saveState();
    return created;
  }

  public updateSubtheme(updated: SubthemeItem): void {
    this.state.subthemes = this.state.subthemes.map((st) => (st.id === updated.id ? updated : st));
    this.saveState();
  }

  public deleteSubtheme(idOrTheme: string, subthemeNameOrId?: string): void {
    if (subthemeNameOrId) {
      const theme = this.state.themes.find((t) => t.id === idOrTheme || t.name === idOrTheme);
      const themeId = theme ? theme.id : idOrTheme;
      this.state.subthemes = this.state.subthemes.filter(
        (st) => !(st.themeId === themeId && (st.id === subthemeNameOrId || st.name === subthemeNameOrId))
      );
    } else {
      this.state.subthemes = this.state.subthemes.filter((st) => st.id !== idOrTheme && st.name !== idOrTheme);
    }
    this.saveState();
  }

  public toggleThemeStatus(idOrName: string): ThemeItem | undefined {
    const theme = this.state.themes.find((t) => t.id === idOrName || t.name === idOrName);
    if (!theme) return undefined;
    const newStatus = theme.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    theme.status = newStatus;
    this.saveState();
    return theme;
  }

  public toggleSubthemeStatus(subthemeId: string): SubthemeItem | undefined {
    const subtheme = this.state.subthemes.find((st) => st.id === subthemeId);
    if (!subtheme) return undefined;
    const newStatus = subtheme.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    subtheme.status = newStatus;
    this.saveState();
    return subtheme;
  }

  public isThemeInUse(idOrName: string): boolean {
    const theme = this.state.themes.find((t) => t.id === idOrName || t.name === idOrName);
    const targetId = theme ? theme.id : idOrName;
    const targetName = theme ? theme.name : idOrName;
    return this.state.activities.some(
      (a) => a.themeId === targetId || a.theme === targetName
    );
  }

  public isSubthemeInUse(idOrName: string): boolean {
    const sub = this.state.subthemes.find((s) => s.id === idOrName || s.name === idOrName);
    const targetId = sub ? sub.id : idOrName;
    const targetName = sub ? sub.name : idOrName;
    return this.state.activities.some(
      (a) => a.subthemeId === targetId || a.subtheme === targetName
    );
  }

  public getAspects(): AspectItem[] {
    return this.state.aspects;
  }

  public getSubaspects(): SubaspectItem[] {
    return this.state.subaspects;
  }

  public updateCPText(id: string, description: string): void {
    this.state.cps = this.state.cps.map((cp) =>
      cp.id === id ? { ...cp, description } : cp
    );
    this.saveState();
  }

  public updateTPText(id: string, description: string): void {
    this.state.tps = this.state.tps.map((tp) =>
      tp.id === id ? { ...tp, description } : tp
    );
    this.saveState();
  }
}

export const curriculumStore = new CurriculumStore();

// Utility function for calculating aspect scores from indicators (Single Source of Truth)
export function calculateAspectScores(
  indicators: IndicatorItem[]
): Record<DevelopmentalAspect, number | null> {
  const scores: Record<DevelopmentalAspect, number | null> = {
    NAM: null,
    JATI_DIRI: null,
    LITERASI_STEAM: null,
    MOTORIK_KASAR: null,
    MOTORIK_HALUS: null,
    KOGNITIF: null,
  };

  const totals: Record<DevelopmentalAspect, { sum: number; count: number }> = {
    NAM: { sum: 0, count: 0 },
    JATI_DIRI: { sum: 0, count: 0 },
    LITERASI_STEAM: { sum: 0, count: 0 },
    MOTORIK_KASAR: { sum: 0, count: 0 },
    MOTORIK_HALUS: { sum: 0, count: 0 },
    KOGNITIF: { sum: 0, count: 0 },
  };

  indicators.forEach((ind) => {
    if (!ind.rating || ind.rating === 'BELUM_DINILAI') return;
    const weight = RATING_WEIGHTS[ind.rating];
    if (!weight) return;

    const aspect = extractIndicatorAspect(ind);
    totals[aspect].sum += weight;
    totals[aspect].count += 1;
  });

  ALL_ASPECTS.forEach((key) => {
    const { sum, count } = totals[key];
    if (count === 0) {
      scores[key] = null;
    } else {
      scores[key] = Math.round((sum / (count * 4)) * 100);
    }
  });

  return scores;
}

export function calculateConfidenceScore(
  indicators: IndicatorItem[],
  teacherNote?: string,
  voiceNoteText?: string,
  evidencesCount: number = 0
): {
  score: number | null;
  level: string;
  factors: string[];
} {
  const assessed = indicators.filter((ind) => {
    const r = ind.rating;
    return r && r !== 'BELUM_DINILAI';
  });

  if (assessed.length === 0) {
    return {
      score: null,
      level: 'Belum Tersedia',
      factors: ['Belum ada indikator yang dinilai'],
    };
  }

  let totalPoints = 0;
  const factors: string[] = [];

  // Coverage factor (up to 40 pts)
  const coverageRatio = assessed.length / Math.max(indicators.length, 1);
  const indPoints = Math.round(coverageRatio * 40);
  totalPoints += indPoints;
  factors.push(`${assessed.length}/${indicators.length} Indikator dinilai (+${indPoints}%)`);

  // Teacher Note factor (up to 20 pts)
  if (teacherNote && teacherNote.trim().length > 15) {
    totalPoints += 20;
    factors.push('Catatan tertulis guru memadai (+20%)');
  } else if (teacherNote && teacherNote.trim().length > 0) {
    totalPoints += 10;
    factors.push('Catatan guru singkat (+10%)');
  }

  // Voice Note factor (up to 20 pts)
  if (voiceNoteText && voiceNoteText.trim().length > 10) {
    totalPoints += 20;
    factors.push('Bukti rekaman suara/transkrip tersedia (+20%)');
  }

  // Evidences factor (up to 20 pts)
  if (evidencesCount > 0) {
    const evPts = Math.min(20, evidencesCount * 10);
    totalPoints += evPts;
    factors.push(`${evidencesCount} Bukti foto/karya terunggah (+${evPts}%)`);
  }

  let level = 'Sangat Tinggi';
  if (totalPoints < 40) level = 'Cukup';
  else if (totalPoints < 70) level = 'Sedang';
  else if (totalPoints < 90) level = 'Tinggi';

  return {
    score: totalPoints,
    level,
    factors,
  };
}
