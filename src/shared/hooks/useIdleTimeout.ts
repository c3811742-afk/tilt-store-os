import { useEffect, useRef } from 'react';

const activityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

// Calls `onIdle` once after `minutes` without a click, tap, key press or scroll. 0 turns it off.
export const useIdleTimeout = (minutes: number, onIdle: () => void) => {
  const latest = useRef(onIdle);
  useEffect(() => {
    latest.current = onIdle;
  });

  useEffect(() => {
    if (!minutes) return undefined;
    let timer: ReturnType<typeof setTimeout>;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), minutes * 60_000);
    };
    restart();
    activityEvents.forEach((name) => window.addEventListener(name, restart, { passive: true }));
    return () => {
      clearTimeout(timer);
      activityEvents.forEach((name) => window.removeEventListener(name, restart));
    };
  }, [minutes]);
};
