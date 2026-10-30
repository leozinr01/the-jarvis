/**
 * Próximo passo da digitação rumo ao alvo: avança uma letra quando o texto é prefixo do alvo.
 * Se a transcrição parcial for revisada, volta na hora até o trecho que ainda vale.
 */
export function nextTyped(atual: string, alvo: string): string {
  let comum = 0;
  while (comum < atual.length && comum < alvo.length && atual[comum] === alvo[comum]) comum++;
  if (comum < atual.length) return atual.slice(0, comum);
  return alvo.slice(0, comum + 1);
}
