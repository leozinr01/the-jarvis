import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const raiz = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
loadEnv({ path: resolve(raiz, '.env') });

const MODELOS_PADRAO = 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash';

export function lerModelos(valor: string | undefined): string[] {
  const modelos = (valor?.trim() ? valor : MODELOS_PADRAO).split(',').map((m) => m.trim()).filter(Boolean);
  return [...new Set(modelos)];
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
  geminiModelos: lerModelos(process.env.GEMINI_MODELS),
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 25000,
  tratamento: process.env.JARVIS_TRATAMENTO || 'senhor',
  port: Number(process.env.PORT) || 3001,
  // Só a própria máquina acessa o servidor: a chave do Gemini fica aqui.
  host: '127.0.0.1',
};
