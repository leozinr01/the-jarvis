const LIMITE = 100;

export function adicionarAoHistorico(itens: string[], pedido: string): string[] {
  if (itens.at(-1) === pedido) return itens;
  return [...itens, pedido].slice(-LIMITE);
}

/** Posição na navegação; `salvo` guarda o que estava sendo digitado antes de navegar. */
export interface Navegacao {
  indice: number;
  salvo: string;
}

export interface PassoHistorico {
  navegacao: Navegacao | null;
  texto: string;
}

/** Retorna null quando a tecla não tem efeito no histórico. */
export function navegarHistorico(
  itens: string[],
  navegacao: Navegacao | null,
  direcao: 'cima' | 'baixo',
  textoAtual: string,
): PassoHistorico | null {
  if (direcao === 'cima') {
    if (itens.length === 0) return null;
    const indice = navegacao ? Math.max(0, navegacao.indice - 1) : itens.length - 1;
    return { navegacao: { indice, salvo: navegacao?.salvo ?? textoAtual }, texto: itens[indice]! };
  }
  if (!navegacao) return null;
  const indice = navegacao.indice + 1;
  if (indice >= itens.length) return { navegacao: null, texto: navegacao.salvo };
  return { navegacao: { indice, salvo: navegacao.salvo }, texto: itens[indice]! };
}
