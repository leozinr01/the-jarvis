import { useEffect, useState } from 'react';
import { nextTyped } from '../lib/typewriter';

const MS_POR_LETRA = 18;

export function useTypewriter(alvo: string): string {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => {
      setTexto((atual) => {
        if (atual === alvo) window.clearInterval(id);
        return nextTyped(atual, alvo);
      });
    }, MS_POR_LETRA);
    return () => window.clearInterval(id);
  }, [alvo]);

  return texto;
}
