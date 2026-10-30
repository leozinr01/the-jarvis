import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceController, type RecognitionLike } from './voiceController';

class FakeRec implements RecognitionLike {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  falar(transcript: string, isFinal: boolean) {
    const resultado = Object.assign([{ transcript }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [resultado] });
  }
}

function montar() {
  const recs: FakeRec[] = [];
  const pedidos: string[] = [];
  const rascunhos: string[] = [];
  const parciais: string[] = [];
  const erros: string[] = [];
  const estados: { capturando: boolean; ativacaoLigada: boolean }[] = [];
  const controller = new VoiceController(
    () => {
      const rec = new FakeRec();
      recs.push(rec);
      return rec;
    },
    {
      onPedido: (t) => pedidos.push(t),
      onRascunho: (t) => rascunhos.push(t),
      onPartial: (t) => parciais.push(t),
      onError: (m) => erros.push(m),
      onState: (s) => estados.push(s),
    },
  );
  return { controller, recs, pedidos, rascunhos, parciais, erros, estados, ultimoEstado: () => estados.at(-1) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('captura manual', () => {
  it('acumula as frases e não envia sozinha, para permitir edição', () => {
    const t = montar();
    t.controller.startManual();
    const rec = t.recs[0]!;
    expect(rec.lang).toBe('pt-BR');
    expect(rec.interimResults).toBe(true);

    rec.falar('qual é', false);
    expect(t.parciais.at(-1)).toBe('qual é');
    rec.falar('qual é a capital', true);
    rec.falar('da França', false);
    expect(t.parciais.at(-1)).toBe('qual é a capital da França');
    expect(t.pedidos).toEqual([]);
    expect(t.ultimoEstado()?.capturando).toBe(true);
    expect(rec.abort).not.toHaveBeenCalled();
  });

  it('ao parar, envia o que já ouviu e fecha o microfone', () => {
    const t = montar();
    t.controller.startManual();
    t.recs[0]!.falar('meio pedido', false);
    t.controller.stopManual();
    expect(t.pedidos).toEqual(['meio pedido']);
    expect(t.recs[0]!.abort).toHaveBeenCalled();
    expect(t.ultimoEstado()).toEqual({ capturando: false, ativacaoLigada: false });
  });

  it('ao parar sem ter ouvido nada, não envia pedido', () => {
    const t = montar();
    t.controller.startManual();
    t.controller.stopManual();
    expect(t.pedidos).toEqual([]);
  });

  it('se o Chrome encerrar, o texto vira rascunho e não reinicia', () => {
    const t = montar();
    t.controller.startManual();
    t.recs[0]!.falar('pedido falado', true);
    t.recs[0]!.onend?.();
    vi.advanceTimersByTime(5000);
    expect(t.rascunhos).toEqual(['pedido falado']);
    expect(t.pedidos).toEqual([]);
    expect(t.recs).toHaveLength(1);
    expect(t.ultimoEstado()?.capturando).toBe(false);
  });

  it('avisa quando não ouve nada', () => {
    const t = montar();
    t.controller.startManual();
    t.recs[0]!.onerror?.({ error: 'no-speech' });
    expect(t.erros[0]).toContain('Não ouvi nada');
  });

  it('erro no meio da captura preserva o texto como rascunho', () => {
    const t = montar();
    t.controller.startManual();
    t.recs[0]!.falar('não perca isto', true);
    t.recs[0]!.onerror?.({ error: 'network' });
    expect(t.rascunhos).toEqual(['não perca isto']);
    expect(t.erros[0]).toContain('internet');
  });
});

describe('interromperFala', () => {
  it('na captura manual fecha o microfone sem enviar nada', () => {
    const t = montar();
    t.controller.startManual();
    t.recs[0]!.falar('vou editar', false);
    t.controller.interromperFala();
    expect(t.pedidos).toEqual([]);
    expect(t.parciais.at(-1)).toBe('');
    expect(t.recs[0]!.abort).toHaveBeenCalled();
    expect(t.ultimoEstado()?.capturando).toBe(false);
  });

  it('na ativação descarta o resto da fala e volta a escutar a próxima', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    const rec = t.recs[0]!;
    rec.falar('Jarvis vou digitar', false);
    t.controller.interromperFala();
    rec.falar('Jarvis vou digitar isto', false);
    expect(t.parciais.at(-1)).toBe('');
    rec.falar('Jarvis vou digitar isto', true);
    expect(t.pedidos).toEqual([]);
    expect(rec.abort).not.toHaveBeenCalled();

    rec.falar('Jarvis outro pedido', true);
    expect(t.pedidos).toEqual(['outro pedido']);
  });

  it('sem fala em andamento, não descarta o próximo pedido por ativação', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.controller.interromperFala();
    t.recs[0]!.falar('Jarvis pedido', true);
    expect(t.pedidos).toEqual(['pedido']);
  });
});

