import { useState } from 'react';
import { X } from 'lucide-react';

interface ChangeEntry {
  text: string;
  author: string;
}

const CHANGES: ChangeEntry[] = [
  { text: 'Sun Path controls moved to left panel', author: 'Egor' },
  { text: 'Landmark pins now show category icons', author: 'Egor' },
  { text: 'Fixed compass arc (was rendering multiple days at once)', author: 'Egor' },
  { text: 'Compass rotates with map, visible only when Sun Path is open', author: 'Egor' },
  { text: 'PR preview deployments via GitHub Actions', author: 'Egor' },
];

export function WhatsNew() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 right-6 z-30 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
            Today's updates
          </span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Change list */}
      <ul className="px-4 py-3 space-y-2">
        {CHANGES.map((entry, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-foreground leading-snug">{entry.text}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">— {entry.author}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Timestamp */}
      <div className="px-4 pb-2.5 text-[9px] text-muted-foreground font-mono">
        Apr 14, 2026 · since 10:00
      </div>
    </div>
  );
}
