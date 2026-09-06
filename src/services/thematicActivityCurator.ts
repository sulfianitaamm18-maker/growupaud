import { DevelopmentalAspect } from '../types';

export interface ThematicCuratedActivity {
  id: string;
  title: string;
  modality:
    | 'Eksplorasi Lingkungan'
    | 'Eksperimen Sederhana'
    | 'Konstruksi Loose Parts'
    | 'Bermain Peran & Budaya'
    | 'Proyek Kolaboratif'
    | 'Sensori & Seni Alami';
  duration: string;
  description: string;
  steps: string[];
  pedagogicalRationale: string;
  whyRelevantToTP: string;
  provocationQuestions: string[];
  primaryMaterials: string[];
  localLooseParts: string[];
  materialAlternatives: Array<{ main: string; alternative: string; reason: string }>;
  tarlAdjustments: {
    perluDukungan: string;
    berkembang: string;
    pengayaan: string;
  };
  observableIndicators: Array<{
    aspect: DevelopmentalAspect;
    aspectLabel: string;
    observableBehavior: string;
    rubric: { BB: string; MB: string; BSH: string; BSB: string };
  }>;
  documentationFocus: string;
}

/**
 * Returns 3-5 pedagogical, deep-learning, TaRL-aligned activity options tailored specifically
 * to the given theme and subtheme, without repetitive or generic worksheets.
 */
