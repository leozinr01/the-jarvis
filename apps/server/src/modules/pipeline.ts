import type { EventoPedido, PedidoRequest, Resposta } from '@jarvis/shared';
import type { BuscaPort } from '../busca/tavily';
import type { GeminiCliente } from '../gemini/cliente';
import { GeminiErro } from '../gemini/erros';
import type { ConversationStore } from '../memory/conversationStore';
import type { ContextoPedido } from './contexto';
import { responderGeral } from './geral';
import { respostaPendente } from './pendente';
import { responderPesquisa } from './pesquisa';
import { classificar } from './roteador';

export interface PipelineDeps {
  gemini: GeminiCliente;
  buscar: BuscaPort;
  store: ConversationStore;
  tratamento: string;
}

/** Texto salvo no histórico: o que o modelo precisa para entender continuações. */
function textoParaHistorico(resposta: Resposta): string {
  return [resposta.titulo, ...resposta.paragrafos].join('\n');
}

export async function processarPedido(
  deps: PipelineDeps,
  { conversaId, texto }: PedidoRequest,
  emitir: (evento: EventoPedido) => void,
  signal: AbortSignal,
): Promise<void> {
  const avisados = new Set<string>();

  try {
    const historico = await deps.store.obter(conversaId);
    const ctx: ContextoPedido = {
      gemini: deps.gemini,
      buscar: deps.buscar,
      tratamento: deps.tratamento,
      historico,
      texto,
      signal,
      // Roteador e resposta podem pular os mesmos modelos: cada aviso aparece uma vez.
      avisar: (aviso) => {
        if (avisados.has(aviso)) return;
        avisados.add(aviso);
        console.warn(`[jarvis] ${aviso}`);
        emitir({ tipo: 'etapa', texto: aviso });
      },
    };

    ctx.avisar('classificando...');
    const { modulo, confianca, consulta_busca: consulta } = await classificar(ctx);
    emitir({ tipo: 'modulo', modulo, confianca });

    const pendente = respostaPendente(modulo);
    if (pendente) {
      // Não entra no histórico: uma futura resposta não deve aprender que "não sabe".
      emitir({ tipo: 'resposta', resposta: pendente });
      return;
    }

    let resposta: Resposta;
    if (modulo === 'pesquisa') {
      resposta = await responderPesquisa(ctx, consulta?.trim() || texto);
    } else {
      ctx.avisar('elaborando resposta...');
      resposta = await responderGeral(ctx, modulo === 'tecnico' ? 'tecnico' : 'conversa');
    }

    if (modulo !== 'pesquisa' || resposta.fontes.length > 0) {
      await deps.store.adicionar(
        conversaId,
        { papel: 'usuario', texto },
        { papel: 'modelo', texto: textoParaHistorico(resposta) },
      );
    }
    emitir({ tipo: 'resposta', resposta });
  } catch (erro) {
    if (signal.aborted) return;
    const falha = erro instanceof GeminiErro ? erro : new GeminiErro('interno');
    if (!(erro instanceof GeminiErro)) console.error('Erro inesperado no pedido:', erro);
    emitir({ tipo: 'erro', codigo: falha.codigo, mensagem: falha.message });
  }
}
