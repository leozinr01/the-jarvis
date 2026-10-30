import type { Modulo, Resposta } from '@jarvis/shared';

const PENDENTES: Partial<Record<Modulo, { nome: string; etapa: number }>> = {
  calculo: { nome: 'cálculo', etapa: 6 },
  juridico: { nome: 'jurídico', etapa: 6 },
};

/** Responder de memória nesses módulos violaria as regras de fontes: é melhor dizer que ainda não existem. */
export function respostaPendente(modulo: Modulo): Resposta | null {
  const pendente = PENDENTES[modulo];
  if (!pendente) return null;
  return {
    modulo,
    titulo: `Módulo de ${pendente.nome} indisponível`,
    paragrafos: [
      `Entendi o pedido como ${pendente.nome}, mas esse módulo só entra na etapa ${pendente.etapa}. Prefiro não responder de memória, sem as fontes ou as ferramentas que ele exige.`,
    ],
    destaques: [],
    certeza: 0,
    fontes: [],
    provas: [],
    aviso: null,
  };
}
