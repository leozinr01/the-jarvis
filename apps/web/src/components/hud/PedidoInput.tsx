import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { navegarHistorico, type Navegacao } from '../../lib/history';
import { deveFocarCampo } from '../../lib/shortcuts';

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  valor: string;
  processando: boolean;
  historico: string[];
  onChange(texto: string): void;
  onEnviar(texto: string): void;
  onLimpar(): void;
}

export function PedidoInput({ inputRef, valor, processando, historico, onChange, onEnviar, onLimpar }: Props) {
  const [focado, setFocado] = useState(false);
  const navegacao = useRef<Navegacao | null>(null);
  const moverCursorParaFim = useRef(false);
  const restaurarFoco = useRef(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const alvo = e.target instanceof HTMLElement ? e.target : null;
      if (!deveFocarCampo({ ...pick(e), target: alvo }) || !inputRef.current) return;
      if (inputRef.current.disabled || document.querySelector('[role=dialog]')) return;
      e.preventDefault();
      inputRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputRef]);

  // Desabilitar o campo tira o foco; devolve quando o pedido terminar de processar.
  useEffect(() => {
    if (!processando && restaurarFoco.current) {
      restaurarFoco.current = false;
      inputRef.current?.focus();
    }
  }, [processando, inputRef]);

  useLayoutEffect(() => {
    if (!moverCursorParaFim.current || !inputRef.current) return;
    moverCursorParaFim.current = false;
    inputRef.current.setSelectionRange(valor.length, valor.length);
  }, [valor, inputRef]);

  function aoPressionar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!valor.trim()) return;
      navegacao.current = null;
      restaurarFoco.current = true;
      onEnviar(valor);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      navegacao.current = null;
      onLimpar();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
      // Em texto com várias linhas, a seta só troca de pedido a partir da primeira ou da última.
      const subindo = e.key === 'ArrowUp';
      const trecho = subindo ? valor.slice(0, el.selectionStart) : valor.slice(el.selectionEnd);
      if (trecho.includes('\n')) return;
      const passo = navegarHistorico(historico, navegacao.current, subindo ? 'cima' : 'baixo', valor);
      if (!passo) return;
      e.preventDefault();
      navegacao.current = passo.navegacao;
      moverCursorParaFim.current = true;
      onChange(passo.texto);
    }
  }

  const mostrarBloco = !focado && !valor && !processando;

  return (
    <div className="shrink-0 border-t border-hud-line px-3 py-2 font-mono text-xs">
      <div className="flex items-start gap-1.5">
        <span aria-hidden className="leading-relaxed text-hud-cyan">
          &gt;
        </span>
        <div className="relative min-w-0 flex-1">
          {mostrarBloco && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-[0.2rem] left-0 h-3 w-1.5 animate-pulse bg-hud-cyan"
            />
          )}
          <textarea
            ref={inputRef}
            aria-label="Pedido para o Jarvis"
            aria-busy={processando}
            rows={1}
            disabled={processando}
            value={processando ? '' : valor}
            placeholder={processando ? '' : 'digite ou fale um pedido'}
            onChange={(e) => {
              navegacao.current = null;
              onChange(e.target.value);
            }}
            onKeyDown={aoPressionar}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            className={`hud-scroll block max-h-24 w-full resize-none overflow-y-auto bg-transparent leading-relaxed break-words text-hud-text caret-hud-cyan outline-none placeholder:text-hud-dim/70 disabled:cursor-wait ${mostrarBloco ? '[text-indent:0.75rem]' : ''}`}
          />
        </div>
      </div>
      {processando ? (
        <p data-testid="processando" className="mt-1 flex items-center gap-2 text-hud-cyan">
          <span aria-hidden className="size-1.5 animate-ping bg-hud-cyan" />
          processando...
        </p>
      ) : (
        <p className="mt-1 text-[0.625rem] leading-snug text-hud-dim">
          / foca · Enter envia · Shift+Enter quebra linha · ↑↓ histórico · Esc limpa
        </p>
      )}
    </div>
  );
}

function pick(e: globalThis.KeyboardEvent) {
  return { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, isComposing: e.isComposing };
}
