import type { Destaque } from '@jarvis/shared';

/** Acumula os destaques da conversa sem repetir um card que já está na tela. */
export function acumularDestaques(atuais: Destaque[], novos: Destaque[]): Destaque[] {
  const vistos = new Set(atuais.map((d) => d.titulo + d.valor));
  const resultado = [...atuais];
  for (const destaque of novos) {
    const chave = destaque.titulo + destaque.valor;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(destaque);
  }
  return resultado;
}
