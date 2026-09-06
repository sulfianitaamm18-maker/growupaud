import {
  PedagogicalRecommendationContext,
  PedagogicalRecommendation,
  TarlDifferentiationBundle,
  UdlPillarsBundle,
  CtrRecommendation,
  PromptingQuestionsBundle,
  TeacherSupportBundle,
  AssessmentIndicatorBundle,
  FollowUpRecommendationBundle,
  DevelopmentalAspect,
  ObservationRecord,
} from '../types';
import { curriculumStore, DEFAULT_RUBRIC } from './curriculumStore';
import { ASPECT_LABELS } from '../data/initialData';

/**
 * Normalizes string for fuzzy theme/subtheme keyword matching
 */
function cleanText(str: string = ''): string {
  return str.toLowerCase().trim();
}

/**
 * Resolves age group context into structural complexity metrics
 */
function getAgeComplexity(ageGroup: string = '') {
  const isKelompokA =
    ageGroup.includes('4-5') ||
    ageGroup.toLowerCase().includes('kelompok a') ||
    ageGroup.toLowerCase().includes('tahap awal');

  return {
    isKelompokA,
    label: isKelompokA ? 'Kelompok A (Usia 4-5 Tahun)' : 'Kelompok B (Usia 5-6 Tahun)',
    duration: isKelompokA ? '35 - 45 Menit' : '50 - 60 Menit',
    instructionDepth: isKelompokA
      ? 'Instruksi 1-2 langkah konkret, fokus sensori-motorik, eksplorasi langsung.'
      : 'Instruksi 2-3 langkah bertahap, eksplorasi mandiri, pemecahan masalah sederhana, dan penalaran.',
  };
}

/**
 * Checks past child observations to tailor recommendation to the child's actual needs
 */
function analyzeChildPastObservations(observations: ObservationRecord[] = []) {
  if (!observations || observations.length === 0) {
    return {
      hasHistory: false,
      strugglingAspects: [] as DevelopmentalAspect[],
      strongAspects: [] as DevelopmentalAspect[],
      summaryNote: '',
    };
  }

  const aspectRatings: Record<DevelopmentalAspect, { bbOrMb: number; bshOrBsb: number }> = {
    NAM: { bbOrMb: 0, bshOrBsb: 0 },
    JATI_DIRI: { bbOrMb: 0, bshOrBsb: 0 },
    LITERASI_STEAM: { bbOrMb: 0, bshOrBsb: 0 },
    MOTORIK_KASAR: { bbOrMb: 0, bshOrBsb: 0 },
    MOTORIK_HALUS: { bbOrMb: 0, bshOrBsb: 0 },
    KOGNITIF: { bbOrMb: 0, bshOrBsb: 0 },
  };

  observations.forEach((obs) => {
    obs.indicators?.forEach((ind) => {
      const asp = ind.aspect || ind.aspectId;
      if (asp && aspectRatings[asp]) {
        if (ind.rating === 'BB' || ind.rating === 'MB') {
          aspectRatings[asp].bbOrMb += 1;
        } else if (ind.rating === 'BSH' || ind.rating === 'BSB') {
          aspectRatings[asp].bshOrBsb += 1;
        }
      }
    });
  });

  const strugglingAspects: DevelopmentalAspect[] = [];
  const strongAspects: DevelopmentalAspect[] = [];

  (Object.keys(aspectRatings) as DevelopmentalAspect[]).forEach((asp) => {
    const stat = aspectRatings[asp];
    if (stat.bbOrMb > stat.bshOrBsb) {
      strugglingAspects.push(asp);
    } else if (stat.bshOrBsb > 0) {
      strongAspects.push(asp);
    }
  });

  const latestObs = observations[0];
  const summaryNote = `Berdasarkan ${observations.length} riwayat observasi autentik (terakhir pada kegiatan "${latestObs?.activityTitle || 'sebelumnya'}"), ` +
    (strugglingAspects.length > 0
      ? `ananda membutuhkan stimulasi pendampingan bertahap pada aspek ${strugglingAspects.map((a) => ASPECT_LABELS[a]).join(', ')}.`
      : `ananda menunjukkan kesiapan belajar yang baik dan siap menerima tantangan pengayaan.`);

  return {
    hasHistory: true,
    strugglingAspects,
    strongAspects,
    summaryNote,
  };
}

/**
 * Primary Chained Recommendation Builder
 */
