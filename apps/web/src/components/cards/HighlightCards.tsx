import type { Destaque } from '@jarvis/shared';
import { isSafeHttpUrl } from '@jarvis/shared/url';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CARD_HEIGHT, getCardSlots, getRailLayout, type Viewport } from '../../lib/cardSlots';

export function HighlightCards({ destaques, viewport }: { destaques: Destaque[]; viewport: Viewport }) {
  const [aberto, setAberto] = useState<Destaque | null>(null);
  const slots = getCardSlots(viewport);
  const { cardWidth } = getRailLayout(viewport.width);
  // Quando as bordas enchem, ficam os mais recentes e os antigos são contados no indicador.
  const ocultos = Math.max(0, destaques.length - slots.length);
  const visiveis = destaques.slice(ocultos);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto]);

  const centro = {
    x: viewport.width / 2 - cardWidth / 2,
    y: viewport.height / 2 - CARD_HEIGHT / 2,
  };

  return (
    <>
      {visiveis.map((destaque, i) => {
        const slot = slots[i]!;
        return (
          <motion.button
            key={destaque.titulo + destaque.valor}
            type="button"
            onClick={() => setAberto(destaque)}
            style={{ width: cardWidth, height: CARD_HEIGHT }}
            className="fixed top-0 left-0 z-20 cursor-pointer overflow-hidden border border-hud-blue bg-hud-panel p-2 text-left hover:border-hud-cyan"
            initial={{ x: centro.x, y: centro.y, scale: 1.5, opacity: 0 }}
            animate={{ x: slot.x, y: slot.y, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 17 }}
          >
            <span className="hud-label block truncate">{destaque.titulo}</span>
            <span className="mt-1 line-clamp-2 block font-mono text-xs leading-snug text-hud-cyan">
              {destaque.valor}
            </span>
          </motion.button>
        );
      })}

      {ocultos > 0 && (
        <p className="hud-label fixed bottom-1 left-1/2 z-20 -translate-x-1/2 bg-hud-bg px-2">
          +{ocultos} destaques anteriores
        </p>
      )}

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center bg-hud-bg/70 p-4"
            onClick={() => setAberto(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={aberto.titulo}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md border border-hud-cyan bg-hud-panel p-5"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="hud-label">{aberto.titulo}</h3>
              <p className="mt-2 font-mono text-lg text-hud-cyan">{aberto.valor}</p>
              {aberto.fonte_url && isSafeHttpUrl(aberto.fonte_url) ? (
                <a
                  href={aberto.fonte_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 block font-mono text-xs break-all text-hud-blue hover:text-hud-cyan"
                >
                  Fonte: {aberto.fonte_url}
                </a>
              ) : (
                <p className="mt-4 font-mono text-xs text-hud-dim">Sem fonte associada a este destaque.</p>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => setAberto(null)}
                className="mt-4 cursor-pointer border border-hud-line px-3 py-1 font-mono text-xs hover:border-hud-cyan"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
