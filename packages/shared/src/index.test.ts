import { describe, expect, it } from 'vitest';
import { RespostaSchema } from './index';
import { isSafeHttpUrl } from './url';

describe('RespostaSchema', () => {
  const valida = {
    modulo: 'pesquisa',
    titulo: 'T',
    paragrafos: ['p'],
    destaques: [{ titulo: 'a', valor: 'b', fonte_url: null }],
    certeza: 80,
    fontes: [{ titulo: 'f', url: 'https://exemplo.com' }],
    provas: [{ afirmacao: 'a', trecho: 't', fonte: { titulo: 'f', url: 'https://exemplo.com' } }],
    aviso: null,
  };

  it('aceita o formato combinado', () => {
    expect(RespostaSchema.safeParse(valida).success).toBe(true);
  });

  it('rejeita módulo desconhecido e certeza fora de 0 a 100', () => {
    expect(RespostaSchema.safeParse({ ...valida, modulo: 'outro' }).success).toBe(false);
    expect(RespostaSchema.safeParse({ ...valida, certeza: 101 }).success).toBe(false);
  });
});

describe('isSafeHttpUrl', () => {
  it('aceita só http e https', () => {
    expect(isSafeHttpUrl('https://exemplo.com/a')).toBe(true);
    expect(isSafeHttpUrl('http://exemplo.com')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,x')).toBe(false);
    expect(isSafeHttpUrl('não é url')).toBe(false);
  });
});
