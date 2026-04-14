import { useEffect } from 'react';
import { useCursors } from '@/hooks/useCursors';

function CursorIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 2L15 9L9.5 11L7.5 16L3 2Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CursorOverlay() {
  const { cursors, sendCursor } = useCursors();

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      sendCursor(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [sendCursor]);

  if (cursors.size === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from(cursors.values()).map(cursor => (
        <div
          key={cursor.id}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${cursor.x * 100}vw, ${cursor.y * 100}vh)`,
            transition: 'transform 80ms linear',
            willChange: 'transform',
          }}
        >
          <CursorIcon color={cursor.color} />
        </div>
      ))}
    </div>
  );
}
