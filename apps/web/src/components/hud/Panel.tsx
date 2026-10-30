import type { ReactNode } from 'react';

export function Panel({
  titulo,
  className = '',
  children,
}: {
  titulo: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col border border-hud-line bg-hud-panel/80 ${className}`}>
      <h2 className="hud-label shrink-0 border-b border-hud-line px-3 py-1.5">{titulo}</h2>
      {children}
    </section>
  );
}
