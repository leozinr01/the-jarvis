import type { Destaque, Modulo, Resposta } from '@jarvis/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiErro, enviarPedidoApi } from '../lib/api';
import { acumularDestaques } from '../lib/destaques';

export function useJarvis() {
  const [processando, setProcessando] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const emAndamento = useRef<AbortController | null>(null);
  // Uma conversa por abertura da página; o servidor guarda o contexto com este id.
  const conversaId = useRef(crypto.randomUUID());

  useEffect(() => () => emAndamento.current?.abort(), []);

  /** Retorna false se já houver um pedido em andamento. */
  const pedir = useCallback((texto: string): boolean => {
    if (emAndamento.current) return false;
    const controle = new AbortController();
    emAndamento.current = controle;
    setProcessando(true);
    setErro(null);
    setLog([]);

    const adicionarLog = (linha: string) => setLog((atual) => [...atual, linha]);

    enviarPedidoApi(
      { conversaId: conversaId.current, texto },
      (evento) => {
        switch (evento.tipo) {
          case 'etapa':
            adicionarLog(evento.texto);
            break;
          case 'modulo':
            setModulo(evento.modulo);
            adicionarLog(`módulo: ${evento.modulo} (${evento.confianca}%)`);
            break;
          case 'resposta':
            setResposta(evento.resposta);
            setModulo(evento.resposta.modulo);
            setDestaques((atuais) => acumularDestaques(atuais, evento.resposta.destaques));
            adicionarLog('resposta pronta');
            break;
          case 'erro':
            setErro(evento.mensagem);
            adicionarLog('falha ao processar');
            break;
        }
      },
      controle.signal,
    )
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return;
        setErro(falha instanceof ApiErro ? falha.message : 'Algo deu errado ao processar o pedido.');
        adicionarLog('falha ao processar');
      })
      .finally(() => {
        if (emAndamento.current === controle) emAndamento.current = null;
        setProcessando(false);
      });
    return true;
  }, []);

  return { processando, log, modulo, resposta, destaques, erro, limparErro: useCallback(() => setErro(null), []), pedir };
}
