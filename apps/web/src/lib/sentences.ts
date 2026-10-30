const segmenter = new Intl.Segmenter('pt-BR', { granularity: 'sentence' });

export function splitSentences(texto: string): string[] {
  return Array.from(segmenter.segment(texto), ({ segment }) => segment).filter((s) => s.trim());
}
