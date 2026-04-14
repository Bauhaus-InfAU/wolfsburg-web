import maplibregl from 'maplibre-gl';
import type { LandUse, BuildingCollection, StreetCollection } from '../config/types';
import type { SegmentUsage } from '../data/StreetUsageTracker';
import type { BlockCollection } from '../data/dataLoader';
import { LAND_USE_COLORS } from '../config/constants';
import { getCityConfig } from '../config/cityConfig';
import type { HeatmapGradient } from '../config/gradientPresets';

// Natural element categories from blocks tn__bez field
const WATER_TYPES = [
  'Fliessgewässer',      // Flowing water (rivers, streams, canals)
  'Stehendes Gewässer',  // Standing water (lakes, ponds)
  'Hafenbecken',         // Harbor basin
  'Sumpf',               // Swamp
  'Moor',                // Bog/Moor
];

const VEGETATION_TYPES = [
  'Wald',                // Forest
  'Gehölz',              // Woodland/Grove
  'Heide',               // Heath
];

const GREEN_SPACE_TYPES = [
  'Sport-, Freizeit- und Erholungsfläche, Siedlungsgrünfläche', // Urban green space
  'Sport-, Freizeit- und Erholungsfläche, Park',                // Park
  'Sport-, Freizeit- und Erholungsfläche, Kleingarten',         // Allotment garden
  'Landwirtschaft, Grünland',                                    // Grassland
];

/**
 * MapLibre GL JS wrapper for WebGL-accelerated map rendering.
 * Replaces Canvas 2D MapView for better pan/zoom performance.
 */
// Map colors for each theme
const MAP_COLORS = {
  light: {
    background: '#fafafa',
    streetBase: '#ffffff',
    streetShadow: 'rgba(0,0,0,0.06)',
    water: '#a8d4e6',
    vegetation: '#8fbc8f',
    greenSpace: '#c8e6c9',
    buildingOutline: 'rgba(0,0,0,0.18)',
    undergroundFill: '#666666',
    undergroundOutline: '#444444',
    monochromeBuilding: '#d4d4d4',
    monochromeWater: '#c8c8c8',
    monochromeVegetation: '#e0e0e0',
    monochromeGreenSpace: '#ebebeb',
  },
  dark: {
    background: '#1a1a1a',
    streetBase: '#c8bfa8',
    streetShadow: 'rgba(0,0,0,0.5)',
    water: '#1e4a6e',
    vegetation: '#213d21',
    greenSpace: '#1a3020',
    buildingOutline: 'rgba(255,255,255,0.22)',
    undergroundFill: '#909090',
    undergroundOutline: '#b0b0b0',
    monochromeBuilding: '#8c8c8c',
    monochromeWater: '#555555',
    monochromeVegetation: '#444444',
    monochromeGreenSpace: '#3a3a3a',
  },
} as const;

export class MapLibreView {
  public map: maplibregl.Map;
  public agentCanvas: HTMLCanvasElement;
  public agentCtx: CanvasRenderingContext2D;

  private container: HTMLElement;
  private isDark = false;
  private isMonochrome = false;

  // Callbacks
  public onViewChange: (() => void) | null = null;
  public onBuildingClick: ((buildingId: string, coordinates: [number, number]) => void) | null = null;
  public onSegmentClick: ((fid: string, name?: string) => void) | null = null;
  public onAddSegment: ((from: [number, number], to: [number, number]) => void) | null = null;

  // Edit mode: 'none' | 'remove' | 'add'
  public editMode: 'none' | 'remove' | 'add' = 'none';
  private pendingAddPoint: [number, number] | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.container.style.position = 'relative';

    const cityConfig = getCityConfig();

