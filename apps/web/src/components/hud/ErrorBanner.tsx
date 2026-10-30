export function ErrorBanner({ mensagem, onFechar }: { mensagem: string; onFechar(): void }) {
  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-center gap-4 border-b border-hud-warn bg-hud-warn/15 px-4 py-1.5 font-mono text-xs text-hud-warn"
    >
      <span>{mensagem}</span>
      <button type="button" onClick={onFechar} className="cursor-pointer underline hover:text-hud-text">
        Fechar
      </button>
    </div>
  );
}
