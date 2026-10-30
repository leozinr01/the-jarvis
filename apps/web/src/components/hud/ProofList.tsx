import type { Prova } from '@jarvis/shared';
import { isSafeHttpUrl } from '@jarvis/shared/url';

export function ProofList({ provas }: { provas: Prova[] }) {
  const validas = provas.filter((prova) => isSafeHttpUrl(prova.fonte.url));
  if (validas.length === 0) return null;

  return (
    <section aria-label="Provas" className="mt-6 border-t border-hud-line pt-4">
      <h3 className="hud-label mb-1">Provas ({validas.length})</h3>
      <p className="mb-3 font-mono text-xs text-hud-dim">
        Cada citação foi conferida no texto da fonte. Abra o link para ver o contexto.
      </p>
      <ol className="space-y-3">
        {validas.map((prova) => (
          <li key={prova.afirmacao + prova.fonte.url} className="border-l-2 border-hud-blue pl-3">
            <p className="text-sm font-semibold text-hud-text">{prova.afirmacao}</p>
            <blockquote className="mt-1 text-sm leading-relaxed text-hud-text/75 italic">“{prova.trecho}”</blockquote>
            <a
              href={prova.fonte.url}
              target="_blank"
              rel="noreferrer noopener"
              title={prova.fonte.url}
              className="mt-1 inline-block font-mono text-xs text-hud-blue underline hover:text-hud-cyan"
            >
              {prova.fonte.titulo}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
