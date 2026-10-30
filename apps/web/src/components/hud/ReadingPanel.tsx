import type { Prova } from '@jarvis/shared';
import { splitSentences } from '../../lib/sentences';
import { ProofList } from './ProofList';

interface Props {
  titulo: string;
  paragrafos: string[];
  aviso: string | null;
  provas: Prova[];
  /** Índice da frase em leitura, contado em todo o texto. */
  fraseAtual: number | null;
}

export function ReadingPanel({ titulo, paragrafos, aviso, provas, fraseAtual }: Props) {
  let contador = 0;

  return (
    <main className="hud-scroll min-h-0 flex-1 overflow-y-auto border border-hud-line bg-hud-panel/60 px-6 py-5 xl:px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-xl font-semibold text-hud-text xl:text-2xl">{titulo}</h2>
        {aviso && (
          <p className="mb-4 border-l-2 border-hud-warn pl-3 font-mono text-xs text-hud-warn">{aviso}</p>
        )}
        {paragrafos.map((paragrafo, i) => (
          <p key={i} className="mb-4 text-base leading-relaxed text-hud-text/75 xl:text-lg">
            {splitSentences(paragrafo).map((frase) => {
              const indice = contador++;
              return (
                <span
                  key={indice}
                  className={indice === fraseAtual ? 'bg-hud-cyan/15 text-hud-cyan' : undefined}
                >
                  {frase}
                </span>
              );
            })}
          </p>
        ))}
        <ProofList provas={provas} />
      </div>
    </main>
  );
}
