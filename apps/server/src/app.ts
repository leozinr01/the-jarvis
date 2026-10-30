import { PedidoRequestSchema, type EventoPedido } from '@jarvis/shared';
import Fastify from 'fastify';
import { criarBuscaTavily, type BuscaPort } from './busca/tavily';
import { config } from './config';
import { GeminiCliente, type GeminiPort } from './gemini/cliente';
import { criarPortaGemini } from './gemini/sdk';
import { MemoryConversationStore } from './memory/conversationStore';
import { processarPedido, type PipelineDeps } from './modules/pipeline';

function criarDeps(porta: GeminiPort, buscar: BuscaPort): PipelineDeps {
  return {
    gemini: new GeminiCliente(porta, config.geminiModelos, config.geminiTimeoutMs),
    buscar,
    store: new MemoryConversationStore(),
    tratamento: config.tratamento,
  };
}

export function buildApp(
  porta: GeminiPort = criarPortaGemini(config.geminiApiKey),
  buscar: BuscaPort = criarBuscaTavily(config.tavilyApiKey),
) {
  const app = Fastify({ logger: false });
  const deps = criarDeps(porta, buscar);

  app.get('/api/health', async () => ({
    status: 'ok',
    modelos: config.geminiModelos,
    chaveConfigurada: config.geminiApiKey.length > 0,
    buscaConfigurada: config.tavilyApiKey.length > 0,
  }));

  app.post('/api/pedido', async (request, reply) => {
    const pedido = PedidoRequestSchema.safeParse(request.body);
    if (!pedido.success) {
      return reply.code(400).send({ mensagem: 'Pedido inválido ou longo demais.' });
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    // Se a página for fechada, para de gastar a API com esse pedido.
    const cancelamento = new AbortController();
    reply.raw.on('close', () => cancelamento.abort());

    const emitir = (evento: EventoPedido) => {
      if (!reply.raw.writableEnded) reply.raw.write(`data: ${JSON.stringify(evento)}\n\n`);
    };

    await processarPedido(deps, pedido.data, emitir, cancelamento.signal);
    reply.raw.end();
  });

  return app;
}
