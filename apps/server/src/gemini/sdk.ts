import { GoogleGenAI } from '@google/genai';
import type { ChamadaGemini, GeminiPort } from './cliente';
import { GeminiErro, statusDoErro } from './erros';

export function criarPortaGemini(apiKey: string): GeminiPort {
  let cliente: GoogleGenAI | undefined;

  async function chamar(c: ChamadaGemini, comRaciocinio: boolean) {
    cliente ??= new GoogleGenAI({ apiKey });
    return cliente.interactions.create(
      {
        model: c.modelo,
        // O histórico fica neste servidor; nada precisa ser guardado do lado do Google.
        store: false,
        system_instruction: c.sistema,
        ...(comRaciocinio ? { generation_config: { thinking_level: c.raciocinio } } : {}),
        response_format: { type: 'text', mime_type: 'application/json', schema: c.schema },
        input: c.mensagens.map((m) => ({
          type: m.papel === 'usuario' ? ('user_input' as const) : ('model_output' as const),
          content: [{ type: 'text' as const, text: m.texto }],
        })),
      },
      { fetchOptions: { signal: c.signal }, retries: { strategy: 'none' } },
    );
  }

  return async (c) => {
    if (!apiKey) throw new GeminiErro('chave');
    let interacao;
    try {
      interacao = await chamar(c, true);
    } catch (erro) {
      // Cada modelo aceita níveis diferentes de raciocínio; a recusa não consome cota.
      const recusou = statusDoErro(erro) === 400 && /thinking level/i.test(String((erro as Error).message));
      if (!recusou) throw erro;
      interacao = await chamar(c, false);
    }
    if (!interacao.output_text) throw new GeminiErro('interno', 'resposta vazia');
    return interacao.output_text;
  };
}
