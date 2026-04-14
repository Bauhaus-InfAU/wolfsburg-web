import { useEffect, useRef, useState, useCallback } from 'react';
import { useDrawing } from '@/context/DrawingContext';
import { useSimulation } from '@/hooks/useSimulation';
import type { MapLibreView } from '@/visualization/MapLibreView';

// ─── Math helpers ──────────────────────────────────────────────────────────────

function snapTo45(from: [number, number], to: [number, number]): [number, number] {
  const dx = to[0] - from[0]; const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return to;
  const snapped = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return [from[0] + Math.cos(snapped) * dist, from[1] + Math.sin(snapped) * dist];
}

function geoToScreen(mv: MapLibreView, pt: [number, number]): [number, number] {
  const p = mv.project(pt); return [p.x, p.y];
}

function screenToGeo(mv: MapLibreView, x: number, y: number): [number, number] {
  const ll = mv.map.unproject([x, y]); return [ll.lng, ll.lat];
}

function rectFromCorners(mv: MapLibreView, c1: [number, number], c2: [number, number]): [number, number][] {
  return ([[c1[0], c1[1]], [c2[0], c1[1]], [c2[0], c2[1]], [c1[0], c2[1]]] as [number, number][])
    .map(([x, y]) => screenToGeo(mv, x, y));
}

function circlePoints(mv: MapLibreView, centerGeo: [number, number], radiusPtGeo: [number, number], n = 48): [number, number][] {
  const cs = geoToScreen(mv, centerGeo), rs = geoToScreen(mv, radiusPtGeo);
  const r = Math.hypot(rs[0] - cs[0], rs[1] - cs[1]);
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return screenToGeo(mv, cs[0] + Math.cos(a) * r, cs[1] + Math.sin(a) * r);
  });
}

