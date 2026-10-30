import { describe, expect, it } from 'vitest';
import { isBrave } from './browserSupport';

describe('isBrave', () => {
  it('detecta o Brave pela API própria', async () => {
    expect(await isBrave({ brave: { isBrave: async () => true } })).toBe(true);
  });

  it('não acusa outros navegadores nem falhas da API', async () => {
    expect(await isBrave({})).toBe(false);
    expect(await isBrave({ brave: {} })).toBe(false);
    expect(await isBrave({ brave: { isBrave: async () => false } })).toBe(false);
    expect(await isBrave({ brave: { isBrave: () => Promise.reject(new Error('x')) } })).toBe(false);
  });
});
