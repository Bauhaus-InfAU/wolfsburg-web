import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { LandUse, SimulationStats, BuildingCollection, StreetCollection } from '../config/types';
import { DESTINATION_LAND_USES } from '../config/constants';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { BuildingStore } from '../data/buildingStore';
import { StreetGraph } from '../data/streetGraph';
import { MapView } from '../visualization/mapView';
import { AgentRenderer } from '../visualization/agentRenderer';
import { loadBuildings, loadStreets } from '../data/dataLoader';
import { renderBuildings, createLegend } from '../visualization/buildingLayer';
import { renderStreets } from '../visualization/streetLayer';
import { renderStreetUsage } from '../visualization/streetUsageLayer';

interface SimulationContextValue {
  // State
  isLoading: boolean;
  loadingStatus: string;
  isRunning: boolean;
  stats: SimulationStats;
  enabledLandUses: Set<LandUse>;
  showUsageHeatmap: boolean;
  showAgents: boolean;
  speed: number;
  spawnRate: number;

  // Actions
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setSpawnRate: (rate: number) => void;
  toggleLandUse: (landUse: LandUse, enabled: boolean) => void;
  setShowUsageHeatmap: (show: boolean) => void;
  setShowAgents: (show: boolean) => void;

  // Map initialization and resize
  initializeMap: (containerId: string) => void;
  resizeMap: () => void;
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
  const [speed, setSpeedState] = useState(1);
  const [spawnRate, setSpawnRateState] = useState(1.0);

  // Refs for imperative objects
  const engineRef = useRef<SimulationEngine | null>(null);
  const mapViewRef = useRef<MapView | null>(null);
  const agentRendererRef = useRef<AgentRenderer | null>(null);
  const buildingDataRef = useRef<BuildingCollection | null>(null);
  const streetDataRef = useRef<StreetCollection | null>(null);
  const buildingStoreRef = useRef<BuildingStore | null>(null);
  const initializedRef = useRef(false);

  // Render function for static layers
  const renderStaticLayers = useCallback((landUses?: Set<LandUse>) => {
    const mapView = mapViewRef.current;
    const buildingData = buildingDataRef.current;
    const buildingStore = buildingStoreRef.current;
    const streetData = streetDataRef.current;
    const engine = engineRef.current;

    if (!mapView || !buildingData || !buildingStore) return;

    mapView.clearCanvas();

    if (streetData) {
      renderStreets(mapView, streetData);
    }

    // Render usage heatmap on top of streets if enabled
    if (showUsageHeatmap && engine) {
      renderStreetUsage(mapView, engine.getUsageTracker());
    }

    renderBuildings(mapView, buildingData, buildingStore, landUses);
  }, [showUsageHeatmap]);

  // Initialize map and load data
  const initializeMap = useCallback(async (containerId: string) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // Initialize map view
      setLoadingStatus('Initializing view...');
      const mapView = new MapView(containerId);
      mapViewRef.current = mapView;

      // Load buildings
      setLoadingStatus('Loading buildings...');
      let buildingData: BuildingCollection;
      try {
        buildingData = await loadBuildings();
        buildingDataRef.current = buildingData;
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

      // Set map bounds
      const bounds = buildingStore.getBounds();
      if (bounds) {
        mapView.setDataBounds(bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]);
        mapView.fitToData();
      }

      // Load streets
      setLoadingStatus('Loading streets...');
      let streetData: StreetCollection | null = null;
      try {
        streetData = await loadStreets();
        streetDataRef.current = streetData;
      } catch (e) {
        console.warn('Could not load streets:', e);
        console.log('Simulation will use direct paths between buildings');
      }

      // Build street graph
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

      // Initialize renderer
      const agentRenderer = new AgentRenderer(mapView);
      agentRendererRef.current = agentRenderer;

      // Create legend
      createLegend();

      // Set up engine callbacks
      engine.onUpdate = (agents) => {
        if (showAgents && agentRendererRef.current) {
          agentRendererRef.current.render(agents);
        }
      };

      engine.onStatsUpdate = (newStats) => {
        setStats(newStats);
      };

      engine.onLandUseToggle = (newEnabledLandUses) => {
        setEnabledLandUses(new Set(newEnabledLandUses));
        renderStaticLayers(newEnabledLandUses);
      };

      // Set up view change callback
      mapView.onViewChange = () => {
        renderStaticLayers(engineRef.current?.getEnabledLandUses());
        if (showAgents && agentRendererRef.current && engineRef.current) {
          agentRendererRef.current.render(engineRef.current.getAgents());
        }
      };

      // Initial render
      renderStaticLayers();

      setLoadingStatus('Ready!');
      setIsLoading(false);

      console.log('Simulation ready. Click "Play" to start.');

    } catch (error) {
      console.error('Error initializing simulation:', error);
      setLoadingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [renderStaticLayers, showAgents]);

  // Update engine callbacks when showAgents changes
  useEffect(() => {
    const engine = engineRef.current;
    const agentRenderer = agentRendererRef.current;
    const mapView = mapViewRef.current;

    if (!engine || !agentRenderer || !mapView) return;

    engine.onUpdate = (agents) => {
      if (showAgents) {
        agentRenderer.render(agents);
      }
    };

    // Immediately update visibility
    if (showAgents) {
      agentRenderer.render(engine.getAgents());
    } else {
      mapView.clearAgentCanvas();
    }
  }, [showAgents]);

  // Update static layers when showUsageHeatmap changes
  useEffect(() => {
    if (!isLoading) {
      renderStaticLayers(engineRef.current?.getEnabledLandUses());
    }
  }, [showUsageHeatmap, isLoading, renderStaticLayers]);

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

  const value: SimulationContextValue = {
    isLoading,
    loadingStatus,
    isRunning,
    stats,
    enabledLandUses,
    showUsageHeatmap,
    showAgents,
    speed,
    spawnRate,
    play,
    pause,
    reset,
    setSpeed,
    setSpawnRate,
    toggleLandUse,
    setShowUsageHeatmap,
    setShowAgents,
    initializeMap,
    resizeMap,
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
