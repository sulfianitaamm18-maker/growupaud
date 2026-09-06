import {
  ActivityPreset,
  DevelopmentalAspect,
} from '../types';

/**
 * Label baku untuk 6 Aspek Perkembangan Anak Usia Dini (Kurikulum Merdeka PAUD)
 */
export const ASPECT_LABELS: Record<DevelopmentalAspect, string> = {
  NAM: 'Nilai Agama & Moral',
  JATI_DIRI: 'Jati Diri (Sosial Emosional)',
  LITERASI_STEAM: 'Literasi & STEAM',
  MOTORIK_KASAR: 'Motorik Kasar',
  MOTORIK_HALUS: 'Motorik Halus',
  KOGNITIF: 'Kognitif & Berpikir',
};

/**
 * Palet warna identitas resmi untuk visualisasi grafik aspek perkembangan
 */
export const ASPECT_COLORS: Record<DevelopmentalAspect, string> = {
  NAM: '#10B981', // Emerald
  JATI_DIRI: '#3B82F6', // Blue
  LITERASI_STEAM: '#8B5CF6', // Purple
  MOTORIK_KASAR: '#F59E0B', // Amber
  MOTORIK_HALUS: '#06B6D4', // Cyan
  KOGNITIF: '#EC4899', // Pink
};

/**
 * Preset Kegiatan Inti Standar Kurikulum Merdeka PAUD (Referensi Pembelajaran)
 */
export const INITIAL_ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    id: 'act-01',
    title: 'Melempar dan Menangkap Bola ke Keranjang',
    category: 'Motorik & Sosial',
    description: 'Kegiatan fisik koordinasi mata dan tangan dalam kelompok kecil.',
    iconName: 'Activity',
    cp: 'Anak mengenali dan menggunakan fungsi gerak tubuh untuk mengeksplorasi dan memanipulasi objek di sekitarnya.',
    tp: 'Anak menunjukkan kemampuan koordinasi mata-tangan dan motorik kasar saat melempar bola tepat sasaran serta bergantian dengan teman.',
    indicators: [
      { id: 'ind-01-1', text: 'Melempar bola ke keranjang dari jarak 2 meter dengan seimbang', aspect: 'MOTORIK_KASAR' },
      { id: 'ind-01-2', text: 'Menangkap bola yang dipantulkan atau dilempar ringan dari teman', aspect: 'MOTORIK_KASAR' },
      { id: 'ind-01-3', text: 'Menunggu giliran bermain dan bersikap kooperatif', aspect: 'JATI_DIRI' },
      { id: 'ind-01-4', text: 'Menghitung jumlah bola yang berhasil masuk ke dalam keranjang (1-10)', aspect: 'KOGNITIF' },
    ],
  },
  {
    id: 'act-02',
    title: 'Bermain Balok Membangun Istana & Jembatan',
    category: 'STEAM & Kognitif',
    description: 'Konstruksi bangunan 3 dimensi bersama teman kelompok.',
    iconName: 'Boxes',
    cp: 'Anak mengeksplorasi berbagai proses seni dan saintifik serta merepresentasikan pikirannya ke dalam karya visual.',
    tp: 'Anak mampu merancang struktur balok dengan keseimbangan dan menjelaskan fungsi bangunannya secara lisan.',
    indicators: [
      { id: 'ind-02-1', text: 'Menyusun balok dengan keseimbangan geometris tanpa roboh', aspect: 'KOGNITIF' },
      { id: 'ind-02-2', text: 'Menggunakan jari tangan secara presisi untuk menempatkan balok kecil', aspect: 'MOTORIK_HALUS' },
      { id: 'ind-02-3', text: 'Menceritakan hasil rancangan jembatan/istana kepada guru dengan kosa kata runtut', aspect: 'LITERASI_STEAM' },
      { id: 'ind-02-4', text: 'Berbagi balok dengan teman dan tidak mudah menyerah saat balok jatuh', aspect: 'JATI_DIRI' },
    ],
  },
  {
    id: 'act-03',
    title: 'Menggunting & Menempel Bentuk Geometri',
    category: 'Motorik Halus & Seni',
    description: 'Melatih motorik halus dan pengenalan bentuk geometri dasar.',
    iconName: 'Scissors',
    cp: 'Anak menunjukkan kemampuan motorik halus dan kreativitas visual melalui media kertas dan lem.',
    tp: 'Anak mampu menggunting mengikuti garis pola geometri dan menyusunnya menjadi bentuk benda/hewan.',
    indicators: [
      { id: 'ind-03-1', text: 'Menggunting kertas mengikuti garis lurus, lengkung, dan segitiga', aspect: 'MOTORIK_HALUS' },
      { id: 'ind-03-2', text: 'Menempel potongan geometri sesuai pola tanpa bantuan guru', aspect: 'MOTORIK_HALUS' },
      { id: 'ind-03-3', text: 'Mengelompokkan bentuk lingkaran, persegi, dan segitiga', aspect: 'KOGNITIF' },
      { id: 'ind-03-4', text: 'Membaca doa sebelum mulai berkarya dan merapikan alat setelah selesai', aspect: 'NAM' },
    ],
  },
  {
    id: 'act-04',
    title: 'Bercerita Buku Dongeng Binatang Hutan',
    category: 'Literasi & Bahasa',
    description: 'Mendengarkan dongeng dan menceritakan kembali pesan moril dongeng.',
    iconName: 'BookOpen',
    cp: 'Anak memahami informasi dari media literasi dan menunjukkan minat terhadap tuturan bahasa.',
    tp: 'Anak menyimak cerita dongeng dan mampu menjawab pertanyaan terbuka tentang tokoh serta amanat cerita.',
    indicators: [
      { id: 'ind-04-1', text: 'Menyimak cerita dari awal hingga akhir dengan fokus', aspect: 'LITERASI_STEAM' },
      { id: 'ind-04-2', text: 'Menyebutkan nama-nama tokoh binatang dan sifat baik/buruknya', aspect: 'NAM' },
      { id: 'ind-04-3', text: 'Menceritakan kembali alur dongeng secara sederhana dengan bahasanya sendiri', aspect: 'LITERASI_STEAM' },
      { id: 'ind-04-4', text: 'Menunjukkan empati terhadap tokoh yang tertimpa masalah dalam cerita', aspect: 'JATI_DIRI' },
    ],
  },
];
