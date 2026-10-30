import type { ZodType } from 'zod';
import { proximaRenovacaoDeCota } from './cotaDiaria';
import { classificarErro, GeminiErro, statusDoErro } from './erros';

export interface MensagemHistorico {
  papel: 'usuario' | 'modelo';
  texto: string;
}

export type Raciocinio = 'minimal' | 'low' | 'medium' | 'high';

export interface ChamadaGemini {
  modelo: string;
  raciocinio: Raciocinio;
  sistema: string;
  mensagens: MensagemHistorico[];
  schema: object;
  signal: AbortSignal;
}

/** Porta para a API: permite testar a lógica sem chamadas reais. */
export type GeminiPort = (chamada: ChamadaGemini) => Promise<string>;

export interface PedidoJson<T> {
  raciocinio: Raciocinio;
  sistema: string;
  mensagens: MensagemHistorico[];
  schema: object;
  validador: ZodType<T>;
  signal: AbortSignal;
  onAviso?: (aviso: string) => void;
}

const PAUSA_CURTA_MS = 5 * 60 * 1000;

interface Bloqueio {
  ate: number;
  motivo: string;
}

export class GeminiCliente {
  private readonly bloqueios = new Map<string, Bloqueio>();

  constructor(
    private readonly port: GeminiPort,
    private readonly modelos: string[],
    private readonly timeoutMs: number,
    private readonly agora: () => number = Date.now,
  ) {}

  async gerarJson<T>(pedido: PedidoJson<T>): Promise<T> {
    const falhas: string[] = [];
    let ultimoCodigo: GeminiErro['codigo'] | undefined;

    for (const modelo of this.modelos) {
      const bloqueio = this.bloqueios.get(modelo);
      if (bloqueio && bloqueio.ate > this.agora()) {
        pedido.onAviso?.(`${modelo}: pulado, ${bloqueio.motivo} até ${formatarHorario(bloqueio.ate)}`);
        falhas.push(`${modelo}: ${bloqueio.motivo}`);
        ultimoCodigo ??= bloqueio.motivo.startsWith('sem cota') ? 'limite' : 'indisponivel';
        continue;
      }

      const tempo = AbortSignal.timeout(this.timeoutMs);
      try {
        const bruto = await this.port({
          modelo,
          raciocinio: pedido.raciocinio,
          sistema: pedido.sistema,
          mensagens: pedido.mensagens,
          schema: pedido.schema,
          signal: AbortSignal.any([pedido.signal, tempo]),
        });
        return converterJson(bruto, pedido.validador);
      } catch (erro) {
        if (pedido.signal.aborted) throw erro;
        const codigo = classificarErro(erro, tempo.aborted);
        if (codigo === 'chave' || codigo === 'sem_internet') throw new GeminiErro(codigo);

        const motivo = this.registrarFalha(modelo, erro, codigo);
        pedido.onAviso?.(`${modelo}: ${motivo}`);
        falhas.push(`${modelo}: ${motivo.split(', indisponível')[0]}`);
        ultimoCodigo = codigo;
      }
    }

    throw new GeminiErro(ultimoCodigo ?? 'interno', `Tentativas: ${falhas.join('; ')}.`);
  }

  /** Aplica a regra de indisponibilidade e devolve o motivo exato para o terminal. */
  private registrarFalha(modelo: string, erro: unknown, codigo: GeminiErro['codigo']): string {
    const status = statusDoErro(erro);

    if (codigo === 'tempo') {
      const motivo = `tempo esgotado (${Math.round(this.timeoutMs / 1000)}s)`;
      return this.bloquear(modelo, this.agora() + PAUSA_CURTA_MS, motivo);
    }
    if (status === 429) return this.bloquear(modelo, proximaRenovacaoDeCota(this.agora()), 'sem cota (429)');
    if (status === 503) return this.bloquear(modelo, proximaRenovacaoDeCota(this.agora()), 'sobrecarga (503)');
    if (status !== undefined) return `erro da API (${status})`;
    return erro instanceof GeminiErro ? erro.message : 'erro inesperado';
  }

  private bloquear(modelo: string, ate: number, motivo: string): string {
    this.bloqueios.set(modelo, { ate, motivo });
    return `${motivo}, indisponível até ${formatarHorario(ate)}`;
  }
}

function converterJson<T>(bruto: string, validador: ZodType<T>): T {
  try {
    return validador.parse(JSON.parse(bruto));
  } catch {
    throw new GeminiErro('interno', 'resposta fora do formato');
  }
}

function formatarHorario(instante: number): string {
  return new Date(instante).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
