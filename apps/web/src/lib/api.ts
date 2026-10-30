import type { EventoPedido, PedidoRequest } from '@jarvis/shared';

export class ApiErro extends Error {}

const SEM_SERVIDOR = 'Não consegui falar com o servidor do Jarvis. Confira se o npm run dev está rodando.';
const SEM_INTERNET = 'Sem conexão com a internet.';
const INTERROMPIDO = 'A resposta do servidor foi interrompida. Tente de novo.';

/** Separa os eventos SSE completos e devolve o que ainda falta chegar. */
export function extrairEventos(buffer: string): { eventos: EventoPedido[]; resto: string } {
  const blocos = buffer.split('\n\n');
  const resto = blocos.pop() ?? '';
  const eventos = blocos
    .filter((bloco) => bloco.startsWith('data: '))
    .map((bloco) => JSON.parse(bloco.slice('data: '.length)) as EventoPedido);
  return { eventos, resto };
}

export async function enviarPedidoApi(
  pedido: PedidoRequest,
  onEvento: (evento: EventoPedido) => void,
  signal: AbortSignal,
): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal,
    });
  } catch (erro) {
    if (signal.aborted) throw erro;
    throw new ApiErro(navigator.onLine ? SEM_SERVIDOR : SEM_INTERNET);
  }

  if (!resposta.ok || !resposta.body) {
    const corpo = (await resposta.json().catch(() => null)) as { mensagem?: string } | null;
    throw new ApiErro(corpo?.mensagem ?? SEM_SERVIDOR);
  }

  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let concluiu = false;
  try {
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      const { eventos, resto } = extrairEventos(buffer + value);
      buffer = resto;
      for (const evento of eventos) {
        if (evento.tipo === 'resposta' || evento.tipo === 'erro') concluiu = true;
        onEvento(evento);
      }
    }
  } catch (erro) {
    if (signal.aborted) throw erro;
    throw new ApiErro(INTERROMPIDO);
  }
  if (!concluiu) throw new ApiErro(INTERROMPIDO);
}
