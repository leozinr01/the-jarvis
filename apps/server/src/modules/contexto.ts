import type { BuscaPort } from '../busca/tavily';
import type { GeminiCliente, MensagemHistorico } from '../gemini/cliente';

export interface ContextoPedido {
  gemini: GeminiCliente;
  buscar: BuscaPort;
  tratamento: string;
  historico: MensagemHistorico[];
  texto: string;
  signal: AbortSignal;
  avisar(texto: string): void;
}

export function regraTratamento(tratamento: string): string {
  return `Trate o usuário sempre como "${tratamento}", quando for natural. Use exatamente essa forma, com a concordância correspondente, e nunca deduza o gênero pelo nome ou por outra pista.`;
}
