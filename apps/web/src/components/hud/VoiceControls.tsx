interface Props {
  capturando: boolean;
  ativacaoLigada: boolean;
  microfoneDesabilitado: boolean;
  onMicrofone(): void;
  onAtivacao(): void;
}

const BOTAO =
  'flex-1 cursor-pointer border px-2 py-1.5 font-mono text-[0.6875rem] tracking-wider uppercase disabled:cursor-wait disabled:opacity-50';
const LIGADO = 'border-hud-cyan bg-hud-cyan/15 text-hud-cyan';
const DESLIGADO = 'border-hud-line text-hud-dim enabled:hover:border-hud-cyan enabled:hover:text-hud-text';

export function VoiceControls({ capturando, ativacaoLigada, microfoneDesabilitado, onMicrofone, onAtivacao }: Props) {
  return (
    <div className="flex shrink-0 gap-2 border-t border-hud-line p-2">
      <button
        type="button"
        aria-pressed={capturando}
        disabled={microfoneDesabilitado}
        onClick={onMicrofone}
        className={`${BOTAO} ${capturando ? LIGADO : DESLIGADO}`}
      >
        {capturando ? 'Enviar' : 'Microfone'}
      </button>
      <button
        type="button"
        aria-pressed={ativacaoLigada}
        onClick={onAtivacao}
        title="Quando ligada, o microfone fica aberto e o Chrome processa continuamente o áudio."
        className={`${BOTAO} ${ativacaoLigada ? LIGADO : DESLIGADO}`}
      >
        "Jarvis": {ativacaoLigada ? 'ligado' : 'desligado'}
      </button>
    </div>
  );
}
