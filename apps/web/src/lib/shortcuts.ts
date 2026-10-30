const TAGS_EDITAVEIS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

interface TeclaGlobal {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
}

/** "/" só foca o campo quando a pessoa não está digitando em outro lugar. */
export function deveFocarCampo(e: TeclaGlobal): boolean {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  return !(e.target?.isContentEditable || TAGS_EDITAVEIS.has(e.target?.tagName ?? ''));
}
