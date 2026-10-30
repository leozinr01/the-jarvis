import { z } from 'zod';

export const MODULOS = ['pesquisa', 'calculo', 'juridico', 'tecnico', 'conversa'] as const;
export const ModuloSchema = z.enum(MODULOS);

export const DestaqueSchema = z.object({
  titulo: z.string(),
  valor: z.string(),
  fonte_url: z.string().nullable(),
});

export const FonteSchema = z.object({
  titulo: z.string(),
  url: z.string(),
});

/** Afirmação da resposta, com o trecho literal da fonte que a sustenta. */
export const ProvaSchema = z.object({
  afirmacao: z.string(),
  trecho: z.string(),
  fonte: FonteSchema,
});

export const RespostaSchema = z.object({
  modulo: ModuloSchema,
  titulo: z.string(),
  paragrafos: z.array(z.string()),
  destaques: z.array(DestaqueSchema),
  certeza: z.number().min(0).max(100),
  fontes: z.array(FonteSchema),
  provas: z.array(ProvaSchema),
  aviso: z.string().nullable(),
});

export type Modulo = z.infer<typeof ModuloSchema>;
export type Destaque = z.infer<typeof DestaqueSchema>;
export type Fonte = z.infer<typeof FonteSchema>;
export type Prova = z.infer<typeof ProvaSchema>;
export type Resposta = z.infer<typeof RespostaSchema>;

export const PedidoRequestSchema = z.object({
  conversaId: z.string().min(1).max(100),
  texto: z.string().trim().min(1).max(4000),
});
export type PedidoRequest = z.infer<typeof PedidoRequestSchema>;

export type CodigoErro =
  | 'chave'
  | 'limite'
  | 'busca_chave'
  | 'busca_limite'
  | 'busca_falhou'
  | 'indisponivel'
  | 'tempo'
  | 'sem_internet'
  | 'interno';

/** Eventos enviados pelo servidor enquanto um pedido é processado. */
export type EventoPedido =
  | { tipo: 'etapa'; texto: string }
  | { tipo: 'modulo'; modulo: Modulo; confianca: number }
  | { tipo: 'resposta'; resposta: Resposta }
  | { tipo: 'erro'; codigo: CodigoErro; mensagem: string };

export type StatusJarvis ='ocioso' | 'aguardando' | 'ouvindo' | 'pensando' | 'falando';
