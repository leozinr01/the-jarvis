import { describe, expect, it } from 'vitest';
import { deveFocarCampo } from './shortcuts';

const tecla = (extra = {}) => ({
  key: '/',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isComposing: false,
  target: { tagName: 'BODY', isContentEditable: false },
  ...extra,
});

describe('deveFocarCampo', () => {
  it('foca fora de campos editáveis', () => {
    expect(deveFocarCampo(tecla())).toBe(true);
    expect(deveFocarCampo(tecla({ target: { tagName: 'BUTTON' } }))).toBe(true);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('não interfere em %s', (tagName) => {
    expect(deveFocarCampo(tecla({ target: { tagName } }))).toBe(false);
  });

  it('não interfere em contenteditable, atalhos, composição ou outras teclas', () => {
    expect(deveFocarCampo(tecla({ target: { tagName: 'DIV', isContentEditable: true } }))).toBe(false);
    expect(deveFocarCampo(tecla({ ctrlKey: true }))).toBe(false);
    expect(deveFocarCampo(tecla({ metaKey: true }))).toBe(false);
    expect(deveFocarCampo(tecla({ altKey: true }))).toBe(false);
    expect(deveFocarCampo(tecla({ isComposing: true }))).toBe(false);
    expect(deveFocarCampo(tecla({ key: 'a' }))).toBe(false);
  });
});
