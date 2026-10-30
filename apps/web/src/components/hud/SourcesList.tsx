import type { Fonte } from '@jarvis/shared';
import { isSafeHttpUrl } from '@jarvis/shared/url';
import { Panel } from './Panel';

export function SourcesList({ fontes }: { fontes: Fonte[] }) {
  const seguras = fontes.filter((fonte) => isSafeHttpUrl(fonte.url));

  return (
    <Panel titulo={`Fontes (${seguras.length})`} className="max-h-[40%] shrink-0">
      {seguras.length === 0 ? (
        <p className="p-3 font-mono text-xs text-hud-dim">Nenhuma fonte nesta resposta.</p>
      ) : (
        <ol className="hud-scroll overflow-y-auto p-2 font-mono text-xs">
          {seguras.map((fonte, i) => (
            <li key={fonte.url}>
              <a
                href={fonte.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate px-1 py-1 text-hud-blue hover:bg-hud-cyan/10 hover:text-hud-cyan"
                title={fonte.url}
              >
                [{i + 1}] {fonte.titulo}
              </a>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
