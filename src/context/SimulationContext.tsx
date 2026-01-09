import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { LandUse, SimulationStats, BuildingCollection, StreetCollection, Path, Building } from '../config/types';
import { DESTINATION_LAND_USES } from '../config/constants';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { BuildingStore } from '../data/buildingStore';
import { StreetGraph } from '../data/streetGraph';
import { MapLibreView } from '../visualization/MapLibreView';
import { AgentRenderer } from '../visualization/agentRenderer';
import { loadBuildings, loadStreets } from '../data/dataLoader';
import { createLegend } from '../visualization/buildingLayer';
import type { SegmentUsage } from '../data/StreetUsageTracker';
import { calculateBuildingWalkability, getWalkabilityBuildingsInRange, type BuildingWalkabilityScore } from '../data/buildingWalkability';

export interface SelectedBuildingStats {
  building: Building;
  tripsGenerated: number;
  tripsAttracted: number;
  clickPosition: [number, number];
}

interface SimulationContextValue {
  // State
  isLoading: boolean;
  loadingStatus: string;
  isRunning: boolean;
  stats: SimulationStats;
  enabledLandUses: Set<LandUse>;
  showUsageHeatmap: boolean;
  showAgents: boolean;
  showTopStreets: boolean;
  topStreetsRange: [number, number];
  showLowWalkability: boolean;
  lowWalkabilityRange: [number, number];
  speed: number;
  spawnRate: number;

  // Path preview state
  showPathPreview: boolean;
  pathPreviewStart: [number, number] | null;
  pathPreviewEnd: [number, number] | null;
  pathPreviewPath: Path | null;

  // Selected building state
  selectedBuildingStats: SelectedBuildingStats | null;

  // Actions
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setSpawnRate: (rate: number) => void;
  toggleLandUse: (landUse: LandUse, enabled: boolean) => void;
  setShowUsageHeatmap: (show: boolean) => void;
  setShowAgents: (show: boolean) => void;
  setShowTopStreets: (show: boolean) => void;
  setTopStreetsRange: (range: [number, number]) => void;
  setShowLowWalkability: (show: boolean) => void;
  setLowWalkabilityRange: (range: [number, number]) => void;

  // Building walkability data
  getResidentialCount: () => number;
  getLowWalkabilityCount: () => number;

  // Selected building actions
  clearSelectedBuilding: () => void;

  // Path preview actions
  setShowPathPreview: (show: boolean) => void;
  setPathPreviewStart: (point: [number, number] | null) => void;
  setPathPreviewEnd: (point: [number, number] | null) => void;
  findPath: (from: [number, number], to: [number, number]) => Path | null;

  // Map access
  getMapView: () => MapLibreView | null;

  // Map initialization and resize
  initializeMap: (containerId: string) => void;
  resizeMap: () => void;

  // Data access for insights
  getStreetUsage: () => SegmentUsage[];
  getStreetUsageMax: () => number;
  getAverageDistancesByLandUse: () => Map<LandUse, { avgDistance: number; count: number }>;
  getLandUseAreas: () => Map<LandUse, number>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  // UI state
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({ activeAgents: 0, totalTrips: 0, avgDistance: 0 });
  const [enabledLandUses, setEnabledLandUses] = useState<Set<LandUse>>(new Set(DESTINATION_LAND_USES));
  const [showUsageHeatmap, setShowUsageHeatmap] = useState(false);
  const [showAgents, setShowAgents] = useState(true);
  const [showTopStreets, setShowTopStreets] = useState(false);
  const [topStreetsRange, setTopStreetsRange] = useState<[number, number]>([0, 10]);
  const [showLowWalkability, setShowLowWalkability] = useState(false);
  const [lowWalkabilityRange, setLowWalkabilityRange] = useState<[number, number]>([0, 10]);
  const [buildingWalkabilityScores, setBuildingWalkabilityScores] = useState<Map<string, BuildingWalkabilityScore>>(new Map());
  const [speed, setSpeedState] = useState(5);
  const [spawnRate, setSpawnRateState] = useState(1.0);

