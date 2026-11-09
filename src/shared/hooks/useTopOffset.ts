import { useLayoutEffect, useRef } from 'react';

// Writes how far an element's top edge is from the top of the screen into a CSS variable (in rem), and keeps it up to
// date while the page scrolls or resizes. A sticky panel uses it to fit the screen below where it starts:
// max-block-size: calc(100dvh - var(--top-offset) - var(--spacing-4)).
export const useTopOffset = <T extends HTMLElement>(variable = '--top-offset') => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        element.style.setProperty(variable, `${Math.max(element.getBoundingClientRect().top, 0) / rootSize}rem`);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [variable]);
  return ref;
};
