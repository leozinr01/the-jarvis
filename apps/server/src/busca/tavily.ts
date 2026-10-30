import { isSafeHttpUrl } from '@jarvis/shared/url';
import { z } from 'zod';
import { GeminiErro } from '../gemini/erros';

export interface ResultadoBusca {
  titulo: string;
  url: string;
  conteudo: string;
}

/** Porta para a busca: permite testar sem gastar créditos. */
export type BuscaPort = (consulta: string, signal: AbortSignal) => Promise<ResultadoBusca[]>;

const URL_TAVILY = 'https://api.tavily.com/search';
const TIMEOUT_MS = 15000;
const MAX_RESULTADOS = 6;
const MAX_CONSULTA = 400;

const RespostaTavilySchema = z.object({
  results: z.array(z.object({ title: z.string().nullish(), url: z.string(), content: z.string().nullish() })),
});

function erroPorStatus(status: number): GeminiErro {
  if (status === 401) return new GeminiErro('busca_chave');
  if (status === 429) return new GeminiErro('busca_limite', 'Tavily: muitas requisições (429).');
  if (status === 432 || status === 433) return new GeminiErro('busca_limite', `Tavily: limite do plano (${status}).`);
  return new GeminiErro('busca_falhou', `Tavily: erro ${status}.`);
}

export function criarBuscaTavily(apiKey: string, requisitar: typeof fetch = fetch): BuscaPort {
  return async (consulta, signal) => {
    if (!apiKey) throw new GeminiErro('busca_chave');

    const tempo = AbortSignal.timeout(TIMEOUT_MS);
    let resposta: Response;
    try {
      resposta = await requisitar(URL_TAVILY, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: consulta.slice(0, MAX_CONSULTA),
          search_depth: 'basic',
          max_results: MAX_RESULTADOS,
        }),
        signal: AbortSignal.any([signal, tempo]),
      });
    } catch (erro) {
      if (signal.aborted) throw erro;
      throw new GeminiErro(
        'busca_falhou',
        tempo.aborted ? 'Tavily: tempo esgotado (15s).' : 'Tavily: sem conexão.',
      );
    }

    if (!resposta.ok) throw erroPorStatus(resposta.status);

    const corpo = RespostaTavilySchema.safeParse(await resposta.json().catch(() => null));
    if (!corpo.success) throw new GeminiErro('busca_falhou', 'Tavily: resposta inesperada.');

    const porUrl = new Map<string, ResultadoBusca>();
    for (const r of corpo.data.results) {
      if (!isSafeHttpUrl(r.url) || !r.content?.trim() || porUrl.has(r.url)) continue;
      porUrl.set(r.url, { titulo: r.title?.trim() || new URL(r.url).hostname, url: r.url, conteudo: r.content });
    }
    return [...porUrl.values()];
  };
}
