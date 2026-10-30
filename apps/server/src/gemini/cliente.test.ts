import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GeminiCliente, type ChamadaGemini, type GeminiPort } from './cliente';

const VALIDO = JSON.stringify({ ok: true });
const MODELOS = ['a', 'b', 'c'];
// Meio-dia em Brasília; a cota renova às 04:00 do dia seguinte.
const AGORA = Date.parse('2026-10-30T15:00:00Z');

function pedido(extra = {}) {
  return {
    raciocinio: 'low' as const,
    sistema: 's',
    mensagens: [],
    schema: {},
    validador: z.object({ ok: z.boolean() }),
    signal: new AbortController().signal,
    ...extra,
  };
}

const comStatus = (status: number) => Object.assign(new Error('x'), { status });

function falharEm(modelos: string[], erro: unknown): GeminiPort & ReturnType<typeof vi.fn> {
  return vi.fn(async (c: ChamadaGemini) => {
    if (modelos.includes(c.modelo)) throw erro;
    return VALIDO;
  });
}

const tentados = (porta: ReturnType<typeof vi.fn>) => porta.mock.calls.map(([c]) => (c as ChamadaGemini).modelo);
const cliente = (porta: GeminiPort, agora = () => AGORA, timeout = 1000) =>
  new GeminiCliente(porta, MODELOS, timeout, agora);

describe('ordem de preferência', () => {
  it('usa o primeiro quando ele responde', async () => {
    const porta = vi.fn(async () => VALIDO);
    await expect(cliente(porta).gerarJson(pedido())).resolves.toEqual({ ok: true });
    expect(tentados(porta)).toEqual(['a']);
  });

  it('percorre a lista na ordem configurada', async () => {
    const porta = falharEm(['a', 'b'], comStatus(429));
    await cliente(porta).gerarJson(pedido());
    expect(tentados(porta)).toEqual(['a', 'b', 'c']);
  });
});

describe('indisponibilidade até o dia seguinte', () => {
  it.each([
    [429, 'sem cota (429)'],
    [503, 'sobrecarga (503)'],
  ])('%i: mostra o motivo exato e o modelo, e pula até a cota renovar', async (status, motivo) => {
    let agora = AGORA;
    const porta = falharEm(['a'], comStatus(status));
    const c = cliente(porta, () => agora);
    const onAviso = vi.fn();
    await c.gerarJson(pedido({ onAviso }));
    expect(onAviso).toHaveBeenCalledWith(`a: ${motivo}, indisponível até 31/10, 04:00`);

    porta.mockClear();
    onAviso.mockClear();
    await c.gerarJson(pedido({ onAviso }));
    expect(tentados(porta)).toEqual(['b']);
    expect(onAviso).toHaveBeenCalledWith(`a: pulado, ${motivo} até 31/10, 04:00`);

    porta.mockClear();
    agora = Date.parse('2026-10-31T06:59:00Z');
    await c.gerarJson(pedido());
    expect(tentados(porta)).toEqual(['b']);

    porta.mockClear();
    agora = Date.parse('2026-10-31T07:01:00Z');
    await c.gerarJson(pedido());
    expect(tentados(porta)).toEqual(['a', 'b']);
  });

  it('tempo esgotado mostra o motivo e pausa só por alguns minutos', async () => {
    let agora = AGORA;
    const porta = vi.fn(
      (ch: ChamadaGemini) =>
        new Promise<string>((resolve, reject) => {
          if (ch.modelo !== 'a') return resolve(VALIDO);
          ch.signal.addEventListener('abort', () => reject(new Error('abortado')));
        }),
    );
    const c = new GeminiCliente(porta, MODELOS, 20, () => agora);
    const onAviso = vi.fn();
    await c.gerarJson(pedido({ onAviso }));
    expect(onAviso.mock.calls[0]![0]).toMatch(/^a: tempo esgotado \(0s\), indisponível até/);

    porta.mockClear();
    await c.gerarJson(pedido());
    expect(tentados(porta)).toEqual(['b']);

    porta.mockClear();
    agora += 5 * 60 * 1000 + 1;
    await c.gerarJson(pedido());
    expect(tentados(porta)[0]).toBe('a');
  });

  it('com todos indisponíveis, não gasta chamadas', async () => {
    const porta = falharEm(MODELOS, comStatus(429));
    const c = cliente(porta);
    await expect(c.gerarJson(pedido())).rejects.toMatchObject({ codigo: 'limite' });
    expect(porta).toHaveBeenCalledTimes(3);
    porta.mockClear();
    await expect(c.gerarJson(pedido())).rejects.toMatchObject({ codigo: 'limite' });
    expect(porta).not.toHaveBeenCalled();
  });

  it('a mensagem final lista cada modelo e motivo', async () => {
    let n = 0;
    const porta = vi.fn(async () => {
      throw comStatus([429, 503, 400][n++]!);
    });
    await expect(cliente(porta).gerarJson(pedido())).rejects.toThrow(
      'Tentativas: a: sem cota (429); b: sobrecarga (503); c: erro da API (400).',
    );
  });
});

describe('outros erros', () => {
  it('erro de requisição tenta o próximo sem bloquear', async () => {
    const porta = falharEm(['a'], comStatus(400));
    const c = cliente(porta);
    await c.gerarJson(pedido());
    porta.mockClear();
    await c.gerarJson(pedido());
    expect(tentados(porta)[0]).toBe('a');
  });

  it('chave inválida para na hora', async () => {
    const porta = falharEm(MODELOS, comStatus(401));
    await expect(cliente(porta).gerarJson(pedido())).rejects.toMatchObject({ codigo: 'chave' });
    expect(porta).toHaveBeenCalledTimes(1);
  });

  it('sem internet para na hora, sem bloquear modelos', async () => {
    const porta = falharEm(MODELOS, new TypeError('fetch failed'));
    await expect(cliente(porta).gerarJson(pedido())).rejects.toMatchObject({ codigo: 'sem_internet' });
    expect(porta).toHaveBeenCalledTimes(1);
  });

  it('JSON inválido ou fora do schema tenta o próximo', async () => {
    for (const ruim of ['não é json', '{"ok":"sim"}']) {
      const porta = vi.fn(async (c: ChamadaGemini) => (c.modelo === 'a' ? ruim : VALIDO));
      await expect(cliente(porta).gerarJson(pedido())).resolves.toEqual({ ok: true });
    }
  });

  it('cancelamento pela página não tenta o próximo', async () => {
    const controle = new AbortController();
    const porta = vi.fn(async () => {
      controle.abort();
      throw new Error('abortado');
    });
    await expect(cliente(porta).gerarJson(pedido({ signal: controle.signal }))).rejects.toBeDefined();
    expect(porta).toHaveBeenCalledTimes(1);
  });
});
