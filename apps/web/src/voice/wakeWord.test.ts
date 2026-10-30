import { describe, expect, it } from 'vitest';
import { extractAfterWakeWord } from './wakeWord';

describe('extractAfterWakeWord', () => {
  it.each([
    ['Jarvis, quero saber a hora', 'quero saber a hora'],
    ['jarvis qual é a capital', 'qual é a capital'],
    ['ok Jarvis: me ajude', 'me ajude'],
    ['Jarbas que horas são', 'que horas são'],
    ['djarvis abre', 'abre'],
    ['jar vis abre', 'abre'],
    ['Jarvis', ''],
    ['Jarvis.', ''],
  ])('%s', (entrada, esperado) => {
    expect(extractAfterWakeWord(entrada)).toBe(esperado);
  });

  it.each(['conversa qualquer', 'jarvisão chegou', 'o superjarvis', ''])('ignora "%s"', (entrada) => {
    expect(extractAfterWakeWord(entrada)).toBeNull();
  });
});
