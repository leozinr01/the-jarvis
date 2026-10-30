import type { StatusJarvis } from '@jarvis/shared';
import { useRef, useState } from 'react';
import { HighlightCards } from './components/cards/HighlightCards';
import { CertaintyBar } from './components/hud/CertaintyBar';
import { ErrorBanner } from './components/hud/ErrorBanner';
import { PedidoInput } from './components/hud/PedidoInput';
import { ReadingPanel } from './components/hud/ReadingPanel';
import { SourcesList } from './components/hud/SourcesList';
import { Terminal } from './components/hud/Terminal';
import { TopBar } from './components/hud/TopBar';
import { VoiceControls } from './components/hud/VoiceControls';
import { useJarvis } from './hooks/useJarvis';
import { useTypewriter } from './hooks/useTypewriter';
import { useViewport } from './hooks/useViewport';
import { getRailLayout } from './lib/cardSlots';
import { adicionarAoHistorico } from './lib/history';
import { useVoice } from './voice/useVoice';

export function App() {
  const viewport = useViewport();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pedido, setPedido] = useState('');
  const [rascunho, setRascunho] = useState('');
  const [historico, setHistorico] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const jarvis = useJarvis();

  /** Ponto único de entrada: pedidos falados e digitados seguem o mesmo fluxo. */
  function enviarPedido(texto: string) {
    const limpo = texto.trim();
    if (!limpo) return;
    if (!jarvis.pedir(limpo)) {
      setAviso('Ainda estou processando o pedido anterior. Repita em seguida.');
      return;
    }
    setAviso(null);
    setPedido(limpo);
    setHistorico((atual) => adicionarAoHistorico(atual, limpo));
  }

  const voz = useVoice({
    onPedido: enviarPedido,
    onRascunho: (texto) => {
      setRascunho(texto);
      inputRef.current?.focus();
    },
  });
  const pedidoDigitado = useTypewriter(pedido);
  const { railWidth } = getRailLayout(viewport.width);
  const { resposta, processando } = jarvis;
  const erro = voz.erro ?? jarvis.erro ?? aviso;

  let status: StatusJarvis = processando ? 'pensando' : 'ocioso';
  if (voz.capturando || voz.parcial) status = 'ouvindo';
  else if (status === 'ocioso' && voz.ativacaoLigada) status = 'aguardando';

  return (
    <div className="flex h-full flex-col">
      <TopBar modulo={jarvis.modulo} status={status} />
      {erro && (
        <ErrorBanner
          mensagem={erro}
          onFechar={() => {
            voz.limparErro();
            jarvis.limparErro();
            setAviso(null);
          }}
        />
      )}
      <div
        className="flex min-h-0 flex-1 gap-3 pt-2 pb-2.5"
        style={{ paddingLeft: railWidth, paddingRight: railWidth }}
      >
        {resposta ? (
          <ReadingPanel
            titulo={resposta.titulo}
            paragrafos={resposta.paragrafos}
            aviso={resposta.aviso}
            provas={resposta.provas}
            fraseAtual={null}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center border border-hud-line bg-hud-panel/60 p-6">
            <p className="hud-label text-center">Digite um pedido, clique em Microfone ou diga "Jarvis"</p>
          </div>
        )}
        <aside className="flex w-64 shrink-0 flex-col gap-3 xl:w-80">
          <Terminal pedido={pedidoDigitado} log={jarvis.log}>
            <PedidoInput
              inputRef={inputRef}
              valor={voz.parcial || rascunho}
              processando={processando}
              historico={historico}
              onChange={(texto) => {
                // Mexer no texto assume o controle: a voz para de sobrescrever o campo.
                if (voz.capturando || voz.parcial) voz.interromperFala();
                setRascunho(texto);
              }}
              onEnviar={(texto) => {
                voz.interromperFala();
                setRascunho('');
                enviarPedido(texto);
              }}
              onLimpar={() => {
                voz.interromperFala();
                setRascunho('');
              }}
            />
            <VoiceControls
              capturando={voz.capturando}
              ativacaoLigada={voz.ativacaoLigada}
              microfoneDesabilitado={processando}
              onMicrofone={voz.alternarMicrofone}
              onAtivacao={voz.alternarAtivacao}
            />
          </Terminal>
          <CertaintyBar valor={resposta?.certeza ?? 0} />
          <SourcesList fontes={resposta?.fontes ?? []} />
        </aside>
      </div>
      <HighlightCards destaques={jarvis.destaques} viewport={viewport} />
    </div>
  );
}
