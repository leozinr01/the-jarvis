import type { CodigoErro } from '@jarvis/shared';

const MENSAGENS: Record<CodigoErro, string> = {
  chave: 'A chave do Gemini está ausente ou é inválida. Confira o GEMINI_API_KEY no arquivo .env.',
  limite: 'Nenhum modelo da lista tem cota disponível agora.',
  busca_chave: 'A chave da Tavily está ausente ou é inválida. Confira o TAVILY_API_KEY no arquivo .env.',
  busca_limite: 'O limite de pesquisas da Tavily foi atingido. Não respondo de memória, porque toda pesquisa precisa de fontes reais.',
  busca_falhou: 'A pesquisa na web falhou. Não respondo de memória, porque toda pesquisa precisa de fontes reais.',
  indisponivel: 'Os modelos da lista estão sobrecarregados no momento. Tente de novo em instantes.',
  tempo: 'Os modelos demoraram demais para responder. Tente de novo em instantes.',
  sem_internet: 'Não consegui falar com o Gemini. Verifique a internet.',
  interno: 'Algo deu errado ao processar o pedido. Tente de novo.',
};

export class GeminiErro extends Error {
  constructor(
    readonly codigo: CodigoErro,
    detalhe?: string,
  ) {
    super(detalhe ? `${MENSAGENS[codigo]} ${detalhe}` : MENSAGENS[codigo]);
    this.name = 'GeminiErro';
  }
}

export function classificarErro(erro: unknown, estourouTempo: boolean): CodigoErro {
  if (erro instanceof GeminiErro) return erro.codigo;
  if (estourouTempo) return 'tempo';
  const status = statusDoErro(erro);
  if (status === undefined) return 'sem_internet';
  if (status === 401 || status === 403) return 'chave';
  if (status === 429) return 'limite';
  if (status >= 500) return 'indisponivel';
  return 'interno';
}

export function statusDoErro(erro: unknown): number | undefined {
  const status = (erro as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}