/** Centroid of a set of screen points */
function centroidScreen(pts: [number, number][]): [number, number] {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/** Rotate geo points around a geo centroid by radians */
function rotateGeoAround(pts: [number, number][], cGeo: [number, number], rad: number): [number, number][] {
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return pts.map(([lng, lat]) => {
    const dx = lng - cGeo[0], dy = lat - cGeo[1];
    return [cGeo[0] + dx * cos - dy * sin, cGeo[1] + dx * sin + dy * cos] as [number, number];
  });
}

// ─── SVG path builders ────────────────────────────────────────────────────────

function linePath(pts: [number, number][], closed = false): string {
  if (pts.length < 2) return '';
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return closed ? d + ' Z' : d;
}

function curvePath(pts: [number, number][], closed = false): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return linePath(pts, closed);
  const T = 6;
  const ext: [number, number][] = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${ext[1][0].toFixed(1)} ${ext[1][1].toFixed(1)}`;
  const seg = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < seg; i++) {
    const [p0, p1, p2, p3] = [ext[i], ext[i+1], ext[i+2], ext[i+3]];
    const cp1x = p1[0] + (p2[0] - p0[0]) / T, cp1y = p1[1] + (p2[1] - p0[1]) / T;
    const cp2x = p2[0] - (p3[0] - p1[0]) / T, cp2y = p2[1] - (p3[1] - p1[1]) / T;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + ' Z' : d;
}

function buildPath(tool: string, pts: [number, number][], closed = false): string {
  return tool === 'curve' ? curvePath(pts, closed) : linePath(pts, closed);
}

const CLOSE_SNAP = 18;
const VR = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawingOverlay() {
  const {
    activeTool, drawingPoints, isPolygonComplete, pendingHeight, customBuildings,
    addPoint, replacePoints, completePolygon, cancelDrawing, setPendingHeight,
    selectedBuildingId, selectBuilding, updateCustomBuilding, showContextMenu,
  } = useDrawing();
  const { getMapView } = useSimulation();

  const [, tick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);

  // Drag refs (no re-render needed on change)
  const heightDragRef   = useRef<{ startY: number; startH: number } | null>(null);
  const vertexDragRef   = useRef<{ buildingId: string; idx: number } | null>(null);
  const rotateDragRef   = useRef<{ buildingId: string; startAngle: number; origPts: [number, number][]; cGeo: [number, number] } | null>(null);

  // ── Map move listener → redraw ────────────────────────────────────────────
  useEffect(() => {
    const mv = getMapView(); if (!mv) return;
    const fn = () => tick(n => n + 1);
    mv.map.on('move', fn); mv.map.on('zoom', fn);
    return () => { mv.map.off('move', fn); mv.map.off('zoom', fn); };
  }, [getMapView]);

  // ── Register click/contextmenu on placed buildings (always, no gating) ────
  useEffect(() => {
    const mv = getMapView(); if (!mv) return;
    mv.onCustomBuildingClick = (id) => selectBuilding(id);
    mv.onCustomBuildingContextMenu = (id, pos) => showContextMenu(id, pos);
    return () => { mv.onCustomBuildingClick = null; mv.onCustomBuildingContextMenu = null; };
  }, [getMapView, selectBuilding, showContextMenu]);

  // ── Sync custom buildings to MapLibre ─────────────────────────────────────
  useEffect(() => {
    const mv = getMapView(); if (!mv) return;
    if (!mv.map.getSource('custom-buildings')) return;
    mv.updateCustomBuildings(customBuildings);
  }, [customBuildings, getMapView]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') { cancelDrawing(); selectBuilding(null); }
    };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [cancelDrawing, selectBuilding]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const evCoords = useCallback((e: React.MouseEvent): [number, number] => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? [e.clientX - r.left, e.clientY - r.top] : [0, 0];
  }, []);

  // ── Mouse move ────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [x, y] = evCoords(e);
    setCursor([x, y]);
    const mv = getMapView(); if (!mv) return;

    // Height Ctrl+drag
    if (isPolygonComplete && e.ctrlKey && e.buttons === 1 && heightDragRef.current) {
      const delta = heightDragRef.current.startY - y;
      setPendingHeight(Math.max(1, Math.round(heightDragRef.current.startH + delta * 0.5)));
      return;
    }

    // Vertex drag
    if (vertexDragRef.current && e.buttons === 1) {
      const { buildingId, idx } = vertexDragRef.current;
      const b = customBuildings.find(b => b.id === buildingId);
      if (b) {
        const pts = [...b.points]; pts[idx] = screenToGeo(mv, x, y);
        updateCustomBuilding(buildingId, { points: pts });
      }
      return;
    }

    // Rotate drag
    if (rotateDragRef.current && e.buttons === 1) {
      const { buildingId, startAngle, origPts, cGeo } = rotateDragRef.current;
      const cScreen = geoToScreen(mv, cGeo);
      const curAngle = Math.atan2(y - cScreen[1], x - cScreen[0]);
      const delta = curAngle - startAngle;
      updateCustomBuilding(buildingId, { points: rotateGeoAround(origPts, cGeo, delta) });
    }
  }, [evCoords, getMapView, isPolygonComplete, setPendingHeight, customBuildings, updateCustomBuilding]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [, y] = evCoords(e);
    if (isPolygonComplete && e.ctrlKey) heightDragRef.current = { startY: y, startH: pendingHeight };
  }, [evCoords, isPolygonComplete, pendingHeight]);

  const handleMouseUp = useCallback(() => {
    heightDragRef.current = null; vertexDragRef.current = null; rotateDragRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor(null); vertexDragRef.current = null; rotateDragRef.current = null;
  }, []);

  // ── Click ─────────────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPolygonComplete || e.detail >= 2) return;
    const mv = getMapView(); if (!mv) return;
    let [x, y] = evCoords(e);
    const screenPts = drawingPoints.map(p => geoToScreen(mv, p));

    // Shift snap
    if (shiftHeld && (activeTool === 'line' || activeTool === 'rectangle') && screenPts.length > 0) {
      [x, y] = snapTo45(screenPts[screenPts.length - 1], [x, y]);
    }

    if (activeTool === 'rectangle') {
      if (drawingPoints.length === 0) { addPoint(screenToGeo(mv, x, y)); }
      else { const c1 = geoToScreen(mv, drawingPoints[0]); replacePoints(rectFromCorners(mv, c1, [x, y])); setTimeout(() => completePolygon(), 0); }
      return;
    }
    if (activeTool === 'circle') {
      if (drawingPoints.length === 0) { addPoint(screenToGeo(mv, x, y)); }
      else { replacePoints(circlePoints(mv, drawingPoints[0], screenToGeo(mv, x, y))); setTimeout(() => completePolygon(), 0); }
      return;
    }
    // Snap-close for line/curve
    if (drawingPoints.length >= 3 && screenPts.length >= 3) {
      const [fx, fy] = screenPts[0];
      if (Math.hypot(x - fx, y - fy) <= CLOSE_SNAP) { completePolygon(); return; }
    }
    addPoint(screenToGeo(mv, x, y));
  }, [isPolygonComplete, getMapView, evCoords, drawingPoints, shiftHeld, activeTool, addPoint, replacePoints, completePolygon]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!isPolygonComplete && (activeTool === 'line' || activeTool === 'curve')) completePolygon();
  }, [isPolygonComplete, activeTool, completePolygon]);

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (selectedBuildingId) showContextMenu(selectedBuildingId, evCoords(e));
  }, [selectedBuildingId, showContextMenu, evCoords]);

  // ── Overlay visibility ────────────────────────────────────────────────────
  const isDrawingMode = activeTool !== 'none';
  const isEditingMode = !isDrawingMode && selectedBuildingId !== null;
  if (!isDrawingMode && !isEditingMode) return null;

  const mv = getMapView();
  const screenPts: [number, number][] = mv ? drawingPoints.map(p => geoToScreen(mv, p)) : [];

  // Shift-snapped cursor
  let snappedCursor = cursor;
  if (cursor && shiftHeld && (activeTool === 'line' || activeTool === 'rectangle') && screenPts.length > 0)
    snappedCursor = snapTo45(screenPts[screenPts.length - 1], cursor);

  const previewPts: [number, number][] = !isPolygonComplete && snappedCursor ? [...screenPts, snappedCursor] : screenPts;
  const nearClose = !isPolygonComplete && cursor !== null && screenPts.length >= 3 &&
    Math.hypot(cursor[0] - screenPts[0][0], cursor[1] - screenPts[0][1]) <= CLOSE_SNAP;

  const isRectPrev = activeTool === 'rectangle' && drawingPoints.length === 1 && snappedCursor && mv;
  const isCircPrev = activeTool === 'circle' && drawingPoints.length === 1 && cursor && mv;

  // Edit building data
  const editBuilding = isEditingMode ? customBuildings.find(b => b.id === selectedBuildingId) : null;
  const editScreenPts: [number, number][] = editBuilding && mv ? editBuilding.points.map(p => geoToScreen(mv, p)) : [];

  // Rotate handle: positioned above the bounding box of the selected building
  let rotateHandlePos: [number, number] | null = null;
  let geoCentroid: [number, number] | null = null;
  if (editBuilding && editScreenPts.length >= 3) {
    const cx = centroidScreen(editScreenPts);
    geoCentroid = [
      editBuilding.points.reduce((s, p) => s + p[0], 0) / editBuilding.points.length,
      editBuilding.points.reduce((s, p) => s + p[1], 0) / editBuilding.points.length,
    ];
    const minY = Math.min(...editScreenPts.map(p => p[1]));
    rotateHandlePos = [cx[0], minY - 32];
  }

  const cursorStyle = isPolygonComplete ? 'ns-resize' : isEditingMode ? 'default' : 'crosshair';

  return (
    <div className="absolute inset-0 z-20" style={{ pointerEvents: 'all' }}>
      <svg ref={svgRef} width="100%" height="100%"
        style={{ cursor: cursorStyle, display: 'block' }}
        onClick={handleClick} onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        {/* Background deselect (edit mode) */}
        {isEditingMode && (
          <rect width="100%" height="100%" fill="transparent"
            onClick={() => { if (activeTool === 'none') selectBuilding(null); }} />
        )}

        {/* ── Rectangle live preview ── */}
        {isRectPrev && mv && (() => {
          const c1 = geoToScreen(mv, drawingPoints[0]);
          const [cx2, cy2] = snappedCursor!;
          return <rect x={Math.min(c1[0], cx2)} y={Math.min(c1[1], cy2)}
            width={Math.abs(cx2 - c1[0])} height={Math.abs(cy2 - c1[1])}
            fill="rgba(245,127,91,0.1)" stroke="#f57f5b" strokeWidth="2" strokeDasharray="6 4" />;
        })()}

        {/* ── Circle live preview ── */}
        {isCircPrev && mv && (() => {
          const cs = geoToScreen(mv, drawingPoints[0]);
          const r = Math.hypot(cursor![0] - cs[0], cursor![1] - cs[1]);
          return <circle cx={cs[0]} cy={cs[1]} r={r}
            fill="rgba(245,127,91,0.1)" stroke="#f57f5b" strokeWidth="2" strokeDasharray="6 4" />;
        })()}

        {/* ── Completed polygon ── */}
        {isPolygonComplete && screenPts.length >= 3 && (
          <path d={buildPath(activeTool, screenPts, true)}
            fill="rgba(245,127,91,0.2)" stroke="#f57f5b" strokeWidth="2" strokeLinejoin="round" />
        )}

        {/* ── In-progress solid line ── */}
        {!isPolygonComplete && !isRectPrev && !isCircPrev && screenPts.length >= 2 && (
          <path d={buildPath(activeTool, screenPts)} fill="none" stroke="#f57f5b" strokeWidth="2" strokeLinejoin="round" />
        )}

        {/* ── Preview dashed to cursor ── */}
        {!isPolygonComplete && !isRectPrev && !isCircPrev && previewPts.length >= 2 && snappedCursor && (
          <path d={buildPath(activeTool, previewPts)} fill="none" stroke="#f57f5b"
            strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 4" opacity={0.5} />
        )}

        {/* ── Vertex dots ── */}
        {!isRectPrev && !isCircPrev && screenPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 0 && nearClose ? 7 : VR}
            fill={i === 0 && nearClose ? '#f57f5b' : '#fff'} stroke="#f57f5b" strokeWidth="2" />
        ))}

        {/* ── Snap ring ── */}
        {nearClose && (
          <circle cx={screenPts[0][0]} cy={screenPts[0][1]} r={CLOSE_SNAP}
            fill="none" stroke="#f57f5b" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.5} pointerEvents="none" />
        )}

        {/* ── Cursor dot ── */}
        {snappedCursor && !isPolygonComplete && (
          <circle cx={snappedCursor[0]} cy={snappedCursor[1]} r={3} fill="#f57f5b" opacity={0.7} pointerEvents="none" />
        )}

        {/* ── Ctrl-drag hint ── */}
        {isPolygonComplete && screenPts.length >= 3 && (
          <text x={screenPts[Math.floor(screenPts.length / 2)][0]} y={screenPts[Math.floor(screenPts.length / 2)][1] - 14}
            textAnchor="middle" fontSize="11" fill="#f57f5b" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            Ctrl + drag ↕ to set height
          </text>
        )}

        {/* ── Editing: selected building outline + vertex handles ── */}
        {isEditingMode && editBuilding && editScreenPts.length >= 3 && (
          <>
            <path d={linePath(editScreenPts, true)}
              fill="rgba(245,127,91,0.08)" stroke="#f57f5b" strokeWidth="2"
              strokeLinejoin="round" strokeDasharray="6 4" />

            {/* Vertex handles */}
            {editScreenPts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={VR + 2} fill="#fff" stroke="#f57f5b" strokeWidth="2"
                style={{ cursor: 'move' }}
                onMouseDown={(e) => { e.stopPropagation(); vertexDragRef.current = { buildingId: editBuilding.id, idx: i }; }} />
            ))}

            {/* Rotate handle arm */}
            {rotateHandlePos && editScreenPts.length >= 3 && (() => {
              const cx = centroidScreen(editScreenPts);
              return (
                <>
                  <line x1={cx[0]} y1={Math.min(...editScreenPts.map(p => p[1]))}
                    x2={rotateHandlePos![0]} y2={rotateHandlePos![1]}
                    stroke="#f57f5b" strokeWidth="1.5" strokeDasharray="3 2" opacity={0.6} pointerEvents="none" />
                  <circle cx={rotateHandlePos![0]} cy={rotateHandlePos![1]} r={10}
                    fill="#f57f5b" stroke="#fff" strokeWidth="2"
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!mv || !geoCentroid) return;
                      const r = svgRef.current?.getBoundingClientRect();
                      if (!r) return;
                      const sx = e.clientX - r.left, sy = e.clientY - r.top;
                      const cScreen = geoToScreen(mv, geoCentroid);
                      rotateDragRef.current = {
                        buildingId: editBuilding.id,
                        startAngle: Math.atan2(sy - cScreen[1], sx - cScreen[0]),
                        origPts: [...editBuilding.points],
                        cGeo: geoCentroid,
                      };
                    }}
                  />
                  {/* Rotation icon (↻) inside the circle */}
                  <text x={rotateHandlePos![0]} y={rotateHandlePos![1] + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="12" fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    ↻
                  </text>
                </>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