    // Create MapLibre map with minimal style (no base map)
    this.map = new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        name: `${cityConfig.name} Simulation`,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': MAP_COLORS.light.background,
            },
          },
        ],
        // Lighting for 3D buildings
        light: {
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.4,
        },
      },
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      pitch: 60, // Steeper tilt for 3D view
      bearing: -17, // Slight rotation for better perspective
      attributionControl: false,
      maxPitch: 75,
    });

    // Create agent canvas overlay on top of MapLibre
    this.agentCanvas = document.createElement('canvas');
    this.agentCanvas.style.position = 'absolute';
    this.agentCanvas.style.top = '0';
    this.agentCanvas.style.left = '0';
    this.agentCanvas.style.width = '100%';
    this.agentCanvas.style.height = '100%';
    this.agentCanvas.style.pointerEvents = 'none';
    this.agentCanvas.style.zIndex = '10';
    this.container.appendChild(this.agentCanvas);
    this.agentCtx = this.agentCanvas.getContext('2d')!;

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Trigger view change on map movement
    this.map.on('move', () => {
      this.onViewChange?.();
    });

    // Resize agent canvas when map resizes
    this.map.on('resize', () => {
      this.resizeAgentCanvas();
    });

    // Building click handler
    this.map.on('click', 'buildings-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const buildingId = feature.properties?.['Building ID'];
        if (buildingId && this.onBuildingClick) {
          this.onBuildingClick(buildingId, [e.lngLat.lng, e.lngLat.lat]);
        }
      }
    });

    // Cursor feedback on building hover
    this.map.on('mouseenter', 'buildings-fill', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'buildings-fill', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  /**
   * Wait for the map to be fully loaded before adding sources/layers.
   */
  async ready(): Promise<void> {
    return new Promise((resolve) => {
      if (this.map.loaded()) {
        this.resizeAgentCanvas();
        resolve();
      } else {
        this.map.on('load', () => {
          this.resizeAgentCanvas();
          resolve();
        });
      }
    });
  }

  /**
   * Resize the agent canvas to match the map container.
   */
  resizeAgentCanvas(): void {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Handle HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    this.agentCanvas.width = rect.width * dpr;
    this.agentCanvas.height = rect.height * dpr;
    this.agentCanvas.style.width = `${rect.width}px`;
    this.agentCanvas.style.height = `${rect.height}px`;
    this.agentCtx.scale(dpr, dpr);

    this.onViewChange?.();
  }

  /**
   * Resize handler for external calls.
   */
  resizeCanvas(): void {
    this.map.resize();
    this.resizeAgentCanvas();
  }

  /**
   * Project WGS84 coordinates to screen pixels.
   */
  project(coord: [number, number]): { x: number; y: number } {
    const point = this.map.project(coord as maplibregl.LngLatLike);
    return { x: point.x, y: point.y };
  }

  /**
   * Get visible bounds for viewport culling.
   */
  getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const bounds = this.map.getBounds();
    return {
      minX: bounds.getWest(),
      maxX: bounds.getEast(),
      minY: bounds.getSouth(),
      maxY: bounds.getNorth(),
    };
  }

  /**
   * Check if a point is within the visible bounds.
   */
  isPointVisible(lng: number, lat: number): boolean {
    const bounds = this.map.getBounds();
    return bounds.contains([lng, lat] as maplibregl.LngLatLike);
  }

  /**
   * Fit map to data bounds with padding.
   */
  fitBounds(bounds: [[number, number], [number, number]]): void {
    this.map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
    });
  }

  /**
   * Add streets source and layers.
   */
  addStreetsLayer(streetData: StreetCollection): void {
    this.map.addSource('streets', {
      type: 'geojson',
      data: streetData,
    });

    // Shadow layer (underneath)
    this.map.addLayer({
      id: 'street-shadow',
      type: 'line',
      source: 'streets',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': 'rgba(0, 0, 0, 0.06)',
        'line-width': 4,
      },
    });

    // Base street layer (on top of shadow)
    this.map.addLayer({
      id: 'street-base',
      type: 'line',
      source: 'streets',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
      },
    });
  }

  /**
   * Add street-editor overlay layers and wire up all map interaction for
   * both "remove" mode (click to disable an existing street) and
   * "add" mode (click two points to draw a new segment).
   * Call this after addHeatmapLayer so the overlays render on top.
   */
  addDisabledStreetsLayer(): void {
    // ── Removed-streets source / layers (red dashed) ──────────────────────
    this.map.addSource('disabled-streets', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'disabled-streets-glow',
      type: 'line',
      source: 'disabled-streets',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ef4444', 'line-width': 8, 'line-opacity': 0.25 },
    });
    this.map.addLayer({
      id: 'disabled-streets-line',
      type: 'line',
      source: 'disabled-streets',
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#ef4444',
        'line-width': 2,
        'line-opacity': 0.9,
        'line-dasharray': [4, 3],
      },
    });

    // ── Added-streets source / layers (green solid) ────────────────────────
    this.map.addSource('added-streets', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'added-streets-glow',
      type: 'line',
      source: 'added-streets',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#22c55e', 'line-width': 8, 'line-opacity': 0.25 },
    });
    this.map.addLayer({
      id: 'added-streets-line',
      type: 'line',
      source: 'added-streets',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#22c55e', 'line-width': 2.5, 'line-opacity': 0.95 },
    });

    // ── Pending first-click point for add-mode (yellow circle) ────────────
    this.map.addSource('pending-point', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'pending-point-circle',
      type: 'circle',
      source: 'pending-point',
      paint: {
        'circle-radius': 7,
        'circle-color': '#eab308',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // ── Map-level click handler (handles both modes) ───────────────────────
    this.map.on('click', (e) => {
      if (this.editMode === 'none') return;

      const clickCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (this.editMode === 'remove' && this.onSegmentClick) {
        // Query with 10 px tolerance so thin lines are easy to hit
        const pt = e.point;
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [pt.x - 10, pt.y - 10],
          [pt.x + 10, pt.y + 10],
        ];
        const features = this.map.queryRenderedFeatures(bbox, { layers: ['street-base'] });
        if (!features.length) return;
        const fid = String(features[0].properties?.fid ?? '');
        if (fid) {
          this.onSegmentClick(fid, features[0].properties?.['names.primary'] as string | undefined);
        }
        return;
      }

      if (this.editMode === 'add' && this.onAddSegment) {
        if (!this.pendingAddPoint) {
          // First click — store point and show marker
          this.pendingAddPoint = clickCoord;
          this._updatePendingPoint(clickCoord);
        } else {
          // Second click — commit segment, clear marker
          this.onAddSegment(this.pendingAddPoint, clickCoord);
          this.pendingAddPoint = null;
          this._updatePendingPoint(null);
        }
      }
    });

    // ── Cursor feedback via mousemove ─────────────────────────────────────
    this.map.on('mousemove', (e) => {
      if (this.editMode === 'none') return;

      if (this.editMode === 'add') {
        this.map.getCanvas().style.cursor = 'crosshair';
        return;
      }

      // Remove mode: crosshair only when over a street
      const pt = e.point;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [pt.x - 10, pt.y - 10],
        [pt.x + 10, pt.y + 10],
      ];
      const features = this.map.queryRenderedFeatures(bbox, { layers: ['street-base'] });
      this.map.getCanvas().style.cursor = features.length ? 'crosshair' : 'default';
    });
  }

  /** Show or hide the pending first-click marker. */
  private _updatePendingPoint(coord: [number, number] | null): void {
    const source = this.map.getSource('pending-point') as maplibregl.GeoJSONSource;
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: coord
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coord } }]
        : [],
    });
  }

  /**
   * Update the disabled-streets overlay.
   */
  updateDisabledStreets(streets: Array<{ fid: string; coordinates: [number, number][] }>): void {
    const source = this.map.getSource('disabled-streets') as maplibregl.GeoJSONSource;
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: streets.map(s => ({
        type: 'Feature' as const,
        properties: { fid: s.fid },
        geometry: { type: 'LineString' as const, coordinates: s.coordinates },
      })),
    });
  }

  /**
   * Update the added-streets overlay.
   */
  updateAddedStreets(streets: Array<{ key: string; from: [number, number]; to: [number, number] }>): void {
    const source = this.map.getSource('added-streets') as maplibregl.GeoJSONSource;
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: streets.map(s => ({
        type: 'Feature' as const,
        properties: { key: s.key },
        geometry: { type: 'LineString' as const, coordinates: [s.from, s.to] },
      })),
    });
  }

  /**
   * Set edit mode. Clears pending add-point and resets cursor.
   */
  setEditMode(mode: 'none' | 'remove' | 'add'): void {
    this.editMode = mode;
    this.pendingAddPoint = null;
    this._updatePendingPoint(null);
    if (mode === 'none') {
      this.map.getCanvas().style.cursor = '';
    }
  }

  /** @deprecated use setEditMode */
  setSegmentEditMode(enabled: boolean): void {
    this.setEditMode(enabled ? 'remove' : 'none');
  }

  /**
   * Add natural elements (water, vegetation) from blocks GeoJSON.
   * Should be called before streets/buildings so they appear underneath.
   */
  addNaturalElementsLayer(blockData: BlockCollection): void {
    // Helper to check if tn__bez matches any prefix
    const matchesType = (tnBez: string, types: string[]): boolean => {
      return types.some(type => tnBez.startsWith(type));
    };

    // Filter features for water
    const waterFeatures = blockData.features.filter(
      f => f.properties.tn__bez && matchesType(f.properties.tn__bez, WATER_TYPES)
    );

    // Filter features for vegetation (forests, groves)
    const vegetationFeatures = blockData.features.filter(
      f => f.properties.tn__bez && matchesType(f.properties.tn__bez, VEGETATION_TYPES)
    );

    // Filter features for green spaces (parks, urban green)
    const greenSpaceFeatures = blockData.features.filter(
      f => f.properties.tn__bez && GREEN_SPACE_TYPES.includes(f.properties.tn__bez)
    );

    console.log(`Natural elements: ${waterFeatures.length} water, ${vegetationFeatures.length} vegetation, ${greenSpaceFeatures.length} green space`);

    // Add water source and layer
    if (waterFeatures.length > 0) {
      this.map.addSource('water', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: waterFeatures,
        },
      });

      this.map.addLayer({
        id: 'water-fill',
        type: 'fill',
        source: 'water',
        paint: {
          'fill-color': '#a8d4e6', // Light blue for water
          'fill-opacity': 0.7,
        },
      });
    }

    // Add vegetation source and layer (forests, groves)
    if (vegetationFeatures.length > 0) {
      this.map.addSource('vegetation', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: vegetationFeatures,
        },
      });

      this.map.addLayer({
        id: 'vegetation-fill',
        type: 'fill',
        source: 'vegetation',
        paint: {
          'fill-color': '#8fbc8f', // Dark sea green for forests
          'fill-opacity': 0.6,
        },
      });
    }

    // Add green space source and layer (parks, urban green)
    if (greenSpaceFeatures.length > 0) {
      this.map.addSource('green-space', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: greenSpaceFeatures,
        },
      });

      this.map.addLayer({
        id: 'green-space-fill',
        type: 'fill',
        source: 'green-space',
        paint: {
          'fill-color': '#c8e6c9', // Light green for urban green spaces
          'fill-opacity': 0.5,
        },
      });
    }
  }

  /**
   * Add heatmap source and layer (starts empty, updated dynamically).
   */
  addHeatmapLayer(): void {
    this.map.addSource('street-usage', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    this.map.addLayer({
      id: 'street-usage-heatmap',
      type: 'line',
      source: 'street-usage',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none', // Hidden by default
      },
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'normalized'],
          0, '#3288bd',    // Blue
          0.5, '#fee08b',  // Yellow
          1, '#d53e4f',    // Red
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'normalized'],
          0, 2,
          1, 8,
        ],
      },
    });

    // Top streets highlight layer
    this.map.addSource('top-streets', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Glow layer for top streets
    this.map.addLayer({
      id: 'top-streets-glow',
      type: 'line',
      source: 'top-streets',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none',
      },
      paint: {
        'line-color': '#f57f5b',
        'line-width': 12,
        'line-opacity': 0.3,
      },
    });

    // Core line for top streets
    this.map.addLayer({
      id: 'top-streets-core',
      type: 'line',
      source: 'top-streets',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none',
      },
      paint: {
        'line-color': '#f57f5b',
        'line-width': 4,
      },
    });
  }

  /**
   * Add path preview source and layers for shortest path visualization.
   */
  addPathPreviewLayer(): void {
    this.map.addSource('path-preview', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Glow layer (wider, semi-transparent)
    this.map.addLayer({
      id: 'path-preview-glow',
      type: 'line',
      source: 'path-preview',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none',
      },
      paint: {
        'line-color': '#f57f5b',
        'line-width': 10,
        'line-opacity': 0.4,
      },
    });

    // Core line layer
    this.map.addLayer({
      id: 'path-preview-line',
      type: 'line',
      source: 'path-preview',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none',
      },
      paint: {
        'line-color': '#f57f5b',
        'line-width': 3,
      },
    });
  }

  /**
   * Update the path preview line data.
   */
  updatePathPreviewLine(points: [number, number][]): void {
    const source = this.map.getSource('path-preview') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (points.length < 2) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: points,
        },
      }],
    });
  }

  /**
   * Set path preview layer visibility.
   */
  setPathPreviewVisibility(visible: boolean): void {
    this.setLayerVisibility('path-preview-glow', visible);
    this.setLayerVisibility('path-preview-line', visible);
  }

  /**
   * Add buildings source and layers with data-driven styling.
   * Handles underground buildings (ofl__bez = "Unter der Erdoberfläche") separately.
   */
  addBuildingsLayer(buildingData: BuildingCollection): void {
    // Split buildings into above-ground and underground
    const aboveGroundFeatures = buildingData.features.filter(
      f => f.properties['ofl__bez'] !== 'Unter der Erdoberfläche'
    );
    const undergroundFeatures = buildingData.features.filter(
      f => f.properties['ofl__bez'] === 'Unter der Erdoberfläche'
    );

    console.log(`Buildings: ${aboveGroundFeatures.length} above ground, ${undergroundFeatures.length} underground`);

    // Add source for above-ground buildings
    this.map.addSource('buildings', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: aboveGroundFeatures,
      },
    });

    // Build the match expression for land use colors
    // Using explicit array to satisfy TypeScript
    const colorMatchExpression = [
      'match',
      ['get', 'primaryLandUse'],
      'Generic Residential', LAND_USE_COLORS['Generic Residential'],
      'Generic Retail', LAND_USE_COLORS['Generic Retail'],
      'Generic Food and Beverage Service', LAND_USE_COLORS['Generic Food and Beverage Service'],
      'Generic Entertainment', LAND_USE_COLORS['Generic Entertainment'],
      'Generic Service', LAND_USE_COLORS['Generic Service'],
      'Generic Health and Wellbeing', LAND_USE_COLORS['Generic Health and Wellbeing'],
      'Generic Education', LAND_USE_COLORS['Generic Education'],
      'Generic Office Building', LAND_USE_COLORS['Generic Office Building'],
      'Generic Culture', LAND_USE_COLORS['Generic Culture'],
      'Generic Civic Function', LAND_USE_COLORS['Generic Civic Function'],
      'Generic Sport Facility', LAND_USE_COLORS['Generic Sport Facility'],
      'Generic Light Industrial', LAND_USE_COLORS['Generic Light Industrial'],
      'Generic Accommodation', LAND_USE_COLORS['Generic Accommodation'],
      'Generic Transportation Service', LAND_USE_COLORS['Generic Transportation Service'],
      'Generic Utilities', LAND_USE_COLORS['Generic Utilities'],
      'Undefined Land use', LAND_USE_COLORS['Undefined Land use'],
      LAND_USE_COLORS['Undefined Land use'], // fallback
    ] as maplibregl.ExpressionSpecification;

    // Flat fill layer used only for footprint outlines — gives building definition
    this.map.addLayer({
      id: 'buildings-footprint',
      type: 'fill',
      source: 'buildings',
      paint: {
        'fill-color': 'rgba(0,0,0,0)',
        'fill-outline-color': MAP_COLORS.light.buildingOutline,
      },
    });

    // 3D extruded buildings based on Height property from GeoJSON
    // Height is stored as string in GeoJSON, convert to number
    this.map.addLayer({
      id: 'buildings-fill',
      type: 'fill-extrusion',
      source: 'buildings',
      paint: {
        'fill-extrusion-color': colorMatchExpression,
        'fill-extrusion-height': [
          '*',
          ['to-number', ['coalesce', ['get', 'Height'], '5']],
          1,
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9,
      },
    });

    // Add underground buildings as flat, very transparent outlines at ground level
    if (undergroundFeatures.length > 0) {
      this.map.addSource('buildings-underground', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: undergroundFeatures,
        },
      });

      // Flat fill for underground footprint
      this.map.addLayer({
        id: 'buildings-underground-fill',
        type: 'fill',
        source: 'buildings-underground',
        paint: {
          'fill-color': '#666666', // Gray for underground
          'fill-opacity': 0.15,
        },
      });

      // Dashed outline to indicate underground
      this.map.addLayer({
        id: 'buildings-underground-outline',
        type: 'line',
        source: 'buildings-underground',
        paint: {
          'line-color': '#444444',
          'line-width': 1,
          'line-dasharray': [2, 2], // Dashed line
          'line-opacity': 0.4,
        },
      });
    }
  }

  /**
   * Update the heatmap data with current street usage.
   */
  updateHeatmapData(segments: SegmentUsage[]): void {
    const source = this.map.getSource('street-usage') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = segments
      .filter((s) => s.count >= 1)
      .map((segment) => ({
        type: 'Feature' as const,
        properties: {
          normalized: segment.normalized,
          count: segment.count,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [segment.from, segment.to],
        },
      }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  /**
   * Update the heatmap gradient colors.
   * Supports variable number of stops.
   */
  updateHeatmapGradient(gradient: HeatmapGradient): void {
    if (!this.map.getLayer('street-usage-heatmap')) return;

    // Sort stops by position and build the interpolate expression
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);

    // Build interpolation array: [position1, color1, position2, color2, ...]
    const interpolationStops: (string | number)[] = [];
    for (const stop of sortedStops) {
      interpolationStops.push(stop.position, stop.color);
    }

    this.map.setPaintProperty('street-usage-heatmap', 'line-color', [
      'interpolate',
      ['linear'],
      ['get', 'normalized'],
      ...interpolationStops,
    ] as maplibregl.ExpressionSpecification);
  }

  /**
   * Update the top streets highlight layer.
   */
  updateTopStreets(segments: SegmentUsage[]): void {
    const source = this.map.getSource('top-streets') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = segments.map((segment) => ({
      type: 'Feature' as const,
      properties: {
        count: segment.count,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [segment.from, segment.to],
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  /**
   * Add low walkability buildings source and layer.
   */
  addLowWalkabilityLayer(): void {
    this.map.addSource('low-walkability-buildings', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Glow layer for low walkability buildings (red highlight)
    this.map.addLayer({
      id: 'low-walkability-glow',
      type: 'fill-extrusion',
      source: 'low-walkability-buildings',
      layout: {
        'visibility': 'none',
      },
      paint: {
        'fill-extrusion-color': '#ef4444', // Red for poor accessibility
        'fill-extrusion-height': [
          '*',
          ['to-number', ['coalesce', ['get', 'Height'], '5']],
          1.02, // Slightly taller to appear above other buildings
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
      },
    });
  }

  /**
   * Update low walkability buildings layer.
   */
  updateLowWalkabilityBuildings(buildingIds: string[], buildingData: BuildingCollection): void {
    const source = this.map.getSource('low-walkability-buildings') as maplibregl.GeoJSONSource;
    if (!source) return;

    const idSet = new Set(buildingIds);
    const features = buildingData.features.filter(
      (f) => idSet.has(f.properties['Building ID'] as string)
    );

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  /**
   * Set layer visibility.
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  /**
   * Filter buildings by enabled land uses.
   * Residential buildings are always shown.
   */
  setLandUseFilter(enabledLandUses: Set<LandUse>): void {
    // Build filter: show residential OR any enabled land use
    const filterValues = ['Generic Residential', ...Array.from(enabledLandUses)];

    const filter: maplibregl.FilterSpecification = [
      'in',
      ['get', 'primaryLandUse'],
      ['literal', filterValues],
    ];

    if (this.map.getLayer('buildings-fill')) {
      this.map.setFilter('buildings-fill', filter);
    }
  }

  /**
   * Clear the land use filter (show all buildings).
   */
  clearLandUseFilter(): void {
    if (this.map.getLayer('buildings-fill')) {
      this.map.setFilter('buildings-fill', null);
    }
  }

  /**
   * Set buildings and natural elements to monochrome (gray) mode for better heatmap readability.
   */
  setMonochromeBuildings(monochrome: boolean): void {
    this.isMonochrome = monochrome;
    const c = this.isDark ? MAP_COLORS.dark : MAP_COLORS.light;

    if (monochrome) {
      if (this.map.getLayer('buildings-fill')) {
        this.map.setPaintProperty('buildings-fill', 'fill-extrusion-color', c.monochromeBuilding);
      }
      if (this.map.getLayer('water-fill')) {
        this.map.setPaintProperty('water-fill', 'fill-color', c.monochromeWater);
      }
      if (this.map.getLayer('vegetation-fill')) {
        this.map.setPaintProperty('vegetation-fill', 'fill-color', c.monochromeVegetation);
      }
      if (this.map.getLayer('green-space-fill')) {
        this.map.setPaintProperty('green-space-fill', 'fill-color', c.monochromeGreenSpace);
      }
    } else {
      if (this.map.getLayer('buildings-fill')) {
        const colorMatchExpression = [
          'match',
          ['get', 'primaryLandUse'],
          'Generic Residential', LAND_USE_COLORS['Generic Residential'],
          'Generic Retail', LAND_USE_COLORS['Generic Retail'],
          'Generic Food and Beverage Service', LAND_USE_COLORS['Generic Food and Beverage Service'],
          'Generic Entertainment', LAND_USE_COLORS['Generic Entertainment'],
          'Generic Service', LAND_USE_COLORS['Generic Service'],
          'Generic Health and Wellbeing', LAND_USE_COLORS['Generic Health and Wellbeing'],
          'Generic Education', LAND_USE_COLORS['Generic Education'],
          'Generic Office Building', LAND_USE_COLORS['Generic Office Building'],
          'Generic Culture', LAND_USE_COLORS['Generic Culture'],
          'Generic Civic Function', LAND_USE_COLORS['Generic Civic Function'],
          'Generic Sport Facility', LAND_USE_COLORS['Generic Sport Facility'],
          'Generic Light Industrial', LAND_USE_COLORS['Generic Light Industrial'],
          'Generic Accommodation', LAND_USE_COLORS['Generic Accommodation'],
          'Generic Transportation Service', LAND_USE_COLORS['Generic Transportation Service'],
          'Generic Utilities', LAND_USE_COLORS['Generic Utilities'],
          'Undefined Land use', LAND_USE_COLORS['Undefined Land use'],
          LAND_USE_COLORS['Undefined Land use'], // fallback
        ] as maplibregl.ExpressionSpecification;
        this.map.setPaintProperty('buildings-fill', 'fill-extrusion-color', colorMatchExpression);
      }
      if (this.map.getLayer('water-fill')) {
        this.map.setPaintProperty('water-fill', 'fill-color', c.water);
      }
      if (this.map.getLayer('vegetation-fill')) {
        this.map.setPaintProperty('vegetation-fill', 'fill-color', c.vegetation);
      }
      if (this.map.getLayer('green-space-fill')) {
        this.map.setPaintProperty('green-space-fill', 'fill-color', c.greenSpace);
      }
    }
  }

  /**
   * Switch the map between dark and light visual themes.
   * Updates background, streets, natural elements, and building outlines.
   */
  setDarkMode(isDark: boolean): void {
    this.isDark = isDark;
    const c = isDark ? MAP_COLORS.dark : MAP_COLORS.light;

    // Background
    if (this.map.getLayer('background')) {
      this.map.setPaintProperty('background', 'background-color', c.background);
    }

    // Streets
    if (this.map.getLayer('street-base')) {
      this.map.setPaintProperty('street-base', 'line-color', c.streetBase);
    }
    if (this.map.getLayer('street-shadow')) {
      this.map.setPaintProperty('street-shadow', 'line-color', c.streetShadow);
    }

    // Building footprint outlines
    if (this.map.getLayer('buildings-footprint')) {
      this.map.setPaintProperty('buildings-footprint', 'fill-outline-color', c.buildingOutline);
    }

    // Natural elements — also respects monochrome mode
    if (this.isMonochrome) {
      if (this.map.getLayer('water-fill')) {
        this.map.setPaintProperty('water-fill', 'fill-color', c.monochromeWater);
      }
      if (this.map.getLayer('vegetation-fill')) {
        this.map.setPaintProperty('vegetation-fill', 'fill-color', c.monochromeVegetation);
      }
      if (this.map.getLayer('green-space-fill')) {
        this.map.setPaintProperty('green-space-fill', 'fill-color', c.monochromeGreenSpace);
      }
      if (this.map.getLayer('buildings-fill')) {
        this.map.setPaintProperty('buildings-fill', 'fill-extrusion-color', c.monochromeBuilding);
      }
    } else {
      if (this.map.getLayer('water-fill')) {
        this.map.setPaintProperty('water-fill', 'fill-color', c.water);
      }
      if (this.map.getLayer('vegetation-fill')) {
        this.map.setPaintProperty('vegetation-fill', 'fill-color', c.vegetation);
      }
      if (this.map.getLayer('green-space-fill')) {
        this.map.setPaintProperty('green-space-fill', 'fill-color', c.greenSpace);
      }
    }

    // Underground buildings
    if (this.map.getLayer('buildings-underground-fill')) {
      this.map.setPaintProperty('buildings-underground-fill', 'fill-color', c.undergroundFill);
    }
    if (this.map.getLayer('buildings-underground-outline')) {
      this.map.setPaintProperty('buildings-underground-outline', 'line-color', c.undergroundOutline);
    }
  }

  /**
   * Clear the agent canvas.
   */
  clearAgentCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.agentCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.agentCtx.clearRect(0, 0, this.agentCanvas.width, this.agentCanvas.height);
    this.agentCtx.scale(dpr, dpr);
  }

  /**
   * Get the agent canvas context.
   */
  getCanvasContext(): CanvasRenderingContext2D {
    return this.agentCtx;
  }

  /**
   * Get the container element's dimensions.
   */
  getContainerSize(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
}
