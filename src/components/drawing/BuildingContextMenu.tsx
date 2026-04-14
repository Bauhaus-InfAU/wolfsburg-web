import { useEffect, useRef } from 'react';
import { useDrawing } from '@/context/DrawingContext';
import { Trash2, Pencil } from 'lucide-react';

export function BuildingContextMenu() {
  const {
    contextMenuBuildingId,
    contextMenuPos,
    hideContextMenu,
    deleteCustomBuilding,
    selectBuilding,
  } = useDrawing();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!contextMenuBuildingId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuBuildingId, hideContextMenu]);

  // Close on Escape
  useEffect(() => {
    if (!contextMenuBuildingId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contextMenuBuildingId, hideContextMenu]);

  if (!contextMenuBuildingId || !contextMenuPos) return null;

  const [x, y] = contextMenuPos;

  const handleEdit = () => {
    selectBuilding(contextMenuBuildingId);
    hideContextMenu();
  };

  const handleDelete = () => {
    deleteCustomBuilding(contextMenuBuildingId);
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px] py-1"
      style={{ left: x, top: y }}
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
        Building
      </p>

      <button
        onClick={handleEdit}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        Edit / Move vertices
      </button>

      <button
        onClick={handleDelete}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete building
      </button>
    </div>
  );
}
