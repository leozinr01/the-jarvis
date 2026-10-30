import { useCallback, useEffect, useRef, useState } from 'react';
import { AVISO_BRAVE, isBrave } from './browserSupport';
import { VoiceController, type RecognitionLike, type VoiceState } from './voiceController';

type RecognitionCtor = new () => RecognitionLike;

function obterReconhecimento(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const SEM_SUPORTE = 'Este navegador não tem reconhecimento de voz. Use o Chrome ou o Edge.';

interface Callbacks {
  onPedido(texto: string): void;
  onRascunho(texto: string): void;
}

export function useVoice(callbacks: Callbacks) {
  const [estado, setEstado] = useState<VoiceState>({ capturando: false, ativacaoLigada: false });
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const controllerRef = useRef<VoiceController | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    let ativo = true;
    void isBrave(navigator as Parameters<typeof isBrave>[0]).then((brave) => {
      if (ativo && brave) setErro(AVISO_BRAVE);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const Ctor = obterReconhecimento();
    if (!Ctor) return;
    const controller = new VoiceController(() => new Ctor(), {
      onState: setEstado,
      onPartial: setParcial,
      onPedido: (texto) => callbacksRef.current.onPedido(texto),
      onRascunho: (texto) => callbacksRef.current.onRascunho(texto),
      onError: setErro,
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const alternarMicrofone = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return setErro(SEM_SUPORTE);
    setErro(null);
    if (estado.capturando) controller.stopManual();
    else controller.startManual();
  }, [estado.capturando]);

  const alternarAtivacao = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return setErro(SEM_SUPORTE);
    setErro(null);
    controller.setAtivacao(!estado.ativacaoLigada);
  }, [estado.ativacaoLigada]);

  return {
    ...estado,
    parcial,
    erro,
    limparErro: useCallback(() => setErro(null), []),
    interromperFala: useCallback(() => controllerRef.current?.interromperFala(), []),
    alternarMicrofone,
    alternarAtivacao,
  };
}
