import maplibregl from 'maplibre-gl';
import type { LandUse, BuildingCollection, StreetCollection } from '../config/types';
import type { SegmentUsage } from '../data/StreetUsageTracker';
import { LAND_USE_COLORS } from '../config/constants';

/**
 * MapLibre GL JS wrapper for WebGL-accelerated map rendering.
 * Replaces Canvas 2D MapView for better pan/zoom performance.
 */
export class MapLibreView {
  public map: maplibregl.Map;
  public agentCanvas: HTMLCanvasElement;
  public agentCtx: CanvasRenderingContext2D;

  private container: HTMLElement;

  // Callbacks
  public onViewChange: (() => void) | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.container.style.position = 'relative';

    // Create MapLibre map with minimal style (no base map)
    this.map = new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        name: 'Weimar Simulation',
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#fafafa',
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
      center: [11.33, 50.98], // Weimar approximate center
      zoom: 16, // Higher zoom for better 3D visibility
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
    this.map.fitBounds(bounds, { padding: 50 });
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
   */
  addBuildingsLayer(buildingData: BuildingCollection): void {
    this.map.addSource('buildings', {
      type: 'geojson',
      data: buildingData,
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

    // 3D extruded buildings based on Height property from GeoJSON
    // Height is stored as string in GeoJSON, convert to number
    // Scale height for visibility (coordinates are in local system, not WGS84 meters)
    this.map.addLayer({
      id: 'buildings-fill',
      type: 'fill-extrusion',
      source: 'buildings',
      paint: {
        'fill-extrusion-color': colorMatchExpression,
        'fill-extrusion-height': [
          '*',
          ['to-number', ['coalesce', ['get', 'Height'], '5']],
          1, // Scale factor: convert meters to local coordinate units
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9,
      },
    });
  }

  /**
   * Update the heatmap data with current street usage.
   */
  updateHeatmapData(segments: SegmentUsage[], minThreshold: number = 0.01): void {
    const source = this.map.getSource('street-usage') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = segments
      .filter((s) => s.normalized >= minThreshold)
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
