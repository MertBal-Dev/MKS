import { describe, expect, it } from 'vitest';
import { wrongToCard } from './autoCards';
import type { Question } from './types';

const q: Question = {
  id: 'sanat-tarihi-004',
  topicId: 'sanat-tarihi',
  subtopic: 'Osmanlı mimarisi',
  difficulty: 2,
  stem: 'Selimiye Camii hangi şehirdedir?',
  choices: [
    { id: 'A', text: 'İstanbul', explanation: 'Süleymaniye İstanbul\'dadır; Selimiye değil.' },
    { id: 'B', text: 'Edirne', explanation: 'Doğru — Mimar Sinan\'ın "ustalık eserim" dediği Selimiye, Edirne\'dedir.' },
    { id: 'C', text: 'Bursa', explanation: 'Bursa\'da Ulu Cami ve Yeşil Cami vardır.' },
    { id: 'D', text: 'Konya', explanation: 'Konya Selimiye\'si küçük ve geç dönem bir camidir; sınavda kastedilen Edirne\'dir.' },
  ],
  correct: 'B',
};

describe('wrongToCard', () => {
  it('yanlış yapılan soruyu karta çevirir', () => {
    const card = wrongToCard(q);
    expect(card.id).toBe('q-sanat-tarihi-004');
    expect(card.front).toBe('Selimiye Camii hangi şehirdedir?');
    expect(card.back).toContain('Edirne');
    expect(card.back).toContain('ustalık eserim');
  });
});
