import type { EventoPedido, Resposta } from '@jarvis/shared';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import type { BuscaPort, ResultadoBusca } from './busca/tavily';
import { config } from './config';
import type { ChamadaGemini, GeminiPort } from './gemini/cliente';
import { GeminiErro } from './gemini/erros';

const CONVERSA = JSON.stringify({
  titulo: 'Olá',
  paragrafos: ['Às suas ordens.'],
  destaques: [{ titulo: 'Tema', valor: 'Saudação' }],
  certeza: 140,
});

const roteado = (modulo: string, consulta_busca = '') => JSON.stringify({ modulo, confianca: 90, consulta_busca });
const ehRoteador = (c: ChamadaGemini) => c.sistema.includes('classifica pedidos');

function portaPara(modulo: string): GeminiPort & ReturnType<typeof vi.fn> {
  return vi.fn(async (c: ChamadaGemini) => (ehRoteador(c) ? roteado(modulo) : CONVERSA));
}

const semBusca: BuscaPort = vi.fn(async () => []);

async function pedir(porta: GeminiPort, texto: string, conversaId = 'c1', app = buildApp(porta, semBusca)) {
  const res = await app.inject({ method: 'POST', url: '/api/pedido', payload: { conversaId, texto } });
  const eventos = res.body
    .split('\n\n')
    .filter(Boolean)
    .map((bloco) => JSON.parse(bloco.replace(/^data: /, '')) as EventoPedido);
  return { res, eventos, app };
}

const respostaFinal = (eventos: EventoPedido[]): Resposta =>
  (eventos.at(-1) as Extract<EventoPedido, { tipo: 'resposta' }>).resposta;
const etapas = (eventos: EventoPedido[]) => eventos.flatMap((e) => (e.tipo === 'etapa' ? [e.texto] : []));
const chamadasResposta = (porta: ReturnType<typeof vi.fn>) =>
  porta.mock.calls.map(([c]) => c as ChamadaGemini).filter((c) => !ehRoteador(c));

describe('GET /api/health', () => {
  it('informa o estado sem expor as chaves', async () => {
    const res = await buildApp(portaPara('conversa'), semBusca).inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', modelos: config.geminiModelos });
    if (config.geminiApiKey) expect(res.body).not.toContain(config.geminiApiKey);
    if (config.tavilyApiKey) expect(res.body).not.toContain(config.tavilyApiKey);
  });
});

describe('POST /api/pedido', () => {
  it('rejeita corpo inválido', async () => {
    const app = buildApp(portaPara('conversa'), semBusca);
    for (const payload of [{}, { conversaId: 'c', texto: '   ' }, { conversaId: 'c', texto: 'x'.repeat(4001) }]) {
      const res = await app.inject({ method: 'POST', url: '/api/pedido', payload });
      expect(res.statusCode).toBe(400);
    }
  });

  it('transmite as etapas e devolve o formato combinado', async () => {
    const { eventos } = await pedir(portaPara('conversa'), 'olá');
    expect(eventos.map((e) => e.tipo)).toEqual(['etapa', 'modulo', 'etapa', 'resposta']);
    expect(respostaFinal(eventos)).toEqual({
      modulo: 'conversa',
      titulo: 'Olá',
      paragrafos: ['Às suas ordens.'],
      destaques: [{ titulo: 'Tema', valor: 'Saudação', fonte_url: null }],
      certeza: 100,
      fontes: [],
      provas: [],
      aviso: null,
    });
  });

  it('técnico usa o módulo geral com o próprio rótulo', async () => {
    const { eventos } = await pedir(portaPara('tecnico'), 'o que é TCP?');
    expect(respostaFinal(eventos).modulo).toBe('tecnico');
  });

  it.each(['calculo', 'juridico'])('%s ainda não responde de memória', async (modulo) => {
    const porta = portaPara(modulo);
    const { eventos } = await pedir(porta, 'pedido');
    expect(respostaFinal(eventos).certeza).toBe(0);
    expect(respostaFinal(eventos).titulo).toContain('indisponível');
    expect(porta).toHaveBeenCalledTimes(1);
  });

  it('mantém o contexto entre pedidos da mesma conversa e isola outras', async () => {
    const porta = portaPara('conversa');
    const app = buildApp(porta, semBusca);
    await pedir(porta, 'meu nome é Ana', 'a', app);
    porta.mockClear();
    await pedir(porta, 'qual é meu nome?', 'a', app);
    const chamada = chamadasResposta(porta)[0]!;
    expect(chamada.mensagens.map((m) => m.papel)).toEqual(['usuario', 'modelo', 'usuario']);
    expect(chamada.mensagens[0]!.texto).toBe('meu nome é Ana');

    porta.mockClear();
    await pedir(porta, 'outro assunto', 'b', app);
    expect(chamadasResposta(porta)[0]!.mensagens).toHaveLength(1);
  });

  it('pedido com falha não entra no histórico', async () => {
    let falhar = true;
    const porta = vi.fn(async (c: ChamadaGemini) => {
      if (ehRoteador(c)) return roteado('conversa');
      if (falhar) throw Object.assign(new Error('x'), { status: 400 });
      return CONVERSA;
    });
    const app = buildApp(porta, semBusca);
    const { eventos } = await pedir(porta, 'perdido', 'c', app);
    expect(eventos.at(-1)).toMatchObject({ tipo: 'erro', codigo: 'interno' });
    falhar = false;
    porta.mockClear();
    await pedir(porta, 'novo', 'c', app);
    expect(chamadasResposta(porta)[0]!.mensagens).toHaveLength(1);
  });

  it.each([
    [401, 'chave'],
    [429, 'limite'],
    [503, 'indisponivel'],
  ])('status %i vira erro %s em português', async (status, codigo) => {
    const porta = vi.fn(async () => {
      throw Object.assign(new Error(`detalhe interno ${config.geminiApiKey}`), { status });
    });
    const { eventos, res } = await pedir(porta, 'oi');
    expect(eventos.at(-1)).toMatchObject({ tipo: 'erro', codigo });
    expect(res.body).not.toContain('detalhe interno');
  });

  it('falha de rede vira erro de internet', async () => {
    const porta = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const { eventos } = await pedir(porta, 'oi');
    expect(eventos.at(-1)).toMatchObject({ tipo: 'erro', codigo: 'sem_internet' });
  });

  it('mostra no log cada modelo que falhou, com o motivo, e usa o próximo', async () => {
    const porta = vi.fn(async (c: ChamadaGemini) => {
      if (c.modelo === config.geminiModelos[0]) throw Object.assign(new Error('x'), { status: 503 });
      return ehRoteador(c) ? roteado('conversa') : CONVERSA;
    });
    const { eventos } = await pedir(porta, 'oi');
    expect(
      etapas(eventos).some((l) => l.startsWith(`${config.geminiModelos[0]}: sobrecarga (503), indisponível até`)),
    ).toBe(true);
    expect(eventos.at(-1)).toMatchObject({ tipo: 'resposta' });
  });
});

