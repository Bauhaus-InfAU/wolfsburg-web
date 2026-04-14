import React, { createContext, useContext, useState, useCallback } from 'react';
import type { LandUse } from '../config/types';

export type DrawingTool = 'none' | 'line' | 'curve' | 'rectangle' | 'circle';

export interface CustomBuilding {
  id: string;
  points: [number, number][];
  height: number;       // total height = floors * floorHeight
  floors: number;
  floorHeight: number;
  landUse: LandUse;
}

interface DrawingContextValue {
  // Tool
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;

  // In-progress drawing
  drawingPoints: [number, number][];
  isPolygonComplete: boolean;
  addPoint: (point: [number, number]) => void;
  replacePoints: (points: [number, number][]) => void;
  completePolygon: () => void;
  cancelDrawing: () => void;

  // Pending building properties (for the new building being drawn)
  pendingFloors: number;
  pendingFloorHeight: number;
  pendingHeight: number;      // derived: floors * floorHeight
  pendingLandUse: LandUse;
  setPendingFloors: (n: number) => void;
  setPendingFloorHeight: (h: number) => void;
  setPendingHeight: (h: number) => void;  // recalculates floors
  setPendingLandUse: (lu: LandUse) => void;

  // Confirm / finish
  confirmBuilding: () => void;

  // Buildings collection
  customBuildings: CustomBuilding[];
  deleteCustomBuilding: (id: string) => void;
  updateCustomBuilding: (id: string, updates: Partial<Omit<CustomBuilding, 'id'>>) => void;

  // Selection (for vertex editing)
  selectedBuildingId: string | null;
  selectBuilding: (id: string | null) => void;

  // Context menu (right-click)
  contextMenuBuildingId: string | null;
  contextMenuPos: [number, number] | null;
  showContextMenu: (id: string, pos: [number, number]) => void;
  hideContextMenu: () => void;
}

const DrawingContext = createContext<DrawingContextValue | null>(null);

const DEFAULT_FLOOR_HEIGHT = 3;   // metres
const DEFAULT_FLOORS = 3;

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<DrawingTool>('none');
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isPolygonComplete, setIsPolygonComplete] = useState(false);

  const [pendingFloors, setPendingFloorsState] = useState(DEFAULT_FLOORS);
  const [pendingFloorHeight, setPendingFloorHeightState] = useState(DEFAULT_FLOOR_HEIGHT);

  const [pendingLandUse, setPendingLandUseState] = useState<LandUse>('Generic Residential');
  const [customBuildings, setCustomBuildings] = useState<CustomBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [contextMenuBuildingId, setContextMenuBuildingId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<[number, number] | null>(null);

  const pendingHeight = pendingFloors * pendingFloorHeight;

  // ── Tool ──────────────────────────────────────────────────────────────────
  const setActiveTool = useCallback((tool: DrawingTool) => {
    setActiveToolState(tool);
    setDrawingPoints([]);
    setIsPolygonComplete(false);
    setSelectedBuildingId(null);
  }, []);

  // ── Points ────────────────────────────────────────────────────────────────
  const addPoint = useCallback((point: [number, number]) => {
    setDrawingPoints(prev => [...prev, point]);
  }, []);

  const replacePoints = useCallback((points: [number, number][]) => {
    setDrawingPoints(points);
  }, []);

  const completePolygon = useCallback(() => {
    setDrawingPoints(prev => {
      if (prev.length >= 3) setIsPolygonComplete(true);
      return prev;
    });
  }, []);

  const cancelDrawing = useCallback(() => {
    setDrawingPoints([]);
    setIsPolygonComplete(false);
    setActiveToolState('none');
  }, []);

  // ── Pending height helpers ────────────────────────────────────────────────
  const setPendingFloors = useCallback((n: number) => {
    setPendingFloorsState(Math.max(1, Math.round(n)));
  }, []);

  const setPendingFloorHeight = useCallback((h: number) => {
    setPendingFloorHeightState(Math.max(1, h));
  }, []);

  const setPendingHeight = useCallback((h: number) => {
    const clamped = Math.max(1, Math.round(h));
    // Keep floorHeight fixed, adjust floors to reach the desired total
    const newFloors = Math.max(1, Math.round(clamped / pendingFloorHeight));
    setPendingFloorsState(newFloors);
  }, [pendingFloorHeight]);

  const setPendingLandUse = useCallback((lu: LandUse) => {
    setPendingLandUseState(lu);
  }, []);

  // ── Confirm building ──────────────────────────────────────────────────────
  const confirmBuilding = useCallback(() => {
    setDrawingPoints(prev => {
      if (prev.length >= 3) {
        const newBuilding: CustomBuilding = {
          id: `custom-${Date.now()}`,
          points: [...prev],
          floors: pendingFloors,
          floorHeight: pendingFloorHeight,
          height: pendingFloors * pendingFloorHeight,
          landUse: pendingLandUse,
        };
        setCustomBuildings(existing => [...existing, newBuilding]);
      }
      return prev;
    });
    setDrawingPoints([]);
    setIsPolygonComplete(false);
    setActiveToolState('none');
    setPendingFloorsState(DEFAULT_FLOORS);
    setPendingFloorHeightState(DEFAULT_FLOOR_HEIGHT);
    setPendingLandUseState('Generic Residential');
  }, [pendingFloors, pendingFloorHeight, pendingLandUse]);

  // ── Building operations ───────────────────────────────────────────────────
  const deleteCustomBuilding = useCallback((id: string) => {
    setCustomBuildings(prev => prev.filter(b => b.id !== id));
    setSelectedBuildingId(prev => (prev === id ? null : prev));
    setContextMenuBuildingId(null);
    setContextMenuPos(null);
  }, []);

  const updateCustomBuilding = useCallback((
    id: string,
    updates: Partial<Omit<CustomBuilding, 'id'>>,
  ) => {
    setCustomBuildings(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const next = { ...b, ...updates };
        // Keep height in sync
        if (updates.floors !== undefined || updates.floorHeight !== undefined) {
          next.height = next.floors * next.floorHeight;
        }
        return next;
      }),
    );
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────────
  const selectBuilding = useCallback((id: string | null) => {
    setSelectedBuildingId(id);
    setContextMenuBuildingId(null);
    setContextMenuPos(null);
  }, []);

  // ── Context menu ──────────────────────────────────────────────────────────
  const showContextMenu = useCallback((id: string, pos: [number, number]) => {
    setContextMenuBuildingId(id);
    setContextMenuPos(pos);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenuBuildingId(null);
    setContextMenuPos(null);
  }, []);

  return (
    <DrawingContext.Provider value={{
      activeTool, setActiveTool,
      drawingPoints, isPolygonComplete,
      addPoint, replacePoints, completePolygon, cancelDrawing,
      pendingFloors, pendingFloorHeight, pendingHeight, pendingLandUse,
      setPendingFloors, setPendingFloorHeight, setPendingHeight, setPendingLandUse,
      confirmBuilding,
      customBuildings, deleteCustomBuilding, updateCustomBuilding,
      selectedBuildingId, selectBuilding,
      contextMenuBuildingId, contextMenuPos, showContextMenu, hideContextMenu,
    }}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error('useDrawing must be within DrawingProvider');
  return ctx;
}
