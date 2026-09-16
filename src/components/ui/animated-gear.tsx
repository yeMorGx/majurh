'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP);

export function AnimatedGearIcon({ size = 18 }: { size?: number }) {
  const rootRef = useRef<SVGSVGElement>(null);
  const gearRef = useRef<SVGGElement>(null);

  useGSAP((_, contextSafe) => {
    const root = rootRef.current;
    const gear = gearRef.current;
    if (!root || !gear || !contextSafe || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const play = contextSafe(() => {
      gsap.killTweensOf(gear);
      gsap.timeline()
        .to(gear, { rotation: 72, duration: 0.24, ease: 'power2.out' })
        .to(gear, { rotation: 0, duration: 0.42, ease: 'back.out(1.8)' });
    });

    root.addEventListener('mouseenter', play);
    root.addEventListener('focus', play);
    return () => {
      root.removeEventListener('mouseenter', play);
      root.removeEventListener('focus', play);
    };
  }, { scope: rootRef });

  return (
    <svg ref={rootRef} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <g ref={gearRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="m19.4 13.25 1.24.96-1.5 2.6-1.48-.56a7.7 7.7 0 0 1-1.47.86l-.23 1.56h-3l-.23-1.56a7.7 7.7 0 0 1-1.47-.86l-1.48.56-1.5-2.6 1.24-.96a7.25 7.25 0 0 1 0-1.7l-1.24-.96 1.5-2.6 1.48.56c.45-.35.94-.64 1.47-.86l.23-1.56h3l.23 1.56c.53.22 1.02.51 1.47.86l1.48-.56 1.5 2.6-1.24.96a7.25 7.25 0 0 1 0 1.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