  // Path preview state
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [pathPreviewStart, setPathPreviewStart] = useState<[number, number] | null>(null);
  const [pathPreviewEnd, setPathPreviewEnd] = useState<[number, number] | null>(null);
  const [pathPreviewPath, setPathPreviewPath] = useState<Path | null>(null);

  // Selected building state
  const [selectedBuildingStats, setSelectedBuildingStats] = useState<SelectedBuildingStats | null>(null);

  // Refs for imperative objects
  const engineRef = useRef<SimulationEngine | null>(null);
  const mapViewRef = useRef<MapLibreView | null>(null);
  const agentRendererRef = useRef<AgentRenderer | null>(null);
  const buildingStoreRef = useRef<BuildingStore | null>(null);
  const enrichedBuildingsRef = useRef<BuildingCollection | null>(null);
  const initializedRef = useRef(false);
  const lastHeatmapUpdateRef = useRef<number>(0);
  const HEATMAP_UPDATE_INTERVAL = 1000; // ms (reduced frequency for performance)

  /**
   * Enrich building GeoJSON with primaryLandUse property for MapLibre data-driven styling.
   */
  const enrichBuildingGeoJSON = useCallback((
    geoJSON: BuildingCollection,
    buildingStore: BuildingStore
  ): BuildingCollection => {
    return {
      ...geoJSON,
      features: geoJSON.features.map((feature) => {
        const buildingId = feature.properties['Building ID'];
        const building = buildingStore.getBuildingById(buildingId);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            primaryLandUse: building?.primaryLandUse || 'Undefined Land use',
          },
        };
      }),
    };
  }, []);

  // Initialize map and load data
  const initializeMap = useCallback(async (containerId: string) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // Initialize MapLibre view
      setLoadingStatus('Initializing view...');
      const mapView = new MapLibreView(containerId);
      mapViewRef.current = mapView;

      // Wait for map to be ready
      await mapView.ready();

      // Load buildings
      setLoadingStatus('Loading buildings...');
      let buildingData: BuildingCollection;
      try {
        buildingData = await loadBuildings();
      } catch (e) {
        console.warn('Could not load buildings:', e);
        setLoadingStatus('Buildings data not found. Please add weimar-buildings.geojson to public/data/');
        setIsLoading(false);
        return;
      }

      // Process buildings
      setLoadingStatus('Processing buildings...');
      const buildingStore = new BuildingStore();
      buildingStore.loadFromGeoJSON(buildingData);
      buildingStoreRef.current = buildingStore;

      console.log(`Loaded ${buildingStore.buildings.size} buildings`);
      console.log(`Residential: ${buildingStore.residential.length}`);
      console.log(`Destinations: ${buildingStore.destinations.length}`);

      // Load streets
      setLoadingStatus('Loading streets...');
      let streetData: StreetCollection | null = null;
      try {
        streetData = await loadStreets();
      } catch (e) {
        console.warn('Could not load streets:', e);
        console.log('Simulation will use direct paths between buildings');
      }

      // Add MapLibre layers
      setLoadingStatus('Adding map layers...');

      // Add streets first (bottom layer)
      if (streetData) {
        mapView.addStreetsLayer(streetData);
      }

      // Add heatmap layer (above streets, below buildings)
      mapView.addHeatmapLayer();

      // Add path preview layer (above heatmap, below buildings)
      mapView.addPathPreviewLayer();

      // Enrich building GeoJSON with primaryLandUse for data-driven styling
      const enrichedBuildings = enrichBuildingGeoJSON(buildingData, buildingStore);
      enrichedBuildingsRef.current = enrichedBuildings;

      // Add low walkability layer (before buildings so it appears underneath)
      mapView.addLowWalkabilityLayer();

      mapView.addBuildingsLayer(enrichedBuildings);

      // Calculate per-building walkability scores
      setLoadingStatus('Calculating walkability...');
      const walkabilityScores = calculateBuildingWalkability(
        buildingStore.residential,
        buildingStore.destinations,
        new Set(DESTINATION_LAND_USES)
      );
      setBuildingWalkabilityScores(walkabilityScores);
      console.log(`Calculated walkability for ${walkabilityScores.size} buildings`);

      // Fit map to data bounds
      const bounds = buildingStore.getBounds();
      if (bounds) {
        mapView.fitBounds(bounds);
      }

      // Build street graph for pathfinding
      setLoadingStatus('Building street network...');
      const streetGraph = new StreetGraph();
      if (streetData) {
        streetGraph.buildFromGeoJSON(streetData);
        console.log(`Street graph: ${streetGraph.nodeCount} nodes, ${streetGraph.edgeCount} edges`);
      }

      // Initialize simulation engine
      setLoadingStatus('Initializing simulation...');
      const engine = new SimulationEngine(buildingStore, streetGraph);
      engineRef.current = engine;

      console.log(`Max active agents: ${engine.getMaxActiveAgents().toLocaleString()} (10% of residents)`);

      // Initialize agent renderer
      const agentRenderer = new AgentRenderer(mapView);
      agentRendererRef.current = agentRenderer;

      // Create legend
      createLegend();

      // Set up engine callbacks
      engine.onUpdate = (agents) => {
        if (showAgents && agentRendererRef.current) {
          agentRendererRef.current.render(agents);
        }

        // Update heatmap periodically during simulation
        if (showUsageHeatmap) {
          const now = Date.now();
          if (now - lastHeatmapUpdateRef.current > HEATMAP_UPDATE_INTERVAL) {
            const segments = engine.getUsageTracker().getSegmentUsage();
            mapView.updateHeatmapData(segments);
            lastHeatmapUpdateRef.current = now;
          }
        }

        // Update top streets periodically
        if (showTopStreets) {
          const now = Date.now();
          if (now - lastHeatmapUpdateRef.current > HEATMAP_UPDATE_INTERVAL) {
            const segments = engine.getUsageTracker().getSegmentUsage();
            const sorted = [...segments].sort((a, b) => b.count - a.count);
            const [minPercent, maxPercent] = topStreetsRange;
            const minIndex = Math.floor(sorted.length * minPercent / 100);
            const maxIndex = Math.ceil(sorted.length * maxPercent / 100);
            mapView.updateTopStreets(sorted.slice(minIndex, maxIndex));
          }
        }
      };

      engine.onStatsUpdate = (newStats) => {
        setStats(newStats);
      };

      engine.onLandUseToggle = (newEnabledLandUses) => {
        setEnabledLandUses(new Set(newEnabledLandUses));
        mapView.setLandUseFilter(newEnabledLandUses);
      };

      // Note: onViewChange callback is set up in the useEffect below
      // to ensure it has access to the current showAgents value

      // Wire up building click callback
      mapView.onBuildingClick = (buildingId, coordinates) => {
        const building = buildingStore.getBuildingById(buildingId);
        const tripStats = engine.getBuildingTripStats(buildingId);

        if (building) {
          setSelectedBuildingStats({
            building,
            tripsGenerated: tripStats.generated,
            tripsAttracted: tripStats.attracted,
            clickPosition: coordinates,
          });
        }
      };

      setLoadingStatus('Ready!');
      setIsLoading(false);

      console.log('Simulation ready. Click "Play" to start.');

    } catch (error) {
      console.error('Error initializing simulation:', error);
      setLoadingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [enrichBuildingGeoJSON, showAgents, showUsageHeatmap, showTopStreets, topStreetsRange]);

  // Update engine callbacks and view change handler when display toggles change
  useEffect(() => {
    const engine = engineRef.current;
    const agentRenderer = agentRendererRef.current;
    const mapView = mapViewRef.current;

    if (!engine || !agentRenderer || !mapView) return;

    // Update the onUpdate callback with current toggle states
    engine.onUpdate = (agents) => {
      // Render agents if enabled
      if (showAgents) {
        agentRenderer.render(agents);
      }

      // Update heatmap periodically during simulation
      if (showUsageHeatmap) {
        const now = Date.now();
        if (now - lastHeatmapUpdateRef.current > HEATMAP_UPDATE_INTERVAL) {
          const segments = engine.getUsageTracker().getSegmentUsage();
          mapView.updateHeatmapData(segments);
          lastHeatmapUpdateRef.current = now;
        }
      }

      // Update top streets periodically
      if (showTopStreets) {
        const now = Date.now();
        if (now - lastHeatmapUpdateRef.current > HEATMAP_UPDATE_INTERVAL) {
          const segments = engine.getUsageTracker().getSegmentUsage();
          const sorted = [...segments].sort((a, b) => b.count - a.count);
          const [minPercent, maxPercent] = topStreetsRange;
          const minIndex = Math.floor(sorted.length * minPercent / 100);
          const maxIndex = Math.ceil(sorted.length * maxPercent / 100);
          mapView.updateTopStreets(sorted.slice(minIndex, maxIndex));
        }
      }
    };

    // Update view change callback with current showAgents value
    mapView.onViewChange = () => {
      if (showAgents && agentRendererRef.current && engineRef.current) {
        agentRendererRef.current.render(engineRef.current.getAgents());
      }
    };

    // Immediately update agent visibility
    if (showAgents) {
      agentRenderer.render(engine.getAgents());
    } else {
      mapView.clearAgentCanvas();
    }
  }, [showAgents, showUsageHeatmap, showTopStreets, topStreetsRange]);

  // Update MapLibre layer visibility when toggles change
  useEffect(() => {
    const mapView = mapViewRef.current;
    const engine = engineRef.current;
    if (!mapView || isLoading) return;

    // Toggle heatmap layer visibility
    mapView.setLayerVisibility('street-usage-heatmap', showUsageHeatmap);

    // Update heatmap data immediately when toggling on
    if (showUsageHeatmap && engine) {
      const segments = engine.getUsageTracker().getSegmentUsage();
      mapView.updateHeatmapData(segments);
    }
  }, [showUsageHeatmap, isLoading]);

  // Update top streets layer visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    const engine = engineRef.current;
    if (!mapView || isLoading) return;

    // Toggle top streets layers visibility
    mapView.setLayerVisibility('top-streets-glow', showTopStreets);
    mapView.setLayerVisibility('top-streets-core', showTopStreets);

    // Update top streets data immediately when toggling on or changing range
    if (showTopStreets && engine) {
      const segments = engine.getUsageTracker().getSegmentUsage();
      const sorted = [...segments].sort((a, b) => b.count - a.count);
      const [minPercent, maxPercent] = topStreetsRange;
      const minIndex = Math.floor(sorted.length * minPercent / 100);
      const maxIndex = Math.ceil(sorted.length * maxPercent / 100);
      mapView.updateTopStreets(sorted.slice(minIndex, maxIndex));
    }
  }, [showTopStreets, topStreetsRange, isLoading]);

  // Update low walkability layer visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    const enrichedBuildings = enrichedBuildingsRef.current;
    if (!mapView || isLoading) return;

    // Toggle low walkability layer visibility
    mapView.setLayerVisibility('low-walkability-glow', showLowWalkability);

    // Update low walkability buildings when toggling on or changing range
    if (showLowWalkability && buildingWalkabilityScores.size > 0 && enrichedBuildings) {
      const lowestIds = getWalkabilityBuildingsInRange(buildingWalkabilityScores, lowWalkabilityRange);
      mapView.updateLowWalkabilityBuildings(lowestIds, enrichedBuildings);
    }
  }, [showLowWalkability, lowWalkabilityRange, buildingWalkabilityScores, isLoading]);

  // Update path preview layer visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.setPathPreviewVisibility(showPathPreview);
  }, [showPathPreview, isLoading]);

  // Compute path when preview points change
  useEffect(() => {
    const mapView = mapViewRef.current;
    const engine = engineRef.current;
    if (!mapView || !engine || isLoading) return;

    if (!showPathPreview || !pathPreviewStart || !pathPreviewEnd) {
      setPathPreviewPath(null);
      mapView.updatePathPreviewLine([]);
      return;
    }

    const path = engine.findPath(pathPreviewStart, pathPreviewEnd);
    setPathPreviewPath(path);
    mapView.updatePathPreviewLine(path.points);
  }, [showPathPreview, pathPreviewStart, pathPreviewEnd, isLoading]);

  // Actions
  const play = useCallback(() => {
    engineRef.current?.start();
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setIsRunning(false);
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    engineRef.current?.setSpeed(newSpeed);
    setSpeedState(newSpeed);
  }, []);

  const setSpawnRate = useCallback((rate: number) => {
    engineRef.current?.setSpawnRate(rate);
    setSpawnRateState(rate);
  }, []);

  const toggleLandUse = useCallback((landUse: LandUse, enabled: boolean) => {
    engineRef.current?.toggleLandUse(landUse, enabled);
  }, []);

  const resizeMap = useCallback(() => {
    mapViewRef.current?.resizeCanvas();
  }, []);

  const getStreetUsage = useCallback((): SegmentUsage[] => {
    return engineRef.current?.getUsageTracker().getSegmentUsage() || [];
  }, []);

  const getStreetUsageMax = useCallback((): number => {
    return engineRef.current?.getUsageTracker().getMaxCount() || 0;
  }, []);

  const getAverageDistancesByLandUse = useCallback((): Map<LandUse, { avgDistance: number; count: number }> => {
    return engineRef.current?.getAverageDistancesByLandUse() || new Map();
  }, []);

  const getLandUseAreas = useCallback((): Map<LandUse, number> => {
    const buildingStore = buildingStoreRef.current;
    if (!buildingStore) return new Map();

    const totals = new Map<LandUse, number>();
    for (const building of buildingStore.buildings.values()) {
      for (const [landUse, area] of building.landUseAreas) {
        totals.set(landUse, (totals.get(landUse) || 0) + area);
      }
    }
    return totals;
  }, []);

  const getResidentialCount = useCallback((): number => {
    return buildingStoreRef.current?.residential.length || 0;
  }, []);

  const getLowWalkabilityCount = useCallback((): number => {
    if (buildingWalkabilityScores.size === 0) return 0;
    const [minPercent, maxPercent] = lowWalkabilityRange;
    const minIndex = Math.floor(buildingWalkabilityScores.size * minPercent / 100);
    const maxIndex = Math.ceil(buildingWalkabilityScores.size * maxPercent / 100);
    return maxIndex - minIndex;
  }, [buildingWalkabilityScores, lowWalkabilityRange]);

  // Selected building methods
  const clearSelectedBuilding = useCallback(() => {
    setSelectedBuildingStats(null);
  }, []);

  // Path preview methods
  const findPath = useCallback((from: [number, number], to: [number, number]): Path | null => {
    return engineRef.current?.findPath(from, to) ?? null;
  }, []);

  const getMapView = useCallback(() => {
    return mapViewRef.current;
  }, []);

  const value: SimulationContextValue = {
    isLoading,
    loadingStatus,
    isRunning,
    stats,
    enabledLandUses,
    showUsageHeatmap,
    showAgents,
    showTopStreets,
    topStreetsRange,
    showLowWalkability,
    lowWalkabilityRange,
    speed,
    spawnRate,
    showPathPreview,
    pathPreviewStart,
    pathPreviewEnd,
    pathPreviewPath,
    selectedBuildingStats,
    play,
    pause,
    reset,
    setSpeed,
    setSpawnRate,
    toggleLandUse,
    setShowUsageHeatmap,
    setShowAgents,
    setShowTopStreets,
    setTopStreetsRange,
    setShowLowWalkability,
    setLowWalkabilityRange,
    getResidentialCount,
    getLowWalkabilityCount,
    clearSelectedBuilding,
    setShowPathPreview,
    setPathPreviewStart,
    setPathPreviewEnd,
    findPath,
    getMapView,
    initializeMap,
    resizeMap,
    getStreetUsage,
    getStreetUsageMax,
    getAverageDistancesByLandUse,
    getLandUseAreas,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
}
