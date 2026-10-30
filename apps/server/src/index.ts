import { buildApp } from './app';
import { config } from './config';

const app = buildApp();

try {
  await app.listen({ host: config.host, port: config.port });
  console.log(`J.A.R.V.I.S servidor em http://${config.host}:${config.port}`);
  if (!config.geminiApiKey) console.warn('GEMINI_API_KEY não configurada no .env');
} catch (erro) {
  console.error('Não foi possível iniciar o servidor:', erro);
  process.exit(1);
}
