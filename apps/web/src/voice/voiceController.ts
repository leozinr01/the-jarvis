import { extractAfterWakeWord } from './wakeWord';

export interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface VoiceState {
  /** Microfone aberto capturando um pedido. */
  capturando: boolean;
  /** Escuta contínua à espera de "Jarvis". */
  ativacaoLigada: boolean;
}

export interface VoiceHandlers {
  onState(state: VoiceState): void;
  onPartial(texto: string): void;
  onPedido(texto: string): void;
  /** A captura manual terminou sozinha com texto: fica no campo para editar e enviar. */
  onRascunho(texto: string): void;
  onError(mensagem: string): void;
}

const ERROS_FATAIS: Record<string, string> = {
  'not-allowed': 'Permissão do microfone negada. Libere o microfone no cadeado da barra de endereço do Chrome.',
  'service-not-allowed': 'O Chrome bloqueou o serviço de reconhecimento de voz nesta página.',
  'audio-capture': 'Nenhum microfone encontrado. Conecte um microfone e tente de novo.',
  network: 'Sem conexão com o serviço de voz do Chrome. Verifique sua internet.',
  'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
};

const RESTART_MS = 300;
const COMANDO_TIMEOUT_MS = 8000;
const FALHA_RAPIDA_MS = 1000;
const MAX_FALHAS_RAPIDAS = 5;