export function getCuratedActivitiesForTheme(
  themeName: string = '',
  subthemeName: string = '',
  isKelompokA: boolean = false
): ThematicCuratedActivity[] {
  const thm = themeName.toLowerCase().trim();
  const sub = subthemeName.toLowerCase().trim();

  // 1. TANAMAN / AIR & KEHIDUPAN (Plants, gardening, nature growth)
  if (thm.includes('tanaman') || sub.includes('tanam') || sub.includes('kebun') || sub.includes('akar') || sub.includes('daun')) {
    return [
      {
        id: 'act-tan-01',
        title: 'Menanam Biji Kacang Hijau di Baki Ramah Lingkungan',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak menyelidiki cara biji bertunas menggunakan media kapas basah atau tanah gembur dalam wadah bekas, lalu menyusun jadwal merawatnya secara berkala.',
        steps: [
          'Pijakan Awal: Mengamati dan meraba tekstur biji kacang hijau kering: "Apa yang menurutmu ada di dalam biji kecil ini?".',
          'Penyelidikan Media: Membasahi kapas atau memasukkan tanah gembur ke wadah cangkir bekas ramah lingkungan.',
          'Pijakan Main: Menanam 3-5 butir biji menggunakan jepitan jari jempol-telunjuk dan meletakkan di sudut kelas yang terkena sinar matahari.',
          'Refleksi Berkesadaran: Berdoa mensyukuri keajaiban benih ciptaan Tuhan dan sepakat menyiramnya setiap pagi.',
        ],
        pedagogicalRationale: 'Memberikan pengalaman hands-on nyata tentang siklus hidup makhluk hidup tanpa buku teks mekanistik, membangun kecintaan pada ciptaan Tuhan dan penalaran saintifik.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Objek Alam dan TP Rasa Syukur: anak mengamati perubahan fisik biji secara langsung dan mempraktikkan tanggung jawab menyiram.',
        provocationQuestions: [
          'Apa yang menurutmu akan terjadi setelah biji ini kita beri air dan sinar matahari?',
          'Mengapa biji membutuhkan air untuk bangun dari tidurnya?',
          'Bagaimana cara kita mengetahui apakah tanaman kita merasa haus atau cukup air?',
        ],
        primaryMaterials: ['Biji kacang hijau pilihan', 'Kapas putih bersih / tanah gembur pekarangan', 'Cangkir/gelas bekas air mineral ramah anak', 'Air bersih dalam teko mini'],
        localLooseParts: ['Ranting penanda nama anak', 'Kerikil alas wadah', 'Potongan kertas label'],
        materialAlternatives: [
          { main: 'Pot plastik pabrikan', alternative: 'Kulit telur utuh atau wadah bekas agar-agar', reason: 'Bebas biaya, ramah lingkungan, dan anak belajar memanfaatkan barang bekas.' },
          { main: 'Pupuk kimia', alternative: 'Air cucian beras dari dapur rumah anak', reason: 'Aman untuk anak dan kaya nutrisi alami bagi tunas.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak dibimbing meletakkan 2 butir biji di atas kapas basah dengan pendampingan sentuhan guru dan menyebutkan nama biji.',
          berkembang: 'Anak mandiri membasahi kapas secukupnya, menata jarak antar biji, dan meletakkan di rak jendela.',
          pengayaan: 'Anak membuat 2 wadah perbandingan (satu di tempat terang dan satu di dalam kardus gelap) untuk menduga perbedaannya.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mengamati, bertanya, dan menceritakan tanda awal pertumbuhan tunas pada biji kacang hijau.',
            rubric: {
              BB: 'Belum memperhatikan biji dan memerlukan stimulasi penuh dari guru.',
              MB: 'Mengamati biji setelah diajak guru dan menunjuk biji yang basah.',
              BSH: 'Mandiri mengamati dan menceritakan perubahan bentuk biji yang mulai mekar.',
              BSB: 'Kritis menghubungkan pemberian air dan sinar matahari dengan munculnya tunas baru serta memprediksi perkembangannya.',
            },
          },
          {
            aspect: 'NAM',
            aspectLabel: 'Nilai Agama & Budi Pekerti',
            observableBehavior: 'Menunjukkan rasa syukur atas tanaman ciptaan Tuhan dan peduli merawat dengan menyiram teratur.',
            rubric: {
              BB: 'Belum menunjukkan kepedulian terhadap tanaman.',
              MB: 'Menyiram tanaman saat diingatkan dan didampingi guru.',
              BSH: 'Spontan dan terbiasa merawat serta menyiram tanaman dengan hati-hati.',
              BSB: 'Menjadi teladan merawat kebun kelas dan mengajak teman menyiram tanaman tanpa diminta.',
            },
          },
          {
            aspect: 'MOTORIK_HALUS',
            aspectLabel: 'Motorik Halus',
            observableBehavior: 'Menggunakan genggaman jempol dan telunjuk (pincer grasp) untuk memungut biji dan meletakkannya cermat.',
            rubric: {
              BB: 'Masih menggenggam banyak biji dengan seluruh telapak tangan sehingga tercecer.',
              MB: 'Mulai menggunakan dua jari mengambil biji meskipun sesekali terlepas.',
              BSH: 'Mantap memungut dan menata satu demi satu biji ke dalam wadah secara rapi.',
              BSB: 'Memiliki koordinasi jari yang sangat stabil, ritmis, dan presisi.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak menjepit biji dengan jari telunjuk-jempol dan ekspresi antusias saat menemukan tunas pertama mekar.',
      },
      {
        id: 'act-tan-02',
        title: 'Detektif Daun: Berburu, Mengelompokkan & Meraba Urat Daun',
        modality: 'Eksplorasi Lingkungan',
        duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
        description: 'Anak berkeliling pekarangan sekolah membawa keranjang kecil untuk mengumpulkan aneka daun gugur, membandingkan tekstur halus-kasar, dan mencocokkan pola urat daun.',
        steps: [
          'Jalan Santai Berkesadaran: Mengamati aneka bentuk pohon dan warna daun di halaman sekolah.',
          'Pencarian Etis: Hanya mengumpulkan daun yang sudah gugur di tanah untuk mengajarkan cinta alam.',
          'Klasifikasi Mandiri: Menata daun ke baki: daun hijau vs kuning, daun halus vs kasar, tepi rata vs bergerigi.',
          'Jiplak Tekstur: Meletakkan kertas tipis di atas daun dan menggosok arang/krayon untuk memunculkan urat daun.',
        ],
        pedagogicalRationale: 'Membangun kemampuan observasi saintifik awal melalui eksplorasi sensorik taktil langsung di alam terbuka.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Karakteristik Objek Alam: anak membedakan ciri fisik objek alam melalui indera raba dan penglihatan.',
        provocationQuestions: [
          'Mengapa menurutmu ada daun yang permukaannya berbulu lembut dan ada yang licin?',
          'Bagaimana caramu mengelompokkan daun-daun ini agar temanmu mudah mengenalnya?',
          'Apa yang menyebabkan daun di pohon lama-kelamaan berubah warna dan gugur?',
        ],
        primaryMaterials: ['Daun gugur aneka bentuk (menjari, lonjong, bulat)', 'Baki bambu atau keranjang kecil', 'Kertas bekas untuk jiplak', 'Krayon atau arang kayu'],
        localLooseParts: ['Ranting pohon', 'Kerikil penindih daun', 'Biji kelopak bunga'],
        materialAlternatives: [
          { main: 'Kertas gambar tebal khusus', alternative: 'Kertas buram atau bagian belakang kalender bekas', reason: 'Lebih tipis sehingga pola urat daun timbul lebih tajam saat digosok krayon.' },
          { main: 'Kaca pembesar kaca', alternative: 'Tetesan air bening di atas permukaan daun licin', reason: 'Menciptakan efek lensa cembung alami tanpa risiko kaca pecah.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak fokus meraba 2 daun berkontras ekstrem (daun talas licin vs daun jati kasar) dan menyebutkan perasaannya.',
          berkembang: 'Anak mengelompokkan minimal 3 jenis daun berdasarkan warna atau ukuran ke dalam baki terpisah.',
          pengayaan: 'Anak mengurutkan 5 helai daun dari ukuran terpendek ke terpanjang dan menceritakan pola urat daunnya.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mengidentifikasi dan mengelompokkan daun berdasarkan atribut fisik (tekstur, bentuk, ukuran).',
            rubric: {
              BB: 'Belum membedakan karakteristik daun.',
              MB: 'Mengelompokkan daun setelah dicontohkan guru.',
              BSH: 'Mandiri mengelompokkan daun berdasarkan ciri yang ditemukannya.',
              BSB: 'Mampu menjelaskan kriteria klasifikasi yang dipilihnya dan menemukan pola tersembunyi pada urat daun.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mengusap jari pada urat daun dan hasil jiplakan pola daun dengan krayon.',
      },
      {
        id: 'act-tan-03',
        title: 'Investigasi Saintifik: Tanaman Haus vs Tanaman Segar',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
        description: 'Anak mengamati dua tanaman kecil yang satu disiram air secara rutin dan yang satu tidak disiram selama 2 hari, untuk memahami fungsi penting air bagi kehidupan.',
        steps: [
          'Pengamatan Komparatif: Meletakkan dua tanaman berdampingan dan mengamati perbedaan posisi daun dan batang.',
          'Sentuhan Penyelidikan: Meraba kelembapan tanah di dalam kedua pot menggunakan jari telunjuk.',
          'Pemberian Bantuan: Menyiramkan air secukupnya pada tanaman yang layu dan mencatat apa yang terjadi setelah 1 jam.',
          'Diskusi Reflektif: Mengaitkan rasa haus tanaman dengan kebutuhan tubuh anak sendiri saat berolahraga.',
        ],
        pedagogicalRationale: 'Menanamkan pemahaman sebab-akibat (causality reasoning) dan empati ekologis melalui perbandingan konkret.',
        whyRelevantToTP: 'Relevan dengan TP Pemecahan Masalah & Pertanyaan Sebab-Akibat Sederhana dan TP Kepedulian Makhluk Hidup.',
        provocationQuestions: [
          'Menurutmu apa yang sedang dirasakan daun yang menunduk layu ini?',
          'Apa yang terjadi di dalam tanah ketika kita menuangkan air?',
          'Bagaimana tubuh kita memberi tahu bahwa kita juga membutuhkan minum air seperti tanaman?',
        ],
        primaryMaterials: ['Dua pot tanaman sejenis (misal tanaman bunga krokot atau sirih gading)', 'Air bersih dalam cangkir kecil', 'Tongkat lidi pengukur kelayuan'],
        localLooseParts: ['Batu kerikil', 'Piring tatakan pot'],
        materialAlternatives: [
          { main: 'Pot tanaman beli di toko', alternative: 'Wadah botol plastik bekas 1.5L yang dipotong dua', reason: 'Dinding transparan memungkinkan anak melihat kelembapan tanah dari luar.' },
          { main: 'Termometer tanah', alternative: 'Ujung jari anak untuk merasakan suhu dan kelembapan tanah', reason: 'Melatih kepekaan sensori raba alami.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak diajak menyentuh tanah kering vs tanah basah dan menyiramkan air dengan cangkir bergagang.',
          berkembang: 'Anak menjelaskan perbedaan fisik antara tanaman yang layu dan segar dengan kata-katanya sendiri.',
          pengayaan: 'Anak membuat prediksi berapa lama daun yang layu akan kembali berdiri tegak setelah diberi minum air.',
        },
        observableIndicators: [
          {
            aspect: 'KOGNITIF',
            aspectLabel: 'Kognitif & Logika',
            observableBehavior: 'Menjelaskan hubungan sebab-akibat sederhana antara ketiadaan air dengan kelayuan tanaman.',
            rubric: {
              BB: 'Belum menyadari hubungan antara air dan kesegaran tanaman.',
              MB: 'Menyatakan tanaman layu butuh disiram setelah dipandu guru.',
              BSH: 'Mandiri menjelaskan bahwa tanaman layu karena kehausan/kekurangan air.',
              BSB: 'Mampu menghubungkan kebutuhan air pada tanaman, hewan, dan tubuh manusia secara komprehensif.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak menyentuh tanah dan ekspresi empati saat menyiram tanaman yang layu.',
      },
      {
        id: 'act-tan-04',
        title: 'Merancang Kebun Mini Impian dari Kotak Bekas & Loose Parts',
        modality: 'Konstruksi Loose Parts',
        duration: isKelompokA ? '40 - 45 Menit' : '50 - 60 Menit',
        description: 'Anak berkolaborasi dalam kelompok kecil menata kotak kardus menjadi lanskap taman mini dengan tanah, kerikil jalan setapak, ranting pohon buatan, dan daun.',
        steps: [
          'Perencanaan Desain: Anak berdiskusi sederhana menentukan letak jalan, pepohonan, dan kolam mini.',
          'Konstruksi Lanskap: Mengisi kotak dengan tanah/pasir, menata kerikil sebagai jalan setapak, dan menancapkan ranting.',
          'Detail Estetika: Menambahkan kelopak bunga gugur dan tutup botol sebagai kolam air imajinatif.',
          'Panggung Cerita: Anak memainkan miniatur hewan atau boneka kayu berjalan di taman mini karyanya.',
        ],
        pedagogicalRationale: 'Mengembangkan penalaran spasial 3D, kerja sama tim, dan ekspresi seni rekayasa berbasis material daur ulang.',
        whyRelevantToTP: 'Relevan dengan TP Menghasilkan Karya Konstruksi Orisinal dan TP Bekerja Sama dalam Kelompok.',
        provocationQuestions: [
          'Bagaimana caramu mengatur agar jalan setapak batu ini bisa dilalui semua pengunjung taman?',
          'Di mana tempat paling teduh untuk menaruh pohon ranting ini?',
          'Bagaimana jika hujan lebat turun, ke mana air di taman ini akan mengalir?',
        ],
        primaryMaterials: ['Tutup kotak sepatu atau nampan kardus', 'Tanah gembur atau pasir pekarangan', 'Ranting pohon bercabang', 'Batu kerikil aneka warna'],
        localLooseParts: ['Tutup botol plastik aneka ukuran', 'Sabut kelapa kering', 'Kelopak bunga kamboja gugur'],
        materialAlternatives: [
          { main: 'Rumput sintetis plastik', alternative: 'Lumut hijau dari batu kali atau sabut kelapa halus', reason: 'Tekstur organik nyata dan ramah lingkungan.' },
          { main: 'Figur mainan plastik mahal', alternative: 'Boneka ranting atau batu kali yang dilukis wajah', reason: 'Memicu imajinasi kreatif anak secara maksimal.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menancapkan 2-3 ranting ke dalam tanah dan menaruh kerikil di sampingnya bersama teman.',
          berkembang: 'Anak merancang pembagian area taman (jalan, kolam, pohon) dan menatanya dengan seimbang.',
          pengayaan: 'Anak menambahkan jembatan dari stik es krim/ranting dan menceritakan alur cerita perjalanan di taman.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Merancang karya konstruksi 3 dimensi menggunakan aneka material loose parts dengan struktur stabil.',
            rubric: {
              BB: 'Hanya meletakkan bahan acak tanpa bentuk terencana.',
              MB: 'Meniru susunan teman atau guru dengan bantuan.',
              BSH: 'Mandiri merancang struktur taman mini yang seimbang dan memiliki fungsi jelas.',
              BSB: 'Menghasilkan rancang bangun inovatif dengan integrasi variasi material yang kaya dan penjelasan arsitektur logis.',
            },
          },
        ],
        documentationFocus: 'Foto konstruksi taman mini dari sudut atas (bird-eye view) dan ekspresi anak saat menceritakan karyanya.',
      },
    ];
  }

  // 2. DIRIKU (Identitas, tubuh, panca indera, emosi, hidup sehat)
  if (thm.includes('diri') || sub.includes('identitas') || sub.includes('tubuh') || sub.includes('indra') || sub.includes('emosi') || sub.includes('sehat')) {
    return [
      {
        id: 'act-dir-01',
        title: 'Melukis Bayangan Diri & Menemukan Pola Unik Jejak Tubuh',
        modality: 'Sensori & Seni Alami',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak berpasangan di luar ruangan saat pagi cerah untuk menjiplak siluet bayangan tubuh temannya di atas kertas gulung besar/paving, lalu mengidentifikasi bagian tubuh.',
        steps: [
          'Eksplorasi Gerak Bayangan: Berdiri di bawah sinar matahari pagi dan meliukkan tubuh mengamati perubahan bayangan.',
          'Penjiplakan Kolaboratif: Satu anak berpose membeku sementara temannya menjiplak garis luar bayangan dengan kapur/kuas air.',
          'Penyelidikan Anggota Tubuh: Menunjuk kepala, bahu, lengan, dan kaki pada bayangan yang sudah digambar.',
          'Hias Siluet: Menata dedaunan dan bunga gugur sebagai baju atau hiasan rambut pada siluet.',
        ],
        pedagogicalRationale: 'Menumbuhkan kesadaran spasial tubuh (body awareness) dan konsep diri positif secara joyful dan kolaboratif.',
        whyRelevantToTP: 'Relevan dengan TP Mengenal Identitas & Anggota Tubuh dan TP Koordinasi Motorik Kasar.',
        provocationQuestions: [
          'Mengapa bayanganmu bisa bertambah panjang atau pendek saat kamu berpindah tempat?',
          'Bagian tubuh mana yang paling lincah kamu gerakkan hari ini?',
          'Bagaimana tubuh kita menjaga keseimbangan saat berdiri dengan satu kaki?',
        ],
        primaryMaterials: ['Kapur tulis warna-warni atau kuas air besar', 'Area paving sekolah / kertas kalender bekas disambung', 'Cermin cilik aman'],
        localLooseParts: ['Kelopak bunga gugur', 'Daun aneka bentuk untuk mahkota siluet', 'Tali rami'],
        materialAlternatives: [
          { main: 'Kertas karton besar pabrikan', alternative: 'Paving halaman sekolah yang dibasahi kuas air', reason: 'Air akan mengering sendiri, ramah lingkungan, dan hemat biaya.' },
          { main: 'Meteran pengukur plastik', alternative: 'Jengkal tangan atau ranting lidi sebagai alat ukur tinggi bayangan', reason: 'Melatih konsep pengukuran non-standar yang intuitif bagi PAUD.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menjiplak telapak tangan atau kakinya sendiri di lantai dengan kapur dan menyebutkan nama jarinya.',
          berkembang: 'Anak bekerja berpasangan menjiplak siluet badan teman dan menunjuk 4 anggota tubuh utama.',
          pengayaan: 'Anak membandingkan panjang bayangan tubuh saat pagi hari dan siang hari serta menjelaskan penyebabnya.',
        },
        observableIndicators: [
          {
            aspect: 'JATI_DIRI',
            aspectLabel: 'Jati Diri',
            observableBehavior: 'Mengenali karakteristik fisik diri dan menunjukkan rasa bangga serta percaya diri atas tubuh ciptaan Tuhan.',
            rubric: {
              BB: 'Belum mau berpartisipasi mengamati bayangan diri.',
              MB: 'Mengamati bayangan dengan bimbingan dan mau berpose sederhana.',
              BSH: 'Percaya diri mengekspresikan pose tubuh dan menyebutkan anggota tubuhnya.',
              BSB: 'Sangat antusias mengapresiasi keunikan dirinya dan menghargai perbedaan bentuk teman sekelas.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak berpose membeku dan tersenyum melihat siluet bayangannya di tanah.',
      },
      {
        id: 'act-dir-02',
        title: 'Kotak Rahasia Panca Indera: Menyelidiki Tekstur, Aroma, dan Bunyi',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
        description: 'Anak memasukkan tangan ke dalam kotak misteri berlubang kain untuk meraba benda tanpa melihat, mencium wadah beraroma alami, dan membunyikan shaker bambu.',
        steps: [
          'Pijakan Sensori Raba: Meraba benda di kotak (spons lembut, batu kasar, kuas halus) dan menebak wujudnya.',
          'Penyelidikan Penciuman: Menghirup aroma daun jeruk purut, serai, dan kayu manis dari cangkir bertutup kain berpori.',
          'Penyelidikan Auditori: Mengocok tabung berisi beras vs kerikil dan mendengarkan perbedaan ritme bunyinya.',
          'Refleksi Berpasangan: Menceritakan bagaimana panca indera membantu kita mengenali dunia dengan aman.',
        ],
        pedagogicalRationale: 'Melatih kepekaan sensorik multi-modal (tactile, olfactory, auditory discrimination) yang menjadi pondasi kognisi awal.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Karakteristik Objek Sensorik dan TP Komunikasi Lisan.',
        provocationQuestions: [
          'Bagaimana tanganmu tahu bahwa benda di dalam kotak ini bertekstur kasar meskipun matamu terpejam?',
          'Aroma apa yang mengingatkanmu pada suasana dapur ibu di rumah?',
          'Bagaimana jika telinga kita tidak bisa mendengar suara bel sekolah?',
        ],
        primaryMaterials: ['Kotak kardus bekas dengan lubang kain', 'Bahan alam bertekstur kontras (batu kali, bulu ayam, spons, sabut)', 'Daun aromatik (pandan, serai, jeruk)', 'Botol kecil bekas berisi biji'],
        localLooseParts: ['Batok kelapa', 'Biji jagung', 'Kain perca'],
        materialAlternatives: [
          { main: 'Alat peraga sensori pabrikan', alternative: 'Kardus bekas mie instan yang dipasangi kaos kaki bekas sebagai tirai lubang', reason: 'Tangan anak masuk nyaman tanpa melihat isi kotak.' },
          { main: 'Minyak esensial kimia', alternative: 'Daun pandan dan batang serai asli yang dimemarkan', reason: '100% alami, aman untuk indera penciuman anak.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak meraba benda bersama guru di luar kotak terlebih dahulu sebelum mencoba menebak di dalam kotak.',
          berkembang: 'Anak mandiri menebak minimal 2 tekstur benda di dalam kotak rahasia dan menceritakan cirinya.',
          pengayaan: 'Anak mampu mendeskripsikan secara rinci 3 ciri benda (suhu, tekstur, kelenturan) sebelum menebak namanya.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Menggunakan kosa kata deskriptif untuk menyampaikan sensasi rabaan, aroma, dan bunyi objek.',
            rubric: {
              BB: 'Hanya mengeluarkan benda tanpa memberikan deskripsi verbal.',
              MB: 'Menyebutkan satu kata sifat (misal: "kasar" atau "wangi") saat ditanya guru.',
              BSH: 'Spontan mendeskripsikan sensasi rabaan dengan kalimat sederhana yang jelas.',
              BSB: 'Kaya kosa kata deskriptif, membandingkan sensasi dengan pengalaman lain secara runtut dan analitis.',
            },
          },
        ],
        documentationFocus: 'Foto ekspresi penasaran anak saat meraba ke dalam kotak dan saat mencium aroma daun pandan.',
      },
      {
        id: 'act-dir-03',
        title: 'Boneka Emosi dari Perca & Cermin Wajah Gembira',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak bercermin mengenali ekspresi senang, sedih, kaget, dan tenang, lalu merangkai boneka ekspresi menggunakan sendok kayu/kardus dan kain perca.',
        steps: [
          'Eksplorasi Ekspresi Cermin: Menirukan mimik wajah gembira, cemberut saat mainan diambil, dan tenang saat dipeluk.',
          'Pembuatan Boneka: Menempelkan mata kancing, benang wol sebagai rambut, dan menggambar garis senyum pada sendok/kardus.',
          'Permainan Peran Empati: Saling bercerita dengan boneka: "Apa yang membuat bonekamu hari ini tersenyum?".',
          'Pijakan Regulasi: Belajar teknik napas kupu-kupu (tarik napas pelan, hembuskan perlahan) saat merasa kesal.',
        ],
        pedagogicalRationale: 'Mengembangkan literasi emosional (emotional literacy) dan regulasi diri sebagai pilar kesehatan mental anak usia dini.',
        whyRelevantToTP: 'Relevan dengan TP Mengenali & Mengelola Emosi Diri Serta Menunjukkan Empati pada Teman.',
        provocationQuestions: [
          'Bagaimana bentuk alismu dan bibirmu saat kamu sedang merasa senang sekali?',
          'Apa yang bisa kita lakukan jika melihat boneka teman kita sedang bersedih?',
          'Ketika hatimu sedang merasa kesal, hal apa yang membuatmu merasa lebih tenang dan nyaman?',
        ],
        primaryMaterials: ['Sendok kayu bekas atau potongan kardus oval', 'Kain perca warna-warni', 'Spidol atau krayon', 'Cermin kecil kelas'],
        localLooseParts: ['Benang wol bekas', 'Tutup botol', 'Pita kain'],
        materialAlternatives: [
          { main: 'Boneka emosi plastik import', alternative: 'Piring kertas bekas atau centong nasi kayu yang digambari ekspresi', reason: 'Anak memiliki kepemilikan personal karena membuatnya sendiri.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menunjuk gambar wajah tersenyum dan mencocokkan dengan ekspresi wajahnya di cermin.',
          berkembang: 'Anak membuat boneka dengan satu ekspresi pilihan dan menceritakan alasan bonekanya merasa demikian.',
          pengayaan: 'Anak membuat boneka bolak-balik (senang dan sedih) serta memperagakan cara menolong teman yang menangis.',
        },
        observableIndicators: [
          {
            aspect: 'JATI_DIRI',
            aspectLabel: 'Jati Diri',
            observableBehavior: 'Mampu mengenali emosi diri dan menunjukkan perilaku menenangkan diri atau empati pada sesama.',
            rubric: {
              BB: 'Belum mampu membedakan emosi senang dan sedih.',
              MB: 'Mengenali ekspresi wajah dengan panduan pertanyaan guru.',
              BSH: 'Mandiri menyebutkan perasaannya hari ini dan mempraktikkan napas tenang.',
              BSB: 'Mampu mendeteksi perasaan teman, menunjukkan empati hangat, dan berinisiatif menghibur.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak bercermin mempraktekkan senyum lebar dan foto boneka emosi buatannya.',
      },
    ];
  }

  // 3. KELUARGAKU & LINGKUNGANKU (Family, Home, Neighborhood, Cleanliness)
  if (thm.includes('keluarga') || thm.includes('lingkungan') || sub.includes('rumah') || sub.includes('sekolah') || sub.includes('sampah') || sub.includes('tetangga')) {
    return [
      {
        id: 'act-kel-01',
        title: 'Arsitek Cilik: Merancang Miniatur Rumah Impian Ramah Lingkungan',
        modality: 'Konstruksi Loose Parts',
        duration: isKelompokA ? '40 - 45 Menit' : '50 - 60 Menit',
        description: 'Anak memanfaatkan kardus bekas berbagai ukuran untuk merancang ruangan rumah, pintu ventilasi, serta pekarangan hijau bersama teman.',
        steps: [
          'Diskusi Kehangatan Rumah: Menceritakan ruangan favorit di rumah (dapur, teras, kamar) dan peran anggota keluarga.',
          'Pemilihan Media Kardus: Memilih kardus sesuai skala ruang yang ingin dibuat.',
          'Penyusunan Struktur: Merekatkan kardus dengan selotip kertas ramah anak dan menata furnitur tutup botol.',
          'Tur Rumah Mini: Menceritakan miniatur rumah kepada teman dan bagaimana menjaga kebersihannya.',
        ],
        pedagogicalRationale: 'Menghubungkan kasih sayang keluarga dengan konsep arsitektur ramah anak dan pemanfaatan bahan daur ulang.',
        whyRelevantToTP: 'Relevan dengan TP Menghasilkan Karya Rekayasa Konstruksi dan TP Kasih Sayang Keluarga.',
        provocationQuestions: [
          'Mengapa rumah kita membutuhkan jendela dan ventilasi udara yang cukup?',
          'Bagaimana caramu membantu ayah dan ibu merapikan rumah setiap hari?',
          'Bagaimana jika miniatur rumah ini kita tambahi tempat memilah sampah di depannya?',
        ],
        primaryMaterials: ['Kardus bekas kemasan bersih (pasta gigi, susu, sereal)', 'Selotip kertas ramah anak', 'Tutup botol plastik aneka warna', 'Kain perca'],
        localLooseParts: ['Ranting pekarangan', 'Batu kerikil jalan setapak', 'Tabung tisu'],
        materialAlternatives: [
          { main: 'Balok balok kayu beli mahal', alternative: 'Kardus kemasan yang diisi remasan koran agar kokoh', reason: 'Lebih ringan, aman, dan mendidik anak untuk berdaya guna.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak fokus menempelkan 1 pintu pada kotak kardus tunggal dan menaruh tutup botol sebagai meja.',
          berkembang: 'Anak menggabungkan 2 kotak kardus menjadi rumah bertingkat atau memiliki teras mandiri.',
          pengayaan: 'Anak merancang pembagian fungsi 3 ruangan (dapur, kamar, pekarangan) dan menjelaskan alasan tata letaknya.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Merancang bangun ruang tiga dimensi dengan memperhitungkan keseimbangan dan fungsi struktural.',
            rubric: {
              BB: 'Menumpuk kardus tanpa keseimbangan sehingga roboh.',
              MB: 'Menyusun kardus dengan arahan fisik dari guru.',
              BSH: 'Mandiri menyusun konstruksi rumah yang kokoh dan memiliki elemen ruangan jelas.',
              BSB: 'Kreatif memadukan material loose parts untuk detail fungsional (atap, tangga, pagar) secara orisinal.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mengukur penempatan atap segitiga pada kotak kardus rumahnya.',
      },
      {
        id: 'act-kel-02',
        title: 'Operasi Detektif Lingkungan: Memilah Sampah Daun vs Plastik',
        modality: 'Eksplorasi Lingkungan',
        duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
        description: 'Anak mengenakan sarung tangan kain berkeliling halaman sekolah untuk mencari dan memilah sampah ke dalam dua keranjang: sampah alami yang bisa jadi pupuk vs sampah daur ulang.',
        steps: [
          'Pijakan Investigasi: Mengamati halaman sekolah: mana yang terlihat asri dan mana sampah yang mengganggu keindahan.',
          'Aksi Bersih Gotong Royong: Anak berpencar mengumpulkan sampah dengan capit bambu/tangan bersarung.',
          'Pilah Bijak: Memasukkan daun kering ke keranjang kompos dan gelas plastik ke keranjang daur ulang.',
          'Refleksi Penutup: Mencuci tangan dengan sabun dan air mengalir hingga bersih.',
        ],
        pedagogicalRationale: 'Menumbuhkan kesadaran ekologis (ecological mindfulness) dan perilaku hidup bersih berkelanjutan sejak dini.',
        whyRelevantToTP: 'Relevan dengan TP Menjaga Kebersihan Lingkungan dan TP Mempraktikkan Perilaku Hidup Bersih & Sehat.',
        provocationQuestions: [
          'Apa yang akan terjadi pada halaman sekolah jika semua orang membuang bungkus makanan sembarangan?',
          'Mengapa daun kering ini bisa hancur menjadi tanah yang subur sedangkan plastik tidak bisa hancur?',
          'Bagaimana cara kita mengajak teman-teman lain agar tidak lagi membuang sampah sembarangan?',
        ],
        primaryMaterials: ['Dua keranjang bertanda warna hijau (alam) dan kuning (plastik)', 'Sarung tangan kain cilik', 'Capit kue atau penjepit bambu ramah anak', 'Sabun cuci tangan'],
        localLooseParts: ['Daun gugur', 'Kertas bekas', 'Botol plastik'],
        materialAlternatives: [
          { main: 'Tempat sampah plastik pabrikan', alternative: 'Kardus bekas yang diwarnai hijau dan kuning oleh anak', reason: 'Anak merasa bangga karena wadah pemilahan dibuat bersama.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak memungut 2 sampah plastik bersama guru dan memasukkannya ke keranjang bertanda kuning.',
          berkembang: 'Anak mandiri membedakan minimal 4 jenis sampah dan memasukkan ke keranjang yang tepat.',
          pengayaan: 'Anak dapat menjelaskan mengapa plastik harus didaur ulang dan menghitung jumlah sampah yang berhasil diselamatkan.',
        },
        observableIndicators: [
          {
            aspect: 'NAM',
            aspectLabel: 'Nilai Agama & Budi Pekerti',
            observableBehavior: 'Menunjukkan tanggung jawab menjaga kebersihan lingkungan ciptaan Tuhan dan membiasakan cuci tangan bersih.',
            rubric: {
              BB: 'Masih membuang sampah sembarangan.',
              MB: 'Membuang sampah ke tempatnya jika diingatkan guru.',
              BSH: 'Spontan memungut sampah di sekitarnya dan membuang ke keranjang yang tepat.',
              BSB: 'Menjadi pelopor kebersihan kelas, konsisten mengingatkan teman, dan mencuci tangan mandiri dengan benar.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mengarahkan capit bambu memungut sampah dan menaruhnya di keranjang sesuai warna.',
      },
      {
        id: 'act-kel-03',
        title: 'Bermain Peran Pasar Lingkungan: Berbelanja dengan Uang Daun',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '35 - 40 Menit' : '50 - 55 Menit',
        description: 'Anak mendirikan stan pasar tradisional di kelas menggunakan meja beralas tikar, menjual sayur daun, buah kerikil, dan menggunakan uang kertas/daun sebagai alat tukar transaksi santun.',
        steps: [
          'Penyiapan Lapak: Menata komoditas loose parts (daun singkong, kerikil kentang, ranting wortel).',
          'Pembagian Peran: Ada pedagang ramah, pembeli yang membawa tas kain, dan kasir penimbang.',
          'Transaksi Santun: Menyapa ramah: "Selamat pagi, berapa harga seikat daun ini?", menimbang, dan membayar.',
          'Evaluasi Bersama: Merapikan barang dagangan bersama dan menghitung pembeli yang datang.',
        ],
        pedagogicalRationale: 'Menstimulasi numerasi sosial, etika sopan santun, kecakapan hidup (life skills), dan interaksi verbal komunikatif.',
        whyRelevantToTP: 'Relevan dengan TP Komunikasi Lisan dan Perilaku Santun Serta TP Konsep Bilangan Konkret.',
        provocationQuestions: [
          'Bagaimana kata-kata yang santun saat kamu ingin menawar atau membeli sayur dari penjual?',
          'Berapa lembar uang daun yang kamu perlukan untuk membeli dua ikat daun bayam ini?',
          'Mengapa kita harus membawa tas kain sendiri saat berbelanja ke pasar?',
        ],
        primaryMaterials: ['Tikar pandan / meja kelas beralas koran', 'Sayuran hijau asli pekarangan / loose parts bentuk sayur', 'Timbangan kue sederhana atau neraca gantungan baju', 'Uang daun / potongan kardus'],
        localLooseParts: ['Kerikil halus', 'Tas anyaman bambu kecil', 'Daun lebar'],
        materialAlternatives: [
          { main: 'Mainan kasir elektronik baterai', alternative: 'Kalkulator kardus buatan sendiri dan neraca gantungan baju', reason: 'Lebih merangsang penalaran bobot fisik nyata dan imajinasi anak.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak berperan sebagai pembeli dengan membawa 1 lembar uang daun dan menyebutkan barang yang diinginkannya.',
          berkembang: 'Anak mampu menghitung 1-5 lembar uang daun untuk membayar belanjaan dan mengucapkan terima kasih.',
          pengayaan: 'Anak berperan sebagai pedagang yang menimbang barang di neraca, menghitung kembalian, dan mempromosikan dagangan sehat.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Menerapkan konsep hitung satu-satu (one-to-one correspondence) dan perbandingan berat dalam simulasi pasar.',
            rubric: {
              BB: 'Memberikan uang daun tanpa menghitung jumlahnya.',
              MB: 'Menghitung 1-3 uang daun dengan bimbingan guru.',
              BSH: 'Mandiri menghitung jumlah uang daun sesuai harga barang belanjaan.',
              BSB: 'Terampil mengombinasikan konsep hitung, membandingkan berat timbangan, dan berkomunikasi persuasif.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak menyerahkan uang daun kepada pedagang cilik dengan senyuman santun.',
      },
    ];
  }

  // 4. BINATANG (Animals, habitats, pet care)
  if (thm.includes('binatang') || sub.includes('hewan') || sub.includes('pelihara') || sub.includes('ikan') || sub.includes('burung')) {
    return [
      {
        id: 'act-bin-01',
        title: 'Arsitek Sarang Burung: Merangkai Ranting dan Daun Kering',
        modality: 'Konstruksi Loose Parts',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak menyelidiki bagaimana burung membuat sarang tanpa tangan, lalu mencoba menganyam ranting lentur, daun, dan rumput kering menjadi sarang mangkuk yang hangat.',
        steps: [
          'Pengamatan Gambar/Sarang Nyata: Mengamati bentuk mangkuk sarang burung dan mengapa telur tidak jatuh.',
          'Pengumpulan Ranting Lentur: Memilih ranting rumput ilalang atau daun pisang kering yang mudah ditekuk.',
          'Konstruksi Sarang: Melengkungkan bahan ke dalam mangkuk cetakan kelapa atau mangkuk kardus.',
          'Pemberian Telur Batu: Menaruh 2-3 batu kali halus sebagai telur burung dan mendiskusikan cara induk menjaga telurnya.',
        ],
        pedagogicalRationale: 'Menumbuhkan pemikiran biomimikri (belajar dari teknologi alam), motorik halus, dan kasih sayang pada binatang.',
        whyRelevantToTP: 'Relevan dengan TP Menyayangi Ciptaan Tuhan dan TP Merancang Konstruksi Loose Parts.',
        provocationQuestions: [
          'Menurutmu, bagaimana burung yang kecil bisa membawa ranting pohon yang panjang hanya dengan paruhnya?',
          'Bahan apa yang paling lembut agar telur burung merasa hangat di dalam sarang ini?',
          'Bagaimana sarang burung bisa tetap menempel di dahan pohon saat tertiup angin?',
        ],
        primaryMaterials: ['Ranting lentur pohon', 'Rumput gajah / daun pisang kering', 'Sabut kelapa bersih', 'Batu kali bulat halus (sebagai telur)'],
        localLooseParts: ['Kelopak bunga', 'Batok kelapa bekas sebagai cetakan mangkuk', 'Kapas kapuk'],
        materialAlternatives: [
          { main: 'Playdough sintetis toko', alternative: 'Sabut kelapa dipadukan tanah liat sedikit untuk merekatkan ranting', reason: 'Persis seperti cara burung walet atau burung gereja merekatkan sarangnya.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak mengisi batok kelapa dengan sabut kelapa yang lembut dan menaruh 1 batu telur di dalamnya.',
          berkembang: 'Anak mandiri melengkungkan ranting lentur mengikuti bentuk mangkuk dan menaruh 3 telur batu seimbang.',
          pengayaan: 'Anak merancang penutup sarang pelindung hujan dan menceritakan bagaimana induk burung mencari makan.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Bereksplorasi dengan kelenturan bahan alam dan merancang struktur sarang yang mampu menampung objek.',
            rubric: {
              BB: 'Mematahkan ranting tanpa mencoba melengkungkannya.',
              MB: 'Menyusun sabut ke wadah setelah dibantu guru.',
              BSH: 'Mandiri menyusun bahan lentur membentuk wadah sarang cekung yang kokoh.',
              BSB: 'Mampu menjelaskan kekuatan anyaman ranting dan menguji daya tampung sarang dengan argumen logis.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak meletakkan batu telur dengan hati-hati ke dalam sarang ranting karyanya.',
      },
      {
        id: 'act-bin-02',
        title: 'Detektif Jejak Kaki Binatang & Meniru Irama Geraknya',
        modality: 'Sensori & Seni Alami',
        duration: isKelompokA ? '35 - 40 Menit' : '40 - 45 Menit',
        description: 'Anak menekan stempel cetakan jejak hewan (kucing, bebek, katak) ke baki pasir basah, lalu menebak pemilik jejak dan bergerak menirukan kelinci melompat atau bebek bergoyang.',
        steps: [
          'Pijakan Sensori Pasir: Meraba pasir basah yang padat di atas nampan.',
          'Pencetakan Jejak: Menggunakan cetakan kayu/daun membentuk jejak selaput bebek vs cakar kucing.',
          'Tebak Gerak: Menghubungkan bentuk jejak dengan cara hidup hewan (selaput bebek untuk mendayung di air).',
          'Sirkuit Gerak & Lagu: Melompat dari satu pola jejak ke jejak lain di lantai sambil melagukan suara hewan.',
        ],
        pedagogicalRationale: 'Menyatukan persepsi visual pola dengan koordinasi lokomotorik kasar (jumping, waddling, hopping).',
        whyRelevantToTP: 'Relevan dengan TP Koordinasi Motorik Kasar & Keseimbangan Serta TP Mengenal Karakteristik Hewan.',
        provocationQuestions: [
          'Mengapa jejak kaki bebek ada selaputnya, sedangkan jejak kaki ayam berbentuk jari bercabang tiga?',
          'Bagaimana katak bisa melompat begitu jauh tanpa terpeleset?',
          'Dapatkah kamu menunjukkan bagaimana caramu melompat seperti katak yang sedang mencari makan?',
        ],
        primaryMaterials: ['Baki pasir pantai/sungai basah', 'Potongan kayu berukir jejak atau bentuk kardus telapak kaki hewan', 'Garis lintasan kapur'],
        localLooseParts: ['Batu penanda jejak', 'Kerang pesisir', 'Ranting'],
        materialAlternatives: [
          { main: 'Alat peraga plastik stempel impor', alternative: 'Ubi jalar atau kentang yang dipotong membentuk cakar bebek dan kucing', reason: 'Murah, mudah dibuat guru bersama anak, dan biodegradable.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menekan stempel ke pasir basah dan menirukan suara ayam/kucing dengan riang.',
          berkembang: 'Anak mencocokkan 3 pola jejak dengan gambar binatangnya dan melompati rute jejak mandiri.',
          pengayaan: 'Anak menjelaskan fungsi selaput kaki bebek untuk berenang di lumpur dan merancang teka-teki jejak untuk temannya.',
        },
        observableIndicators: [
          {
            aspect: 'MOTORIK_KASAR',
            aspectLabel: 'Motorik Kasar',
            observableBehavior: 'Menunjukkan kelincahan, kekuatan melompat dua kaki bersamaan, dan menjaga keseimbangan saat mendarat.',
            rubric: {
              BB: 'Masih ragu melompat dan mendarat tidak seimbang.',
              MB: 'Melompat dengan kedua kaki dibimbing pegangan tangan guru.',
              BSH: 'Mandiri melompat meniru kelinci/katak dan mendarat stabil tanpa terjatuh.',
              BSB: 'Menunjukkan kontrol lokomotorik yang sangat lincah, berirama lentur, dan sigap mengubah arah lompatan.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mendarat dari lompatan kelinci dan foto jejak kaki di pasir basah.',
      },
    ];
  }

  // 5. KENDARAAN / TRANSPORTASI (Vehicles, road safety)
  if (thm.includes('transportasi') || sub.includes('kendaraan') || sub.includes('jalan') || sub.includes('mobil') || sub.includes('perahu') || sub.includes('pesawat')) {
    return [
      {
        id: 'act-trans-01',
        title: 'Merakit Perahu Kulit Jeruk & Balap Aliran Air',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak memanfaatkan separuh kulit jeruk bali/jeruk nipis atau sabut kelapa, memasang layar dari daun nangka dengan tiang ranting, lalu meniup perahu di talang air.',
        steps: [
          'Penyelidikan Mengapung: Menguji benda di ember air: kulit jeruk mengapung atau tenggelam?',
          'Perakitan Layar: Menancapkan lidi sebagai tiang dan melubangi daun nangka sebagai layar penangkap angin.',
          'Balap Angin Tiupan: Meletakkan perahu di talang air dan meniup layar perahu menggunakan sedotan bambu/kertas.',
          'Diskusi Penyeimbang: Mengamati apa yang terjadi jika perahu diberi muatan batu kecil (daya apung).',
        ],
        pedagogicalRationale: 'Menyelidiki fenomena daya apung (buoyancy) dan tenaga dorong angin secara sensorik dan kompetisi bersahabat.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Sifat Fisika Air & Udara dan TP Menggunakan Koordinasi Jemari.',
        provocationQuestions: [
          'Mengapa kulit jeruk ini bisa mengapung di air sedangkan batu kerikil langsung tenggelam ke dasar?',
          'Bagaimana caramu mengarahkan tiupan angin agar perahumu melaju lebih lurus dan cepat?',
          'Berapa banyak batu kerikil kecil yang sanggup dibawa perahumu sebelum air mulai masuk?',
        ],
        primaryMaterials: ['Kulit jeruk tebal (jeruk bali/jeruk medan) atau sabut kelapa', 'Ranting lidi kokoh', 'Daun lebar kering (daun nangka/mangga)', 'Talang air bambu atau baskom air panjang'],
        localLooseParts: ['Kerikil halus muatan kapal', 'Sedotan kertas'],
        materialAlternatives: [
          { main: 'Perahu plastik pabrikan bermesin baterai', alternative: 'Kulit jeruk atau sabut kelapa dengan layar daun asli', reason: 'Menunjukkan prinsip rekayasa kapal tradisional nusantara dan ramah lingkungan.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menaruh perahu kulit jeruk yang sudah jadi ke dalam air dan meniupnya perlahan dengan bimbingan.',
          berkembang: 'Anak mandiri menancapkan tiang layar daun pada kulit jeruk dan meniupnya meluncur di air.',
          pengayaan: 'Anak menguji menambahkan muatan kerikil satu demi satu sambil menghitung daya tampung maksimal perahu.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Menyelidiki peristiwa mengapung-tenggelam dan memodifikasi desain perahu agar melaju seimbang.',
            rubric: {
              BB: 'Hanya mencipratkan air tanpa memperhatikan laju perahu.',
              MB: 'Meniup layar setelah diarahkan posisi meniup oleh guru.',
              BSH: 'Mandiri mengarahkan tiupan angin dan mengamati posisi keseimbangan perahu di air.',
              BSB: 'Mampu menjelaskan hubungan antara luas layar, kekuatan tiupan angin, dan daya apung muatan kapal.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak meniup layar daun dan perahu meluncur di permukaan air baskom.',
      },
    ];
  }

  // 6. PEKERJAAN / PROFESI (Jobs, community helpers)
  if (thm.includes('profesi') || thm.includes('pekerjaan') || sub.includes('guru') || sub.includes('dokter') || sub.includes('petani') || sub.includes('nelayan') || sub.includes('polisi') || sub.includes('pemadam')) {
    return [
      {
        id: 'act-prof-01',
        title: 'Simulasi Sahabat Bumi: Menjadi Petani Penabur Benih & Menakar Hasil Panen',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '35 - 40 Menit' : '50 - 55 Menit',
        description: 'Anak mengenakan caping petani mini, menggemburkan tanah bedengan dengan sekop kayu, menabur benih jagung berjarak teratur, dan menakar hasil panen biji ke dalam karung goni kecil.',
        steps: [
          'Apresiasi Jasa Petani: Mengamati bulir beras dan jagung: "Siapa yang bekerja keras agar kita punya nasi di piring?".',
          'Pengolahan Tanah: Menggunakan sekop kayu membalik tanah agar gembur dan mencabut rumput liar.',
          'Penaburan Benih Berjarak: Membuat lubang dengan ranting kayu sepanjang satu jengkal dan memasukkan 2 butir benih.',
          'Penakaran Hasil Panen: Menggunakan batok kelapa menakar biji jagung pipil ke dalam kantong goni cilik.',
        ],
        pedagogicalRationale: 'Menanamkan rasa hormat mendalam pada petani pangan nusantara (CRT), nilai kerja keras, dan konsep takaran volume.',
        whyRelevantToTP: 'Relevan dengan TP Menghargai Profesi Sekitar dan TP Pengukuran Volume Konkret.',
        provocationQuestions: [
          'Bagaimana perasaanmu jika para petani berhenti menanam padi dan sayuran di sawah?',
          'Mengapa kita harus memberi jarak saat menanam biji di dalam tanah?',
          'Berapa batok kelapa biji jagung yang dibutuhkan untuk mengisi penuh kantong kecil ini?',
        ],
        primaryMaterials: ['Caping bambu mini', 'Sekop kayu / sekop plastik tumpul ramah anak', 'Biji jagung kering', 'Batok kelapa takaran', 'Kantong kain/goni kecil'],
        localLooseParts: ['Ranting penanda baris tanam', 'Tanah gembur pekarangan'],
        materialAlternatives: [
          { main: 'Mainan plastik alat tani pabrikan', alternative: 'Sekop dari bilah bambu halus atau sendok kayu dapur', reason: 'Memberikan nuansa kearifan lokal yang otentik dan bersahaja.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak memasukkan biji jagung ke dalam lubang tanah yang sudah disiapkan guru dan menutupnya dengan tanah.',
          berkembang: 'Anak membuat lubang sendiri dengan ranting dan menaburkan tepat 2 butir jagung di setiap lubang.',
          pengayaan: 'Anak mengukur jarak tanam menggunakan rentangan jemari tangannya dan menakar volume jagung dengan batok kelapa.',
        },
        observableIndicators: [
          {
            aspect: 'NAM',
            aspectLabel: 'Nilai Agama & Budi Pekerti',
            observableBehavior: 'Menunjukkan sikap hormat pada profesi petani dan menghargai makanan dengan tidak menyia-nyiakan nasi/makanan.',
            rubric: {
              BB: 'Belum mengenal peran petani.',
              MB: 'Menirukan gerakan menabur benih saat didampingi guru.',
              BSH: 'Antusias bermain peran petani dan mengungkapkan rasa terima kasih atas jerih payah petani pangan.',
              BSB: 'Menghubungkan kerja keras petani dengan kebiasaan menghabiskan makanan di rumah tanpa sisa.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak memakai caping menunduk menabur benih jagung dengan penuh kesungguhan.',
      },
    ];
  }

  // 7. ALAM SEMESTA / AIR, UDARA, API / LINGKUNGAN ALAM (Universe, Elements, Earth)
  if (thm.includes('alam') || thm.includes('semesta') || thm.includes('air') || thm.includes('udara') || thm.includes('api') || thm.includes('benda')) {
    return [
      {
        id: 'act-elem-01',
        title: 'Laboratorium Pelangi: Menangkap Cahaya Spektrum dengan Cermin & Air',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak memasukkan cermin datar ke dalam mangkuk air miring menghadap sinar matahari pagi, lalu menangkap pantulan pelangi tujuh warna di atas kertas putih.',
        steps: [
          'Pencarian Sinar Matahari: Memilih tempat di beranda kelas yang terkena berkas cahaya matahari pagi cerah.',
          'Penyusunan Perangkat: Meletakkan cermin miring terendam separuh di dalam mangkuk air bening.',
          'Penangkapan Pelangi: Mengarahkan pantulan cahaya ke bidang dinding atau kertas putih tebal.',
          'Pencatatan Warna: Mengamati urutan warna pelangi dan menggoreskan krayon sesuai warna yang ditangkap matanya.',
        ],
        pedagogicalRationale: 'Menyingkap keajaiban fisika optik sederhana (pembiasan cahaya putih menjadi spektrum pelangi) secara alami tanpa proyektor digital.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Peristiwa Alam Sains dan TP Pengenalan Warna Primer-Sekunder.',
        provocationQuestions: [
          'Dari mana warna-warni pelangi ini muncul padahal air dan cermin tidak memiliki warna?',
          'Mengapa pelangi sering muncul di langit setelah hujan reda dan matahari kembali bersinar?',
          'Warna apa yang berada paling atas pada lengkungan pelangi yang berhasil kamu tangkap?',
        ],
        primaryMaterials: ['Mangkuk air bening transparan', 'Cermin datar kecil', 'Air bersih', 'Kertas gambar putih tebal penangkap pantulan', 'Krayon warna pelangi'],
        localLooseParts: ['Batu penahan posisi cermin'],
        materialAlternatives: [
          { main: 'Lampu prisma optik laboratorium', alternative: 'Cermin saku dalam mangkuk air di bawah sinar matahari langsung', reason: 'Mudah dipraktikkan guru di sekolah mana pun di pelosok nusantara.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak memegang kertas putih dan menunjuk warna pelangi yang dipantulkan cermin oleh guru.',
          berkembang: 'Anak mandiri mengatur kemiringan cermin di air hingga muncul berkas pelangi di kertasnya.',
          pengayaan: 'Anak mencatat urutan warna pelangi yang tampak dan menjelaskan bahwa cahaya matahari memiliki banyak warna tersembunyi.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mengamati dan menamai variasi warna spektrum hasil pembiasan cahaya serta menunjukkan rasa takjub sains.',
            rubric: {
              BB: 'Belum fokus mengamati pantulan pelangi.',
              MB: 'Melihat pelangi saat diarahkan guru dan menyebutkan 1 warna.',
              BSH: 'Mandiri mengarahkan cermin dan mengidentifikasi minimal 3 warna pelangi di kertas.',
              BSB: 'Menjelaskan fenomena pembiasan dengan analogi sederhana dan antusias menguji sudut cermin yang berbeda.',
            },
          },
        ],
        documentationFocus: 'Foto saat pantulan pelangi jatuh di tangan atau wajah anak dengan ekspresi takjub.',
      },
    ];
  }

  // 8. BUDAYA / NEGARAKU / REKREASI / MAKANAN (Culture, Heritage, Traditional Games)
  return [
    {
      id: 'act-bud-01',
      title: 'Permainan Tradisional Engklek Batu & Olah Gerak Irama Nusantara',
      modality: 'Bermain Peran & Budaya',
      duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
      description: 'Anak menggambar kotak-kotak engklek dengan kapur di paving halaman, melempar serpihan pecahan genting/batu kali pipih (gacuk), dan melompat satu kaki dengan riang bergantian.',
      steps: [
        'Pengenalan Budaya: Guru menceritakan permainan kakek-nenek zaman dahulu yang sehat dan membuat tubuh kuat.',
        'Pembuatan Petak: Menggambar kotak 1 hingga 8 dengan kapur dan menomori bersama.',
        'Aturan Santun: Mengantre giliran melempar gacuk batu kali ke kotak sasaran.',
        'Lompatan Keseimbangan: Melompati kotak satu kaki (engklek) tanpa menginjak garis pembatas.',
      ],
      pedagogicalRationale: 'Melestarikan kearifan lokal (CRT), menumbuhkan sportivitas, regulasi antre, dan kekuatan proprioseptif motorik kasar.',
      whyRelevantToTP: 'Relevan dengan TP Melestarikan Permainan Tradisional dan TP Regulasi Emosi Saat Bermain Kelompok.',
      provocationQuestions: [
        'Bagaimana caramu menjaga tubuh agar tidak oleng saat melompat dengan satu kaki?',
        'Apa yang harus kita lakukan jika teman kita tidak sengaja menginjak garis petak engklek?',
        'Mengapa bermain engklek bersama teman di halaman terasa lebih menyenangkan daripada bermain gawai sendirian?',
      ],
      primaryMaterials: ['Kapur tulis halaman sekolah', 'Batu kali pipih / pecahan genting tumpul aman (gacuk)', 'Area paving terbuka'],
      localLooseParts: ['Kerikil penghitung skor', 'Tali rami batas garis'],
      materialAlternatives: [
        { main: 'Matras engklek busa pabrikan', alternative: 'Garis kapur di tanah atau paving sekolah', reason: 'Lebih luas, bebas biaya, dan melatih anak menggambar petak geometri mandiri.' },
      ],
      tarlAdjustments: {
        perluDukungan: 'Anak melompat dengan dua kaki di dalam petak besar tanpa melempar gacuk terlebih dahulu.',
        berkembang: 'Anak melempar gacuk ke kotak nomor 1-3 dan melompat satu kaki melintasi petak secara mandiri.',
        pengayaan: 'Anak bermain engklek utuh hingga kotak bintang, menghitung skor, dan membantu mengajari teman yang kesulitan melompat.',
      },
      observableIndicators: [
        {
          aspect: 'JATI_DIRI',
          aspectLabel: 'Jati Diri',
          observableBehavior: 'Mampu menunggu giliran dengan sabar, menaati aturan main bersama, dan bangga memainkan permainan tradisional.',
          rubric: {
            BB: 'Menyerobot giliran teman dan menangis jika gagal melompat.',
            MB: 'Menunggu giliran setelah diingatkan guru dengan lembut.',
            BSH: 'Mandiri mengantre giliran dengan tertib dan menghargai giliran teman.',
            BSB: 'Menunjukkan sportivitas tinggi, menyemangati teman yang gagal, dan memimpin permainan dengan ramah.',
          },
        },
      ],
      documentationFocus: 'Foto saat anak melompat dengan satu kaki terangkat dan ekspresi tawa gembira menunggu giliran.',
    },
  ];
}
