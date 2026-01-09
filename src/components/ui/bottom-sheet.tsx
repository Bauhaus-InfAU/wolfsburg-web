import { cn } from '@/lib/utils';
import { ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: 'half' | 'full';
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  height = 'half',
  title,
}: BottomSheetProps) {
  const heightClasses = {
    half: 'max-h-[55vh]',
    full: 'max-h-[85vh]',
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50 bg-card rounded-t-2xl border-t border-border shadow-lg',
          'transform transition-transform duration-300 ease-out',
          heightClasses[height],
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-2 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground text-center">
              {title}
            </h2>
          </div>
        )}

        {/* Content - scrollable */}
        <div className="overflow-y-auto scrollbar-hidden h-full pb-safe">
          {children}
        </div>
      </div>
    </>
  );
}
