import type { Modulo, StatusJarvis } from '@jarvis/shared';
import { useEffect, useState } from 'react';

const ROTULOS: Record<StatusJarvis, string> = {
  ocioso: 'em espera',
  aguardando: 'aguardando "Jarvis"',
  ouvindo: 'ouvindo',
  pensando: 'pensando',
  falando: 'falando',
};

const formatarHora = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function TopBar({ modulo, status }: { modulo: Modulo | null; status: StatusJarvis }) {
  const [hora, setHora] = useState(formatarHora);

  useEffect(() => {
    const id = window.setInterval(() => setHora(formatarHora()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-hud-line px-4 font-mono">
      <h1 className="text-sm font-semibold tracking-[0.2em] text-hud-cyan">
        J.A.R.V.I.S <span className="text-hud-dim">/ {(modulo ?? 'em espera').toUpperCase()}</span>
      </h1>
      <div className="flex items-center gap-6 text-xs tracking-widest uppercase">
        <span className="flex items-center gap-2" role="status">
          <span
            aria-hidden
            className={`size-2 ${status === 'ocioso' ? 'bg-hud-dim' : 'animate-pulse bg-hud-cyan'}`}
          />
          {ROTULOS[status]}
        </span>
        <time className="tabular-nums text-hud-dim">{hora}</time>
      </div>
    </header>
  );
}
