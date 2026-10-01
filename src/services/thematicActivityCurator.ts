import { DevelopmentalAspect } from '../types';

export interface ThematicCuratedActivity {
  id: string;
  title: string;
  modality:
    | 'Bercerita & Percakapan Bermakna'
    | 'Bermain Peran & Budaya'
    | 'Bermain Peran & Imajinasi'
    | 'Konstruksi Loose Parts'
    | 'Seni Rupa & Kreasi Alami'
    | 'Permainan Bahasa & Kosakata'
    | 'Gerak, Lagu & Motorik'
    | 'Eksplorasi Lingkungan'
    | 'Eksperimen Sederhana'
    | 'Proyek Kolaboratif'
    | 'Sensori & Seni Alami'
    | string;
  duration: string;
  description: string;
  literacyIntegration?: string;
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
  linkedCPIds?: string[];
  linkedTPIds?: string[];
  linkedObjectiveIds?: string[];
}

/**
 * Returns 3-5 pedagogical, deep-learning, TaRL-aligned activity options tailored specifically
 * to the given theme and subtheme, without repetitive or generic worksheets.
 */
export function getCuratedActivitiesForTheme(
  themeName: string = '',
  subthemeName: string = '',
  isKelompokA: boolean = false,
  selectedCPIds?: string[],
  selectedTPIds?: string[]
): ThematicCuratedActivity[] {
  const acts = getRawCuratedActivitiesForTheme(themeName, subthemeName, isKelompokA, selectedCPIds, selectedTPIds);
  
  // Ensure every activity has linkedCPIds and linkedTPIds matching the teacher's selection or valid defaults
  return acts.map((act, idx) => {
    let actCPs = Array.isArray(selectedCPIds) && selectedCPIds.length > 0 ? [...selectedCPIds] : ['cp-03'];
    let actTPs = Array.isArray(selectedTPIds) && selectedTPIds.length > 0 ? [...selectedTPIds] : ['tp-lit-01'];

    // If teacher selected multiple TPs, distribute or pair them meaningfully
    if (actTPs.length > 1) {
      // Rotate or assign subsets so activities have targeted alignments
      const subsetTPs = [actTPs[idx % actTPs.length]];
      if (actTPs.length >= 2 && (idx % 2 === 0)) {
        subsetTPs.push(actTPs[(idx + 1) % actTPs.length]);
      }
      actTPs = Array.from(new Set(subsetTPs));
    }

    return {
      ...act,
      linkedCPIds: actCPs,
      linkedTPIds: actTPs,
      linkedObjectiveIds: [`obj-curated-${idx + 1}`],
    };
  });
}

