import { describe, expect, it } from 'vitest';
import { CARD_GAP, CARD_HEIGHT, getCardSlots, getRailLayout } from './cardSlots';

const TELAS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 3440, height: 1440 },
];

describe.each(TELAS)('getCardSlots em $width x $height', (tela) => {
  const { cardWidth, railWidth } = getRailLayout(tela.width);
  const slots = getCardSlots(tela);

  it('fica dentro da tela e não sobrepõe cards', () => {
    slots.forEach((a, i) => {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + cardWidth).toBeLessThanOrEqual(tela.width);
      expect(a.y + CARD_HEIGHT).toBeLessThanOrEqual(tela.height);
      slots.slice(i + 1).forEach((b) => {
        const separados =
          Math.abs(a.x - b.x) >= cardWidth || Math.abs(a.y - b.y) >= CARD_HEIGHT + CARD_GAP;
        expect(separados).toBe(true);
      });
    });
  });

  it('fica só nas laterais reservadas', () => {
    slots.forEach(({ x }) => {
      const naEsquerda = x + cardWidth <= railWidth;
      const naDireita = x >= tela.width - railWidth;
      expect(naEsquerda || naDireita).toBe(true);
    });
  });

  it('começa pelos quatro cantos', () => {
    expect(slots.slice(0, 4).map((s) => s.x)).toEqual([
      slots[0]!.x,
      tela.width - slots[0]!.x - cardWidth,
      slots[0]!.x,
      tela.width - slots[0]!.x - cardWidth,
    ]);
    expect(slots[2]!.y).toBeGreaterThan(slots[0]!.y);
  });
});

it('usa duas colunas em ultrawide', () => {
  expect(getRailLayout(3440).columns).toBe(2);
  expect(getRailLayout(1366).columns).toBe(1);
});
