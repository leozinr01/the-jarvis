import type { ReactNode } from 'react';
import { Panel } from './Panel';

export function Terminal({ pedido, log, children }: { pedido: string; log: string[]; children?: ReactNode }) {
  return (
    <Panel titulo="Terminal" className="min-h-40 flex-1">
      <div className="hud-scroll flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        <p data-testid="pedido" className="break-words whitespace-pre-wrap text-hud-cyan">
          &gt; pedido: {pedido}
        </p>
        <ul aria-live="polite" className="mt-2 text-hud-dim">
          {log.map((linha, i) => (
            <li key={i}>· {linha}</li>
          ))}
        </ul>
      </div>
      {children}
    </Panel>
  );
}
