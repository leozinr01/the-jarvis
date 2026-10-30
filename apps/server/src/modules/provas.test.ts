import { describe, expect, it } from 'vitest';
import { fontesDasProvas, limitarCerteza, verificarProvas } from './provas';

const RESULTADOS = [
  { titulo: 'A', url: 'https://a.com', conteudo: 'A Petrobras foi criada em 3 de outubro de 1953, pelo presidente.' },
  { titulo: 'B', url: 'https://b.org', conteudo: 'Sua sede  fica\nno “Rio de Janeiro”, segundo a empresa.' },
];

describe('verificarProvas', () => {
  it('aceita citação literal e usa a fonte real da busca', () => {
    expect(
      verificarProvas([{ afirmacao: 'Criada em 1953', fonte: 1, citacao: 'criada em 3 de outubro de 1953' }], RESULTADOS),
    ).toEqual([
      {
        afirmacao: 'Criada em 1953',
        trecho: 'criada em 3 de outubro de 1953',
        fonte: { titulo: 'A', url: 'https://a.com' },
      },
    ]);
  });

  it('tolera diferenças de maiúsculas, espaços, aspas e reticências', () => {
    const provas = verificarProvas(
      [{ afirmacao: 'Sede', fonte: 2, citacao: '...SUA SEDE fica no "Rio de Janeiro"...' }],
      RESULTADOS,
    );
    expect(provas).toHaveLength(1);
  });

  it('descarta citação inventada', () => {
    expect(
      verificarProvas([{ afirmacao: 'x', fonte: 1, citacao: 'foi criada em 1960 por outra pessoa' }], RESULTADOS),
    ).toEqual([]);
  });

  it('descarta citação verdadeira atribuída à fonte errada', () => {
    expect(verificarProvas([{ afirmacao: 'x', fonte: 2, citacao: 'criada em 3 de outubro de 1953' }], RESULTADOS)).toEqual([]);
  });

  it('descarta fonte inexistente e citação curta demais', () => {
    expect(
      verificarProvas(
        [
          { afirmacao: 'x', fonte: 9, citacao: 'criada em 3 de outubro de 1953' },
          { afirmacao: 'x', fonte: 0, citacao: 'criada em 3 de outubro de 1953' },
          { afirmacao: 'x', fonte: 1, citacao: 'Petrobras' },
        ],
        RESULTADOS,
      ),
    ).toEqual([]);
  });

  it('não repete a mesma afirmação com a mesma fonte', () => {
    const repetida = { afirmacao: 'x', fonte: 1, citacao: 'criada em 3 de outubro de 1953' };
    expect(verificarProvas([repetida, repetida], RESULTADOS)).toHaveLength(1);
  });
});

describe('fontesDasProvas', () => {
  it('lista cada página uma vez', () => {
    const fonte = { titulo: 'A', url: 'https://a.com' };
    expect(fontesDasProvas([{ afirmacao: '1', trecho: 't', fonte }, { afirmacao: '2', trecho: 't', fonte }])).toEqual([fonte]);
  });
});

describe('limitarCerteza', () => {
  const fontes = (...urls: string[]) => urls.map((url) => ({ titulo: 't', url }));

  it('sem fontes é zero, mesmo se o modelo disser 100', () => {
    expect(limitarCerteza(100, [], 1)).toBe(0);
  });

  it('um único site tem teto de 60', () => {
    expect(limitarCerteza(100, fontes('https://www.a.com/1', 'https://a.com/2'), 1)).toBe(60);
  });

  it('mais sites e mais citações confirmadas sobem o teto, sem chegar a 100', () => {
    const dois = limitarCerteza(100, fontes('https://a.com', 'https://b.com'), 0.5);
    const quatro = limitarCerteza(100, fontes('https://a.com', 'https://b.com', 'https://c.com', 'https://d.com'), 1);
    expect(dois).toBeLessThan(quatro);
    expect(quatro).toBe(95);
  });

  it('respeita estimativa menor que o teto', () => {
    expect(limitarCerteza(20, fontes('https://a.com', 'https://b.com'), 1)).toBe(20);
  });
});