describe('palavra de ativação', () => {
  it('ignora fala sem "Jarvis" e nem a mostra', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.recs[0]!.falar('conversa particular', false);
    t.recs[0]!.falar('conversa particular', true);
    expect(t.pedidos).toEqual([]);
    expect(t.parciais).toEqual([]);
  });

  it('captura o que vem depois de "Jarvis", envia sozinha e continua escutando', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    const rec = t.recs[0]!;
    rec.falar('Jarvis quero', false);
    expect(t.parciais.at(-1)).toBe('quero');
    rec.falar('Jarvis, quero saber', true);
    expect(t.pedidos).toEqual(['quero saber']);
    expect(rec.abort).not.toHaveBeenCalled();
    expect(t.ultimoEstado()?.ativacaoLigada).toBe(true);
  });

  it('aceita "Jarvis" sozinho e usa a frase seguinte como pedido', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    const rec = t.recs[0]!;
    rec.falar('Jarvis', true);
    rec.falar('que horas são', true);
    expect(t.pedidos).toEqual(['que horas são']);
  });

  it('desiste de esperar o pedido depois do tempo limite', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    const rec = t.recs[0]!;
    rec.falar('Jarvis', true);
    vi.advanceTimersByTime(8001);
    rec.falar('outra conversa', true);
    expect(t.pedidos).toEqual([]);
  });

  it('mantém o pedido se o final revisado perder a palavra', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    const rec = t.recs[0]!;
    rec.falar('Jarvis me diga', false);
    rec.falar('me diga a hora', true);
    expect(t.pedidos).toEqual(['me diga a hora']);
  });

  it('religa quando o Chrome encerra a escuta', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    vi.advanceTimersByTime(30000);
    t.recs[0]!.onend?.();
    vi.advanceTimersByTime(300);
    expect(t.recs).toHaveLength(2);
    expect(t.recs[1]!.start).toHaveBeenCalled();
  });

  it('para o laço quando o reconhecedor morre logo ao iniciar', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    for (let i = 0; i < 5; i++) {
      t.recs.at(-1)!.onend?.();
      vi.advanceTimersByTime(300);
    }
    const total = t.recs.length;
    vi.advanceTimersByTime(10000);
    expect(t.recs).toHaveLength(total);
    expect(t.erros[0]).toContain('parou de responder');
    expect(t.ultimoEstado()?.ativacaoLigada).toBe(false);
  });

  it('não religa depois de desligada', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.controller.setAtivacao(false);
    vi.advanceTimersByTime(5000);
    expect(t.recs).toHaveLength(1);
    expect(t.recs[0]!.abort).toHaveBeenCalled();
  });

  it('microfone manual convive com a ativação e a mantém ligada', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.controller.startManual();
    expect(t.recs).toHaveLength(1);
    t.recs[0]!.falar('sem palavra de ativação', true);
    expect(t.pedidos).toEqual([]);
    t.controller.stopManual();
    expect(t.pedidos).toEqual(['sem palavra de ativação']);
    expect(t.ultimoEstado()).toEqual({ capturando: false, ativacaoLigada: true });
    expect(t.recs[0]!.abort).not.toHaveBeenCalled();
  });
});

describe('erros', () => {
  it.each([
    ['not-allowed', 'Permissão do microfone negada'],
    ['audio-capture', 'Nenhum microfone'],
    ['network', 'internet'],
  ])('%s desliga tudo e explica em português', (codigo, trecho) => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.recs[0]!.onerror?.({ error: codigo });
    expect(t.erros[0]).toContain(trecho);
    expect(t.ultimoEstado()).toEqual({ capturando: false, ativacaoLigada: false });
    vi.advanceTimersByTime(5000);
    expect(t.recs).toHaveLength(1);
  });

  it('silêncio na escuta contínua não vira erro', () => {
    const t = montar();
    t.controller.setAtivacao(true);
    t.recs[0]!.onerror?.({ error: 'no-speech' });
    expect(t.erros).toEqual([]);
  });
});