export function buildPedagogicalRecommendation(
  context: PedagogicalRecommendationContext
): PedagogicalRecommendation {
  const {
    theme = 'Lingkungan',
    subtheme = 'Rumahku',
    ageGroup = 'Usia 5-6 Tahun (Kelompok B)',
    schoolContext = {},
    childObservations = [],
    studentName,
  } = context;

  const age = getAgeComplexity(ageGroup);
  const childHistory = analyzeChildPastObservations(childObservations);

  // 1. Resolve Available Loose Parts & Context
  const availableMediaList: string[] =
    schoolContext.availableMediaTypes ||
    schoolContext.availableMedia ||
    context.availableMaterials || [
      'Bahan alam (daun kering, ranting, batu halus, biji-bijian)',
      'Loose parts daur ulang (kardus bekas bersih, tutup botol, tabung tisu)',
      'Media perekat aman (lem kanji / selotip kertas)',
    ];

  const locationContext =
    schoolContext.locationCategory ||
    schoolContext.locationContext ||
    'Lingkungan permukiman ramah anak di sekitar sekolah';

  const culturalContext =
    schoolContext.culturalContext ||
    schoolContext.cultureContext ||
    'Kearifan lokal Indonesia, semangat gotong royong, dan kebersamaan keluarga';

  // 2. Resolve Curriculum Links (CP, ATP, TP)
  const allCPs = curriculumStore.getCPs();
  const allTPs = curriculumStore.getTPs();
  const allATPs = curriculumStore.getATPs();

  // Find or craft matching CP
  let matchedCP = allCPs.find((c) =>
    context.cpId ? c.id === context.cpId : cleanText(c.title).includes('literasi') || cleanText(c.title).includes('sains')
  ) || allCPs[0] || {
    id: 'cp-default',
    code: 'CP-03',
    title: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
    description: 'Anak memahami informasi, bernalar kritis, serta mengekspresikan imajinasi dan kreativitasnya.',
  };

  // Find or craft matching TP
  let matchedTP = allTPs.find((t) =>
    context.tpId ? t.id === context.tpId : (context.tpTitle && cleanText(t.title).includes(cleanText(context.tpTitle)))
  );

  let isCurriculumVerified = Boolean(matchedTP);

  if (!matchedTP) {
    // Dynamic contextually aligned TP
    matchedTP = {
      id: `tp-chain-${Date.now()}`,
      cpId: matchedCP.id,
      code: 'TP-REK-01',
      title: `Eksplorasi Konseptual ${subtheme} Melalui Media Bermain Konkret`,
      description: `Anak mampu mengeksplorasi ciri, bentuk, fungsi, dan makna ${subtheme} menggunakan bahan di sekitarnya serta mengomunikasikan karyanya.`,
      status: 'ACTIVE',
    };
  }

  // Find or craft matching ATP
  let matchedATP = allATPs.find((a) =>
    context.atpId ? a.id === context.atpId : a.cpId === matchedCP.id
  ) || {
    id: `atp-chain-${Date.now()}`,
    cpId: matchedCP.id,
    code: 'ATP-REK-01',
    title: `Tahap Investigasi & Representasi Karya ${subtheme}`,
    phase: 'Fase Fondasi (4-6 Tahun)',
    stepOrder: age.isKelompokA ? 1 : 2,
    description: `Anak mengamati objek lingkungan, mengidentifikasi fungsi, dan memanipulasi bahan konkret secara bertahap.`,
    status: 'ACTIVE',
  };

  // 3. Theme & Subtheme Archetype Determination
  const themeClean = cleanText(theme);
  const subClean = cleanText(subtheme);

  let activityTitle = context.activityTitle || '';
  let activityDesc = context.activityDescription || '';
  let duration = age.duration;
  let steps: string[] = [];
  let pedagogicalRationale = '';
  let primaryMaterials: string[] = [];
  let localLooseParts: string[] = [];
  let materialAlternatives: Array<{ main: string; alternative: string; reason: string }> = [];

  let tarlBundle: TarlDifferentiationBundle;
  let udlBundle: UdlPillarsBundle;
  let ctrBundle: CtrRecommendation;
  let questionsBundle: PromptingQuestionsBundle;
  let teacherSupport: TeacherSupportBundle;
  let indicators: AssessmentIndicatorBundle[];
  let followUpBundle: FollowUpRecommendationBundle;

  // Case A: LINGKUNGAN / RUMAHKU (Or Home / Buildings)
  if (
    subClean.includes('rumah') ||
    subClean.includes('tempat tinggal') ||
    (themeClean.includes('lingkungan') && subClean.includes('ruang'))
  ) {
    activityTitle = age.isKelompokA
      ? 'Membangun Bagian Rumahku dari Kotak Bekas & Loose Parts'
      : 'Merancang Miniatur Rumah dan Pekarangan Idaman dengan Loose Parts';

    activityDesc = age.isKelompokA
      ? 'Anak diajak mengenali bagian-bagian rumah (pintu, atap, dinding) melalui eksplorasi sensorik kotak kardus ramah anak, menyusun bentuk sederhana, dan menceritakan siapa yang tinggal di dalam rumah.'
      : 'Anak menyelidiki fungsi ruang dan bentuk rumah, merancang struktur miniatur rumah kokoh dari kardus dan bahan alam, serta mempresentasikan denah atau keunikan rumahnya.';

    steps = age.isKelompokA
      ? [
          'Pijakan Sebelum Main: Guru mengajak anak bernyanyi tentang rumah dan memperlihatkan foto berbagai rumah ramah lingkungan.',
          'Eksplorasi Konkret: Anak meraba dan memilih kotak kardus, balok busa/karton, dan kain perca.',
          'Pijakan Saat Main: Anak menyusun dinding dan meletakkan atap secara terpandu, menempelkan stiker/gambar pintu.',
          'Pijakan Setelah Main: Anak menceritakan siapa saja anggota keluarga yang ada di dalam rumah buatannya.',
        ]
      : [
          'Investigasi Awal: Diskusi tentang fungsi atap, jendela, pintu, dan pekarangan rumah serta bagaimana rumah melindungi dari panas/hujan.',
          'Pemilihan Media Mandiri: Anak memilih variasi loose parts (kardus bergelombang, stik es krim, ranting pekarangan, tutup botol).',
          'Konstruksi 3D: Anak merancang struktur rumah, menyelesaikan tantangan agar atap seimbang dan tidak roboh.',
          'Presentasi & Berbagi Makna: Anak menjelaskan denah miniatur rumahnya dan mendemonstrasikan fungsi pintu atau ventilasi.',
        ];

    pedagogicalRationale =
      'Kegiatan ini mengontekstualisasikan konsep ruang dan arsitektur ramah anak ke dalam pengalaman hidup sehari-hari tanpa LKPD. Memadukan motorik halus, penalaran spasial, dan kehangatan relasi keluarga.';

    primaryMaterials = [
      'Kardus bekas bersih aneka ukuran (kemasan makanan/kotak susu)',
      'Tutup botol plastik aneka warna (sebagai meja, kursi, atau roda gerbang)',
      'Ranting kecil dan daun kering halaman sekolah',
      'Selotip kertas ramah anak atau perekat kanji non-toksik',
    ];

    localLooseParts = [
      'Batu kerikil halus halaman',
      'Perca kain batik/kain sisa jahitan',
      'Tabung kardus tisu',
    ];

    materialAlternatives = [
      {
        main: 'Balok kayu pabrikan',
        alternative: 'Kotak kardus bekas odol/susu yang diisi kertas agar padat',
        reason: 'Lebih ekonomis, ringan, melimpah di rumah anak, dan aman jika terjatuh.',
      },
      {
        main: 'Lem tembak panas',
        alternative: 'Selotip kertas atau lem kanji buatan guru',
        reason: 'Sangat aman digunakan langsung oleh anak usia dini tanpa risiko luka bakar.',
      },
    ];

    tarlBundle = {
      perluDukungan: {
        label: 'Perlu Dukungan (Tahap Awal)',
        childCharacteristics: 'Anak masih dalam tahap mengenali bagian dasar dan memerlukan bantuan memegang/menempel media.',
        activityAdjustment: 'Disediakan pola kotak rumah yang sudah berdiri; anak fokus menempelkan 1 pintu dan 1 jendela dengan bimbingan.',
        promptingQuestions: [
          'Coba tunjuk, mana bagian pintu rumah ini?',
          'Pintu ini warnanya apa ya?',
          'Siapa yang suka membuka pintu di rumahmu?',
        ],
        teacherSupport: 'Guru duduk berdampingan, memberikan pegangan fisik santun (hand-over-hand), dan memvalidasi setiap sentuhan media.',
        realisticExpectation: 'Anak mampu menunjuk dan menempelkan minimal satu elemen rumah (pintu/jendela) dengan pendampingan.',
      },
      berkembang: {
        label: 'Berkembang (Tahap Sesuai Usia)',
        childCharacteristics: 'Anak mampu menyusun bentuk kubus/atap mandiri dan menjelaskan fungsinya secara komunikatif.',
        activityAdjustment: 'Anak menggabungkan 2-3 kotak kardus menjadi bangunan rumah serta menambahkan atap segitiga.',
        promptingQuestions: [
          'Menurutmu, apa fungsi atap bagi rumah kita?',
          'Bagaimana caramu membuat atap ini menempel dengan kuat?',
          'Ada ruangan apa saja di dalam rumah yang kamu buat?',
        ],
        teacherSupport: 'Guru memberikan pertanyaan pemantik berkala dan memberi keleluasaan anak mencoba beberapa posisi kotak.',
        realisticExpectation: 'Anak menyusun struktur miniatur rumah sederhana secara mandiri dan menceritakan fungsinya.',
      },
      pengayaan: {
        label: 'Pengayaan (Tahap Mahir / Tantangan)',
        childCharacteristics: 'Anak memiliki koordinasi jemari mantap dan penalaran spasial tinggi.',
        activityAdjustment: 'Anak menambahkan elemen detail seperti pagar, ventilasi udara, jalan setapak batu, atau halaman hijau bertingkat.',
        promptingQuestions: [
          'Bagaimana jika rumahmu tidak memiliki pintu atau ventilasi? Apa yang akan terjadi di dalamnya?',
          'Bagaimana caramu agar miniatur rumah ini tahan terhadap tiupan angin kencang?',
          'Bisakah kamu merancang pekarangan yang ada tempat menampung air hujan?',
        ],
        teacherSupport: 'Guru berperan sebagai mitra diskusi (provocateur of thought) yang menantang anak memecahkan masalah struktural.',
        realisticExpectation: 'Anak menghasilkan karya miniatur detail dengan solusi keseimbangan dan argumen logis yang kaya.',
      },
    };

    udlBundle = {
      engagement: {
        title: 'Prinsip Keterlibatan (Engagement)',
        description: 'Menumbuhkan motivasi otentik dengan mengaitkan rumah impian dengan rasa aman keluarga anak.',
        options: [
          'Anak bebas memilih jenis rumah yang ingin dibuat (rumah panggung, rumah bertingkat, atau pondok kebun).',
          'Anak dapat memilih peran: sebagai arsitek perancang, penyusun bahan, atau pengisah cerita rumah.',
          'Mengaitkan dengan kenangan hangat di rumah bersama kakek, nenek, ayah, atau ibu.',
        ],
      },
      representation: {
        title: 'Prinsip Representasi (Representation)',
        description: 'Informasi tentang bentuk dan fungsi rumah disajikan multi-sensori.',
        modalities: [
          'Benda Konkret: Memegang langsung kotak kardus 3 dimensi dan batu kerikil bertekstur.',
          'Visual: Menampilkan foto dokumentasi ragam bentuk rumah nyata di lingkungan sekitar.',
          'Kinestetik/Gerakan: Memperagakan membuka jendela lebar-lebar dan memayungi kepala seperti atap.',
          'Narasi Cerita: Dongeng hangat tentang sarang burung dan rumah perlindungan.',
        ],
      },
      actionAndExpression: {
        title: 'Prinsip Aksi & Ekspresi (Action & Expression)',
        description: 'Memberi ruang ekspresi beragam tanpa memaksa lembar kerja pensil-kertas.',
        expressionChoices: [
          'Membangun fisik miniatur dengan kardus dan ranting.',
          'Menceritakan secara lisan tentang ruangan favorit di rumahnya.',
          'Bermain peran mikro dengan figur mainan kecil di dalam miniatur yang dibuat.',
          'Menunjuk dan membandingkan tinggi-rendah kotak bagi anak yang belum lancar berbicara.',
        ],
      },
    };

    ctrBundle = {
      approachName: 'Culturally Responsive Teaching (CRT)',
      culturalContextSummary: `Menghubungkan arsitektur rumah dengan konteks lokal: ${locationContext}.`,
      localConnection:
        'Guru mengajak anak mengamati bahwa di sekitar sekolah ada berbagai bentuk rumah: rumah beratap genteng tanah liat, rumah panggung tradisional, rumah sederhana berdinding anyaman bambu, atau rumah beton perkotaan.',
      communityOrFamilyLink:
        'Mengintegrasikan kebiasaan keluarga lokal, seperti tradisi melepas alas kaki sebelum masuk rumah, berkumpul di teras sore hari, atau gotong royong membersihkan selokan.',
      antiBiasNote:
        'Guru menegaskan bahwa setiap bentuk rumah anak—baik besar, kecil, di desa, maupun di kota—adalah tempat istimewa yang penuh kasih sayang. Tidak boleh ada pelabelan rumah "bagus" atau "jelek".',
    };

    questionsBundle = {
      introductory: [
        'Apa yang paling kamu sukai saat pulang ke rumah setelah sekolah?',
        'Siapa yang biasanya membukakan pintu untukmu di rumah?',
      ],
      exploratory: [
        'Bagaimana caramu membuat dinding rumah ini berdiri tegak?',
        'Bahan mana yang paling cocok untuk dijadikan atap peneduh?',
      ],
      reflective: [
        'Bagian mana dari rumah buatanmu yang paling kamu banggakan?',
        'Bagaimana perasaanmu setelah berhasil menyusun miniatur ini?',
      ],
      differentiatedByTarl: {
        perluDukungan: [
          'Mana pintu rumahmu? Coba tunjuk dengan jarimu.',
          'Kotak yang ini besar atau kecil?',
        ],
        berkembang: [
          'Menurutmu, mengapa rumah memerlukan jendela?',
          'Bagaimana caramu menempelkan atap agar tidak miring?',
        ],
        pengayaan: [
          'Bagaimana rumahmu jika tidak memiliki atap saat hujan turun deras?',
          'Apa yang bisa kita tambahkan agar pekarangan rumahmu sejuk?',
        ],
      },
    };

    teacherSupport = {
      scaffoldingSteps: [
        'Langkah 1: Siapkan baki loose parts yang tertata rapi agar anak tidak kewalahan sensorik.',
        'Langkah 2: Modelkan cara merekatkan selotip dengan melipat ujungnya agar mudah ditarik anak.',
        'Langkah 3: Amati anak secara cermat; beri jeda 10-15 detik sebelum menawarkan bantuan saat anak mengalami kesulitan.',
        'Langkah 4: Berikan afirmasi verbal deskriptif: "Ibu guru melihat kamu berusaha keras menyeimbangkan kardus ini."',
      ],
      environmentalSetup:
        'Sediakan area karpet lantai yang luas agar anak leluasa menyusun struktur 3D tanpa takut roboh.',
      emotionalSupport:
        'Ciptakan suasana santai tanpa batasan waktu kaku sehingga anak tidak merasa terburu-buru.',
    };

    indicators = [
      {
        aspect: 'LITERASI_STEAM',
        aspectLabel: ASPECT_LABELS.LITERASI_STEAM,
        observableBehavior: 'Mengenali bentuk geometri pada kotak kardus dan memanipulasinya untuk merepresentasikan bagian rumah.',
        rubric: {
          BB: 'Belum mau memegang atau menyusun kotak kardus.',
          MB: 'Menyusun kotak menjadi bentuk rumah dengan panduan langsung guru.',
          BSH: 'Mandiri menyusun minimal 2 bagian rumah (dinding dan atap) serta menceritakan fungsinya.',
          BSB: 'Kreatif memodifikasi dan merancang miniatur rumah detail dengan loose parts beragam.',
        },
      },
      {
        aspect: 'MOTORIK_HALUS',
        aspectLabel: ASPECT_LABELS.MOTORIK_HALUS,
        observableBehavior: 'Menggunakan jemari tangan untuk menempelkan perekat atau menyusun bahan alam dengan koordinasi yang seimbang.',
        rubric: {
          BB: 'Jemari belum mampu menempelkan atau menempatkan bahan pada posisinya.',
          MB: 'Mulai menempelkan bahan dengan bantuan guru memegang kardus.',
          BSH: 'Mandiri mengoordinasikan kedua tangan menata dan merekatkan loose parts dengan mantap.',
          BSB: 'Menunjukkan presisi jemari yang sangat luwes saat memasang detail kecil.',
        },
      },
      {
        aspect: 'JATI_DIRI',
        aspectLabel: ASPECT_LABELS.JATI_DIRI,
        observableBehavior: 'Menunjukkan rasa bangga menceritakan rumah dan keluarganya serta menghargai karya teman.',
        rubric: {
          BB: 'Enggan menceritakan hasil karyanya meskipun diajak bertanya.',
          MB: 'Menceritakan karyanya dengan jawaban sepatah dua patah kata setelah dituntun.',
          BSH: 'Percaya diri menunjukkan bagian miniatur rumah buatannya kepada guru dan teman.',
          BSB: 'Antusias berbagi cerita dengan kalimat runtut dan mengapresiasi keunikan miniatur teman.',
        },
      },
    ];

    followUpBundle = {
      nextSteps: [
        'Menambahkan figur wayang kertas keluarga untuk bermain peran (roleplay) di dalam miniatur rumah.',
        'Mengajak anak menggambar peta sederhana dari gerbang sekolah menuju rumahnya.',
      ],
      observationFocus:
        'Perhatikan apakah anak yang memerlukan dukungan mulai berani memilih loose parts sendiri tanpa menunggu instruksi guru.',
      homeStimulation: [
        'Ajak ananda berjalan di sekitar rumah untuk mengamati bentuk jendela, pintu, dan warna dinding.',
        'Beri kesempatan ananda membantu merapikan mainan ke dalam wadah sebagai bagian dari rasa memiliki rumah.',
        'Bercerita santai sebelum tidur tentang ruang favorit ananda di rumah.',
      ],
      basedOnPreviousObservations: childHistory.hasHistory ? childHistory.summaryNote : undefined,
    };
  }

  // Case B: DIRIKU / NAMAKU / TUBUHKU
  else if (
    subClean.includes('nama') ||
    subClean.includes('identitas') ||
    subClean.includes('tubuh') ||
    themeClean.includes('diriku') ||
    subClean.includes('panca indra')
  ) {
    activityTitle = age.isKelompokA
      ? 'Menyusun Huruf Awal Namaku dengan Biji & Kerikil Sensorik'
      : 'Eksplorasi Jejak Identitas: Merangkai Kartu Nama Unik dari Loose Parts Alam';

    activityDesc = age.isKelompokA
      ? 'Anak diajak mengenali bunyi dan bentuk huruf awal namanya melalui baki pasir/biji-bijian alami, meraba pola lekuk huruf, dan menyebutkan namanya dengan riang di depan cermin.'
      : 'Anak mengidentifikasi susunan huruf pada namanya, memilih aneka bahan alam untuk merangkai kartu nama 3D bertekstur, serta saling menyapa dan membaca nama teman sekelas.';

    steps = age.isKelompokA
      ? [
          'Pijakan Awal: Permainan tebak nama ceria di depan cermin: "Siapa anak hebat berbaju kuning ini?".',
          'Eksplorasi Sensori: Meraba lekuk huruf awal nama yang dibentuk dari tali rami atau kardus tebal.',
          'Pijakan Saat Main: Menata biji saga/kerikil halus mengikuti garis huruf awal nama di atas baki sensorik.',
          'Pijakan Refleksi: Menyebutkan namanya dengan lantang dan tersenyum bangga.',
        ]
      : [
          'Penyelidikan: Mengamati kartu nama masing-masing, menghitung jumlah huruf, dan mendengarkan bunyi fonik awal.',
          'Seleksi Loose Parts: Memilih ranting lentur, daun kecil, atau kerikil untuk membentuk setiap huruf.',
          'Perangkaian Kreatif: Menata dan menempelkan bahan alam pada lempengan kardus nama.',
          'Galeri Sapa Teman: Berkeliling memperlihatkan kartu nama kepada teman dan saling bertukar salam hangat.',
        ];

    pedagogicalRationale =
      'Pengenalan literasi awal PAUD yang berbasis fonik dan sensori konkret (tactile letter awareness) tanpa lembar kerja tulis mekanistik, memperkuat konsep diri positif dan jati diri anak.';

    primaryMaterials = [
      'Lempengan kardus bekas seukuran kartu pos',
      'Biji-bijian lokal (biji jagung, saga merah, kuaci bunga matahari)',
      'Kerikil halus yang dicuci bersih',
      'Lem kanji ramah anak',
    ];

    localLooseParts = ['Ranting cemara mini', 'Tutup botol air mineral', 'Potongan benang wol/tali rami'];

    materialAlternatives = [
      {
        main: 'Flashcard plastik pabrikan',
        alternative: 'Kartu kardus bekas bertuliskan nama anak dengan spidol besar',
        reason: 'Lebih ramah lingkungan, dapat dimodifikasi teksturnya dengan lem dan pasir.',
      },
      {
        main: 'Cat poster sintetis',
        alternative: 'Pewarna kunyit atau air daun pandan dicampur tepung beras',
        reason: '100% aman untuk anak yang memiliki kulit sensitif atau fase oral.',
      },
    ];

    tarlBundle = {
      perluDukungan: {
        label: 'Perlu Dukungan (Tahap Awal)',
        childCharacteristics: 'Anak baru mulai menyadari bunyi namanya dan belum membedakan bentuk visual huruf.',
        activityAdjustment: 'Fokus hanya pada 1 huruf pertama nama panggilan dengan alur timbul tebal yang mudah diraba.',
        promptingQuestions: [
          'Siapa namamu yang ganteng/cantik ini?',
          'Huruf ini rasanya halus atau kasar saat kamu raba?',
          'Bisa kamu letakkan batu ini di atas garis?',
        ],
        teacherSupport: 'Guru menuntun jari anak meraba garis timbul huruf sambil menyuarakan bunyinya secara ceria.',
        realisticExpectation: 'Anak menyebutkan nama panggilannya dan menaruh 2-3 butir kerikil di atas pola huruf.',
      },
      berkembang: {
        label: 'Berkembang (Tahap Sesuai Usia)',
        childCharacteristics: 'Anak mengenali huruf awal namanya dan mampu menyusun beberapa butir biji mandiri.',
        activityAdjustment: 'Menyusun huruf awal dan huruf vokal namanya di atas baki sensorik secara utuh.',
        promptingQuestions: [
          'Huruf awal namamu bunyinya bagaimana ya?',
          'Ada berapa batu yang sudah kamu tempelkan di garis ini?',
          'Bahan apa yang ingin kamu gunakan untuk huruf berikutnya?',
        ],
        teacherSupport: 'Guru memberikan penguatan positif saat anak berhasil menyelesaikan satu lekukan huruf.',
        realisticExpectation: 'Anak menyelesaikan pembentukan huruf awal namanya dengan loose parts secara mandiri.',
      },
      pengayaan: {
        label: 'Pengayaan (Tahap Mahir / Tantangan)',
        childCharacteristics: 'Anak sudah mengenali seluruh huruf nama panggilannya dan tertarik mengeja nama teman.',
        activityAdjustment: 'Merangkai nama lengkap panggilannya dan membantu membuatkan kartu nama untuk teman sebangku.',
        promptingQuestions: [
          'Apakah ada temanmu yang huruf awal namanya sama denganmu? Siapa ya?',
          'Bagaimana jika kamu menyusun huruf namamu dari bahan yang bergradasi ukuran?',
          'Bisakah kamu menceritakan arti indah dari nama yang diberikan ayah dan ibumu?',
        ],
        teacherSupport: 'Guru memfasilitasi interaksi sosial literasi antar anak dan mendorong anak mengeksplorasi kata baru.',
        realisticExpectation: 'Anak merangkai seluruh nama panggilannya mandiri dan mampu mengenali nama teman.',
      },
    };

    udlBundle = {
      engagement: {
        title: 'Prinsip Keterlibatan (Engagement)',
        description: 'Membangun rasa kepemilikan dan cinta diri melalui nama yang sakral dan bermakna bagi keluarga.',
        options: [
          'Anak memilih sendiri bahan yang disukainya (biji berkilau, kerikil halus, atau ranting kering).',
          'Bebas menentukan hiasan di sekeliling namanya (bunga atau dedaunan).',
        ],
      },
      representation: {
        title: 'Prinsip Representasi (Representation)',
        description: 'Representasi multi-modal untuk mengenali nama.',
        modalities: [
          'Sentuhan (Taktil): Meraba tekstur timbul tali rami berbentuk huruf.',
          'Auditori: Melagukan nama bersama dalam ritme tepuk tangan.',
          'Visual: Melihat cermin dan kartu nama bersanding.',
        ],
      },
      actionAndExpression: {
        title: 'Prinsip Aksi & Ekspresi (Action & Expression)',
        description: 'Mengekspresikan pengenalan diri dengan berbagai medium ramah anak.',
        expressionChoices: [
          'Menata biji di atas pola huruf.',
          'Menyebutkan nama dengan suara berbisik atau bersorak riang.',
          'Meniru bentuk huruf dengan meliukkan tubuhnya di karpet.',
        ],
      },
    };

    ctrBundle = {
      approachName: 'Culturally Responsive Teaching (CRT)',
      culturalContextSummary: 'Menghormati makna budaya, tradisi pemberian nama keluarga, dan dialek lokal anak.',
      localConnection:
        'Guru menyadari keberagaman latar belakang nama anak (nama bernuansa adat, keagamaan, atau harapan keluarga).',
      communityOrFamilyLink:
        'Menghubungkan dengan cerita orang tua di rumah mengenai alasan dan doa indah di balik pemberian nama ananda.',
      antiBiasNote:
        'Semua nama diucapkan dengan benar dan penuh hormat. Tidak ada pengubahan atau pengolok-olokan nama khas daerah.',
    };

    questionsBundle = {
      introductory: ['Siapa nama panggilan kesayanganmu di rumah?', 'Huruf apa yang paling depan di namamu?'],
      exploratory: ['Bagaimana bunyi huruf pertama namamu saat diucapkan?', 'Bahan mana yang paling pas untuk membuat lekukan huruf ini?'],
      reflective: ['Bagaimana perasaanmu melihat namamu tertera indah di kartu ini?', 'Apakah kamu ingin memperlihatkannya pada ayah dan ibu?'],
      differentiatedByTarl: {
        perluDukungan: ['Ini huruf namamu, coba raba garisnya.', 'Batu ini dingin atau hangat?'],
        berkembang: ['Huruf apa saja yang ada di kartu namamu?', 'Berapa biji yang kamu gunakan di huruf ini?'],
        pengayaan: ['Siapa temanmu yang punya nama mirip denganmu?', 'Apa arti doa dari namamu yang diceritakan ibu?'],
      },
    };

    teacherSupport = {
      scaffoldingSteps: [
        'Langkah 1: Siapkan kartu nama dengan garis huruf yang jelas dan berkontras tinggi.',
        'Langkah 2: Tunjukkan cara mengambil biji menggunakan jepitan jempol-telunjuk (pincer grasp).',
        'Langkah 3: Beri kesempatan anak mengeksplorasi sensasi sentuhan biji di tangannya terlebih dahulu.',
      ],
      environmentalSetup: 'Gunakan nampan kayu/plastik agar biji-bijian tidak menggelinding ke lantai dan mudah dirapikan.',
      emotionalSupport: 'Selalu panggil anak dengan nama panggilan yang mereka sukai dengan nada penuh kelembutan.',
    };

    indicators = [
      {
        aspect: 'JATI_DIRI',
        aspectLabel: ASPECT_LABELS.JATI_DIRI,
        observableBehavior: 'Mengenali dan menyebutkan nama diri dengan percaya diri serta merespons saat dipanggil namanya.',
        rubric: {
          BB: 'Belum merespons atau menyebutkan namanya saat disapa guru.',
          MB: 'Menyebutkan nama setelah didorong dan diajak bernyanyi bersama guru.',
          BSH: 'Spontan dan percaya diri menyebutkan nama panggilan serta menunjuk kartu namanya.',
          BSB: 'Sangat percaya diri memperkenalkan diri dan antusias menyapa teman sekelas dengan nama mereka.',
        },
      },
      {
        aspect: 'LITERASI_STEAM',
        aspectLabel: ASPECT_LABELS.LITERASI_STEAM,
        observableBehavior: 'Mengenali bentuk visual dan fonik huruf awal namanya melalui manipulasi loose parts konkret.',
        rubric: {
          BB: 'Belum membedakan bentuk huruf pada kartu nama.',
          MB: 'Menunjuk huruf awal namanya dengan panduan guru.',
          BSH: 'Mandiri menyusun bahan alam mengikuti alur bentuk huruf awal namanya.',
          BSB: 'Mampu mengidentifikasi bunyi fonik huruf namanya dan mencocokkan dengan huruf pada benda lain.',
        },
      },
      {
        aspect: 'MOTORIK_HALUS',
        aspectLabel: ASPECT_LABELS.MOTORIK_HALUS,
        observableBehavior: 'Menggunakan genggaman jemari (pincer grasp) untuk memungut dan meletakkan biji/kerikil secara presisi.',
        rubric: {
          BB: 'Masih menggunakan seluruh telapak tangan meraup biji tanpa kontrol presisi.',
          MB: 'Mulai menggunakan dua jari memungut biji meskipun sesekali terjatuh.',
          BSH: 'Mandiri dan teratur menata biji satu persatu mengikuti garis pola kartu.',
          BSB: 'Menunjukkan kontrol motorik halus yang sangat stabil dan ritmis saat meletakkan biji kecil.',
        },
      },
    ];

    followUpBundle = {
      nextSteps: [
        'Menempelkan kartu nama di loker atau gantungan tas anak sebagai penanda kepemilikan mandiri.',
        'Bermain kartu sapa di circle time pagi.',
      ],
      observationFocus: 'Amati perkembangan kemandirian anak dalam mengenali loker dan barang pribadinya melalui kartu nama ini.',
      homeStimulation: [
        'Ajak ananda meraba tulisan namanya di buku cerita atau botol minumnya.',
        'Minta ananda menceritakan proses menempel biji di sekolah kepada anggota keluarga.',
      ],
      basedOnPreviousObservations: childHistory.hasHistory ? childHistory.summaryNote : undefined,
    };
  }

  // Case C: TANAMAN / KEBUN / ALAM SEKITAR (Default Nature / Environment)
  else {
    activityTitle = age.isKelompokA
      ? `Eksplorasi Detektif Sensorik ${subtheme}: Mengamati & Mengelompokkan Bahan Alam`
      : `Penyelidikan Saintifik & Kolase Imajinatif ${subtheme} Berbasis Loose Parts Lokal`;

    activityDesc = age.isKelompokA
      ? `Anak diajak berjalan di pekarangan sekolah untuk mengamati, meraba, dan mengumpulkan bahan alam terkait ${subtheme}, lalu mengelompokkannya berdasarkan tekstur halus-kasar atau warna terang-gelap.`
      : `Anak melakukan investigasi terbimbing mengenai karakteristik, siklus, dan keunikan ${subtheme}, mencatat temuan lewat perbandingan ukuran/tekstur, serta merangkai karya seni kolase 3D multi-bahan.`;

    steps = age.isKelompokA
      ? [
          `Pijakan Awal: Mengamati tanaman/objek nyata ${subtheme} di kebun sekolah sambil menyentuh daun dan batangnya.`,
          'Pengumpulan Sensori: Anak membawa keranjang kecil mengumpulkan 3-4 bahan alam berguguran di tanah.',
          'Klasifikasi Konkret: Meraba dan meletakkan bahan ke nampan: nampan halus vs nampan kasar.',
          'Apresiasi & Refleksi: Menceritakan daun atau ranting unik yang paling disukai ananda.',
        ]
      : [
          `Penyelidikan Kritis: Mengamati detail pola tulang daun/urat permukaan objek ${subtheme} dengan kaca pembesar sederhana.`,
          'Pengelompokan Sains: Mengurutkan bahan alam dari ukuran terkecil ke terbesar.',
          'Kreasi Mandiri: Menyusun pola kolase bebas di atas bidang kardus tanpa batasan bentuk.',
          'Presentasi Temuan: Menjelaskan alasan pemilihan bahan dan manfaat tanaman/alam bagi kehidupan kita.',
        ];

    pedagogicalRationale =
      `Menumbuhkan kecintaan pada alam (nature connectedness) dan penalaran saintifik awal melalui penyelidikan otentik terhadap ${subtheme} menggunakan bahan-bahan lokal tanpa biaya.`;

    primaryMaterials = [
      'Daun kering aneka warna dan bentuk (koleksi halaman sekolah)',
      'Ranting pohon kecil yang gugur',
      'Batu kerikil dan kelopak bunga gugur',
      'Lem kanji atau perekat alami ramah anak',
    ];

    localLooseParts = ['Tutup botol plastik', 'Pecahan kulit telur yang sudah dicuci bersih', 'Kardus bekas kemasan'];

    materialAlternatives = [
      {
        main: 'Kertas origami buatan pabrik',
        alternative: 'Daun pisang layu atau daun nangka kering',
        reason: 'Tekstur alami melatih sensori anak jauh lebih kaya, bebas biaya, dan langsung terurai di tanah.',
      },
      {
        main: 'Kaca pembesar kaca berbahaya',
        alternative: 'Tetesan air di atas plastik bening atau botol air mineral bulat terisi air',
        reason: 'Berfungsi sebagai lensa pembesar alami yang aman dan melatih kreativitas sains sederhana.',
      },
    ];

    tarlBundle = {
      perluDukungan: {
        label: 'Perlu Dukungan (Tahap Awal)',
        childCharacteristics: 'Anak masih enggan menyentuh tekstur baru atau memerlukan bantuan membedakan ciri bahan.',
        activityAdjustment: 'Fokus pada eksplorasi sentuhan 2 benda kontras (daun lembut vs ranting kasar) bersama guru.',
        promptingQuestions: [
          'Sentuh daun ini, rasanya halus atau kasar ya?',
          'Mana ranting yang panjang? Coba tunjuk.',
          'Bahan mana yang paling kamu sukai?',
        ],
        teacherSupport: 'Guru mencontohkan memegang bahan dengan tenang dan mendampingi anak secara rileks.',
        realisticExpectation: 'Anak mau menyentuh bahan alam dan menunjuk 1 perbedaan tekstur dengan bimbingan.',
      },
      berkembang: {
        label: 'Berkembang (Tahap Sesuai Usia)',
        childCharacteristics: 'Anak antusias mengeksplorasi mandiri dan mampu membedakan minimal 2 kelompok bahan.',
        activityAdjustment: 'Anak mengelompokkan bahan berdasarkan 2 ciri (warna atau bentuk) lalu menatanya di nampan.',
        promptingQuestions: [
          'Mengapa daun-daun ini ada yang berwarna hijau dan ada yang cokelat?',
          'Bagaimana caramu menyusun ranting ini agar membentuk pola?',
          'Berapa jumlah daun yang berhasil kamu kumpulkan?',
        ],
        teacherSupport: 'Guru memberikan pertanyaan yang merangsang anak mengamati detail tanpa mendikte hasil karya.',
        realisticExpectation: 'Anak mengelompokkan 2-3 variasi bahan alam dan menyusun karya kolase sederhana mandiri.',
      },
      pengayaan: {
        label: 'Pengayaan (Tahap Mahir / Tantangan)',
        childCharacteristics: 'Anak memiliki rasa ingin tahu tinggi, kosa kata sains berkembang, dan daya cipta kaya.',
        activityAdjustment: 'Anak membuat pola berulang (gradasi pola ukuran atau simetri) dan merancang cerita dari karyanya.',
        promptingQuestions: [
          'Apa yang akan terjadi pada daun yang gugur jika kita kubur di dalam tanah kebun?',
          'Bagaimana kamu bisa membuat bentuk hewan atau kendaraan hanya menggunakan daun dan ranting ini?',
          'Menurutmu, bagaimana cara pohon minum air dari dalam tanah?',
        ],
        teacherSupport: 'Guru menantang anak berpikir sebab-akibat dan mendokumentasikan hipotesis anak dalam jurnal guru.',
        realisticExpectation: 'Anak merangkai kolase kompleks dengan pola bertahap dan mengemukakan ide sains logis.',
      },
    };

    udlBundle = {
      engagement: {
        title: 'Prinsip Keterlibatan (Engagement)',
        description: 'Belajar langsung di luar kelas (outdoor learning) memicu rasa takjub anak terhadap ciptaan Tuhan.',
        options: [
          'Anak boleh memilih rute pencarian bahan di halaman sekolah.',
          'Anak bebas memilih membuat karya sendiri atau berkolaborasi dengan satu teman akrab.',
        ],
      },
      representation: {
        title: 'Prinsip Representasi (Representation)',
        description: 'Multi-sensori perjumpaan dengan alam.',
        modalities: [
          'Penciuman: Menghirup aroma khas daun basah dan tanah.',
          'Perabaan: Meraba tekstur kasar urat daun dan kehalusan kelopak bunga.',
          'Penglihatan: Mengamati ragam spektrum warna alam (hijau muda, hijau tua, kuning, cokelat).',
        ],
      },
      actionAndExpression: {
        title: 'Prinsip Aksi & Ekspresi (Action & Expression)',
        description: 'Pilihan penyampaian pemahaman tanpa tes kertas.',
        expressionChoices: [
          'Menata bahan membentuk gambar imajinatif di atas kardus.',
          'Menceritakan secara lisan sensasi sentuhan yang dirasakannya.',
          'Mengelompokkan bahan ke dalam wadah berbeda sesuai kategorinya.',
        ],
      },
    };

    ctrBundle = {
      approachName: 'Culturally Responsive Teaching (CRT)',
      culturalContextSummary: `Menghargai lingkungan ekologis lokal di sekitar sekolah: ${locationContext}.`,
      localConnection:
        'Guru memanfaatkan flora dan tanaman lokal yang sangat akrab di pekarangan rumah anak (misal: pohon pisang, mangga, kamboja, rumput liar).',
      communityOrFamilyLink:
        'Menghubungkan dengan kebiasaan orang tua atau kakek-nenek berkebun, menyiram tanaman sore hari, atau memanfaatkan daun untuk pembungkus makanan tradisional.',
      antiBiasNote:
        'Semua jenis tanaman dihormati sebagai bagian dari ekosistem ciptaan Tuhan. Anak diajarkan etika tidak mencabut daun segar sembarangan, melainkan memungut daun yang telah gugur.',
    };

    questionsBundle = {
      introductory: [`Benda apa saja yang pernah kamu lihat di kebun terkait ${subtheme}?`, 'Bagaimana udara di luar kelas pagi ini?'],
      exploratory: ['Bagaimana tekstur permukaan daun ini saat kamu usap?', 'Menurutmu, mengapa ada daun yang gugur ke tanah?'],
      reflective: ['Apa yang kamu pelajari dari tanaman di sekitar kita hari ini?', 'Bagaimana caramu menyayangi tanaman di rumah?'],
      differentiatedByTarl: {
        perluDukungan: ['Ini daun apa ranting? Coba pegang.', 'Daun ini rasanya halus atau kasar?'],
        berkembang: ['Kelompokkan daun yang warnanya sama ke nampan ini.', 'Menurutmu, kenapa ranting ini bisa patah?'],
        pengayaan: ['Apa yang akan terjadi pada tanah jika tidak ada pohon sama sekali?', 'Bagaimana caramu merawat tanaman agar tetap subur?'],
      },
    };

    teacherSupport = {
      scaffoldingSteps: [
        'Langkah 1: Tentukan batas area aman bermain di luar ruang bersama anak.',
        'Langkah 2: Sediakan wadah/keranjang kecil yang mudah dibawa anak berkeliling.',
        'Langkah 3: Dampingi anak yang ragu menyentuh tanah atau daun kering dengan senyuman ramah.',
      ],
      environmentalSetup: 'Pastikan area kebun bebas dari benda tajam, kaca, atau serangga berbahaya sebelum kegiatan.',
      emotionalSupport: 'Apresiasi antusiasme anak saat menemukan daun dengan bentuk yang menurutnya unik.',
    };

    indicators = [
      {
        aspect: 'LITERASI_STEAM',
        aspectLabel: ASPECT_LABELS.LITERASI_STEAM,
        observableBehavior: `Mengamati ciri fisik bahan alam terkait ${subtheme}, mengelompokkan menurut tekstur/warna, dan menceritakan temuannya.`,
        rubric: {
          BB: 'Belum mau menyentuh atau mengamati bahan alam yang disediakan.',
          MB: 'Mulai mengamati dan mengelompokkan bahan alam setelah dibimbing guru.',
          BSH: 'Mandiri mengelompokkan minimal 2 jenis bahan alam dan menceritakan perbedaannya.',
          BSB: 'Menunjukkan rasa ingin tahu tinggi, mengklasifikasikan bahan dengan kategori sendiri, dan mengajukan pertanyaan kritis.',
        },
      },
      {
        aspect: 'MOTORIK_HALUS',
        aspectLabel: ASPECT_LABELS.MOTORIK_HALUS,
        observableBehavior: 'Menggunakan kedua tangan untuk meraba, memilah, menempel, atau menata bahan alam dengan koordinasi yang baik.',
        rubric: {
          BB: 'Jemari tampak canggung memegang atau memilah bahan alam.',
          MB: 'Mampu memegang dan menata bahan alam dengan pendampingan berkala.',
          BSH: 'Mandiri dan terampil menata bahan alam pada bidang karya dengan seimbang.',
          BSB: 'Menunjukkan ketelitian dan keluwesan jemari yang sangat baik saat merangkai detail kolase.',
        },
      },
      {
        aspect: 'NAM',
        aspectLabel: ASPECT_LABELS.NAM,
        observableBehavior: 'Menunjukkan rasa syukur dan sikap menyayangi makhluk hidup serta alam ciptaan Tuhan.',
        rubric: {
          BB: 'Belum menunjukkan kepedulian terhadap kebersihan lingkungan main atau tanaman.',
          MB: 'Mulai diingatkan untuk tidak merusak tanaman segar dan membuang sampah pada tempatnya.',
          BSH: 'Terbiasa memperlakukan tanaman dengan lembut dan memungut daun gugur dengan penuh rasa sayang.',
          BSB: 'Menjadi teladan bagi teman dalam merawat tanaman dan menjaga kebersihan alam sekitar.',
        },
      },
    ];

    followUpBundle = {
      nextSteps: [
        'Membuat display pameran galeri mini karya kolase alam di koridor sekolah.',
        'Praktek bersama menyiram tanaman sekolah menggunakan botol semprot daur ulang.',
      ],
      observationFocus:
        'Pantau kemampuan anak dalam mengklasifikasikan objek dan menceritakan temuannya secara mandiri.',
      homeStimulation: [
        'Ajak ananda menyiram satu pot tanaman di pekarangan rumah setiap pagi/sore.',
        'Ajak ananda mengumpulkan daun kering di halaman rumah dan berkreasi bersama keluarga.',
      ],
      basedOnPreviousObservations: childHistory.hasHistory ? childHistory.summaryNote : undefined,
    };
  }

  // Final Coherent Linked Output
  const recommendation: PedagogicalRecommendation = {
    id: `ped-rec-${Date.now()}`,
    createdAt: new Date().toISOString(),
    context: {
      theme,
      subtheme,
      ageGroup,
      cp: {
        code: matchedCP.code,
        title: matchedCP.title,
        description: matchedCP.description,
      },
      atp: {
        code: matchedATP.code,
        title: matchedATP.title,
        phase: matchedATP.phase,
        stepOrder: matchedATP.stepOrder,
        description: matchedATP.description,
      },
      tp: {
        code: matchedTP.code,
        title: matchedTP.title,
        description: matchedTP.description,
      },
      isCurriculumVerified,
    },
    activityRecommendation: {
      title: activityTitle,
      duration,
      description: activityDesc,
      steps,
      pedagogicalRationale,
      ageAppropriateness: age.instructionDepth,
    },
    materials: {
      primary: primaryMaterials,
      localLooseParts,
      alternatives: materialAlternatives,
      safetyNote: 'Pastikan seluruh bahan loose parts bersih, tidak bertepi tajam, dan tidak berukuran terlalu kecil untuk mencegah risiko tertelan.',
    },
    tarlDifferentiation: tarlBundle,
    udlRecommendation: udlBundle,
    ctrRecommendation: ctrBundle,
    promptingQuestions: questionsBundle,
    teacherSupport,
    assessmentIndicators: indicators,
    followUpRecommendation: followUpBundle,
  };

  return recommendation;
}
