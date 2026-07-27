/**
 * Kutlama kartlarının içeriği.
 *
 * İki kural var. Birincisi: kart gerçek sayılara dayanır — "harikasın" demek
 * kolay ama boş; "üç gündür ara vermedin" bir şey söyler. İkincisi: düşük puan
 * güzellenmez. Kaygılı birine yalan söylemek onu sınav sabahı yalnız bırakır.
 */

export type MotivasyonTur = 'gun' | 'sinav';
export type MotivasyonTon = 'basari' | 'ilerleme' | 'sakin';

export interface MotivasyonKart {
  tur: MotivasyonTur;
  ton: MotivasyonTon;
  baslik: string;
  metin: string;
  altBilgi?: string;
  /** Kartın götürdüğü bir sonraki adım. */
  eylem?: { etiket: string; href: string };
}

/** Aynı tohum aynı başlığı verir — kart her render'da değişmesin diye. */
function tohumla(seed: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

const GUN_BASLIKLARI = [
  'Bugün tamam',
  'Liste bitti',
  'Günü kapattın',
  'Bugünün payı ödendi',
  'Bir gün daha yerine oturdu',
];

export interface GunBaglami {
  /** YYYY-MM-DD — başlık seçimini sabitler. */
  tarih: string;
  seri: number;
  kalanGun: number;
  planYuzde: number;
}

export function gunKarti(ctx: GunBaglami): MotivasyonKart {
  const { seri, kalanGun, planYuzde } = ctx;

  const metin =
    seri >= 14
      ? `${seri} gündür aksatmadın. Bu artık disiplin değil, alışkanlık — en zor kısmını geçtin.`
      : seri >= 7
        ? `${seri} gündür ara vermedin. Bir haftayı geçen her seri, kalan günleri hafifletir.`
        : seri >= 3
          ? `${seri} gündür üst üste çalışıyorsun. Fark tam olarak burada birikiyor.`
          : seri === 2
            ? 'İkinci gün. Seriler burada başlar; yarın gelirsen üçe çıkar.'
            : 'Bugünün hepsini bitirdin. Yarın da buradaysan bu bir seriye dönüşür.';

  return {
    tur: 'gun',
    ton: seri >= 7 ? 'basari' : 'ilerleme',
    baslik: GUN_BASLIKLARI[tohumla(ctx.tarih, GUN_BASLIKLARI.length)],
    metin,
    altBilgi: `Sınava ${kalanGun} gün • planın %${planYuzde}'i tamam`,
    eylem: { etiket: 'Yarının planına bak', href: '/plan' },
  };
}

export interface SinavBaglami {
  puan: number;
  dogru: number;
  yanlis: number;
  bos: number;
  baraj: number;
  /** Tam deneme mi, tek konuluk mini test mi, günün denemesi mi. */
  tur: 'deneme' | 'mini' | 'gunluk';
  /** Bu, o güne kadarki en yüksek puan mı. */
  enIyiMi: boolean;
  oncekiEnIyi?: number;
}

const TUR_ADI: Record<SinavBaglami['tur'], string> = {
  deneme: 'deneme',
  mini: 'mini test',
  gunluk: 'günün denemesi',
};

export function sinavKarti(ctx: SinavBaglami): MotivasyonKart {
  const { puan, dogru, yanlis, baraj, enIyiMi, oncekiEnIyi } = ctx;
  const ad = TUR_ADI[ctx.tur];
  const puanMetni = puan.toLocaleString('tr-TR');

  // Hatasız bir denemede "yanlışlarına bak" demek, olmayan bir işe yollamaktır.
  const yanlisaBak: MotivasyonKart['eylem'] =
    yanlis > 0
      ? { etiket: 'Yanlışlarına bak', href: '/cozduklerim?filter=wrong' }
      : { etiket: 'İstatistiğine bak', href: '/istatistik' };

  // Rekor her şeyin önüne geçer: kendi geçmişini yenmek, barajdan bağımsız
  // olarak ölçülebilir bir ilerleme.
  if (enIyiMi && oncekiEnIyi !== undefined && puan > oncekiEnIyi) {
    return {
      tur: 'sinav',
      ton: 'basari',
      baslik: 'Yeni rekor',
      metin: `${puanMetni} puan — önceki en iyin ${oncekiEnIyi.toLocaleString('tr-TR')} idi. Bu ${ad} bir öncekinden daha iyi gitti, tesadüf değil.`,
      altBilgi: `${dogru} doğru • ${yanlis} yanlış`,
      eylem: yanlisaBak,
    };
  }

  if (puan >= 85) {
    return {
      tur: 'sinav',
      ton: 'basari',
      baslik: 'Bu ciddi bir puan',
      metin: `${puanMetni} puan. Bu seviyede sınav günü sürpriz olmaz; tek işin bunu sınava kadar korumak.`,
      altBilgi: `${dogru} doğru • ${yanlis} yanlış`,
      eylem: { etiket: 'Konu kırılımını incele', href: '/istatistik' },
    };
  }

  if (puan >= baraj) {
    return {
      tur: 'sinav',
      ton: 'basari',
      baslik: 'Baraj aşıldı',
      metin: `${puanMetni} puan, baraj ${baraj}. Sınav bugün olsaydı geçiyordun. Şimdi payı büyütme zamanı.`,
      altBilgi: `${dogru} doğru • ${yanlis} yanlış`,
      eylem: yanlisaBak,
    };
  }

  if (puan >= baraj - 10) {
    const fark = Math.round(baraj - puan);
    return {
      tur: 'sinav',
      ton: 'ilerleme',
      baslik: 'Barajın hemen altı',
      metin: `${fark} puan kaldı. Bu mesafe yeni konu değil, yanlış havuzu işi — aynı hataları kapatmak yeter.`,
      altBilgi: `${dogru} doğru • ${yanlis} yanlış`,
      eylem: { etiket: 'Yanlış havuzunu aç', href: '/yanlis-havuzu' },
    };
  }

  if (puan >= 40) {
    return {
      tur: 'sinav',
      ton: 'ilerleme',
      baslik: 'Zemin oluşuyor',
      metin:
        yanlis > 0
          ? `${dogru} doğru yaptın. Asıl kazanç şu ${yanlis} yanlışta: çözümlerini okuduğunda bir daha aynı yerden kaybetmezsin.`
          : `${dogru} doğru yaptın ve hiç yanlışın yok — puanı düşüren boş bıraktıkların. Emin olmadığında da işaretle; yanlış, doğruyu götürmüyor.`,
      altBilgi: `${puanMetni} puan • baraj ${baraj}`,
      eylem: yanlisaBak,
    };
  }

  return {
    tur: 'sinav',
    ton: 'sakin',
    baslik: 'Şimdi asıl iş başlıyor',
    metin: `Puan düşük, ama bu bir kayıp değil: hangi konuların açık olduğunu tam olarak öğrendin. Konu kırılımında en alttakinden başla.`,
    altBilgi: `${puanMetni} puan • ${dogru} doğru`,
    eylem: { etiket: 'Konu kırılımını gör', href: '/istatistik' },
  };
}
