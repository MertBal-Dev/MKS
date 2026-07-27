import { describe, expect, it } from 'vitest';
import { gunKarti, sinavKarti, type SinavBaglami } from './motivasyon';

const temel: SinavBaglami = {
  puan: 0,
  dogru: 0,
  yanlis: 0,
  bos: 0,
  baraj: 70,
  tur: 'deneme',
  enIyiMi: false,
};

describe('gunKarti', () => {
  it('aynı gün aynı başlığı verir', () => {
    const ctx = { tarih: '2026-07-27', seri: 3, kalanGun: 33, planYuzde: 12 };
    expect(gunKarti(ctx).baslik).toBe(gunKarti(ctx).baslik);
  });

  it('seri uzadıkça metin değişir ve seriyi anar', () => {
    const yap = (seri: number) => gunKarti({ tarih: '2026-07-27', seri, kalanGun: 33, planYuzde: 12 }).metin;
    expect(yap(1)).not.toBe(yap(5));
    expect(yap(9)).toContain('9');
    expect(yap(20)).toContain('20');
  });

  it('kalan gün ve plan yüzdesini alt bilgide gösterir', () => {
    const kart = gunKarti({ tarih: '2026-07-27', seri: 1, kalanGun: 33, planYuzde: 40 });
    expect(kart.altBilgi).toContain('33');
    expect(kart.altBilgi).toContain('40');
  });
});

describe('sinavKarti', () => {
  it('baraj üstünü kutlar', () => {
    const kart = sinavKarti({ ...temel, puan: 78, dogru: 78, yanlis: 22 });
    expect(kart.ton).toBe('basari');
    expect(kart.baslik).toBe('Baraj aşıldı');
  });

  it('barajın hemen altında kalan farkı söyler', () => {
    const kart = sinavKarti({ ...temel, puan: 64, dogru: 64, yanlis: 36 });
    expect(kart.baslik).toBe('Barajın hemen altı');
    expect(kart.metin).toContain('6 puan');
  });

  it('düşük puanı güzellemez ama suçlamaz', () => {
    const kart = sinavKarti({ ...temel, puan: 22, dogru: 22, yanlis: 78 });
    expect(kart.ton).toBe('sakin');
    expect(kart.metin).toContain('Puan düşük');
    // Yönlendirme olmadan bırakmaz
    expect(kart.eylem?.href).toBeTruthy();
  });

  it('kişisel rekor barajdan önce gelir', () => {
    const kart = sinavKarti({ ...temel, puan: 55, dogru: 55, yanlis: 45, enIyiMi: true, oncekiEnIyi: 40 });
    expect(kart.baslik).toBe('Yeni rekor');
    expect(kart.metin).toContain('40');
  });

  it('rekor eşitlikte tetiklenmez', () => {
    const kart = sinavKarti({ ...temel, puan: 40, dogru: 40, yanlis: 60, enIyiMi: true, oncekiEnIyi: 40 });
    expect(kart.baslik).not.toBe('Yeni rekor');
  });

  it('mini testte sınav türünü doğru anar', () => {
    const kart = sinavKarti({ ...temel, puan: 60, dogru: 12, yanlis: 8, tur: 'mini', enIyiMi: true, oncekiEnIyi: 50 });
    expect(kart.metin).toContain('mini test');
  });

  it('hatasız denemede yanlış sayfasına yollamaz', () => {
    const kart = sinavKarti({ ...temel, puan: 100, dogru: 100, yanlis: 0, enIyiMi: true, oncekiEnIyi: 80 });
    expect(kart.eylem?.href).not.toContain('wrong');
  });

  it('boş bırakmaktan düşen puanı yanlışa yormaz', () => {
    const kart = sinavKarti({ ...temel, puan: 45, dogru: 45, yanlis: 0, bos: 55 });
    expect(kart.metin).toContain('boş bıraktıkların');
    expect(kart.metin).not.toContain('0 yanlışta');
  });

  it('her puan aralığı bir kart üretir', () => {
    for (const puan of [0, 15, 39, 40, 59, 60, 69, 70, 84, 85, 100]) {
      const kart = sinavKarti({ ...temel, puan, dogru: puan, yanlis: 100 - puan });
      expect(kart.baslik, `puan ${puan}`).toBeTruthy();
      expect(kart.metin.length, `puan ${puan}`).toBeGreaterThan(20);
    }
  });
});