function getRawCuratedActivitiesForTheme(
  themeName: string = '',
  subthemeName: string = '',
  isKelompokA: boolean = false,
  selectedCpIds?: string[],
  selectedTpIds?: string[]
): ThematicCuratedActivity[] {
  const thm = themeName.toLowerCase().trim();
  const sub = subthemeName.toLowerCase().trim();

  // 1. TANAMAN / AIR & KEHIDUPAN (Plants, gardening, nature growth)
  if (thm.includes('tanaman') || sub.includes('tanam') || sub.includes('kebun') || sub.includes('akar') || sub.includes('daun') || sub.includes('bunga') || sub.includes('sayur') || sub.includes('pohon')) {
    // 1A. SUBTEMA SAYURAN / BUAH / PANGAN
    if (sub.includes('sayur') || sub.includes('buah') || sub.includes('tomat') || sub.includes('wortel') || sub.includes('bayam') || sub.includes('kangkung') || sub.includes('sawi') || sub.includes('pangan') || sub.includes('kebun sayur')) {
      return [
        {
          id: 'act-tan-syr-01',
          title: 'Petualangan Sensori: Memilah, Mengupas & Meraba Tekstur Sayuran Segar',
          modality: 'Eksplorasi Lingkungan',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak menyelidiki ragam sayuran segar (bayam, wortel, jagung, buncis), membedakan sayuran daun vs buah vs akar, dan meraba tekstur permukaan sayur dengan indera peraba.',
          steps: [
            'Pijakan Awal: Berkeliling gerai pasar sayur mini di kelas dan mencium aroma segar dedaunan sayur.',
            'Penyelidikan Taktil: Memilah sayuran berdasarkan bagian tanaman yang dimakan (daun, batang, buah, atau akar).',
            'Eksplorasi Mandiri: Memetik tangkai bayam atau mengupas kulit jagung lapis demi lapis menggunakan kelenturan jari tangan.',
            'Refleksi Sehat: Mensyukuri anugerah sayuran ciptaan Tuhan yang membuat tubuh sehat dan berenergi.',
          ],
          pedagogicalRationale: 'Menumbuhkan kebiasaan makan sehat (healthy habits), keterampilan sensomotorik taktil, dan pemahaman biologis dasar tentang bagian tanaman.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Objek Alam, TP Membiasakan Hidup Sehat, dan TP Motorik Halus (memetik/mengupas).',
          provocationQuestions: [
            'Bagaimana tekstur kulit jagung ini saat kamu raba dengan ujung jarimu?',
            'Mengapa tanaman sayuran membutuhkan air dan tanah yang subur untuk tumbuh?',
            'Sayuran mana yang menurutmu aromanya paling segar dan unik?',
          ],
          primaryMaterials: ['Sayuran segar aneka jenis (bayam, jagung berkulit, wortel, mentimun)', 'Baki bambu atau keranjang anyaman', 'Piring saji ramah anak'],
          localLooseParts: ['Talenan kayu halus', 'Cangkir takar ramah anak', 'Cap jepit kayu'],
          materialAlternatives: [
            { main: 'Sayuran plastik mainan', alternative: 'Sayuran asli segar dari pasar tradisional terdekat', reason: 'Memberikan pengalaman sensori nyata (aroma, rabaan, getah alami, bobot asli).' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi memetik 3-4 helai daun bayam menggunakan jepitan jari jempol-telunjuk bersama guru.',
            berkembang: 'Anak mandiri mengelompokkan sayuran berwarna hijau vs oranye ke dalam keranjang terpisah.',
            pengayaan: 'Anak mengamati dan menghitung ruas jagung atau lingkaran serat wortel menggunakan kaca pembesar.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Mampu mengidentifikasi, membandingkan, dan mengelompokkan jenis sayuran berdasarkan atribut fisik (warna, bentuk, bagian tanaman).',
              rubric: {
                BB: 'Belum membedakan jenis sayuran dan membutuhkan pendampingan penuh.',
                MB: 'Menyebutkan nama 1-2 sayuran setelah diberi contoh oleh guru.',
                BSH: 'Mandiri mengelompokkan sayuran daun dan buah serta menjelaskan perbedaannya.',
                BSB: 'Kritis menghubungkan fungsi bagian sayuran (akar, daun) dengan pertumbuhan tanaman dan nutrisi tubuh.',
              },
            },
            {
              aspect: 'MOTORIK_HALUS',
              aspectLabel: 'Motorik Halus',
              observableBehavior: 'Terampil menggunakan koordinasi jempol-telunjuk saat memetik daun atau mengupas kulit sayuran.',
              rubric: {
                BB: 'Masih meremas kasar sayuran hingga hancur.',
                MB: 'Mulai memetik daun satu per satu dengan arahan guru.',
                BSH: 'Mantap dan luwes memetik serta menata daun sayur secara rapi.',
                BSB: 'Koordinasi jemari sangat presisi dan berhati-hati menjaga kesegaran daun.',
              },
            },
          ],
          documentationFocus: 'Foto saat jari anak fokus memetik daun bayam dan ekspresi senang mencium aroma sayuran.',
        },
        {
          id: 'act-tan-syr-02',
          title: 'Laboratorium Cap Tekstur Bonggol Sayur & Pewarna Alami',
          modality: 'Sensori & Seni Alami',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak memanfaatkan potongan bonggol sawi, batang seledri, dan belimbing wuluh yang dicelupkan ke pasta pewarna alami (kunyit/buah naga) untuk mencetak pola bunga dan tekstur pada kertas.',
          steps: [
            'Observasi Bentuk Potongan: Mengamati bentuk melingkar mirip kelopak mawar pada potongan bonggol sawi.',
            'Persiapan Warna Alami: Mencampur parutan kunyit atau sari buah naga dengan sedikit tepung sagu encer ramah anak.',
            'Aksi Mencetak: Mencelupkan permukaan bonggol sawi ke pewarna alami dan menekannya stabil di atas kertas.',
            'Pameran Karya: Menceritakan pola yang berhasil dibuat dan mensyukuri pemanfaatan sisa bahan dapur.',
          ],
          pedagogicalRationale: 'Mengajarkan konsep keberlanjutan (zero-waste) dan eksplorasi seni rupa berbasis bahan alam dapur.',
          whyRelevantToTP: 'Relevan dengan TP Mengekspresikan Kreativitas Seni Melalui Berbagai Media dan TP Menghargai Sumber Daya Alam.',
          provocationQuestions: [
            'Bentuk apa yang kamu lihat saat bonggol sawi ini kita tempelkan di atas kertas?',
            'Apa yang terjadi jika kamu menekan terlalu kuat atau terlalu lembut?',
            'Warna alami apa lagi dari dapur yang bisa kita coba untuk mencetak pola?',
          ],
          primaryMaterials: ['Bonggol sawi bekas potongan dapur', 'Batang seledri berongga', 'Pewarna alami (sari kunyit, buah naga, daun suji)', 'Kertas gambar tebal daur ulang'],
          localLooseParts: ['Piring tatakan dari daun pisang', 'Kain perca alas cetak', 'Spons pencelup'],
          materialAlternatives: [
            { main: 'Cat poster kimia sintetis', alternative: 'Sari buah naga, kunyit, dan arang halus', reason: 'Aman jika tidak sengaja tersentuh mulut anak dan ramah lingkungan.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak dibimbing memegang potongan bonggol dan mengecapkan 2 kali di kertas dengan dorongan lembut.',
            berkembang: 'Anak mandiri mencetak pola berulang secara berjarak dan memadukan 2 warna alami.',
            pengayaan: 'Anak menyusun pola berirama (misal: sawi-seledri-sawi-seledri) dan menambahkan detail garis daun dengan ranting.',
          },
          observableIndicators: [
            {
              aspect: 'MOTORIK_HALUS',
              aspectLabel: 'Motorik Halus',
              observableBehavior: 'Mengontrol tekanan telapak dan jari tangan saat mencapkan media sayur ke atas kertas.',
              rubric: {
                BB: 'Tekanan belum teratur sehingga gambar meleset atau luntur.',
                MB: 'Mampu mencap dengan bimbingan posisi tangan dari guru.',
                BSH: 'Mandiri mencap dengan tekanan mantap dan hasil cap terlihat jelas.',
                BSB: 'Sangat terampil mengontrol tekanan dan mampu menciptakan ritme pola seni yang harmonis.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengangkat bonggol sawi dan melihat pola bunga yang tercetak indah di kertas.',
        },
        {
          id: 'act-tan-syr-03',
          title: 'Regrowing Sayur Sederhana: Menumbuhkan Kembali Bonggol di Mangkuk Air',
          modality: 'Eksperimen Sederhana',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak menyelidiki keajaiban regenerasi tanaman dengan menaruh pangkal bonggol sawi atau bawang merah di mangkuk ceper berisi sedikit air, lalu mengamati kemunculan daun baru.',
          steps: [
            'Pengamatan Awal Bonggol: Mengamati bagian bawah bonggol tempat tumbuhnya akar dan bagian tengah pucuk.',
            'Penyiapan Wadah Hidroponik Sederhana: Menuang air bersih setinggi 1 cm ke wadah ceper ramah anak.',
            'Penataan Bonggol: Meletakkan bonggol sawi/bawang dengan posisi tegak menghadap ke atas di dekat jendela.',
            'Komitmen Perawatan: Membuat jadwal bersama anak untuk mengganti air setiap pagi agar tetap bersih.',
          ],
          pedagogicalRationale: 'Menanamkan penalaran ilmiah sebab-akibat dan rasa takjub terhadap kemampuan regenerasi tumbuhan ciptaan Tuhan.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Pertumbuhan Makhluk Hidup dan TP Mempraktikkan Sikap Peduli Lingkungan.',
          provocationQuestions: [
            'Menurutmu apakah sisa sayuran yang biasanya dibuang ini bisa tumbuh daun baru lagi?',
            'Mengapa air di dalam mangkuk tidak boleh terlalu penuh menenggelamkan seluruh sayur?',
            'Apa yang akan muncul terlebih dahulu, akar di bawah atau daun hijau di tengah?',
          ],
          primaryMaterials: ['Pangkal bonggol sawi sendok / kangkung / bawang merah', 'Mangkuk kaca/plastik transparan ramah anak', 'Air bersih dalam teko mini'],
          localLooseParts: ['Kerikil penopang bonggol', 'Tusuk gigi berujung tumpul penahan wadah'],
          materialAlternatives: [
            { main: 'Pot hidroponik pabrikan', alternative: 'Tutup botol atau wadah bekas selai kaca transparan', reason: 'Anak bisa mengamati pertumbuhan akar dari samping secara jelas.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi menaruh 1 bonggol ke wadah dan menuangkan air secangkir kecil.',
            berkembang: 'Anak mandiri menata kerikil penopang dan meletakkan wadah di rak terkena sinar matahari.',
            pengayaan: 'Anak menandai ketinggian air dan membuat catatan visual dugaan kapan daun baru akan mekar.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Menunjukkan rasa ingin tahu dan mengamati perubahan tunas tanaman yang tumbuh di media air.',
              rubric: {
                BB: 'Belum tertarik melihat wadah tanaman air.',
                MB: 'Melihat tanaman saat diingatkan dan menyebutkan ada daun hijau.',
                BSH: 'Mandiri mengamati dan menceritakan munculnya tunas daun baru dari bonggol sayur.',
                BSB: 'Kritis menghubungkan pentingnya air dan sinar matahari serta memprediksi pertumbuhan tunas harian.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak menuangkan air ke mangkuk dan wajah antusias mengamati pucuk hijau yang mulai bertunas.',
        },
        {
          id: 'act-tan-syr-04',
          title: 'Pasar Kebun Sayur Cilik: Bermain Peran Petani, Pedagang, & Pembeli Cerdas',
          modality: 'Bermain Peran & Budaya',
          duration: isKelompokA ? '35 - 40 Menit' : '50 - 60 Menit',
          description: 'Anak-anak berkolaborasi menata lapak sayuran dari meja dan kardus, menimbang sayuran dengan timbangan gantung sederhana, dan melakukan transaksi jual-beli yang santun.',
          steps: [
            'Penataan Lapak: Mengelompokkan sayuran ke keranjang dan memberi tanda harga menggunakan loose parts (misal: 2 keping batu kali).',
            'Pembagian Peran: Memilih peran secara sukarela (petani pengantar, penjual ramah, pembeli membawa tas belanja).',
            'Aksi Bermain Peran: Menimbang sayuran, menghitung batu koin mainan, dan bercakap-cakap santun menggunakan bahasa sopan.',
            'Merapikan Bersama: Gotong royong mengembalikan sayuran dan media pasar ke tempat penyimpanan semula.',
          ],
          pedagogicalRationale: 'Mengintegrasikan literasi numerasi awal (menghitung, menimbang, konsep nilai) dengan kecerdasan sosial-emosional dan komunikasi asertif.',
          whyRelevantToTP: 'Relevan dengan TP Berkomunikasi Efektif, TP Menggunakan Konsep Matematika Awal, dan TP Kerja Sama Positif.',
          provocationQuestions: [
            'Bagaimana cara pedagang menyapa pembeli sayur dengan ramah?',
            'Mana keranjang sayur yang lebih berat saat kamu angkat di timbangan?',
            'Mengapa kita sebaiknya membawa tas kain sendiri saat berbelanja sayur?',
          ],
          primaryMaterials: ['Aneka sayuran asli atau replika alam', 'Timbangan gantung sederhana (gantungan baju + dua wadah cangkir)', 'Tas belanja kain mini'],
          localLooseParts: ['Batu kali halus (sebagai koin uang mainan)', 'Keranjang anyaman bambu', 'Kartu label dari daun kering'],
          materialAlternatives: [
            { main: 'Mainan mesin kasir plastik', alternative: 'Timbangan gantungan baju dan koin batu kerikil', reason: 'Membangun pemahaman langsung tentang keseimbangan berat dan konsep jumlah konkret.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak berperan sebagai pembeli dengan membawa 2 keping kerikil dan didampingi menunjuk sayuran yang diinginkan.',
            berkembang: 'Anak mandiri menimbang sayur dan menyebutkan harga sederhana (misal: 3 batu untuk 1 ikat bayam).',
            pengayaan: 'Anak berperan sebagai kasir, membandingkan berat 2 jenis sayur di timbangan gantungan, dan memimpin transaksi sopan.',
          },
          observableIndicators: [
            {
              aspect: 'JATI_DIRI',
              aspectLabel: 'Jati Diri',
              observableBehavior: 'Mampu bergantian peran, bersikap sopan santun saat berinteraksi, dan menunjukkan tanggung jawab menjaga lapak.',
              rubric: {
                BB: 'Berebut sayuran dan belum mau berbagi peran dengan teman.',
                MB: 'Mau bermain peran setelah ditengahi dan diarahkan oleh guru.',
                BSH: 'Mandiri menjalankan peran penjual/pembeli dengan santun dan tertib.',
                BSB: 'Sangat komunikatif, ramah menyapa teman, dan inisiatif merapikan pasar bersama.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengamati keseimbangan timbangan gantungan baju dan interaksi santun transaksi pasar sayur.',
        },
      ];
    }

    // 1B. SUBTEMA BUNGA / HIAS / WARNA ALAM
    if (sub.includes('bunga') || sub.includes('hias') || sub.includes('mawar') || sub.includes('melati') || sub.includes('telang') || sub.includes('taman') || sub.includes('anggrek')) {
      return [
        {
          id: 'act-tan-bng-01',
          title: 'Petualangan Warna & Mahkota Bunga Gugur di Pekarangan Sekolah',
          modality: 'Eksplorasi Lingkungan',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak membawa keranjang eksplorasi untuk mengumpulkan aneka bunga yang gugur alami di halaman sekolah, membedakan aroma wangi, dan meneliti jumlah mahkota bunga.',
          steps: [
            'Etika Pecinta Alam: Kesepakatan tidak memetik bunga yang masih hidup di dahan, hanya memungut yang telah gugur di tanah.',
            'Pencarian Warna-Warni: Mengumpulkan bunga merah, kuning, ungu, dan putih ke dalam baki bersekat.',
            'Penyelidikan Mahkota: Menghitung helai mahkota bunga kamboja, kembang sepatu, atau melati menggunakan jari telunjuk.',
            'Refleksi Takjub: Mensyukuri keindahan ragam warna bunga ciptaan Tuhan yang mempercantik bumi.',
          ],
          pedagogicalRationale: 'Menanamkan etika konservasi lingkungan sejak dini dan melatih diskriminasi visual warna dan bentuk geometri alami.',
          whyRelevantToTP: 'Relevan dengan TP Mengapresiasi Ciptaan Tuhan, TP Menghargai Kelestarian Alam, dan TP Literasi Sains Awal.',
          provocationQuestions: [
            'Bunga mana yang menurutmu memiliki aroma paling harum saat didekatkan ke hidung?',
            'Mengapa kita tidak boleh memetik bunga yang masih segar mekar di dahan pohon?',
            'Bagaimana bentuk helai mahkota bunga ini, apakah membulat atau runcing?',
          ],
          primaryMaterials: ['Bunga gugur alami aneka warna (kamboja, bougenville, kembang sepatu)', 'Baki bambu bersekat', 'Kaca pembesar ramah anak'],
          localLooseParts: ['Ranting kering', 'Daun alas mahkota', 'Batu penanda hitungan'],
          materialAlternatives: [
            { main: 'Bunga plastik imitasi', alternative: 'Bunga gugur asli dari pekarangan sekolah', reason: 'Memberikan sensasi aroma nyata, tekstur lembut kelopak, dan warna pigmen asli.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi mengumpulkan 2 jenis bunga dan menyebutkan warnanya bersama guru.',
            berkembang: 'Anak mandiri mengelompokkan bunga berdasarkan warna ke dalam sekat baki yang sesuai.',
            pengayaan: 'Anak menghitung jumlah mahkota bunga dan membandingkan bunga bermahkota 5 helai vs 3 helai.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Mampu membedakan dan mengelompokkan bunga berdasarkan warna, aroma, atau jumlah kelopaknya.',
              rubric: {
                BB: 'Belum membedakan warna bunga dan acak meletakkan di baki.',
                MB: 'Mengelompokkan warna bunga setelah dicontohkan guru.',
                BSH: 'Mandiri mengklasifikasikan bunga sesuai atribut warna dan bentuk.',
                BSB: 'Kritis mendeskripsikan keunikan helai mahkota dan aroma bunga dengan kosakata kaya.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengamati helai mahkota bunga dengan kaca pembesar dan tersenyum mencium aromanya.',
        },
        {
          id: 'act-tan-bng-02',
          title: 'Laboratorium Ekstraksi Cat Air Alami dari Mahkota Bunga Telang & Mawar',
          modality: 'Sensori & Seni Alami',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak menumbuk kelopak bunga telang biru atau mawar merah di cobek kayu kecil, menambahkan beberapa tetes air hangat, lalu melukis bebas menggunakan kuas cat air alami buatan sendiri.',
          steps: [
            'Pijakan Sensori: Meraba kelembutan kelopak bunga dan mencium aromanya sebelum ditumbuk.',
            'Aksi Menumbuk (Ekstraksi): Menggunakan ulekan kayu kecil untuk meremukkan kelopak hingga sari warnanya keluar.',
            'Penyaringan & Keajaiban Warna: Meneteskan sari warna ke kertas putih; mengamati perubahan warna saat ditetesi air perasan jeruk nipis.',
            'Lukisan Alami: Melukis bebas pola bunga impian di atas kertas tebal menggunakan kuas atau jari.',
          ],
          pedagogicalRationale: 'Mengenalkan reaksi kimia alami ramah anak (pH indicator bunga telang) dan melatih kekuatan motorik tangan melalui menumbuk.',
          whyRelevantToTP: 'Relevan dengan TP Eksplorasi Sains Sederhana, TP Motorik Halus (meremas & menumbuk), dan TP Ekspresi Seni Orisinal.',
          provocationQuestions: [
            'Apa yang terjadi dengan warna air saat kita menumbuk kelopak bunga telang biru ini?',
            'Kira-kira apa yang terjadi jika warna biru ini kita tetesi air jeruk nipis?',
            'Bagaimana aroma cat air alami buatanmu dibandingkan cat kimia di botol?',
          ],
          primaryMaterials: ['Kelopak bunga telang / mawar / bougenville', 'Ulekan dan cobek kayu mini ramah anak', 'Air hangat dalam mangkuk kecil', 'Kertas gambar tebal'],
          localLooseParts: ['Pipet tetes ramah anak', 'Jeruk nipis potong', 'Tangkai daun sebagai kuas alami'],
          materialAlternatives: [
            { main: 'Pewarna sintetis pabrikan', alternative: 'Kelopak bunga telang, kunyit, dan daun suji', reason: 'Aman untuk anak, bebas bahan kimia berbahaya, dan mengajarkan sains pigmen alam.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak dibimbing memegang ulekan kayu dan menumbuk 3 kelopak bunga bersama pendampingan guru.',
            berkembang: 'Anak mandiri menumbuk kelopak hingga mengeluarkan pigmen warna dan mencelupkan kuas ke kertas.',
            pengayaan: 'Anak melakukan uji coba meneteskan air jeruk nipis pada sari bunga telang dan menceritakan perubahan warna biru ke ungu.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Menunjukkan rasa ingin tahu ilmiah saat mengekstraksi warna bunga dan mengamati perubahan warna yang terjadi.',
              rubric: {
                BB: 'Hanya memainkan ulekan tanpa memperhatikan perubahan warna.',
                MB: 'Menyebutkan perubahan warna setelah diarahkan oleh guru.',
                BSH: 'Mandiri menumbuk dan menjelaskan perubahan warna yang dihasilkannya.',
                BSB: 'Kritis mengemukakan hipotesis mengapa warna bisa berubah saat ditetesi air jeruk nipis.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengamati sari warna ungu menetes dari cobek kayu ke kertas lukis.',
        },
        {
          id: 'act-tan-bng-03',
          title: 'Merangkai Mahkota & Kalung Bunga Daun: Kreasi Perhiasan Loose Parts Alam',
          modality: 'Konstruksi Loose Parts',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak menggunakan tangkai daun singkong/pepaya berongga atau tali rami untuk meronce kelopak bunga gugur dan daun menjadi mahkota kepala atau kalung indah bertema alam.',
          steps: [
            'Pemilihan Bahan: Memilih kombinasi warna kelopak bunga dan daun yang disukai.',
            'Teknik Meronce / Menyemat: Menusukkan lidi tumpul atau memasukkan benang rami ke lubang tangkai daun secara ritmis.',
            'Pola Hiasan: Menyusun urutan pola selang-seling (bunga - daun - bunga - daun).',
            'Pawai Mahkota Alam: Memakai mahkota hasil kreasi sendiri dan berparade ceria bersama teman sekelas.',
          ],
          pedagogicalRationale: 'Melatih koordinasi bilateral mata-tangan, kesabaran, penalaran pola (patterning), dan penghargaan estetika diri.',
          whyRelevantToTP: 'Relevan dengan TP Kemampuan Motorik Halus Kompleks (meronce), TP Mengenal Pola Berulang, dan TP Percaya Diri.',
          provocationQuestions: [
            'Bagaimana susunan pola yang kamu pilih untuk mahkota kepalamu?',
            'Apa yang kamu lakukan agar tangkai bunga ini tidak mudah lepas dari tali?',
            'Bagaimana perasaanmu saat mengenakan mahkota bunga buatan tanganmu sendiri?',
          ],
          primaryMaterials: ['Kelopak bunga gugur berlubang/bertangkai', 'Tangkai daun pepaya/singkong berongga', 'Tali rami atau benang katun ramah anak', 'Lidi bambu berujung tumpul'],
          localLooseParts: ['Daun mangga muda lentur', 'Biji melinjo berlubang', 'Pita kain perca'],
          materialAlternatives: [
            { main: 'Manik-manik plastik pabrikan', alternative: 'Tangkai daun berongga dan bunga gugur', reason: 'Melatih kehati-hatian tangan pada bahan rapuh organik dan ramah lingkungan.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak memasukkan 3 tangkai daun berongga besar ke tali dengan bantuan ujung lidi pemandu.',
            berkembang: 'Anak mandiri meronce minimal 5 elemen selang-seling bunga dan daun membentuk gelang/kalung.',
            pengayaan: 'Anak merancang mahkota utuh dengan pola ABAB yang simetris dan membantu temannya yang tali ronceannya terlepas.',
          },
          observableIndicators: [
            {
              aspect: 'MOTORIK_HALUS',
              aspectLabel: 'Motorik Halus',
              observableBehavior: 'Mampu memasukkan tali ke dalam lubang tangkai/bunga (meronce) dengan koordinasi mata-tangan yang stabil.',
              rubric: {
                BB: 'Masih kesulitan mengarahkan ujung tali ke lubang bahan.',
                MB: 'Mampu memasukkan 1-2 bahan dengan bantuan tangan guru.',
                BSH: 'Mandiri meronce dengan gerakan jari yang terkoordinasi dan sabar.',
                BSB: 'Sangat lincah, terampil, dan mampu menyusun pola ronce yang rumit dan rapi.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak fokus memasukkan tali ke kelopak bunga dan senyum bangga memakai mahkotanya.',
        },
        {
          id: 'act-tan-bng-04',
          title: 'Investigasi Sahabat Bunga: Mengamati Kupu-Kupu & Lebah Mengisap Madu',
          modality: 'Eksperimen Sederhana',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak mengamati secara tenang interaksi serangga penyerbuk (kupu-kupu, lebah tanpa sengat, semut) yang hinggap pada tanaman bunga di halaman sekolah, lalu mendiskusikan manfaat serbuk sari.',
          steps: [
            'Langkah Sunyi (Silent Walk): Berjalan perlahan mendekati rumpun bunga agar kupu-kupu dan lebah tidak terkejut.',
            'Observasi Sabar: Duduk melingkar tenang mengamati serangga yang hinggap di tengah kelopak bunga.',
            'Pencatatan Grafis Cilik: Menggambar bentuk sayap kupu-kupu atau warna bunga yang paling banyak disukai serangga.',
            'Refleksi Kerjasama Alam: Memahami bahwa bunga dan serangga saling membantu (simbiosis mutualisme sederhana).',
          ],
          pedagogicalRationale: 'Membangun kesadaran ekosistem terpadu, regulasi ketenangan diri (mindfulness), dan rasa hormat pada makhluk hidup kecil.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Hubungan Antar Makhluk Hidup dan TP Regulasi Diri Saat Berada di Alam.',
          provocationQuestions: [
            'Mengapa menurutmu kupu-kupu sangat suka hinggap di atas bunga yang berwarna cerah?',
            'Apa yang sedang dicari lebah di bagian tengah bunga ini?',
            'Bagaimana cara tubuh kita tetap tenang agar kupu-kupu tidak takut terbang menjauh?',
          ],
          primaryMaterials: ['Rumpun tanaman bunga mekar di sekolah', 'Kaca pembesar ramah anak', 'Papan jalan mini dan kertas gambar'],
          localLooseParts: ['Krayon lilin warna alami', 'Teropong kertas gulung'],
          materialAlternatives: [
            { main: 'Video dokumenter serangga di layar TV', alternative: 'Pengamatan langsung di rumpun taman bunga sekolah', reason: 'Memberikan pengalaman sensorik nyata dan melatih kesabaran observasi alam.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi mengamati kupu-kupu dari jarak aman dan menirukan gerak sayap kupu-kupu dengan tangannya.',
            berkembang: 'Anak mandiri mengamati warna bunga yang dihinggapi dan menceritakan apa yang dilakukan serangga.',
            pengayaan: 'Anak membandingkan perilaku semut vs kupu-kupu saat berada di bunga dan mendeskripsikan serbuk sari kuning yang menempel di kaki lebah.',
          },
          observableIndicators: [
            {
              aspect: 'NAM',
              aspectLabel: 'Nilai Agama & Budi Pekerti',
              observableBehavior: 'Menunjukkan kasih sayang dan kehati-hatian terhadap serangga ciptaan Tuhan tanpa berniat menyakiti.',
              rubric: {
                BB: 'Berniat mengejar atau memukul serangga yang hinggap.',
                MB: 'Mampu tenang setelah diingatkan guru untuk tidak mengganggu serangga.',
                BSH: 'Spontan menjaga jarak aman dan menyayangi serangga dengan mengamati damai.',
                BSB: 'Menjadi teladan bagi teman untuk menjaga ketenangan pekarangan dan melindungi serangga penyerbuk.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak berjongkok diam mengamati kupu-kupu hinggap di bunga dengan ekspresi takjub.',
        },
      ];
    }

    // 1C. SUBTEMA TANAMAN OBAT / HERBAL / APOTEK HIDUP (TOGA)
    if (sub.includes('obat') || sub.includes('herbal') || sub.includes('toga') || sub.includes('jahe') || sub.includes('kunyit') || sub.includes('kencur') || sub.includes('sereh') || sub.includes('apotek') || sub.includes('rimpang') || sub.includes('jamu')) {
      return [
        {
          id: 'act-tan-obt-01',
          title: 'Petualangan Aroma & Tekstur Rimpang Apotek Hidup Nusantara',
          modality: 'Eksplorasi Lingkungan',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak menyelidiki rimpang tanaman obat keluarga (jahe, kunyit, kencur, serai, daun sirih), meraba kulit kasar beruas, mencium aroma hangat menyegarkan, dan membandingkan warna dalamnya.',
          steps: [
            'Pijakan Sensori Raba: Memegang rimpang jahe beruas-ruas dan membandingkan bentuknya dengan kencur yang bulat kecil.',
            'Penyelidikan Olfaktori (Penciuman): Menggosok sedikit kulit serai atau daun sirih dan mencium keharuman khasnya.',
            'Misteri Warna Dalam: Mematahkan sedikit kunyit untuk melihat warna oranye menyala di dalamnya.',
            'Refleksi Warisan Nenek Moyang: Berdiskusi bahwa tanaman obat ini adalah anugerah Tuhan yang membuat tubuh hangat saat kedinginan.',
          ],
          pedagogicalRationale: 'Menghubungkan sains sensorik dengan kearifan lokal budaya nusantara (Culturally Responsive Teaching).',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Karakteristik Sensorik Alam dan TP Menghargai Kearifan Tradisional Keluarga.',
          provocationQuestions: [
            'Bagaimana aroma jahe ini saat didekatkan ke hidungmu, apakah terasa hangat?',
            'Warna apa yang muncul di ujung jarimu setelah menyentuh potongan kunyit ini?',
            'Pernahkah ibumu di rumah membuatkan minuman hangat dari tanaman ini saat kamu batuk?',
          ],
          primaryMaterials: ['Rimpang jahe, kunyit, kencur, batang serai, daun sirih segar', 'Talenan kayu halus ramah anak', 'Pisau tumpul mentega / alat parut aman'],
          localLooseParts: ['Cobek batu kecil', 'Cangkir tanah liat', 'Nampan anyaman bambu'],
          materialAlternatives: [
            { main: 'Gambar tanaman obat di buku cerita', alternative: 'Rimpang asli yang bisa dipatahkan, dicium, dan diraba langsung', reason: 'Memberikan pengalaman sensori bau dan warna alami yang tak tergantikan.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi meraba 2 rimpang berkontras (jahe besar vs kencur kecil) dan mencium aroma serai.',
            berkembang: 'Anak mandiri membedakan jahe dan kunyit berdasarkan warna bagian dalamnya dan menyebutkan aromanya.',
            pengayaan: 'Anak menceritakan fungsi tanaman herbal yang pernah diketahuinya di rumah dan mengelompokkan 4 rimpang sesuai jenisnya.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Mampu membedakan karakteristik fisik dan aroma khas rimpang tanaman obat keluarga.',
              rubric: {
                BB: 'Belum mau memegang atau mencium aroma rimpang.',
                MB: 'Mau memegang dan mencium setelah dicontohkan guru.',
                BSH: 'Mandiri mengidentifikasi nama dan aroma rimpang tanaman obat secara tepat.',
                BSB: 'Kritis mendeskripsikan sensasi aroma hangat dan membandingkan khasiat alami tanaman obat dengan lugas.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mencium batang serai yang dimemarkan dengan mata berbinar penasaran.',
        },
        {
          id: 'act-tan-obt-02',
          title: 'Eksperimen Jamu Hangat Cilik: Meramu Wedang Kunyit Madu Ramah Anak',
          modality: 'Eksperimen Sederhana',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak mempraktikkan proses meracik minuman sehat tradisional dengan mencelupkan irisan kunyit dan serai ke dalam cangkir air hangat, menambahkan sesendok madu, dan mengamati perubahan warna air.',
          steps: [
            'Penyiapan Media Sehat: Menyiapkan cangkir ramah anak berisi air hangat suam-suam kuku.',
            'Pencelupan Ramuan: Memasukkan irisan tipis kunyit dan serai yang telah dimemarkan ke air hangat.',
            'Pengadukan & Pencampuran: Mengaduk air dengan batang serai dan meneteskan madu alami menggunakan sendok kayu.',
            'Pencicipan Berkesadaran (Mindful Tasting): Menghirup uap hangatnya dan mencicipi sedikit rasa manis-hangat ramuan sehat.',
          ],
          pedagogicalRationale: 'Melatih kemampuan proses sains (pelarutan, difusi warna, sensori rasa) sekaligus menanamkan gaya hidup sehat alami.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Perubahan Zat/Pelarutan Sederhana dan TP Membiasakan Konsumsi Makanan/Minuman Sehat.',
          provocationQuestions: [
            'Apa yang terjadi dengan air bening saat kunyit dimasukkan dan diaduk?',
            'Rasa apa yang lidahmu rasakan setelah kita menambahkan madu ke dalam ramuan?',
            'Mengapa tubuh kita merasa nyaman dan hangat setelah minum ramuan alami ini?',
          ],
          primaryMaterials: ['Irisan kunyit bersih', 'Batang serai memar', 'Madu alami ramah anak', 'Air hangat suam-suam kuku dalam termos mini', 'Cangkir tanah liat / enamel ramah anak'],
          localLooseParts: ['Sendok kayu manis', 'Tatakan daun pisang'],
          materialAlternatives: [
            { main: 'Minuman sachet rasa buah berpengawet', alternative: 'Seduhan kunyit serai madu murni', reason: 'Membiasakan anak mencintai minuman herbal tradisional tanpa pewarna buatan.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi memasukkan 1 iris kunyit dan mengaduk air perlahan dengan sendok kayu.',
            berkembang: 'Anak mandiri menuangkan madu dengan sendok dan menceritakan perubahan warna air dari bening ke kuning.',
            pengayaan: 'Anak menjelaskan proses bagaimana warna kunyit menyebar di air hangat dan membandingkannya jika menggunakan air dingin.',
          },
          observableIndicators: [
            {
              aspect: 'KOGNITIF',
              aspectLabel: 'Kognitif & Logika',
              observableBehavior: 'Menjelaskan perubahan warna air yang terjadi saat kunyit dilarutkan ke dalam air hangat.',
              rubric: {
                BB: 'Belum memperhatikan perubahan warna air.',
                MB: 'Menyebutkan air menjadi kuning setelah ditunjukkan guru.',
                BSH: 'Mandiri menghubungkan warna kuning air dengan sari kunyit yang larut.',
                BSB: 'Mampu menjelaskan proses pelarutan secara runut dan mengaitkan rasa madu dengan kehangatan minuman.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengaduk cangkir dan mengamati pendaran warna kuning kunyit di air hangat.',
        },
        {
          id: 'act-tan-obt-03',
          title: 'Kebun Toga Mini: Menanam Rimpang Tunas di Kantong Tanam Daur Ulang',
          modality: 'Konstruksi Loose Parts',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak menanam rimpang jahe atau kunyit yang sudah memiliki "mata tunas" ke dalam polybag atau botol bekas terpotong yang diisi campuran tanah gembur dan sekam padi.',
          steps: [
            'Mencari Mata Tunas: Meneliti permukaan rimpang untuk menemukan bintik tunas yang siap tumbuh.',
            'Menyiapkan Media Tanam: Memasukkan tanah gembur menggunakan sekop kecil ke dalam wadah tanam daur ulang.',
            'Menanam Tunas: Menaruh rimpang dengan mata tunas menghadap ke atas dan menutupnya tipis dengan tanah.',
            'Pemberian Nama & Doa: Memasang plang stik kayu bertuliskan nama anak dan menyiramnya dengan percikan air lembut.',
          ],
          pedagogicalRationale: 'Mengajarkan tanggung jawab pemeliharaan jangka panjang dan pemahaman tentang perkembangbiakan vegetatif alami.',
          whyRelevantToTP: 'Relevan dengan TP Menanam dan Merawat Tumbuhan serta TP Bertanggung Jawab Atas Tugas Harian.',
          provocationQuestions: [
            'Mengapa mata tunas ini harus menghadap ke atas dan tidak boleh terbalik?',
            'Apa yang akan terjadi jika kita menimbun tanah terlalu tebal di atas tunas kecil ini?',
            'Bagaimana jadwal kita bergantian merawat kebun apotek hidup kelas kita?',
          ],
          primaryMaterials: ['Rimpang jahe/kunyit bertunas aktif', 'Tanah gembur campur kompos', 'Kantong tanam kain atau botol plastik bekas 1.5L', 'Sekop mini ramah anak'],
          localLooseParts: ['Stik kayu es krim penanda nama', 'Kerikil drainase dasar wadah'],
          materialAlternatives: [
            { main: 'Pot keramik mahal', alternative: 'Botol plastik air mineral bekas dipotong dua', reason: 'Mengurangi sampah plastik dan anak belajar daur ulang fungsional.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi memasukkan 2 sekop tanah dan meletakkan rimpang ke wadah dengan sentuhan guru.',
            berkembang: 'Anak mandiri mengisi wadah hingga garis batas, menaruh rimpang bertunas dengan posisi tepat, dan menyiramnya.',
            pengayaan: 'Anak menata deretan polybag apotek hidup berdasarkan jenis tanaman dan membuat kartu perawatan kelompok.',
          },
          observableIndicators: [
            {
              aspect: 'NAM',
              aspectLabel: 'Nilai Agama & Budi Pekerti',
              observableBehavior: 'Menunjukkan kepedulian dan kehati-hatian merawat rimpang tanaman ciptaan Tuhan saat menanam.',
              rubric: {
                BB: 'Membuang atau melempar rimpang tanpa kehati-hatian.',
                MB: 'Menanam rimpang dengan bimbingan dan mau menyiram saat diminta.',
                BSH: 'Mandiri dan berhati-hati menanam rimpang agar tunasnya tidak patah.',
                BSB: 'Sangat bersemangat, merawat dengan penuh kasih sayang, dan mengajak teman menjaga kebun TOGA bersama.',
              },
            },
          ],
          documentationFocus: 'Foto saat jari anak dengan hati-hati menaruh rimpang bertunas ke dalam tanah.',
        },
        {
          id: 'act-tan-obt-04',
          title: 'Bermain Peran Kedai Jamu Tradisional: Budaya Sehat Rukun Warga',
          modality: 'Bermain Peran & Budaya',
          duration: isKelompokA ? '35 - 40 Menit' : '50 - 60 Menit',
          description: 'Anak bermain peran sebagai "Mbok Jamu" atau "Tabib Cilik" yang meracik minuman herbal sehat untuk teman-teman yang berpura-pura lelah setelah berolahraga, menggunakan cangkir bambu dan bakul gendong.',
          steps: [
            'Penyiapan Kedai Jamu: Menata botol-botol kaca ramah anak berisi air perasan warna alami kunyit dan pandan di meja bambu.',
            'Pembagian Peran: Memilih peran penjual jamu gendong, peracik herbal, dan warga pembeli yang santun.',
            'Aksi Bermain Peran: Melayani pesanan minuman hangat, menanyakan keluhan kesehatan teman secara ramah, dan berterima kasih.',
            'Refleksi Kerukunan: Memahami bahwa saling merawat dan hidup rukun adalah nilai luhur bangsa Indonesia.',
          ],
          pedagogicalRationale: 'Menumbuhkan empati sosial, nilai gotong royong, dan apresiasi terhadap profesi kesehatan tradisional lokal.',
          whyRelevantToTP: 'Relevan dengan TP Menghargai Keragaman Budaya Tradisional dan TP Menunjukkan Sikap Empati & Tolong Menolong.',
          provocationQuestions: [
            'Bagaimana cara penjual jamu menyapa pembeli yang sedang merasa tidak enak badan?',
            'Mengapa orang zaman dahulu sangat suka minum jamu tradisional buatan sendiri?',
            'Apa yang kamu katakan setelah temanmu memberikan cangkir minuman sehat ini?',
          ],
          primaryMaterials: ['Bakul anyaman bambu mini', 'Botol-botol bening aman berisi air rebusan pandan/kunyit', 'Cangkir tempurung kelapa / cangkir bambu'],
          localLooseParts: ['Kain selendang gendong anak', 'Koin batu kali mainan', 'Serbet kain bersih'],
          materialAlternatives: [
            { main: 'Mainan plastik impor', alternative: 'Tempurung kelapa halus dan cangkir bambu lokal', reason: 'Mengenalkan estetika kearifan lokal nusantara (CRT).' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak berperan memegang cangkir tempurung kelapa dan menyapa teman dengan didampingi guru.',
            berkembang: 'Anak mandiri menuang air jamu pura-pura dari teko ke cangkir dan melayani teman dengan tutur kata santun.',
            pengayaan: 'Anak berinisiatif menjelaskan manfaat masing-masing jamu (kunyit untuk perut, jahe untuk dingin) saat melayani pelanggan.',
          },
          observableIndicators: [
            {
              aspect: 'JATI_DIRI',
              aspectLabel: 'Jati Diri',
              observableBehavior: 'Mampu berempati, menggunakan bahasa santun, dan bekerja sama dalam bermain peran sosial budaya.',
              rubric: {
                BB: 'Masih enggan berinteraksi atau berebut cangkir dengan teman.',
                MB: 'Mau bermain peran dan berbicara santun setelah dibimbing guru.',
                BSH: 'Mandiri dan hangat berkomunikasi dalam alur bermain peran kedai jamu.',
                BSB: 'Sangat empatik, komunikatif memimpin alur peran, dan menciptakan suasana bermain yang harmonis.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak menggendong bakul jamu bambu dengan senyum ramah melayani temannya.',
        },
      ];
    }

    // 1D. SUBTEMA POHON / BATANG / KAYU / RANTING / HUTAN
    if (sub.includes('pohon') || sub.includes('kayu') || sub.includes('batang') || sub.includes('ranting') || sub.includes('kelapa') || sub.includes('berkayu') || sub.includes('hutan')) {
      return [
        {
          id: 'act-tan-phn-01',
          title: 'Memeluk & Mengukur Lingkar Batang Pohon Peneduh Sekolah',
          modality: 'Eksplorasi Lingkungan',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak berdiri di bawah naungan pohon rindang sekolah, merasakan kesejukan udaranya, memeluk batang pohon dengan rentangan tangannya, dan mengukur keliling batang menggunakan jengkal atau tali rami.',
          steps: [
            'Sensori Naungan: Berdiri di bawah sinar matahari lalu berpindah ke bawah pohon: "Apa yang kulitmu rasakan?".',
            'Pelukan Pohon (Tree Hugging): Merentangkan kedua tangan memeluk batang pohon: "Apakah tanganmu bisa menyentuh jari temanmu?".',
            'Pengukuran Non-Standar: Melingkarkan tali rami pada batang pohon dan memotong tali sesuai keliling lingkar batang.',
            'Refleksi Sahabat Bumi: Mengucapkan terima kasih kepada pohon yang memberi oksigen segar dan tempat berteduh.',
          ],
          pedagogicalRationale: 'Membangun ikatan emosional mendalam dengan alam (nature connectedness) dan konsep pengukuran non-standar awal.',
          whyRelevantToTP: 'Relevan dengan TP Menunjukkan Rasa Sayang Terhadap Lingkungan Hidup dan TP Pengukuran Sederhana.',
          provocationQuestions: [
            'Mengapa udara di bawah pohon terasa jauh lebih sejuk daripada di lapangan terbuka?',
            'Berapa banyak anak yang dibutuhkan untuk memeluk batang pohon besar ini sampai melingkar penuh?',
            'Apa yang akan terjadi pada burung dan kita jika tidak ada pohon peneduh di sekolah?',
          ],
          primaryMaterials: ['Pohon peneduh di halaman sekolah', 'Tali rami atau pita kain panjang', 'Gunting tumpul ramah anak'],
          localLooseParts: ['Kulit kayu gugur', 'Daun peneduh', 'Ranting penanda keliling'],
          materialAlternatives: [
            { main: 'Pita meteran jahit plastik', alternative: 'Tali rami alami atau jengkal tangan anak', reason: 'Lebih intuitif untuk konsep perbandingan panjang bagi anak usia dini.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi meraba kulit batang pohon dan memeluknya bersama teman dan guru.',
            berkembang: 'Anak mandiri merentangkan tali rami melingkari batang pohon dan membandingkan pohon kurus vs pohon gemuk.',
            pengayaan: 'Anak menghitung panjang tali keliling menggunakan satuan jengkal tangan atau balok kayu secara mandiri.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Mampu membandingkan ukuran lingkar batang pohon menggunakan alat ukur non-standar (tali/pelukan tangan).',
              rubric: {
                BB: 'Hanya berlari mengelilingi pohon tanpa fokus mengamati ukuran.',
                MB: 'Memeluk pohon dan merentangkan tali setelah dibimbing guru.',
                BSH: 'Mandiri mengukur lingkar pohon dengan tali dan membandingkan ukuran pohon yang berbeda.',
                BSB: 'Kritis menghubungkan ketebalan batang pohon dengan usia pohon dan kekuatan akarnya menopang dahan.',
              },
            },
          ],
          documentationFocus: 'Foto saat dua anak saling berpegangan tangan merentangkan pelukan di sekeliling batang pohon besar.',
        },
        {
          id: 'act-tan-phn-02',
          title: 'Laboratorium Gesek Tekstur Kulit Kayu (Bark Rubbing) & Arang Alami',
          modality: 'Sensori & Seni Alami',
          duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
          description: 'Anak menempelkan kertas buram tipis pada permukaan kulit batang pohon yang bertekstur kasar/beralur, lalu menggosokkan arang kayu atau krayon mendatar untuk memunculkan sidik jari unik kulit pohon.',
          steps: [
            'Eksplorasi Raba: Mengusapkan telapak tangan ke kulit pohon mangga, cemara, atau kelapa: "Apakah terasa licin atau bergerigi?".',
            'Pemasangan Kertas: Menempelkan kertas di permukaan batang pohon dan menahannya dengan selotip kertas atau tangan teman.',
            'Aksi Menggesek: Memegang batang krayon/arang secara mendatar dan menggosokkannya dengan ritme stabil hingga pola urat timbul.',
            'Galeri Kulit Pohon: Membandingkan pola gesekan antara satu jenis pohon dengan pohon lainnya di dinding kelas.',
          ],
          pedagogicalRationale: 'Melatih kemampuan sensori taktil diskriminatif, kontrol motorik halus saat mengarsir, dan apresiasi seni tekstur alam.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Tekstur Objek Alam dan TP Mengembangkan Kontrol Motorik Halus Tangan.',
          provocationQuestions: [
            'Mengapa pola gosokan dari pohon cemara berbeda dengan pola dari pohon mangga?',
            'Bagaimana cara tanganmu memegang arang ini agar pola kulit pohonnya terlihat jelas di kertas?',
            'Apa fungsi kulit tebal dan kasar ini bagi keselamatan batang pohon di dalamnya?',
          ],
          primaryMaterials: ['Pohon aneka tekstur di sekolah', 'Kertas buram atau kertas roti tipis', 'Arang kayu alami / krayon lilin tanpa pembungkus', 'Selotip kertas ramah lingkungan'],
          localLooseParts: ['Serpihan kulit kayu yang terkelupas alami di tanah'],
          materialAlternatives: [
            { main: 'Kertas cetak komputer tebal', alternative: 'Kertas buram tipis daur ulang', reason: 'Lebih lentur mengikuti lekuk permukaan batang pohon sehingga pola tekstur muncul tajam.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak dibantu guru memegangi kertas dan diarahkan menggosokkan krayon secara mendatar 3-4 kali.',
            berkembang: 'Anak mandiri menempelkan kertas dan menggosok arang hingga menghasilkan cetakan tekstur yang jelas.',
            pengayaan: 'Anak membuat 2 cetakan dari pohon berbeda, membandingkan teksturnya, dan menceritakan perbedaannya di depan kelas.',
          },
          observableIndicators: [
            {
              aspect: 'MOTORIK_HALUS',
              aspectLabel: 'Motorik Halus',
              observableBehavior: 'Mampu memegang media arang/krayon dengan posisi miring dan mengontrol tekanan tangan saat menggesek.',
              rubric: {
                BB: 'Hanya mencoret titik atau merobek kertas karena tekanan terlalu runcing.',
                MB: 'Mulai menggesek mendatar dengan bimbingan posisi tangan dari guru.',
                BSH: 'Mandiri mengontrol tekanan gesek hingga pola tekstur kulit pohon tercetak rapi.',
                BSB: 'Sangat terampil, konsisten mengontrol ketebalan arsir, dan menghasilkan karya cetak tekstur yang artistik.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak menggosok arang di atas kertas yang menempel di batang pohon dan melihat polanya muncul.',
        },
        {
          id: 'act-tan-phn-03',
          title: 'Rekayasa Rancang Bangun: Sarang Burung dari Ranting Gugur & Sabut Kelapa',
          modality: 'Konstruksi Loose Parts',
          duration: isKelompokA ? '40 - 45 Menit' : '50 - 60 Menit',
          description: 'Anak bekerja sama mengumpulkan ranting-ranting pohon yang gugur, menyusunnya melingkar di atas wadah mangkuk daun, dan melapisinya dengan sabut kelapa lembut untuk membuat miniatur sarang burung hangat.',
          steps: [
            'Pengumpulan Ranting: Berburu ranting kering aneka ukuran di bawah pohon (panjang, pendek, bercabang).',
            'Konstruksi Struktur Lingkaran: Menganyam atau menyilangkan ranting membentuk cekungan sarang yang kokoh.',
            'Pelapisan Lembut: Mengurai sabut kelapa atau lumut kering dan meletakkannya di dasar sarang agar empuk.',
            'Uji Fungsi: Menaruh telur mainan dari batu kali bulat dan memastikan sarang tidak goyah saat ditiup angin.',
          ],
          pedagogicalRationale: 'Menumbuhkan pemikiran rekayasa struktural (biomimicry: belajar dari cara burung membangun rumah) dan empati perlindungan hewan.',
          whyRelevantToTP: 'Relevan dengan TP Menghasilkan Karya Konstruksi Rekayasa Sederhana dan TP Kepedulian Terhadap Kehidupan Satwa.',
          provocationQuestions: [
            'Bagaimana cara burung menata ranting-ranting kaku ini agar bisa menjadi mangkuk sarang yang kokoh?',
            'Bahan apa yang paling lembut untuk ditaruh di dalam sarang agar telur burung merasa hangat?',
            'Di cabang pohon yang mana sarang ini aman dari angin kencang dan tetesan hujan lebat?',
          ],
          primaryMaterials: ['Ranting pohon gugur aneka ukuran', 'Sabut kelapa kering yang diurai lembut', 'Batu kali bulat halus (sebagai telur)', 'Mangkuk anyaman bambu alas sarang'],
          localLooseParts: ['Daun kering lebar', 'Kapas kapuk alami', 'Tali sabut kelapa'],
          materialAlternatives: [
            { main: 'Kandang burung kawat besi', alternative: 'Ranting pohon alami dan sabut kelapa', reason: 'Anak meniru konstruksi asli burung di alam liar (hands-on biomimicry).' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi menata 4-5 ranting di dalam mangkuk bambu dan menaruh gumpalan sabut kelapa bersama guru.',
            berkembang: 'Anak mandiri menyilangkan ranting membentuk mangkuk sarang dan meletakkan telur batu di dalamnya.',
            pengayaan: 'Anak menguji kekokohan sarang dengan menggoyangkannya perlahan dan memperkuat sisi dinding sarang dengan ranting bercabang.',
          },
          observableIndicators: [
            {
              aspect: 'LITERASI_STEAM',
              aspectLabel: 'Dasar Literasi & STEAM',
              observableBehavior: 'Merancang struktur cekungan sarang menggunakan ranting dan material loose parts dengan mempertimbangkan kekokohan.',
              rubric: {
                BB: 'Hanya menaruh ranting acak tanpa membentuk cekungan sarang.',
                MB: 'Menyusun sarang dengan mengikuti panduan langsung dari guru.',
                BSH: 'Mandiri merancang sarang cekung yang kokoh menopang batu telur.',
                BSB: 'Kreatif memadukan anyaman ranting dan sabut serta menjelaskan mengapa konstruksinya aman bagi anak burung.',
              },
            },
          ],
          documentationFocus: 'Foto sarang burung mini hasil karya anak dengan batu kali di dalamnya di atas dahan pohon rendah.',
        },
        {
          id: 'act-tan-phn-04',
          title: 'Investigasi Saintifik: Menguji Kekuatan & Kelenturan Ranting Hijau vs Ranting Kering',
          modality: 'Eksperimen Sederhana',
          duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
          description: 'Anak menguji kelenturan dua jenis ranting: ranting yang baru jatuh (masih basah/hijau) vs ranting yang sudah lama kering di tanah, membengkokkannya secara perlahan, dan mendengarkan bunyi retakannya.',
          steps: [
            'Penyelidikan Sensorik: Meraba kelembapan kulit ranting dan mencoba menggoresnya dengan kuku: "Ada cairan hijau atau serbuk kering?".',
            'Pengujian Kelenturan: Membengkokkan ranting hijau secara perlahan: "Apakah ia melengkung seperti busur atau patah?".',
            'Pengujian Ranting Kering: Membengkokkan ranting kering: "Dengarkan bunyi krek saat ranting ini patah!".',
            'Diskusi Reflektif: Mengapa ranting yang memiliki air di dalamnya lebih lentur daripada ranting kering yang kaku.',
          ],
          pedagogicalRationale: 'Menanamkan konsep sifat bahan (elasticity vs brittleness) melalui eksplorasi auditori dan taktil langsung.',
          whyRelevantToTP: 'Relevan dengan TP Menyelidiki Sifat Fisik Bahan Alami dan TP Mengamati dan Menjelaskan Sebab-Akibat.',
          provocationQuestions: [
            'Apa yang kamu dengar saat ranting kering ini kita tekuk sampai patah?',
            'Mengapa ranting yang masih berwarna hijau di dalamnya tidak mudah patah saat kita lengkungkan?',
            'Bahan mana yang lebih cocok kita jadikan busur panah mainan: ranting lentur atau ranting kering?',
          ],
          primaryMaterials: ['Ranting hijau yang baru jatuh tertiup angin', 'Ranting cokelat kering yang rapuh', 'Alas nampan kayu untuk menampung serpihan'],
          localLooseParts: ['Kaca pembesar untuk melihat serat patahan'],
          materialAlternatives: [
            { main: 'Stik plastik uji kelenturan', alternative: 'Ranting pohon alami di pekarangan sekolah', reason: 'Memberikan pengalaman sensasi patahan serat kayu alami yang autentik.' },
          ],
          tarlAdjustments: {
            perluDukungan: 'Anak didampingi merasakan lekukan ranting lentur dan mendengarkan bunyi saat ranting kering dipatahkan guru.',
            berkembang: 'Anak mandiri mematahkan ranting kering dan melengkungkan ranting lentur serta menceritakan perbedaannya.',
            pengayaan: 'Anak mengelompokkan 6 ranting ke dalam kelompok "lentur" vs "rapuh/kering" dan menyusun alasan logisnya.',
          },
          observableIndicators: [
            {
              aspect: 'KOGNITIF',
              aspectLabel: 'Kognitif & Logika',
              observableBehavior: 'Mampu membedakan sifat fisik kelenturan ranting basah vs kerapuhan ranting kering melalui pengujian langsung.',
              rubric: {
                BB: 'Belum memperhatikan perbedaan antara ranting basah dan kering.',
                MB: 'Menyebutkan ranting patah setelah diarahkan oleh guru.',
                BSH: 'Mandiri menjelaskan bahwa ranting kering mudah patah sedangkan ranting basah bisa melengkung.',
                BSB: 'Kritis menghubungkan kandungan air di dalam ranting dengan tingkat kelenturan serat kayu.',
              },
            },
          ],
          documentationFocus: 'Foto saat anak mengamati serat kayu pada patahan ranting kering menggunakan kaca pembesar.',
        },
      ];
    }

    // 1E. SUBTEMA DAUN / BIJI / AKAR / TUNAS / UMUM TANAMAN
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
      {
        id: 'act-bin-03',
        title: 'Metamorfosis Kupu-kupu: Seni Daun Gulung & Gerak Tari Kepompong',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak menyelidiki siklus hidup kupu-kupu: menempel butir biji saga (telur) di daun, merayap seperti ulat, membungkus diri dengan selendang kain perca (kepompong), dan mengepakkan sayap terbang bebas.',
        steps: [
          'Investigasi Daun: Menemukan daun berlubang bekas dimakan ulat di halaman sekolah.',
          'Kreasi Siklus Daun: Menyusun 4 tahapan siklus (telur biji, ulat ranting berbulu benang, kepompong daun pisang kering, kupu-kupu kelopak bunga).',
          'Dramatisasi Gerak: Anak berguling melingkar di matras menirukan kepompong yang diam tenang, lalu perlahan keluar meregangkan tangan.',
          'Pentas Terbang Harmonis: Menggerakkan sayap kain selaras dengan irama petikan musik lembut alam.',
        ],
        pedagogicalRationale: 'Menanamkan pemahaman sains siklus hidup biologis (metamorfosis) melalui penghayatan gerak kinestetik dan seni alam.',
        whyRelevantToTP: 'Relevan dengan TP Memahami Siklus Hidup Makhluk Hidup dan TP Mengekspresikan Diri Lewat Gerak Tari.',
        provocationQuestions: [
          'Mengapa ulat harus tidur lama di dalam kepompong sebelum bisa menjadi kupu-kupu yang indah?',
          'Bagaimana caramu bergerak pelan dan tenang seperti kepompong yang sedang beristirahat di dahan?',
          'Apa yang dicari kupu-kupu saat terbang hinggap dari satu bunga ke bunga lainnya?',
        ],
        primaryMaterials: ['Daun hijau segar aneka bentuk', 'Biji-bijian kecil (biji saga/kacang hijau)', 'Selendang kain perca warna-warni', 'Daun pisang kering'],
        localLooseParts: ['Ranting pohon bercabang', 'Benang wol sisa', 'Bunga gugur'],
        materialAlternatives: [
          { main: 'Kertas kerja siklus hidup bergambar cetak', alternative: 'Eksplorasi gerak tubuh nyata dan media loose parts dedaunan pekarangan', reason: 'Jauh lebih membekas secara emosional dan kognitif daripada lembar kerja kertas.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menempelkan biji pada daun dan menirukan kepompong berguling bersama guru.',
          berkembang: 'Anak menyusun 4 urutan siklus secara mandiri dan memeragakan gerak ulat menjadi kupu-kupu.',
          pengayaan: 'Anak menceritakan metamorfosis secara lengkap dan memimpin gerak tari kepompong bersama teman sekelas.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mengenal konsep urutan waktu dan siklus perubahan bentuk makhluk hidup dari pengamatan nyata.',
            rubric: {
              BB: 'Belum mampu membedakan ulat dan kepompong.',
              MB: 'Menyebutkan tahap kepompong saat diarahkan dengan media visual daun.',
              BSH: 'Mandiri mengurutkan 4 tahapan metamorfosis dan menghubungkannya dengan gerak tubuhnya.',
              BSB: 'Kritis bertanya tentang fungsi kepompong dan kreatif memadukan bahan alam untuk merepresentasikan sayap.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak membuka rentangan selendang kain perca mengepakkan sayap kupu-kupu.',
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
      {
        id: 'act-trans-02',
        title: 'Mobil Luncur Roda Tutup Botol & Uji Kemiringan Jalan',
        modality: 'Konstruksi Loose Parts',
        duration: isKelompokA ? '40 - 45 Menit' : '50 - 55 Menit',
        description: 'Anak merakit sasis mobil dari kotak kardus bekas/karton susu, memasang sumbu tusuk sate dan roda tutup botol, lalu meluncurkannya pada bidang miring papan kayu bertumpuk balok.',
        steps: [
          'Eksplorasi Gerak Roda: Menggelindingkan tutup botol di lantai: mengapa lingkaran berputar mulus sedangkan kubus tidak?',
          'Perakitan Sasis & Sumbu: Menyelipkan tusuk sate tumpul ke dalam sedotan dan merekatkan tutup botol sebagai roda depan-belakang.',
          'Uji Lintasan Bidang Miring: Mengatur kemiringan papan seluncur (rendah vs tinggi) dan mengamati kecepatan luncur mobil.',
          'Pengukuran Jarak Luncur: Menghitung jarak tempuh mobil menggunakan jengkal tangan atau pita kain penanda.',
        ],
        pedagogicalRationale: 'Memperkenalkan prinsip mekanika dasar (gaya gravitasi, perputaran poros roda, dan kemiringan bidang) melalui rekayasa nyata.',
        whyRelevantToTP: 'Relevan dengan TP Memecahkan Masalah Rekayasa Konstruksi dan TP Konsep Pengukuran Jarak.',
        provocationQuestions: [
          'Apa yang membuat mobil buatanmu meluncur lebih jauh saat papan seluncurnya dibuat lebih tinggi?',
          'Bagaimana jika kedua roda depan tidak dipasang lurus sejajar?',
          'Bahan apa yang bisa kita pasang di roda agar mobil tidak mudah selip di jalanan licin?',
        ],
        primaryMaterials: ['Kotak kardus susu/pasta gigi bekas', 'Tutup botol plastik aneka ukuran yang dilubangi tengahnya', 'Tusuk sate tumpul / sumpit bambu halus', 'Sedotan kertas'],
        localLooseParts: ['Papan kayu / kardus tebal sebagai bidang miring', 'Batu bata penopang ketinggian', 'Selotip kertas'],
        materialAlternatives: [
          { main: 'Mobil remote control plastik pabrikan', alternative: 'Sasis kardus daur ulang buatan sendiri dengan roda tutup botol', reason: 'Mengasah penalaran kausalitas mekanik secara konkret sejak dini.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak memasukkan sumbu roda ke dalam lubang tutup botol dan mencoba meluncurkannya pada papan miring rendah.',
          berkembang: 'Anak mandiri merakit 4 roda mobil dan membandingkan jarak luncur pada dua tingkat kemiringan berbeda.',
          pengayaan: 'Anak memodifikasi bentuk bodi mobil dan menambahkan beban kerikil untuk menganalisis dampaknya pada kecepatan luncur.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mengidentifikasi hubungan sebab-akibat antara kemiringan lintasan dengan laju luncur objek.',
            rubric: {
              BB: 'Melempar mobil tanpa menaruhnya di bidang miring.',
              MB: 'Meluncurkan mobil di bidang miring dengan arahan guru.',
              BSH: 'Mandiri menguji perbedaan sudut kemiringan dan menyebutkan mobil meluncur lebih cepat jika papan dinaikkan.',
              BSB: 'Mampu menjelaskan konsep kemiringan secara logis dan merekayasa perbaikan jika roda mobil macet.',
            },
          },
        ],
        documentationFocus: 'Foto saat mobil kardus meluncur turun dari papan miring dan anak mengamati garis berhentinya.',
      },
      {
        id: 'act-trans-03',
        title: 'Pesawat Kertas Aerodinamis & Teropong Angin Langit',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak melipat aneka jenis kertas bekas menjadi pesawat glider, membuat teropong kertas gulung untuk mengamati arah angin dedaunan pohon, dan menerbangkan pesawat melintasi lingkaran target.',
        steps: [
          'Pengamatan Gerak Angin: Melihat daun pohon bergoyang: ke mana arah angin bertiup hari ini?',
          'Pelipatan Pesawat Glider: Melipat kertas membentuk sayap lebar yang seimbang kiri dan kanan.',
          'Peluncuran Target: Menerbangkan pesawat melewati simpai rotan atau lingkaran tali yang digantung di pohon sekolah.',
          'Modifikasi Sayap: Menekuk ujung sayap sedikit ke atas dan melihat perbedaannya saat terbang melayang.',
        ],
        pedagogicalRationale: 'Menstimulasi pemikiran aerodinamika, keterampilan motorik lipat presisi, dan koordinasi visual-spasial motorik.',
        whyRelevantToTP: 'Relevan dengan TP Bereksplorasi Sifat Udara dan TP Koordinasi Bilateral Tangan Kanan & Kiri.',
        provocationQuestions: [
          'Bagaimana bentuk sayap pesawat yang bisa melayang paling lama di udara?',
          'Mengapa pesawat harus dilipat sama rata antara sayap kanan dan sayap kirinya?',
          'Apa yang terjadi jika kita melepaskan pesawat searah dengan tiupan angin di halaman?',
        ],
        primaryMaterials: ['Kertas koran / kertas bekas kalender tebal', 'Simpai hula hoop rotan / gantungan tali lingkaran target', 'Krayon penanda tanda sayap'],
        localLooseParts: ['Pita kain penunjuk arah angin', 'Ranting penanda jarak mendarat'],
        materialAlternatives: [
          { main: 'Drone mainan plastik', alternative: 'Pesawat lipat kertas bekas dipadukan pita penunjuk angin', reason: 'Melatih anak tekun melipat sendiri dan memahami daya angkat udara alami.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak melipat kertas satu lipatan simetris dan menerbangkan pesawat dengan lemparan tangan lembut.',
          berkembang: 'Anak mandiri menyelesaikan 4 tahapan lipatan sayap pesawat dan membidik lingkaran sasaran.',
          pengayaan: 'Anak membuat dua model lipatan (sayap runcing vs sayap lebar) dan mendokumentasikan mana yang meluncur terjauh.',
        },
        observableIndicators: [
          {
            aspect: 'MOTORIK_HALUS',
            aspectLabel: 'Motorik Halus',
            observableBehavior: 'Menyelaraskan tekanan jemari tangan dalam melipat garis lurus kertas dan menyatukan sudut simetris.',
            rubric: {
              BB: 'Meremas kertas menjadi gumpalan tanpa melipat.',
              MB: 'Melipat kertas mengikuti garis lipatan yang dicontohkan guru.',
              BSH: 'Mandiri merapikan lipatan sayap pesawat dengan tekanan jari yang terkoordinasi rapi.',
              BSB: 'Sangat terampil melipat berbagai variasi sayap presisi dan membantu teman merapikan lipatan pesawatnya.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mengarahkan pesawat kertas meluncur menembus lingkaran sasaran.',
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
      {
        id: 'act-prof-02',
        title: 'Klinik Sahabat Sehat: Menyelidiki Denyut Nadi & Meracik Jamu Herbal Cilik',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '35 - 40 Menit' : '50 - 55 Menit',
        description: 'Anak menyelidiki detak jantung sebelum dan sesudah melompat menggunakan corong pendengar tabung karton, serta menumbuk rimpang kunyit dan serai membuat ramuan sehat.',
        steps: [
          'Investigasi Detak Jantung: Meletakkan telapak tangan di dada: detak santai vs detak cepat setelah melompat 10 kali.',
          'Pemeriksaan dengan Tabung Karton: Mendengarkan detak dada teman melalui corong stetoskop karton sederhana.',
          'Apotek Hidup Herbal: Menumbuk rimpang kunyit dan serai menggunakan cobek kayu kecil ramah anak, mencium aroma segarnya.',
          'Bermain Peran Dokter Ramah: Menulis resep gambar (gambar buah, istirahat, minum air) untuk pasien boneka.',
        ],
        pedagogicalRationale: 'Mengenalkan profesi tenaga kesehatan tanpa rasa takut, literasi kesehatan tubuh (health literacy), dan apresiasi herbal nusantara.',
        whyRelevantToTP: 'Relevan dengan TP Mempraktikkan Perilaku Hidup Sehat dan TP Menghargai Profesi Sekitar.',
        provocationQuestions: [
          'Mengapa detak jantung di dadamu berdegup lebih cepat saat kamu selesai berlari kencang?',
          'Bagaimana aroma serai dan kunyit ini membantu tubuh kita merasa lebih segar?',
          'Nasihat apa yang akan kamu berikan pada temanmu agar badannya selalu bugar dan tidak gampang pilek?',
        ],
        primaryMaterials: ['Tabung karton bekas tisu tebal', 'Rimpang kunyit dan serai segar pekarangan', 'Cobek dan ulekan kayu mini', 'Kertas resep bergambar'],
        localLooseParts: ['Daun sirih', 'Air matang hangat', 'Cangkir batok kelapa'],
        materialAlternatives: [
          { main: 'Mainan dokter-dokteran plastik impor', alternative: 'Tabung karton stetoskop dan lumpang kayu herbal asli', reason: 'Menghilangkan fobia dokter dan menumbuhkan kecintaan pada herbal lokal.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak merasakan denyut nadinya sendiri di pergelangan tangan dibimbing guru.',
          berkembang: 'Anak mendengarkan detak jantung teman lewat tabung karton dan menumbuk kunyit mandiri.',
          pengayaan: 'Anak menjelaskan perbedaan denyut nadi saat diam vs aktif dan meracik minuman herbal hangat bersama pendamping.',
        },
        observableIndicators: [
          {
            aspect: 'JATI_DIRI',
            aspectLabel: 'Jati Diri',
            observableBehavior: 'Mengenali ritme fisiologis tubuhnya dan menunjukkan empati peduli kesehatan pada sesama.',
            rubric: {
              BB: 'Belum bisa merasakan letak detak jantung.',
              MB: 'Merasakan detak dada setelah dipandu guru menaruh telapak tangan.',
              BSH: 'Mandiri menceritakan perubahan detak jantung sebelum dan sesudah berolahraga.',
              BSB: 'Kritis mengaitkan kebiasaan istirahat cukup, nutrisi herbal, dan daya tahan tubuh prima.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mendengarkan detak jantung teman dengan corong karton sambil tersenyum.',
      },
      {
        id: 'act-prof-03',
        title: 'Studio Tukang Kayu & Arsitek Cilik: Mengukur Balok & Memalu Pasak Bambu',
        modality: 'Konstruksi Loose Parts',
        duration: isKelompokA ? '40 - 45 Menit' : '50 - 60 Menit',
        description: 'Anak mengukur panjang potongan kayu/kardus dengan jengkal tangan, menandai garis potong dengan arang, dan mengetuk pasak kayu ke dalam lubang menggunakan palu kayu tumpul.',
        steps: [
          'Apresiasi Profesi Pembangun: Mendiskusikan siapa yang membangun kelas, meja, dan jembatan kokoh di lingkungan kita.',
          'Pengukuran Skala Jengkal: Merentangkan jemari mengukur balok kayu (berapa jengkal panjangnya?).',
          'Aktivitas Memalu Pasak: Memegang palu kayu tumpul dan mengetuk pasak bambu tumpul ke dalam busa spons padat atau adonan lempung.',
          'Konstruksi Struktur Bersama: Menggabungkan potongan balok membentuk gapura atau meja mini.',
        ],
        pedagogicalRationale: 'Melatih koordinasi motorik halus kekuatan genggaman (palmar-to-pincer grasp), persepsi spasial geometri, dan konsep pengukuran non-standar.',
        whyRelevantToTP: 'Relevan dengan TP Pengukuran Panjang Non-Standar dan TP Menggunakan Alat Sederhana Secara Aman.',
        provocationQuestions: [
          'Berapa jengkal tanganmu panjang balok kayu ini jika dibandingkan dengan balok milik temanmu?',
          'Mengapa seorang tukang kayu harus berhati-hati saat memegang dan mengayunkan palu?',
          'Bagaimana cara kita memasang pasak agar gapura kayu ini berdiri tegak tanpa roboh?',
        ],
        primaryMaterials: ['Palu kayu tumpul aman', 'Pasak bambu tumpul / stik kayu tebal', 'Spons padat / lempung pekarangan sebagai media pasak', 'Potongan kayu sisa halus'],
        localLooseParts: ['Kerikil pengganjal', 'Tali sabut kelapa', 'Arang penanda'],
        materialAlternatives: [
          { main: 'Mainan toolbox plastik perkakas', alternative: 'Palu kayu buatan tukang lokal dipadu pasak ranting bambu tumpul', reason: 'Memberikan sensasi bobot dan resistensi nyata yang sangat melatih proprioseptif anak.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak mengetukkan palu ke pasak yang sudah tertancap separuh di spons dengan bimbingan.',
          berkembang: 'Anak mandiri menancapkan dan mengetuk 3 pasak kayu hingga rata dengan permukaan spons.',
          pengayaan: 'Anak mengukur balok dengan jengkal, mencatat jumlah jengkalnya dengan garis kapur, dan membangun gapura kokoh.',
        },
        observableIndicators: [
          {
            aspect: 'MOTORIK_HALUS',
            aspectLabel: 'Motorik Halus',
            observableBehavior: 'Mengendalikan arah dan kekuatan ketukan palu dengan koordinasi mata-tangan yang mantap dan aman.',
            rubric: {
              BB: 'Mengayun palu sembarangan tanpa membidik sasaran pasak.',
              MB: 'Mengetuk pasak dengan ayunan pelan setelah diberi contoh posisi tangan aman.',
              BSH: 'Mandiri membidik dan mengetuk pasak kayu hingga tertancap kokoh tanpa mencederai tangan.',
              BSB: 'Sangat terampil mengombinasikan kekuatan ayunan palu dengan presisi tinggi dan konsisten memperhatikan keselamatan diri & teman.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak memfokuskan tatapan mata membidik pasak dengan palu kayu mini.',
      },
    ];
  }

  // 7. ALAM SEMESTA / AIR, UDARA, API / LINGKUNGAN ALAM (Universe, Elements, Earth)
  if (thm.includes('alam') || thm.includes('semesta') || thm.includes('air') || thm.includes('udara') || thm.includes('api') || thm.includes('benda') || thm.includes('bumi') || thm.includes('cuaca')) {
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
      {
        id: 'act-elem-02',
        title: 'Laboratorium Hujan Mini: Siklus Awan & Tetes Air dalam Toples Kaca',
        modality: 'Eksperimen Sederhana',
        duration: isKelompokA ? '30 - 35 Menit' : '40 - 45 Menit',
        description: 'Anak menuangkan air hangat ke dalam toples kaca bening, menutupnya dengan piring berisi es batu di atasnya, lalu mengamati uap naik membentuk awan dan menetes turun sebagai hujan mini.',
        steps: [
          'Pijakan Cerita Hujan: Menceritakan bagaimana rasa air hujan dan dari mana awan abu-abu mendapatkan airnya.',
          'Penyusunan Ekosistem Toples: Menuangkan air hangat ke dasar toples kaca bening dengan pendampingan guru.',
          'Pemberian Es Batu: Menaruh piring logam/kaca berisi es batu di atas mulut toples.',
          'Pengamatan Kondensasi: Mengamati kabut uap yang mengembun di bawah piring dan menetes turun kembali ke air.',
        ],
        pedagogicalRationale: 'Membuat konsep abstrak siklus hidrologi (evaporasi, kondensasi, presipitasi) menjadi peristiwa konkrit yang dapat disentuh dan dilihat anak.',
        whyRelevantToTP: 'Relevan dengan TP Menyelidiki Perubahan Wujud Benda dan Peristiwa Cuaca Hujan.',
        provocationQuestions: [
          'Mengapa di dinding kaca toples muncul titik-titik air padahal kita tidak menyemprotnya dari luar?',
          'Apa yang terjadi pada uap air saat bertemu dengan piring dingin berisi es batu?',
          'Bagaimana jika bumi tidak pernah turun hujan lagi? Apa dampaknya bagi tanaman dan hewan?',
        ],
        primaryMaterials: ['Toples kaca bening transparan', 'Piring seng / piring kaca penutup', 'Air hangat aman', 'Bongkahan es batu'],
        localLooseParts: ['Kain lap penyeka uap', 'Kertas catatan pengamatan'],
        materialAlternatives: [
          { main: 'Video animasi siklus air layar proyektor', alternative: 'Eksperimen toples kaca air hangat dan es batu langsung', reason: 'Pengalaman sensori suhu hangat-dingin dan tetesan nyata tak tergantikan oleh layar digital.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak meraba bagian luar toples yang hangat dan menyentuh es batu dingin di piring penutup.',
          berkembang: 'Anak mengamati dan menghitung 5 tetesan hujan yang jatuh dari bawah piring penutup toples.',
          pengayaan: 'Anak menceritakan alur siklus air lengkap (air laut menguap → jadi awan dingin → turun hujan) dengan bahasanya sendiri.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mampu menjelaskan fenomena penguapan dan pengembunan air sederhana secara teratur.',
            rubric: {
              BB: 'Hanya memainkan es batu tanpa mengamati toples.',
              MB: 'Menyebutkan ada air menetes saat ditunjuk oleh guru.',
              BSH: 'Mandiri mengamati dan menjelaskan bahwa tetesan air berasal dari uap air hangat yang mendingin.',
              BSB: 'Mampu merefleksikan pentingnya hujan bagi kelangsungan hidup tanaman dan sumur air di desa.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mendekatkan wajahnya ke dinding toples mengamati tetesan air embun hujan.',
      },
      {
        id: 'act-elem-03',
        title: 'Bintang Langit Malam: Melukis Rasi Bintang dengan Arang & Biji Kuaci',
        modality: 'Sensori & Seni Alami',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak menggelapkan bidang kertas menggunakan usapan arang kayu pekarangan, lalu menyusun biji kuaci/kerikil putih membentuk rasi bintang biduk atau layang-layang di langit malam.',
        steps: [
          'Eksplorasi Siang & Malam: Berbincang tentang apa yang kita lihat di langit siang (matahari, awan putih) vs langit malam (bulan, gemintang).',
          'Pewarnaan Langit Arang: Mengusapkan arang kayu ke kertas karton tebal dan meratakannya dengan ibu jari (sensori raba halus).',
          'Penyusunan Titik Rasi: Menempelkan biji-biji putih menyerupai pola rasi bintang buatan sendiri.',
          'Pemberian Garis Imajinasi: Menarik garis kapur tipis menghubungkan bintang-bintang menjadi bentuk hewan atau kapal langit.',
        ],
        pedagogicalRationale: 'Menstimulasi daya imajinasi astronomi, toleransi sensori terhadap material arang alami, dan ketelitian spasial motorik halus.',
        whyRelevantToTP: 'Relevan dengan TP Mengenal Benda-Benda Langit dan TP Mengekspresikan Seni Visual Alami.',
        provocationQuestions: [
          'Ke mana matahari pergi saat langit kita mulai gelap dan bintang-bintang mulai bermunculan?',
          'Bentuk apa yang kamu lihat jika bintang-bintang di karyamu ini dihubungkan dengan satu garis benang?',
          'Bagaimana rasa arang di jemarimu saat kamu meratakannya di atas kertas karton ini?',
        ],
        primaryMaterials: ['Arang kayu alami pekarangan', 'Kertas karton abu-abu/putih tebal', 'Biji kuaci putih / potongan kerikil putih kecil', 'Kapur tulis putih'],
        localLooseParts: ['Daun kering penutup sebagian bulan', 'Sabun cuci tangan'],
        materialAlternatives: [
          { main: 'Stiker bintang glow in the dark sintetis', alternative: 'Arang kayu asli dipadukan biji kuaci atau kerang kecil putih', reason: 'Melatih anak tidak jijik pada bahan alam dan merangsang eksplorasi tekstur alami.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak mengusapkan arang dengan bimbingan dan menempelkan 3 butir biji bintang di kertasnya.',
          berkembang: 'Anak meratakan arang di seluruh permukaan kertas dan menyusun pola rasi bintang sederhana.',
          pengayaan: 'Anak menghubungkan bintang dengan garis kapur membentuk objek imajinatif dan menceritakan kisahnya di depan kelas.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Bereksplorasi dengan medium arang dan menyusun pola titik koordinat bintang secara imajinatif.',
            rubric: {
              BB: 'Takut menyentuh arang karena warna hitamnya.',
              MB: 'Mau mengusap arang setelah melihat contoh guru dan mencuci tangan.',
              BSH: 'Mandiri meratakan arang dan menempelkan biji-biji bintang membentuk formasi berpola rapi.',
              BSB: 'Kaya imajinasi visual spasial, mengombinasikan tekstur arang pekat dan tipis untuk efek kabut galaksi malam.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak mengusap arang dengan jarinya dan foto rasi bintang buatannya yang berkilau.',
      },
    ];
  }

  // 8. BUDAYA / NEGARAKU / REKREASI / MAKANAN (Culture, Heritage, Traditional Games)
  if (thm.includes('budaya') || thm.includes('negara') || thm.includes('pancasila') || thm.includes('batik') || thm.includes('tradisional') || thm.includes('seni') || thm.includes('rekreasi') || thm.includes('makanan')) {
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
      {
        id: 'act-bud-02',
        title: 'Ecoprint Daun Jati & Kreasi Kain Motif Nusantara',
        modality: 'Sensori & Seni Alami',
        duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
        description: 'Anak menata daun jati muda atau daun jarak di atas kain blacu putih, menutupinya dengan plastik pelindung, lalu mengetuknya dengan palu kayu hingga zat warna alami daun meresap ke serat kain membentuk motif batik.',
        steps: [
          'Apresiasi Wastra Nusantara: Mengamati motif batik asli dan bagaimana nenek moyang menggunakan getah tumbuhan untuk memberi warna.',
          'Pencarian Daun Berpigmen: Memetik daun jati muda atau daun jarak yang memiliki getah warna merah/hijau kuat.',
          'Penataan Komposisi: Menyusun daun di atas bentangan kain katun/blacu putih sesuai pola kesukaan.',
          'Pengetukan Berirama: Mengetuk daun dengan palu kayu secara merata hingga serat warna tercetak jelas di kain.',
        ],
        pedagogicalRationale: 'Menghubungkan biologi botani (pigmen klorofil/antosianin daun) dengan warisan budaya tekstil adiluhung nusantara (CRT) dan regulasi motorik ritmis.',
        whyRelevantToTP: 'Relevan dengan TP Mengenal dan Menghargai Warisan Seni Budaya Daerah Serta TP Koordinasi Gerak Ritmis.',
        provocationQuestions: [
          'Bagaimana daun jati yang hijau ini bisa mengeluarkan warna ungu kemerahan saat kita ketuk di atas kain?',
          'Pola apa yang ingin kamu buat agar kain batik buatanmu terlihat anggun dan seimbang?',
          'Bagaimana perasaanmu setelah berhasil mencetak motif daun nyata ke kain dengan tanganmu sendiri?',
        ],
        primaryMaterials: ['Kain blacu/katun putih polos', 'Daun jati muda / daun jarak / daun pakis segar', 'Palu kayu tumpul ringan', 'Alas papan kayu datar'],
        localLooseParts: ['Plastik bening pelindung ketukan', 'Batu pipih penghalus'],
        materialAlternatives: [
          { main: 'Pewarna tekstil sintetis kimia', alternative: 'Zat warna daun jati dan bunga telang asli alam sekitar', reason: 'Aman untuk kulit anak, tidak beracun, dan ramah lingkungan.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak menata 1 helai daun besar di kain dan mengetuknya bersama bimbingan tangan guru.',
          berkembang: 'Anak mandiri menyusun 3 jenis daun dan mengetuk hingga pigmen warna tercetak jelas di kain.',
          pengayaan: 'Anak membuat komposisi motif simetris dan menceritakan filosofi motif batik buatannya kepada teman.',
        },
        observableIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            aspectLabel: 'Dasar Literasi & STEAM',
            observableBehavior: 'Mampu menata komposisi bentuk visual alami dan mengendalikan ritme ketukan palu untuk mentransfer warna.',
            rubric: {
              BB: 'Mengetuk sembarangan hingga daun hancur tanpa pola.',
              MB: 'Mengetuk daun dengan bimbingan dan melihat jejak warna.',
              BSH: 'Mandiri mengetuk dengan ritme terkontrol dan menghasilkan cetakan motif daun yang utuh di kain.',
              BSB: 'Menghasilkan komposisi seni wastra yang estetis, teratur, dan antusias menceritakan kebanggaannya.',
            },
          },
        ],
        documentationFocus: 'Foto saat anak membuka plastik pelindung dan tersenyum takjub melihat motif daun yang tercetak di kain.',
      },
      {
        id: 'act-bud-03',
        title: 'Dapur Tradisional Cilik: Meremas Adonan Klepon & Mengisi Gula Aren',
        modality: 'Bermain Peran & Budaya',
        duration: isKelompokA ? '40 - 45 Menit' : '50 - 55 Menit',
        description: 'Anak meremas tepung ketan yang diberi perasan daun pandan wangi, membentuk bulatan bola kecil, membuat lubang dengan jempol untuk diisi serutan gula aren, lalu menggulingkannya di atas parutan kelapa.',
        steps: [
          'Pengenalan Kudapan Nusantara: Mencium aroma wangi pandan dan rasa manis gula kelapa khas jajanan pasar.',
          'Pencampuran Adonan Alami: Menuangkan air perasan pandan ke tepung ketan dan meremasnya hingga kalis lembut.',
          'Pembulatan & Pengisian Gula: Menggelindingkan adonan di telapak tangan, membuat cekungan jempol, menaruh gula aren, dan menutupnya rapat.',
          'Pesta Rasa Bersama: Menikmati klepon sehat yang sudah direbus matang bersama teman sekelas dengan penuh rasa syukur.',
        ],
        pedagogicalRationale: 'Menstimulasi integrasi sensori taktil oromotorik, keterampilan motorik halus manipulatif (bilateral hand coordination), dan kecintaan pada kuliner nusantara.',
        whyRelevantToTP: 'Relevan dengan TP Menghargai Keragaman Makanan Tradisional dan TP Koordinasi Bilateral Jemari.',
        provocationQuestions: [
          'Bagaimana tekstur adonan tepung ini berubah saat kita tambahkan sedikit demi sedikit air pandan?',
          'Mengapa kita harus menutup adonan klepon ini rapat-rapat setelah diisi gula aren?',
          'Dari mana warna hijau wangi pada kue klepon ini berasal?',
        ],
        primaryMaterials: ['Tepung ketan alami', 'Air perasan daun pandan dan suji', 'Gula aren/gula kelapa serut', 'Parutan kelapa kukus bersih'],
        localLooseParts: ['Nampan daun pisang', 'Baskom adonan'],
        materialAlternatives: [
          { main: 'Pewarna hijau sintetis botolan', alternative: 'Air perasan daun pandan asli pekarangan sekolah', reason: 'Memberikan aroma harum alami dan mengajarkan anak sumber makanan sehat.' },
        ],
        tarlAdjustments: {
          perluDukungan: 'Anak meremas adonan kalis dan menggulung 2 bola klepon dengan bantuan guru.',
          berkembang: 'Anak mandiri membuat cekungan pada bola adonan, mengisi sejumput gula aren, dan membulatkannya rapat.',
          pengayaan: 'Anak terampil membuat 5 klepon bulat sempurna tanpa bocor dan membantu menata di atas tampah beralas daun pisang.',
        },
        observableIndicators: [
          {
            aspect: 'MOTORIK_HALUS',
            aspectLabel: 'Motorik Halus',
            observableBehavior: 'Menyelaraskan koordinasi kedua telapak tangan dalam membulatkan adonan dan menutup cekungan dengan presisi jempol.',
            rubric: {
              BB: 'Adonan hancur atau gula tumpah keluar tanpa tertutup.',
              MB: 'Membulatkan adonan dengan bantuan bimbingan guru.',
              BSH: 'Mandiri membulatkan, melubangi, mengisi, dan menutup adonan klepon hingga rapi.',
              BSB: 'Sangat terampil menghasilkan ukuran klepon yang konsisten, bersih, dan menghargai proses memasak tradisional.',
            },
          },
        ],
        documentationFocus: 'Foto jemari mungil anak yang sedang membulatkan adonan hijau beraroma pandan di telapak tangannya.',
      },
    ];
  }

  // 9. DYNAMIC CONTEXTUAL ACTIVITIES FALLBACK (Organic Theme-Subtheme Adaptation)
  return buildDynamicContextualActivities(themeName, subthemeName, isKelompokA, selectedCpIds, selectedTpIds);
}

/**
 * Fallback generator dinamis yang menghasilkan kegiatan kontekstual berkualitas tinggi
 * berbasis nama tema dan subtema pengguna secara organik jika tidak cocok dengan preset statis mana pun.
 */
function buildDynamicContextualActivities(
  themeName: string,
  subthemeName: string,
  isKelompokA: boolean,
  _selectedCpIds: string[],
  _selectedTpIds: string[]
): ThematicCuratedActivity[] {
  const displayTheme = themeName || 'Lingkungan Belajar';
  const displaySubtheme = subthemeName || 'Eksplorasi Lingkungan Bermakna';

  return [
    {
      id: `act-dyn-01-${Date.now()}`,
      title: `Panggung Cerita & Dialog Interaktif: Kisah Sahabat ${displaySubtheme}`,
      modality: 'Bercerita & Percakapan Bermakna',
      duration: isKelompokA ? '35 - 40 Menit' : '40 - 45 Menit',
      description: `Anak menyimak dongeng interaktif bergambar dan wayang kardus tentang ${displaySubtheme}, berdialog lisan, menanggapi karakter, dan menceritakan kembali pesan kebaikan dengan kata-kata sendiri.`,
      literacyIntegration: 'Menyimak cerita interaktif bergambar, berdialog lisan santun, memperkaya kosakata tematik, dan menceritakan kembali gagasan tanpa lembar kerja hafalan.',
      steps: [
        `Pijakan Cerita: Guru membacakan kisah bergambar bermakna tentang ${displaySubtheme} dalam lingkaran hangat.`,
        `Dialog Interaktif: Anak bergantian menanggapi jalan cerita dan menggunakan wayang kardus karakter untuk mengekspresikan gagasannya.`,
        `Bermain Kata: Mengenal 2-3 kosa kata tematik baru yang berkesan dalam cerita (misal: bertunas, sejuk, merawat).`,
        `Refleksi & Pesan Moral: Berbincang santai tentang hikmah kisah dan rasa syukur atas ciptaan Tuhan.`,
      ],
      pedagogicalRationale: `Menumbuhkan kecintaan membaca sejak dini (early literacy), kemampuan narasi lisan, empati karakter, dan pemahaman konsep secara kontekstual.`,
      whyRelevantToTP: `Relevan dengan Capaian Pembelajaran Dasar Literasi dan Capaian Nilai Agama & Budi Pekerti secara holistik.`,
      provocationQuestions: [
        `Bagaimana perasaan tokoh dalam ceritamu saat berada di dekat ${displaySubtheme}?`,
        `Kata-kata baik apa yang ingin kamu sampaikan jika kamu menjadi sahabatnya?`,
        `Bagian cerita mana yang paling ingin kamu ceritakan kembali kepada orang tuamu di rumah?`,
      ],
      primaryMaterials: ['Buku cerita bergambar anak', 'Wayang kardus karakter tokoh', 'Kain panggung sederhana', 'Bantal duduk melingkar'],
      localLooseParts: ['Dedaunan aneka bentuk', 'Batu pipih karakter', 'Ranting penopang wayang'],
      materialAlternatives: [
        { main: 'Lembar kerja mewarnai huruf mekanik', alternative: 'Wayang cerita kardus dan buku bergambar interaktif', reason: 'Menstimulasi literasi naratif alami tanpa drilling atau hafalan kaku.' },
      ],
      tarlAdjustments: {
        perluDukungan: 'Anak menunjuk gambar tokoh yang disukai dan menirukan 1 dialog pendek bersama guru.',
        berkembang: 'Anak mandiri menceritakan kembali tokoh utama dan menjawab pertanyaan terbuka.',
        pengayaan: 'Anak menciptakan kelanjutan akhir cerita menggunakan imajinasi dan bahasa santunnya sendiri.',
      },
      observableIndicators: [
        {
          aspect: 'LITERASI_STEAM',
          aspectLabel: 'Dasar Literasi & STEAM',
          observableBehavior: `Mampu menyimak cerita interaktif, berdialog aktif, dan mengutarakan kembali gagasan dengan kosa kata santun.`,
          rubric: {
            BB: 'Belum fokus menyimak cerita atau malu bersuara.',
            MB: 'Merespons cerita dan menjawab pertanyaan tertutup setelah dimotivasi guru.',
            BSH: 'Mandiri menceritakan kembali inti cerita dan berdialog antusias.',
            BSB: 'Kritis menghubungkan pesan cerita dengan pengalaman sehari-harinya dan berbahasa santun.',
          },
        },
      ],
      documentationFocus: `Foto saat anak antusias merespons dialog cerita menggunakan wayang karakter.`,
    },
    {
      id: `act-dyn-02-${Date.now()}`,
      title: `Studio Rekayasa & Konstruksi Loose Parts: Merancang ${displaySubtheme}`,
      modality: 'Konstruksi Loose Parts',
      duration: isKelompokA ? '40 - 45 Menit' : '50 - 60 Menit',
      description: `Anak memanfaatkan aneka material lepas (loose parts) ramah lingkungan seperti kardus, batu kali, ranting, dan tutup botol untuk merekayasa miniatur karya tiga dimensi yang merepresentasikan ${displaySubtheme}.`,
      literacyIntegration: 'Menceritakan fungsi bagian bangunannya secara lisan, menggunakan konsep posisi spasial (di atas, di dalam, di samping), dan menyematkan label nama karya.',
      steps: [
        `Tantangan Rekayasa: Mengamati gambar atau benda nyata ${displaySubtheme}: "Bagaimana kita bisa membuat bentuknya menggunakan bahan-bahan ini?".`,
        `Pemilihan Material: Anak bebas memilih bahan loose parts yang sesuai dengan ide rancangannya.`,
        `Penyusunan Struktur: Merangkai, menumpuk, dan menyeimbangkan material tanpa bantuan lem kimia beracun.`,
        `Apresiasi Karya Teman: Melakukan tur karya di atas meja, saling memberikan apresiasi positif dan menceritakan fungsi bagian bangunannya.`,
      ],
      pedagogicalRationale: `Menumbuhkan kemampuan pemecahan masalah spasial (spatial problem-solving), daya rekayasa teknik (engineering design process), dan kelenturan daya cipta.`,
      whyRelevantToTP: `Relevan dengan TP Menghasilkan Karya Rekayasa Konstruksi dan TP Kerja Sama Antar Teman.`,
      provocationQuestions: [
        `Bagaimana caramu menyusun material ini agar struktur karyamu tetap kokoh dan tidak mudah runtuh?`,
        `Jika kamu ingin menambahkan detail yang lebih tinggi, bahan loose parts apa yang paling pas untuk dipasang?`,
        `Apa fungsi dari bagian yang sedang kamu rakit ini untuk mendukung ${displaySubtheme}?`,
      ],
      primaryMaterials: ['Kardus bekas bersih aneka bentuk', 'Tutup botol plastik aneka warna', 'Ranting pohon lentur dan kokoh', 'Batu kali halus'],
      localLooseParts: ['Tabung tisu karton', 'Kepingan kayu halus', 'Daun kering', 'Tali rami'],
      materialAlternatives: [
        { main: 'Mainan balok plastik pabrikan seragam', alternative: 'Kombinasi kardus daur ulang dan bahan alam sekitar sekolah', reason: 'Memberikan keanekaragaman bentuk tak berhingga yang menantang kreativitas murni anak.' },
      ],
      tarlAdjustments: {
        perluDukungan: 'Anak menumpuk 3 balok kardus/batu dengan stabil dibimbing guru.',
        berkembang: 'Anak mandiri menggabungkan minimal 2 jenis loose parts membentuk miniatur yang kokoh.',
        pengayaan: 'Anak merancang konstruksi multi-elemen yang kompleks, seimbang, dan mampu mempresentasikan cara kerjanya secara logis.',
      },
      observableIndicators: [
        {
          aspect: 'LITERASI_STEAM',
          aspectLabel: 'Dasar Literasi & STEAM',
          observableBehavior: 'Merancang karya tiga dimensi dengan mempertimbangkan keseimbangan, bentuk geometri, dan pemanfaatan bahan secara kreatif.',
          rubric: {
            BB: 'Menjatuhkan material tanpa mencoba menyusunnya.',
            MB: 'Menyusun material setelah dicontohkan posisi seimbangnya oleh guru.',
            BSH: 'Mandiri menyusun konstruksi stabil dengan ide rancangannya sendiri.',
            BSB: 'Sangat kreatif memadukan aneka tekstur loose parts untuk fungsi struktural yang kokoh dan memiliki nilai estetika tinggi.',
          },
        },
      ],
      documentationFocus: `Foto saat anak menempatkan elemen penyeimbang pada puncak konstruksi ${displaySubtheme} buatannya.`,
    },
    {
      id: `act-dyn-03-${Date.now()}`,
      title: `Panggung Peran & Karakter Kolaboratif: Kisah ${displaySubtheme}`,
      modality: 'Bermain Peran & Budaya',
      duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
      description: `Anak bermain peran interaktif bersama teman sesuai konteks ${displaySubtheme}, berbagi tugas dengan santun, mengekspresikan empati sosial, dan menyelesaikan skenario bermain bersama.`,
      literacyIntegration: 'Berdialog aktif antar teman sebaya, menyampaikan ide peran secara santun, merespons dialog teman, dan negosiasi sosial positif.',
      steps: [
        `Penyulut Cerita: Guru memperkenalkan situasi bermain peran yang terkait erat dengan ${displaySubtheme}.`,
        `Pembagian Karakter/Media: Anak bermusyawarah memilih peran dan menyiapkan perlengkapan bermain sederhana menggunakan kain perca atau daun.`,
        `Aksi Kolaboratif: Anak memperagakan dialog santun dan berinteraksi spontan bersama kelompoknya.`,
        `Pesan Moral & Refleksi: Menarik hikmah tentang tolong-menolong, saling menghargai teman, dan merapikan ruang main bersama.`,
      ],
      pedagogicalRationale: `Mengembangkan kecerdasan sosio-emosional, keterampilan berbahasa naratif (narrative literacy), dan kepekaan rasa empati sosial.`,
      whyRelevantToTP: `Relevan dengan TP Menunjukkan Sikap Empati, Kerja Sama Kolaboratif, dan Berkomunikasi Santun.`,
      provocationQuestions: [
        `Bagaimana perasaan tokoh yang kamu perankan saat berinteraksi dengan tokoh temanmu?`,
        `Kata-kata baik apa yang bisa kita ucapkan saat mengajak teman bekerja sama dalam peran ini?`,
        `Bagaimana caramu dan temanmu saling membantu menyelesaikan masalah dalam cerita tadi?`,
      ],
      primaryMaterials: ['Kain perca aneka warna', 'Wayang kardus / topeng buatan anak', 'Aksesoris loose parts peran', 'Keranjang jinjing'],
      localLooseParts: ['Batang serai/pandan harum', 'Tutup botol sebagai koin mainan', 'Ranting penunjuk arah'],
      materialAlternatives: [
        { main: 'Kostum pabrikan sintetis sewa mahal', alternative: 'Kain perca selendang dan aksesori daun buatan anak sendiri', reason: 'Melatih kebanggaan berkarya dan menumbuhkan daya imajinasi murni tanpa konsumerisme.' },
      ],
      tarlAdjustments: {
        perluDukungan: 'Anak memeragakan dialog 1-2 kata singkat atau gerakan tubuh sederhana dengan dorongan hangat guru.',
        berkembang: 'Anak mandiri berdialog singkat dalam skenario bermain peran bersama teman.',
        pengayaan: 'Anak memimpin adegan cerita, berimprovisasi dengan kosakata kaya, dan membantu teman menyelesaikan perannya.',
      },
      observableIndicators: [
        {
          aspect: 'JATI_DIRI',
          aspectLabel: 'Jati Diri',
          observableBehavior: 'Percaya diri mengekspresikan emosi, ide, dan berdialog santun dalam suasana kolaboratif yang menghargai teman.',
          rubric: {
            BB: 'Malu atau menolak ikut serta dalam kegiatan bermain peran.',
            MB: 'Berpartisipasi aktif setelah diajak dan ditemani teman karibnya.',
            BSH: 'Mandiri mengekspresikan peran dan berdialog santun bersama teman.',
            BSB: 'Menunjukkan inisiatif tinggi, mampu mengorganisir peran bersama teman secara hangat, dan bertutur kata santun.',
          },
        },
      ],
      documentationFocus: `Foto saat anak berpose memeragakan tokoh atau berdialog santun dalam bermain peran ${displaySubtheme}.`,
    },
    {
      id: `act-dyn-04-${Date.now()}`,
      title: `Galeri Seni Rupa & Kolase Pigmen Alami: Pesona ${displaySubtheme}`,
      modality: 'Seni Rupa & Kreasi Alami',
      duration: isKelompokA ? '35 - 40 Menit' : '45 - 50 Menit',
      description: `Anak mengekspresikan rasa keindahan tentang ${displaySubtheme} melalui kolase daun gugur, sapuan warna dari bahan alam (kunyit, arang, suji), menyematkan simbol nama karya, dan mempresentasikannya.`,
      literacyIntegration: 'Membuat simbol atau tulisan nama karya secara mandiri dan menceritakan makna estetika karyanya kepada guru dan teman.',
      steps: [
        `Apresiasi Awal: Mengamati keanekaragaman bentuk dan warna alami yang berhubungan dengan ${displaySubtheme}.`,
        `Eksplorasi Media: Meracik pigmen warna alami dan menata komposisi daun gugur di atas bidang kertas tebal.`,
        `Kreasi Kolase & Lukis: Mengekspresikan imajinasi bebas memadukan tekstur bahan alam menjadi karya seni unik.`,
        `Pameran Mini: Memberi judul pada karya dan menceritakan bagian mana yang paling disukai.`,
      ],
      pedagogicalRationale: `Menumbuhkan kepekaan estetika, motorik halus, apresiasi terhadap keindahan ciptaan Tuhan, dan ekspresi simbolik alami tanpa lembar kerja hafalan.`,
      whyRelevantToTP: `Relevan dengan TP Mengekspresikan Diri Melalui Ragam Karya Seni dan Menghargai Karya Teman.`,
      provocationQuestions: [
        `Judul cerita indah apa yang ingin kamu berikan pada karya senimu hari ini?`,
        `Bagian mana dari perpaduan warna dan bahan alam ini yang paling membuatmu kagum?`,
        `Ceritakan pesan apa yang ingin kamu sampaikan melalui lukisan dan kolase ini?`,
      ],
      primaryMaterials: ['Kertas gambar tebal daur ulang', 'Dedaunan gugur aneka bentuk', 'Pewarna alami (kunyit, arang, daun suji)', 'Lem kanji ramah anak'],
      localLooseParts: ['Kelopak bunga gugur', 'Biji-bijian lokal', 'Kuas ranting alami'],
      materialAlternatives: [
        { main: 'Kertas mewarnai pabrik yang membatasi imajinasi', alternative: 'Kanvas kertas daur ulang dan pewarna alami', reason: 'Melatih orisinalitas ekspresi seni dan kepedulian lingkungan.' },
      ],
      tarlAdjustments: {
        perluDukungan: 'Anak menempelkan 2 helai daun dan membuat cap warna dengan bimbingan lembut.',
        berkembang: 'Anak mandiri menyusun kolase bahan alam dengan perpaduan warna kontras yang rapi.',
        pengayaan: 'Anak merancang komposisi visual detail, memberi judul mandiri, dan mempresentasikan nilai seninya.',
      },
      observableIndicators: [
        {
          aspect: 'LITERASI_STEAM',
          aspectLabel: 'Dasar Literasi & STEAM',
          observableBehavior: 'Mampu mengekspresikan ide melalui eksplorasi media seni alami dan menceritakan makna karyanya secara percaya diri.',
          rubric: {
            BB: 'Belum mau mencoba menempel bahan atau memegang kuas alami.',
            MB: 'Membuat karya setelah diarahkan dan dicontohkan guru.',
            BSH: 'Mandiri merancang karya seni alami dan memberi judul karyanya.',
            BSB: 'Sangat kreatif memadukan tekstur bahan alam, orisinal, dan memaparkan makna karya secara ekspresif.',
          },
        },
      ],
      documentationFocus: `Foto karya seni kolase alami anak dan ekspresi gembiranya saat memamerkan karya ${displaySubtheme}.`,
    },
  ];
}
