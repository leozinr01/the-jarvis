// O reconhecedor em pt-BR costuma transcrever "Jarvis" de outras formas, como "Jarbas".
const WAKE_WORD = /(?:^|[^\p{L}])(?:d?jarv[iaey]s|jar vis|jarbas)(?!\p{L})[\s,.:;!?-]*/iu;

/** Retorna o que vem depois da palavra de ativação, ou null se ela não foi dita. */
export function extractAfterWakeWord(transcript: string): string | null {
  const match = WAKE_WORD.exec(transcript);
  if (!match) return null;
  return transcript.slice(match.index + match[0].length).trim();
}
