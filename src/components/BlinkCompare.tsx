'use client';

import { useEffect, useState } from 'react';

type Props = {
  designSrc: string;
  actualSrc: string;
  playing: boolean;
  speedMs?: number;
};

export default function BlinkCompare({ designSrc, actualSrc, playing, speedMs = 500 }: Props) {
  const [showDesign, setShowDesign] = useState(true);

  useEffect(() => {
    if (!playing) {
      setShowDesign(true);
      return;
    }
    const id = setInterval(() => setShowDesign((v) => !v), speedMs);
    return () => clearInterval(id);
  }, [playing, speedMs]);

  return (
    <div className="relative">
      <img
        src={actualSrc}
        alt="Live build"
        className="w-full rounded"
        draggable={false}
      />
      <img
        src={designSrc}
        alt="Design mockup"
        className={`absolute inset-0 w-full h-full rounded transition-opacity duration-75 ${
          showDesign ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
      />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
        {showDesign ? 'Design' : 'Build'} — blinking
      </div>
    </div>
  );
}