export class VoiceController {
  private rec: RecognitionLike | null = null;
  private manual = false;
  private ativacao = false;
  /** "Jarvis" já foi ouvido e o próximo trecho é o pedido. */
  private aguardandoComando = false;
  private ouviuNestaFala = false;
  /** A pessoa assumiu o texto pelo teclado: descarta o restante da fala em andamento. */
  private ignorarFala = false;
  /** Frases já finalizadas na captura manual. */
  private acumulado = '';
  private parcial = '';
  private iniciadoEm = 0;
  private falhasRapidas = 0;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private comandoTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly criar: () => RecognitionLike,
    private readonly handlers: VoiceHandlers,
  ) {}

  startManual(): void {
    this.manual = true;
    this.ignorarFala = false;
    this.acumulado = '';
    this.definirParcial('');
    this.emitirEstado();
    this.garantirRodando();
  }

  /** Encerra a captura manual e envia o que já foi ouvido. */
  stopManual(): void {
    if (!this.manual) return;
    const texto = this.parcial.trim();
    this.interromperFala();
    if (texto) this.handlers.onPedido(texto);
  }

  /** Para de transcrever sem enviar nada; o texto passa a ser de quem está digitando. */
  interromperFala(): void {
    this.ignorarFala = this.ativacao && this.parcial !== '';
    this.manual = false;
    this.acumulado = '';
    this.ouviuNestaFala = false;
    this.limparComando();
    this.definirParcial('');
    this.pararSeOcioso();
    this.emitirEstado();
  }

  setAtivacao(ligada: boolean): void {
    this.ativacao = ligada;
    this.ignorarFala = false;
    this.limparComando();
    if (!ligada && !this.manual) this.definirParcial('');
    if (ligada) this.garantirRodando();
    else this.pararSeOcioso();
    this.emitirEstado();
  }

  dispose(): void {
    this.manual = false;
    this.ativacao = false;
    this.limparComando();
    clearTimeout(this.restartTimer);
    this.abortar();
  }

  private garantirRodando(): void {
    clearTimeout(this.restartTimer);
    if (this.rec) return;
    const rec = this.criar();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => this.aoReceber(event);
    rec.onerror = (event) => this.aoErrar(event.error);
    rec.onend = () => this.aoTerminar(rec);
    this.rec = rec;
    this.iniciadoEm = Date.now();
    rec.start();
  }

  private abortar(): void {
    const rec = this.rec;
    this.rec = null;
    if (!rec) return;
    rec.onresult = rec.onerror = rec.onend = null;
    rec.abort();
  }

  private pararSeOcioso(): void {
    if (this.manual || this.ativacao) return;
    clearTimeout(this.restartTimer);
    this.abortar();
  }

  private aoReceber(event: RecognitionEventLike): void {
    this.falhasRapidas = 0;
    let final = '';
    let interino = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const resultado = event.results[i]!;
      const texto = resultado[0]?.transcript ?? '';
      if (resultado.isFinal) final += texto;
      else interino += texto;
    }

    if (this.ignorarFala) {
      if (final.trim()) this.ignorarFala = false;
      return;
    }
    if (this.manual) this.processarManual(final, interino);
    else if (this.ativacao) this.processarAtivacao(final, interino);
  }

  private processarManual(final: string, interino: string): void {
    if (final.trim()) this.acumulado = juntar(this.acumulado, final.trim());
    this.definirParcial(juntar(this.acumulado, interino.trim()));
  }

  private processarAtivacao(final: string, interino: string): void {
    if (final.trim()) {
      this.processarFinalAtivacao(final.trim());
      return;
    }
    const aposAtivacao = extractAfterWakeWord(interino);
    if (aposAtivacao !== null) {
      this.ouviuNestaFala = true;
      this.definirParcial(aposAtivacao);
    } else if (this.aguardandoComando || this.ouviuNestaFala) {
      this.definirParcial(interino.trim());
    }
  }

  private processarFinalAtivacao(final: string): void {
    const aposAtivacao = extractAfterWakeWord(final);
    // O reconhecedor pode revisar a frase e tirar a palavra que apareceu no resultado parcial.
    const comando = aposAtivacao ?? (this.aguardandoComando || this.ouviuNestaFala ? final : null);
    this.ouviuNestaFala = false;

    if (comando === null) return;
    if (comando === '') {
      this.aguardandoComando = true;
      clearTimeout(this.comandoTimer);
      this.comandoTimer = setTimeout(() => this.limparComando(), COMANDO_TIMEOUT_MS);
      this.definirParcial('');
      return;
    }
    this.limparComando();
    this.definirParcial('');
    this.handlers.onPedido(comando);
  }

  private aoErrar(erro: string): void {
    const fatal = ERROS_FATAIS[erro];
    if (fatal) {
      this.falhar(fatal);
    } else if (erro === 'no-speech' && this.manual && !this.parcial && !this.ativacao) {
      this.interromperFala();
      this.handlers.onError('Não ouvi nada. Clique no microfone e tente de novo.');
    }
  }

  private falhar(mensagem: string): void {
    const texto = this.manual ? this.parcial.trim() : '';
    this.manual = false;
    this.ativacao = false;
    this.acumulado = '';
    this.limparComando();
    this.definirParcial('');
    clearTimeout(this.restartTimer);
    this.abortar();
    this.emitirEstado();
    if (texto) this.handlers.onRascunho(texto);
    this.handlers.onError(mensagem);
  }

  private aoTerminar(rec: RecognitionLike): void {
    if (this.rec !== rec) return;
    this.rec = null;
    this.ouviuNestaFala = false;
    this.ignorarFala = false;

    if (this.manual) {
      // O Chrome pode encerrar sozinho: o que já foi dito não pode se perder.
      const texto = this.parcial.trim();
      this.manual = false;
      this.acumulado = '';
      this.definirParcial('');
      if (texto) this.handlers.onRascunho(texto);
    }

    if (this.ativacao) {
      // O Chrome encerra a escuta contínua de tempos em tempos; religa sem aparecer para o usuário.
      this.falhasRapidas = Date.now() - this.iniciadoEm < FALHA_RAPIDA_MS ? this.falhasRapidas + 1 : 0;
      if (this.falhasRapidas >= MAX_FALHAS_RAPIDAS) {
        this.falhar('A escuta de voz parou de responder. Ligue a ativação novamente.');
        return;
      }
      this.definirParcial('');
      this.restartTimer = setTimeout(() => this.garantirRodando(), RESTART_MS);
    } else {
      this.definirParcial('');
    }
    this.emitirEstado();
  }

  private limparComando(): void {
    this.aguardandoComando = false;
    clearTimeout(this.comandoTimer);
  }

  private definirParcial(texto: string): void {
    if (texto === this.parcial) return;
    this.parcial = texto;
    this.handlers.onPartial(texto);
  }

  private emitirEstado(): void {
    this.handlers.onState({ capturando: this.manual, ativacaoLigada: this.ativacao });
  }
}

function juntar(a: string, b: string): string {
  return a && b ? `${a} ${b}` : a || b;
}