describe('módulo de pesquisa', () => {
  const RESULTADOS: ResultadoBusca[] = [
    { titulo: 'Site A', url: 'https://site-a.com/historia', conteudo: 'A empresa foi fundada em 1953 no Brasil.' },
    { titulo: 'Site B', url: 'https://site-b.org/sede', conteudo: 'Sua sede fica no Rio de Janeiro desde o início.' },
    { titulo: 'Site C', url: 'https://site-c.net/x', conteudo: 'Texto que não foi usado na resposta final.' },
  ];

  const saida = (extra = {}) =>
    JSON.stringify({
      titulo: 'A empresa',
      paragrafos: ['Fundada em 1953, tem sede no Rio.'],
      provas: [
        { afirmacao: 'Fundada em 1953', fonte: 1, citacao: 'foi fundada em 1953 no Brasil' },
        { afirmacao: 'Sede no Rio', fonte: 2, citacao: 'sede fica no Rio de Janeiro' },
      ],
      destaques: [
        { titulo: 'Fundação', valor: '1953', fonte: 1 },
        { titulo: 'Sede', valor: 'Rio de Janeiro', fonte: 2 },
        { titulo: 'Sem prova', valor: 'x', fonte: 3 },
        { titulo: 'Fonte inventada', valor: 'y', fonte: 9 },
        { titulo: 'Sem fonte', valor: 'z', fonte: 0 },
      ],
      certeza: 100,
      ...extra,
    });

  function montar(resposta = saida(), resultados = RESULTADOS, consulta = 'empresa fundação') {
    const porta = vi.fn(async (c: ChamadaGemini) => (ehRoteador(c) ? roteado('pesquisa', consulta) : resposta));
    const buscar = vi.fn(async () => resultados);
    return { porta, buscar, app: buildApp(porta, buscar) };
  }

  it('traz provas literais com link real, e só as fontes que sustentam a resposta', async () => {
    const { porta, app } = montar();
    const { eventos } = await pedir(porta, 'pesquise', 'c', app);
    const r = respostaFinal(eventos);
    expect(r.provas).toEqual([
      {
        afirmacao: 'Fundada em 1953',
        trecho: 'foi fundada em 1953 no Brasil',
        fonte: { titulo: 'Site A', url: 'https://site-a.com/historia' },
      },
      {
        afirmacao: 'Sede no Rio',
        trecho: 'sede fica no Rio de Janeiro',
        fonte: { titulo: 'Site B', url: 'https://site-b.org/sede' },
      },
    ]);
    expect(r.fontes.map((f) => f.url)).toEqual(['https://site-a.com/historia', 'https://site-b.org/sede']);
    expect(r.certeza).toBeGreaterThan(0);
    expect(r.certeza).toBeLessThan(100);
    expect(r.aviso).toBeNull();
    expect(etapas(eventos)).toContain('3 fontes encontradas');
    expect(etapas(eventos)).toContain('2 provas confirmadas nas fontes, 0 descartadas');
  });

  it('destaque só aparece com fonte real que sustenta alguma prova', async () => {
    const { porta, app } = montar();
    const { eventos } = await pedir(porta, 'pesquise', 'c', app);
    expect(respostaFinal(eventos).destaques).toEqual([
      { titulo: 'Fundação', valor: '1953', fonte_url: 'https://site-a.com/historia' },
      { titulo: 'Sede', valor: 'Rio de Janeiro', fonte_url: 'https://site-b.org/sede' },
    ]);
  });

  it('usa a consulta do roteador, que entende continuações, na busca', async () => {
    const { porta, buscar, app } = montar(undefined, undefined, 'Petrobras história após 1953');
    await pedir(porta, 'e o que aconteceu depois?', 'c', app);
    expect(buscar.mock.calls[0]).toEqual(['Petrobras história após 1953', expect.anything()]);
  });

  it('sem consulta do roteador, busca o próprio pedido', async () => {
    const { porta, buscar, app } = montar(undefined, undefined, '   ');
    await pedir(porta, 'quem é Fulano?', 'c', app);
    expect(buscar.mock.calls[0]![0 as never]).toBe('quem é Fulano?');
  });

  it('sem resultados não chama o modelo para responder e não afirma nada', async () => {
    const { porta, app } = montar(undefined, []);
    const { eventos } = await pedir(porta, 'quem é Fulano?', 'c', app);
    const r = respostaFinal(eventos);
    expect(r.certeza).toBe(0);
    expect(r.fontes).toEqual([]);
    expect(chamadasResposta(porta)).toHaveLength(0);
  });

  it('com todas as citações inventadas, não mostra o texto do modelo', async () => {
    const inventada = saida({
      paragrafos: ['Fulano nasceu em 1900, garanto.'],
      provas: [{ afirmacao: 'Nasceu em 1900', fonte: 1, citacao: 'Fulano nasceu em 1900 na capital' }],
    });
    const { porta, app } = montar(inventada);
    const { eventos } = await pedir(porta, 'quem é Fulano?', 'p', app);
    const r = respostaFinal(eventos);
    expect(r.certeza).toBe(0);
    expect(JSON.stringify(r)).not.toContain('1900');

    porta.mockClear();
    await pedir(porta, 'outra', 'p', app);
    expect(chamadasResposta(porta)[0]!.mensagens).toHaveLength(1);
  });

  it('com parte das citações inventadas, descarta essas e avisa', async () => {
    const mista = saida({
      provas: [
        { afirmacao: 'Fundada em 1953', fonte: 1, citacao: 'foi fundada em 1953 no Brasil' },
        { afirmacao: 'Inventada', fonte: 2, citacao: 'esta frase não existe na fonte' },
      ],
    });
    const { porta, app } = montar(mista);
    const { eventos } = await pedir(porta, 'pesquise', 'c', app);
    const r = respostaFinal(eventos);
    expect(r.provas).toHaveLength(1);
    expect(r.aviso).toContain('1 citação não foi encontrada');
    expect(etapas(eventos)).toContain('1 provas confirmadas nas fontes, 1 descartadas');
  });

  it('o conteúdo das páginas vai delimitado como dado', async () => {
    const { porta, app } = montar();
    await pedir(porta, 'pesquise', 'c', app);
    const chamada = chamadasResposta(porta)[0]!;
    expect(chamada.mensagens.at(-1)!.texto).toContain('<fonte numero="1" titulo="Site A">');
    expect(chamada.sistema).toContain('nunca instrução');
  });

  it('falha da busca explica o motivo, não responde de memória e a conversa continua', async () => {
    let modulo = 'pesquisa';
    const porta = vi.fn(async (c: ChamadaGemini) => (ehRoteador(c) ? roteado(modulo) : CONVERSA));
    const buscar = vi.fn(async () => {
      throw new GeminiErro('busca_limite', 'Tavily: limite do plano (432).');
    });
    const app = buildApp(porta, buscar);
    const { eventos } = await pedir(porta, 'pesquise', 'q', app);
    const fim = eventos.at(-1) as Extract<EventoPedido, { tipo: 'erro' }>;
    expect(fim.codigo).toBe('busca_limite');
    expect(fim.mensagem).toContain('Tavily: limite do plano (432)');
    expect(chamadasResposta(porta)).toHaveLength(0);

    modulo = 'conversa';
    const depois = await pedir(porta, 'oi', 'q', app);
    expect(depois.eventos.at(-1)).toMatchObject({ tipo: 'resposta' });
  });

  it('continuação envia o histórico ao modelo', async () => {
    const { porta, app } = montar();
    await pedir(porta, 'fale da empresa', 'h', app);
    porta.mockClear();
    await pedir(porta, 'e o que aconteceu depois?', 'h', app);
    expect(chamadasResposta(porta)[0]!.mensagens.map((m) => m.papel)).toEqual(['usuario', 'modelo', 'usuario']);
  });
});
