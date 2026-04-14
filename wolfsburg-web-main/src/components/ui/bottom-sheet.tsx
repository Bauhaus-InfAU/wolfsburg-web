import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 bottom-0 z-50 bg-card rounded-t-2xl border-t border-border shadow-lg',
        'transform transition-transform duration-300 ease-out',
        'flex flex-col',
        'h-[50vh]',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
        <div className="w-8" /> {/* Spacer for centering */}
        {title && (
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        )}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent/50 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content - scrollable, only render when open for proper chart dimensions */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden pb-safe">
        {isOpen && children}
      </div>
    </div>
  );
}
