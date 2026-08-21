'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#0a84ff', '#16a34a', '#f97316', '#a855f7', '#f43f5e', '#14b8a6'];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
}

export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setPieces(
      Array.from({ length: 40 }).map((_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 260,
        duration: 1600 + Math.random() * 1200,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 6,
        drift: (Math.random() - 0.5) * 120,
      })),
    );

    const id = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(id);
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            position: 'absolute',
            top: '-5%',
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 1.6,
            background: piece.color,
            borderRadius: 2,
            animation: `confetti-fall ${piece.duration}ms linear ${piece.delay}ms forwards`,
            ['--drift' as string]: `${piece.drift}px`,
          }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translate3d(var(--drift), 110vh, 0) rotate(540deg);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
