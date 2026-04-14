import type * as Party from "partykit/server";

const COLORS = [
  "#f57f5b", // coral
  "#60a5fa", // blue
  "#34d399", // green
  "#a78bfa", // purple
  "#f472b6", // pink
  "#fbbf24", // amber
  "#f87171", // red
  "#2dd4bf", // teal
];

type CursorState = { color: string; x: number | null; y: number | null };

export default class CursorServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    conn.setState({ color, x: null, y: null } satisfies CursorState);

    // Send all existing cursors to the newly joined client
    for (const other of this.room.getConnections<CursorState>()) {
      if (other.id === conn.id) continue;
      const s = other.state;
      if (s && s.x !== null && s.y !== null) {
        conn.send(JSON.stringify({ type: "cursor", id: other.id, color: s.color, x: s.x, y: s.y }));
      }
    }
  }

  onMessage(message: string, sender: Party.Connection<CursorState>) {
    const data = JSON.parse(message) as { type: string; x: number; y: number };
    if (data.type === "cursor") {
      const color = (sender.state?.color) ?? COLORS[0];
      sender.setState({ color, x: data.x, y: data.y });
      this.room.broadcast(
        JSON.stringify({ type: "cursor", id: sender.id, color, x: data.x, y: data.y }),
        [sender.id],
      );
    }
  }

  onClose(conn: Party.Connection) {
    this.room.broadcast(JSON.stringify({ type: "leave", id: conn.id }), [conn.id]);
  }
}
