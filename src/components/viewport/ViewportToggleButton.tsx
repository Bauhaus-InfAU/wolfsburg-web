import { cn } from '@/lib/utils';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export function ViewportToggleButton({ active, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={active ? 'Single viewport' : '4 viewports (Top / Front / Side / Perspective)'}
      className={cn(
        'absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5',
        'rounded-xl border shadow-lg text-[11px] font-semibold transition-colors select-none',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground border-border hover:bg-accent',
      )}
    >
      <ViewportGridIcon active={active} />
      {active ? 'Single View' : '4 Viewports'}
    </button>
  );
}

function ViewportGridIcon({ active }: { active: boolean }) {
  const fill = active ? 'currentColor' : 'none';
  const stroke = 'currentColor';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {/* 2×2 grid */}
      <rect x="1" y="1" width="5.5" height="5.5" rx="0.8" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x="7.5" y="1" width="5.5" height="5.5" rx="0.8" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x="1" y="7.5" width="5.5" height="5.5" rx="0.8" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.8" fill={fill} stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}
