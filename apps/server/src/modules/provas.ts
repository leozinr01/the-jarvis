import type { Fonte, Prova } from '@jarvis/shared';
import type { ResultadoBusca } from '../busca/tavily';

const MAX_PROVAS = 12;
const TAMANHO_MINIMO_CITACAO = 15;

export interface ProvaProposta {
  afirmacao: string;
  fonte: number;
  citacao: string;
}

/** Ignora só diferenças de apresentação: maiúsculas, aspas, travessões e espaços. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[​-‍﻿]/g, '')
    .replace(/[“”«»"]/g, '"')
    .replace(/[‘’']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function limparReticencias(citacao: string): string {
  return citacao.trim().replace(/^(\.\.\.|…)\s*/, '').replace(/\s*(\.\.\.|…)$/, '');
}

/**
 * O modelo pode inventar uma citação; por isso cada uma é conferida no texto que a busca devolveu.
 * A fonte vem da busca, por número: o modelo não tem como apresentar uma URL própria.
 */
export function verificarProvas(propostas: ProvaProposta[], resultados: ResultadoBusca[]): Prova[] {
  const provas: Prova[] = [];
  for (const proposta of propostas) {
    const resultado = resultados[proposta.fonte - 1];
    const citacao = limparReticencias(proposta.citacao);
    if (!resultado || citacao.length < TAMANHO_MINIMO_CITACAO) continue;
    if (!normalizar(resultado.conteudo).includes(normalizar(citacao))) continue;
    const repetida = provas.some((p) => p.afirmacao === proposta.afirmacao && p.fonte.url === resultado.url);
    if (repetida) continue;
    provas.push({
      afirmacao: proposta.afirmacao,
      trecho: citacao,
      fonte: { titulo: resultado.titulo, url: resultado.url },
    });
  }
  return provas.slice(0, MAX_PROVAS);
}

/** Só aparecem como fontes as páginas que sustentam alguma prova. */
export function fontesDasProvas(provas: Prova[]): Fonte[] {
  const porUrl = new Map<string, Fonte>();
  for (const { fonte } of provas) porUrl.set(fonte.url, fonte);
  return [...porUrl.values()];
}

function dominio(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * O modelo estima a certeza, mas o servidor impõe um teto pelo que dá para medir:
 * quantos sites diferentes sustentam a resposta e quantas citações foram confirmadas.
 */
export function limitarCerteza(estimada: number, fontes: Fonte[], confirmadas: number): number {
  if (fontes.length === 0) return 0;
  const dominios = new Set(fontes.map((f) => dominio(f.url))).size;
  const teto = dominios === 1 ? 60 : Math.min(95, 30 + 15 * dominios + 35 * confirmadas);
  return Math.round(Math.min(Math.max(0, estimada), teto));
}
