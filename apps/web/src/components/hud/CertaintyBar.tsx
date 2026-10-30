import { motion } from 'framer-motion';
import { Panel } from './Panel';

export function CertaintyBar({ valor }: { valor: number }) {
  return (
    <Panel titulo="Certeza" className="shrink-0">
      <div className="flex items-center gap-3 p-3">
        <div
          role="progressbar"
          aria-label="Certeza da resposta"
          aria-valuenow={valor}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 flex-1 border border-hud-line"
        >
          <motion.div
            className="h-full bg-hud-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${valor}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>
        <span className="w-10 text-right font-mono text-sm tabular-nums text-hud-cyan">{valor}%</span>
      </div>
    </Panel>
  );
}
