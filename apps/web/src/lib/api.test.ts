import { describe, expect, it } from 'vitest';
import { extrairEventos } from './api';

describe('extrairEventos', () => {
  it('separa eventos completos', () => {
    const { eventos, resto } = extrairEventos(
      'data: {"tipo":"etapa","texto":"a"}\n\ndata: {"tipo":"etapa","texto":"b"}\n\n',
    );
    expect(eventos.map((e) => e.tipo === 'etapa' && e.texto)).toEqual(['a', 'b']);
    expect(resto).toBe('');
  });

  it('guarda o evento que chegou pela metade', () => {
    const parte1 = extrairEventos('data: {"tipo":"etapa","texto":"a"}\n\ndata: {"tipo":"et');
    expect(parte1.eventos).toHaveLength(1);
    const parte2 = extrairEventos(`${parte1.resto}apa","texto":"b"}\n\n`);
    expect(parte2.eventos).toEqual([{ tipo: 'etapa', texto: 'b' }]);
  });
});
