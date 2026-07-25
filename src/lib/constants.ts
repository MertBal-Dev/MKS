export const EXAM_DATE = new Date('2026-08-29T10:00:00+03:00');
export const EXAM_NAME = 'MKS-4';
export const PASS_SCORE = 70;
export const EXAM_QUESTION_COUNT = 100;
export const EXAM_DURATION_MIN = 120;
export const STORAGE_KEY = 'mks:v1';

export const TOPIC_IDS = [
  'genel-turizm',
  'turizm-cografyasi',
  'genel-turk-tarihi',
  'osmanli-tarihi',
  'arkeoloji-mitoloji',
  'roma-yunan-bizans',
  'sanat-tarihi',
  'dinler-tarihi',
  'ilk-yardim',
  'anadolu-medeniyetleri',
  'halk-bilimi-edebiyat',
  'muzecilik',
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export interface TopicMeta {
  title: string;
  short: string;
  order: number;
  /**
   * Deneme sınavlarında bu konudan kaç soru gelir (toplam 100).
   * Kaynak: Bakanlığın açıkladığı 14 başlıklı resmi dağılım
   * (Genel Turizm 15 + İletişim-Etik 5 → genel-turizm 20;
   *  Tarih-Coğrafya 13 + Flora-Fauna 5 → turizm-cografyasi 18; ...).
   */
  examWeight: number;
}

export const TOPICS: Record<TopicId, TopicMeta> = {
  'genel-turizm': {
    title: 'Genel Turizm Bilgisi, Mevzuat ve Turizm Sosyolojisi',
    short: 'Genel Turizm',
    order: 1,
    examWeight: 20,
  },
  'turizm-cografyasi': {
    title: "Türkiye'nin Tarihi ve Turizm Coğrafyası",
    short: 'Turizm Coğrafyası',
    order: 2,
    examWeight: 18,
  },
  'genel-turk-tarihi': {
    title: 'Genel Türk Tarihi ve Kültürü',
    short: 'Türk Tarihi',
    order: 3,
    examWeight: 6,
  },
  'osmanli-tarihi': {
    title: 'Osmanlı İmparatorluğu Tarihi',
    short: 'Osmanlı',
    order: 4,
    examWeight: 4,
  },
  'arkeoloji-mitoloji': {
    title: 'Arkeoloji ve Mitoloji',
    short: 'Arkeoloji & Mitoloji',
    order: 5,
    examWeight: 6,
  },
  'roma-yunan-bizans': {
    title: 'Roma, Yunan ve Bizans Tarihi',
    short: 'Roma-Yunan-Bizans',
    order: 6,
    examWeight: 8,
  },
  'sanat-tarihi': {
    title: 'Genel Sanat Tarihi',
    short: 'Sanat Tarihi',
    order: 7,
    examWeight: 6,
  },
  'dinler-tarihi': {
    title: 'Dinler Tarihi',
    short: 'Dinler Tarihi',
    order: 8,
    examWeight: 4,
  },
  'ilk-yardim': {
    title: 'Genel Sağlık Bilgisi ve İlk Yardım',
    short: 'İlk Yardım',
    order: 9,
    examWeight: 5,
  },
  'anadolu-medeniyetleri': {
    title: 'Anadolu Medeniyetleri Tarihi',
    short: 'Anadolu Medeniyetleri',
    order: 10,
    examWeight: 12,
  },
  'halk-bilimi-edebiyat': {
    title: 'Türk Halk Bilimi, Dili ve Edebiyatı',
    short: 'Halk Bilimi & Edebiyat',
    order: 11,
    examWeight: 6,
  },
  muzecilik: {
    title: 'Müzecilik, Eser Kaçakçılığı ve Koruma',
    short: 'Müzecilik',
    order: 12,
    examWeight: 5,
  },
};
