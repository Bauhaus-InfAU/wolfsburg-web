import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768; // matches Tailwind's md: breakpoint

export type MobilePanel = 'none' | 'controls' | 'data';

export function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [activePanel, setActivePanel] = useState<MobilePanel>('none');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // Close any open panel when switching to desktop
      if (!mobile) {
        setActivePanel('none');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openPanel = useCallback((panel: MobilePanel) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel('none');
  }, []);

  const togglePanel = useCallback((panel: Exclude<MobilePanel, 'none'>) => {
    setActivePanel(current => current === panel ? 'none' : panel);
  }, []);

  return {
    isMobile,
    activePanel,
    openPanel,
    closePanel,
    togglePanel,
  };
}
