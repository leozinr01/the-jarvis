/** Só http(s) pode virar link clicável: bloqueia javascript:, data: etc. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
