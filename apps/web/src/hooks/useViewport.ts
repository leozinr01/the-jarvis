import { useEffect, useState } from 'react';
import type { Viewport } from '../lib/cardSlots';

const atual = (): Viewport => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(atual);
  useEffect(() => {
    const observer = new ResizeObserver(() => setViewport(atual()));
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  return viewport;
}
