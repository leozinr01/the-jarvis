import { describe, expect, it, vi } from 'vitest';
import { criarBuscaTavily } from './tavily';

const signal = new AbortController().signal;
const responder = (corpo: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;

describe('criarBuscaTavily', () => {
  it('envia a consulta com a chave no cabeçalho, e não no corpo', async () => {
    const req = responder({ results: [] });
    await criarBuscaTavily('tvly-segredo', req)('petrobras', signal);
    const [url, opcoes] = (req as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.tavily.com/search');
    expect((opcoes.headers as Record<string, string>).Authorization).toBe('Bearer tvly-segredo');
    expect(opcoes.body).not.toContain('tvly-segredo');
    expect(JSON.parse(opcoes.body as string)).toMatchObject({ query: 'petrobras', search_depth: 'basic' });
  });

  it('limita o tamanho da consulta', async () => {
    const req = responder({ results: [] });
    await criarBuscaTavily('k', req)('x'.repeat(900), signal);
    const [, opcoes] = (req as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opcoes.body as string).query).toHaveLength(400);
  });

  it('normaliza resultados, descartando inseguros, vazios e repetidos', async () => {
    const req = responder({
      results: [
        { title: 'A', url: 'https://a.com', content: 'texto a', score: 0.9 },
        { title: 'A de novo', url: 'https://a.com', content: 'texto', score: 0.8 },
        { title: 'Mal', url: 'javascript:alert(1)', content: 'x' },
        { title: 'Vazio', url: 'https://v.com', content: '  ' },
        { title: null, url: 'https://www.b.org/x', content: 'texto b' },
      ],
    });
    await expect(criarBuscaTavily('k', req)('q', signal)).resolves.toEqual([
      { titulo: 'A', url: 'https://a.com', conteudo: 'texto a' },
      { titulo: 'www.b.org', url: 'https://www.b.org/x', conteudo: 'texto b' },
    ]);
  });

  it.each([
    [401, 'busca_chave'],
    [429, 'busca_limite'],
    [432, 'busca_limite'],
    [433, 'busca_limite'],
    [500, 'busca_falhou'],
  ])('status %i vira %s', async (status, codigo) => {
    await expect(criarBuscaTavily('k', responder({}, status))('q', signal)).rejects.toMatchObject({ codigo });
  });

  it('sem chave não chama a API', async () => {
    const req = responder({ results: [] });
    await expect(criarBuscaTavily('', req)('q', signal)).rejects.toMatchObject({ codigo: 'busca_chave' });
    expect(req).not.toHaveBeenCalled();
  });

  it('falha de rede e resposta estranha viram erro em português, sem expor a chave', async () => {
    const semRede = vi.fn(async () => {
      throw new TypeError('fetch failed tvly-segredo');
    }) as unknown as typeof fetch;
    const erro = await criarBuscaTavily('tvly-segredo', semRede)('q', signal).catch((e: Error) => e);
    expect((erro as Error).message).toContain('sem conexão');
    expect((erro as Error).message).not.toContain('tvly-segredo');
    await expect(criarBuscaTavily('k', responder({ outra: 1 }))('q', signal)).rejects.toMatchObject({
      codigo: 'busca_falhou',
    });
  });
});
