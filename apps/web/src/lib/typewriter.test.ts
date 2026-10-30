import { describe, expect, it } from 'vitest';
import { nextTyped } from './typewriter';

describe('nextTyped', () => {
  it('avança uma letra por vez até o alvo', () => {
    expect(nextTyped('', 'abc')).toBe('a');
    expect(nextTyped('a', 'abc')).toBe('ab');
    expect(nextTyped('abc', 'abc')).toBe('abc');
  });

  it('volta ao trecho comum quando o alvo é revisado', () => {
    expect(nextTyped('qual e', 'qual é')).toBe('qual ');
    expect(nextTyped('abc', '')).toBe('');
  });
});
