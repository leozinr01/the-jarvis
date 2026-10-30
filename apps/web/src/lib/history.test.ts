import { describe, expect, it } from 'vitest';
import { adicionarAoHistorico, navegarHistorico } from './history';

describe('adicionarAoHistorico', () => {
  it('não repete o último pedido e respeita o limite', () => {
    expect(adicionarAoHistorico(['a'], 'a')).toEqual(['a']);
    expect(adicionarAoHistorico(['a'], 'b')).toEqual(['a', 'b']);
    const cheio = Array.from({ length: 100 }, (_, i) => String(i));
    const novo = adicionarAoHistorico(cheio, 'x');
    expect(novo).toHaveLength(100);
    expect(novo.at(-1)).toBe('x');
  });
});

describe('navegarHistorico', () => {
  const itens = ['a', 'b', 'c'];

  it('sobe do mais recente ao mais antigo e para no primeiro', () => {
    const p1 = navegarHistorico(itens, null, 'cima', 'rascunho')!;
    expect(p1.texto).toBe('c');
    const p2 = navegarHistorico(itens, p1.navegacao, 'cima', p1.texto)!;
    expect(p2.texto).toBe('b');
    const p3 = navegarHistorico(itens, p2.navegacao, 'cima', p2.texto)!;
    const p4 = navegarHistorico(itens, p3.navegacao, 'cima', p3.texto)!;
    expect(p4.texto).toBe('a');
  });

  it('ao descer até o fim devolve o que estava sendo digitado', () => {
    const p1 = navegarHistorico(itens, null, 'cima', 'rascunho')!;
    const p2 = navegarHistorico(itens, p1.navegacao, 'baixo', p1.texto)!;
    expect(p2).toEqual({ navegacao: null, texto: 'rascunho' });
  });

  it('não faz nada sem histórico ou descendo sem estar navegando', () => {
    expect(navegarHistorico([], null, 'cima', '')).toBeNull();
    expect(navegarHistorico(itens, null, 'baixo', '')).toBeNull();
  });
});
