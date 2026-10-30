import { expect, it } from 'vitest';
import { acumularDestaques } from './destaques';

const card = (titulo: string, valor = 'v') => ({ titulo, valor, fonte_url: null });

it('acumula em ordem de chegada sem repetir', () => {
  const resultado = acumularDestaques([card('a')], [card('b'), card('a'), card('b'), card('a', 'outro')]);
  expect(resultado.map((d) => d.titulo + d.valor)).toEqual(['av', 'bv', 'aoutro']);
});
