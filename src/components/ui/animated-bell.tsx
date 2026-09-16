'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP);

export function AnimatedBellIcon({ size = 19, active = false }: { size?: number; active?: boolean }) {
  const rootRef = useRef<SVGSVGElement>(null);
  const bellRef = useRef<SVGGElement>(null);

  useGSAP((_, contextSafe) => {
    const root = rootRef.current;
    const bell = bellRef.current;
    if (!root || !bell || !contextSafe || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ring = contextSafe(() => {
      gsap.killTweensOf(bell);
      gsap.timeline()
        .to(bell, { rotation: 12, duration: 0.09, ease: 'power1.out' })
        .to(bell, { rotation: -10, duration: 0.14, ease: 'power1.inOut' })
        .to(bell, { rotation: 6, duration: 0.12, ease: 'power1.inOut' })
        .to(bell, { rotation: 0, duration: 0.22, ease: 'back.out(2)' });
    });

    root.addEventListener('mouseenter', ring);
    if (active) ring();
    return () => root.removeEventListener('mouseenter', ring);
  }, { scope: rootRef, dependencies: [active], revertOnUpdate: true });

  return (
    <svg ref={rootRef} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <g ref={bellRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 6.5-2.5 8h17c0-1.5-2.5-2-2.5-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 21h4M12 3V2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
