export interface Viewport {
  width: number;
  height: number;
}

export interface Slot {
  x: number;
  y: number;
}

export interface RailLayout {
  railWidth: number;
  columns: number;
  cardWidth: number;
}

export const CARD_HEIGHT = 72;
export const CARD_GAP = 8;
const MARGIN = 10;
const TOP_OFFSET = 60; // abaixo da barra superior

export function getRailLayout(width: number): RailLayout {
  const columns = width >= 2400 ? 2 : 1;
  const cardWidth = width >= 1700 ? 220 : width >= 1200 ? 164 : 132;
  return {
    columns,
    cardWidth,
    railWidth: MARGIN * 2 + columns * cardWidth + (columns - 1) * CARD_GAP,
  };
}

/** Posições das bordas, dos cantos para o meio; a ordem é a de chegada dos cards. */
export function getCardSlots({ width, height }: Viewport): Slot[] {
  const { columns, cardWidth } = getRailLayout(width);
  const usable = height - TOP_OFFSET - MARGIN + CARD_GAP;
  const rows = Math.max(1, Math.floor(usable / (CARD_HEIGHT + CARD_GAP)));
  const topRows = Math.ceil(rows / 2);
  const bottomRows = rows - topRows;
  const slots: Slot[] = [];

  for (let col = 0; col < columns; col++) {
    const inset = MARGIN + col * (cardWidth + CARD_GAP);
    const left = inset;
    const right = width - inset - cardWidth;
    for (let depth = 0; depth < topRows; depth++) {
      const top = TOP_OFFSET + depth * (CARD_HEIGHT + CARD_GAP);
      const bottom = height - MARGIN - CARD_HEIGHT - depth * (CARD_HEIGHT + CARD_GAP);
      slots.push({ x: left, y: top }, { x: right, y: top });
      if (depth < bottomRows) slots.push({ x: left, y: bottom }, { x: right, y: bottom });
    }
  }
  return slots;
}
