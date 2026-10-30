import type { MensagemHistorico } from '../gemini/cliente';

/** Assíncrona de propósito: o Supabase poderá substituir a versão em memória sem mudar os módulos. */
export interface ConversationStore {
  obter(conversaId: string): Promise<MensagemHistorico[]>;
  adicionar(conversaId: string, ...mensagens: MensagemHistorico[]): Promise<void>;
}

const MAX_MENSAGENS = 40;
const MAX_CONVERSAS = 100;

export class MemoryConversationStore implements ConversationStore {
  private readonly conversas = new Map<string, MensagemHistorico[]>();

  async obter(conversaId: string): Promise<MensagemHistorico[]> {
    return [...(this.conversas.get(conversaId) ?? [])];
  }

  async adicionar(conversaId: string, ...mensagens: MensagemHistorico[]): Promise<void> {
    const atual = this.conversas.get(conversaId) ?? [];
    // Reinsere para a mais antiga ser sempre a primeira do Map.
    this.conversas.delete(conversaId);
    this.conversas.set(conversaId, [...atual, ...mensagens].slice(-MAX_MENSAGENS));
    if (this.conversas.size > MAX_CONVERSAS) {
      const maisAntiga = this.conversas.keys().next().value;
      if (maisAntiga !== undefined) this.conversas.delete(maisAntiga);
    }
  }
}
