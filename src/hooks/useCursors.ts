import { useEffect, useRef, useState, useCallback } from 'react';
import PartySocket from 'partysocket';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST as string | undefined;

export interface RemoteCursor {
  id: string;
  color: string;
  x: number; // normalized 0–1 of viewport width
  y: number; // normalized 0–1 of viewport height
}

export function useCursors() {
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const socketRef = useRef<PartySocket | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!PARTYKIT_HOST) return;

    const socket = new PartySocket({ host: PARTYKIT_HOST, room: 'main' });

    socket.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as {
        type: 'cursor' | 'leave';
        id: string;
        color?: string;
        x?: number;
        y?: number;
      };

      if (data.type === 'cursor' && data.color !== undefined && data.x !== undefined && data.y !== undefined) {
        setCursors(prev => {
          const next = new Map(prev);
          next.set(data.id, { id: data.id, color: data.color!, x: data.x!, y: data.y! });
          return next;
        });
      } else if (data.type === 'leave') {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.id);
          return next;
        });
      }
    };

    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastSentRef.current < 50) return; // throttle to ~20fps
    lastSentRef.current = now;
    socketRef.current?.send(JSON.stringify({ type: 'cursor', x, y }));
  }, []);

  return { cursors, sendCursor };
}
