import { describe, expect, it } from 'vitest';
import { lerModelos } from '../config';
import { proximaRenovacaoDeCota } from './cotaDiaria';

describe('proximaRenovacaoDeCota', () => {
  it.each([
    ['horário de verão', '2026-10-30T14:00:00Z', '2026-10-31T07:00:00Z'],
    ['horário padrão', '2026-12-15T14:00:00Z', '2026-12-16T08:00:00Z'],
    ['logo antes da virada', '2026-10-31T06:59:00Z', '2026-10-31T07:00:00Z'],
    ['logo depois da virada', '2026-10-31T07:01:00Z', '2026-11-01T07:00:00Z'],
    ['dia da troca para o horário padrão', '2026-11-01T12:00:00Z', '2026-11-02T08:00:00Z'],
    ['virada de mês e ano', '2026-12-31T20:00:00Z', '2027-01-01T08:00:00Z'],
  ])('%s', (_nome, agora, esperado) => {
    expect(new Date(proximaRenovacaoDeCota(Date.parse(agora))).toISOString()).toBe(
      new Date(esperado).toISOString(),
    );
  });
});

describe('lerModelos', () => {
  it('lê em ordem, ignora espaços e repetições', () => {
    expect(lerModelos(' a , b,,a ,c')).toEqual(['a', 'b', 'c']);
  });

  it('usa a lista padrão quando vazio', () => {
    expect(lerModelos(undefined)[0]).toBe('gemini-3.5-flash');
    expect(lerModelos('  ').at(-1)).toBe('gemini-3.8-flash');
  });
});
