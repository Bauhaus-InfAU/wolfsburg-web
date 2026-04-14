import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { LandUse, BuildingCollection, StreetCollection, Path, Building, TransportMode } from '../config/types';
import { DESTINATION_LAND_USES } from '../config/constants';
import { FlowCalculator, type FlowResult } from '../simulation/FlowCalculator';
import { FlowCalculatorParallel } from '../simulation/FlowCalculatorParallel';
import { BuildingStore } from '../data/buildingStore';
import { StreetGraph } from '../data/streetGraph';
import { MapLibreView } from '../visualization/MapLibreView';
import { loadBuildings, loadStreets, loadBlocks, type BlockCollection } from '../data/dataLoader';
import { transformFeatureCollection } from '../utils/coordinateTransform';
import { getCityConfig } from '../config/cityConfig';
import { createLegend } from '../visualization/buildingLayer';
import type { SegmentUsage } from '../data/StreetUsageTracker';
import { calculateBuildingWalkability, getWalkabilityBuildingsInRange, type BuildingWalkabilityScore } from '../data/buildingWalkability';
import { DEFAULT_GRADIENT, GRADIENT_STORAGE_KEY, type HeatmapGradient } from '../config/gradientPresets';

const DISABLED_STREETS_STORAGE_KEY = 'wolfsburg-disabled-streets';
const ADDED_STREETS_STORAGE_KEY = 'wolfsburg-added-streets';
import { GraphPartitioner } from '../data/partition/GraphPartitioner';
import { IncrementalManager } from '../data/partition/IncrementalManager';
import type { PartitionStats } from '../data/partition/types';

export interface AddedStreetInfo {
  key: string; // canonical: "lng1,lat1|lng2,lat2"
  from: [number, number];
  to: [number, number];
}

export interface DisabledStreetInfo {
  fid: string;
  segments: Array<{ from: [number, number]; to: [number, number]; streetClass?: string }>;
  coordinates: [number, number][];
  name?: string;
  streetClass?: string;
}

export interface SelectedBuildingStats {
  building: Building;
  tripsGenerated: number;
  tripsAttracted: number;
  clickPosition: [number, number];
}

export interface FlowStats {
  totalTrips: number;
  avgDistance: number;
}

interface FlowContextValue {
  // State
  isLoading: boolean;
  loadingStatus: string;
  stats: FlowStats;
  enabledLandUses: Set<LandUse>;
  transportMode: TransportMode;
  showUsageHeatmap: boolean;
  showTopStreets: boolean;
  topStreetsRange: [number, number];
  showLowWalkability: boolean;
  lowWalkabilityRange: [number, number];

  // Calculation state
  isCalculating: boolean;
  calculationProgress: number;
  calculationStatus: string;
  hasCalculated: boolean;

  // Path preview state
  showPathPreview: boolean;
  pathPreviewStart: [number, number] | null;
  pathPreviewEnd: [number, number] | null;
  pathPreviewPath: Path | null;

  // Monochrome mode
  monochromeBuildings: boolean;

  // Selected building state
  selectedBuildingStats: SelectedBuildingStats | null;

  // Actions
  toggleLandUse: (landUse: LandUse, enabled: boolean) => void;
  setEnabledLandUses: (landUses: Set<LandUse>) => void;
  setTransportMode: (mode: TransportMode) => void;
  setShowUsageHeatmap: (show: boolean) => void;
  setShowTopStreets: (show: boolean) => void;

  // Heatmap gradient
  heatmapGradient: HeatmapGradient;
  setHeatmapGradient: (gradient: HeatmapGradient) => void;
  resetGradientToDefault: () => void;
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

  // Monochrome mode action
  setMonochromeBuildings: (monochrome: boolean) => void;

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

  // Recalculate flows (triggered after land use changes)
  recalculateFlows: () => void;

  // Manual calculation trigger
  startCalculation: () => void;

  // Graph editing (for interactive street modifications)
  addStreet: (from: [number, number], to: [number, number]) => void;
  removeStreet: (from: [number, number], to: [number, number]) => void;
  applyPendingUpdates: () => void;
  hasPendingUpdates: boolean;
  isUpdating: boolean;

  // Street segment editor — remove mode
  disabledStreets: Map<string, DisabledStreetInfo>;
  isRemoveMode: boolean;
  toggleRemoveMode: () => void;
  toggleStreet: (fid: string) => void;
  restoreStreet: (fid: string) => void;
  restoreAllStreets: () => void;

  // Street segment editor — add mode
  addedStreets: Map<string, AddedStreetInfo>;
  isAddMode: boolean;
  toggleAddMode: () => void;
  addSegment: (from: [number, number], to: [number, number]) => void;
  removeAddedSegment: (key: string) => void;
  clearAllAddedSegments: () => void;

  // Persistence
  saveStreetEdits: () => void;
  streetEditsUnsaved: boolean;

  /** @deprecated use isRemoveMode */
  isSegmentEditMode: boolean;
  /** @deprecated use toggleRemoveMode */
  toggleSegmentEditMode: () => void;

  // Partition stats (for debugging/display)
  getPartitionStats: () => PartitionStats | null;
  isPartitioningEnabled: boolean;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  // Flow stats (replaces simulation stats)
  const [stats, setStats] = useState<FlowStats>({ totalTrips: 0, avgDistance: 0 });
  const [enabledLandUses, setEnabledLandUsesState] = useState<Set<LandUse>>(new Set(DESTINATION_LAND_USES));
  const [transportMode, setTransportModeState] = useState<TransportMode>('pedestrian');
  const [showUsageHeatmap, setShowUsageHeatmap] = useState(true); // Default on for flow model
  const [showTopStreets, setShowTopStreets] = useState(false);

  // Heatmap gradient state with localStorage persistence
  const [heatmapGradient, setHeatmapGradientState] = useState<HeatmapGradient>(() => {
    try {
      const stored = localStorage.getItem(GRADIENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_GRADIENT;
    } catch {
      return DEFAULT_GRADIENT;
    }
  });
  const [topStreetsRange, setTopStreetsRange] = useState<[number, number]>([0, 10]);
  const [showLowWalkability, setShowLowWalkability] = useState(false);
  const [lowWalkabilityRange, setLowWalkabilityRange] = useState<[number, number]>([0, 10]);
  const [buildingWalkabilityScores, setBuildingWalkabilityScores] = useState<Map<string, BuildingWalkabilityScore>>(new Map());

  // Path preview state
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [pathPreviewStart, setPathPreviewStart] = useState<[number, number] | null>(null);
  const [pathPreviewEnd, setPathPreviewEnd] = useState<[number, number] | null>(null);
  const [pathPreviewPath, setPathPreviewPath] = useState<Path | null>(null);

  // Monochrome mode state
  const [monochromeBuildings, setMonochromeBuildings] = useState(false);

  // Selected building state
  const [selectedBuildingStats, setSelectedBuildingStats] = useState<SelectedBuildingStats | null>(null);

  // Flow result
  const [flowResult, setFlowResult] = useState<FlowResult | null>(null);

  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculationStatus, setCalculationStatus] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);
  const isCalculatingRef = useRef(false); // Ref to avoid dependency loops

  // Graph editing state
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPartitioningEnabled, setIsPartitioningEnabled] = useState(false);

  // Street segment editor state
  const [disabledStreets, setDisabledStreets] = useState<Map<string, DisabledStreetInfo>>(new Map());
  const [isRemoveMode, setIsRemoveModeState] = useState(false);
  const [addedStreets, setAddedStreets] = useState<Map<string, AddedStreetInfo>>(new Map());
  const [isAddMode, setIsAddModeState] = useState(false);
  const [streetEditsUnsaved, setStreetEditsUnsaved] = useState(false);
  // Index of all streets by fid, populated during initialization
  const streetSegmentsRef = useRef<Map<string, DisabledStreetInfo>>(new Map());

  // Refs for imperative objects
  const flowCalculatorRef = useRef<FlowCalculator | null>(null);
  const flowCalculatorParallelRef = useRef<FlowCalculatorParallel | null>(null);
  const mapViewRef = useRef<MapLibreView | null>(null);
  const buildingStoreRef = useRef<BuildingStore | null>(null);
  const streetGraphRef = useRef<StreetGraph | null>(null);
  const partitionerRef = useRef<GraphPartitioner | null>(null);
  const incrementalManagerRef = useRef<IncrementalManager | null>(null);
  const enrichedBuildingsRef = useRef<BuildingCollection | null>(null);
  const initializedRef = useRef(false);

  /**
   * Enrich building GeoJSON with primaryLandUse property for MapLibre data-driven styling.
   */
  const enrichBuildingGeoJSON = useCallback((
    _geoJSON: BuildingCollection,
    buildingStore: BuildingStore
  ): BuildingCollection => {
    const features = Array.from(buildingStore.buildings.values()).map(building => ({
      ...building.feature,
      properties: {
        ...building.feature.properties,
        primaryLandUse: building.primaryLandUse,
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, []);

  /**
   * Recalculate flows and update visualization.
   * Only triggered by land use changes, not visualization toggles.
   * Uses hierarchical pathfinding for faster computation.
   */
  const recalculateFlows = useCallback(async () => {
    // Prefer parallel calculator with hierarchical pathfinding
    const flowCalculator = flowCalculatorParallelRef.current ?? flowCalculatorRef.current;
    const mapView = mapViewRef.current;

    // Use ref to check calculating state to avoid dependency loop
    if (!flowCalculator || !mapView || !hasCalculated || isCalculatingRef.current) return;

    isCalculatingRef.current = true;
    setIsCalculating(true);
    setCalculationProgress(0);
    setCalculationStatus('Starting...');

    console.log(`Recalculating flows (A* pathfinding, mode: ${transportMode})...`);

    const result = await flowCalculator.calculateAsync(enabledLandUses, (percent, status) => {
      setCalculationProgress(percent);
      setCalculationStatus(status);
    }, transportMode);
    setFlowResult(result);

    // Update stats
    setStats({
      totalTrips: result.totalTrips,
      avgDistance: Math.round(result.avgDistance),
    });

    // Always update heatmap data - visibility is controlled by separate effect
    mapView.updateHeatmapData(result.streetFlows);

    isCalculatingRef.current = false;
    setIsCalculating(false);
    setCalculationProgress(100);

    // Log cache stats if using parallel calculator
    const cacheStats = flowCalculatorParallelRef.current?.getCacheStats();
    if (cacheStats) {
      console.log(`Flow calculation complete: ${result.totalTrips} trips, ${result.streetFlows.length} segments`);
      console.log(`  Cache: ${cacheStats.hits} hits, ${cacheStats.misses} misses (${(cacheStats.hitRate * 100).toFixed(1)}% hit rate)`);
    } else {
      console.log(`Flow calculation complete: ${result.totalTrips} trips, ${result.streetFlows.length} segments`);
    }
  }, [enabledLandUses, hasCalculated, transportMode]);

  /**
   * Manually start calculation (called by Calculate button).
   * Uses hierarchical pathfinding for faster computation.
   */
  const startCalculation = useCallback(async () => {
    // Prefer parallel calculator with hierarchical pathfinding
    const flowCalculator = flowCalculatorParallelRef.current ?? flowCalculatorRef.current;
    const mapView = mapViewRef.current;

    // Use ref to check calculating state to avoid dependency loop
    if (!flowCalculator || !mapView || isCalculatingRef.current) return;

    isCalculatingRef.current = true;
    setIsCalculating(true);
    setCalculationProgress(0);
    setCalculationStatus('Starting...');

    console.log(`Starting flow calculation (A* pathfinding, mode: ${transportMode})...`);

    const result = await flowCalculator.calculateAsync(enabledLandUses, (percent, status) => {
      setCalculationProgress(percent);
      setCalculationStatus(status);
    }, transportMode);
    setFlowResult(result);

    // Update stats
    setStats({
      totalTrips: result.totalTrips,
      avgDistance: Math.round(result.avgDistance),
    });

    // Update heatmap data - visibility is controlled by separate effect
    mapView.updateHeatmapData(result.streetFlows);

    isCalculatingRef.current = false;
    setIsCalculating(false);
    setHasCalculated(true);
    setCalculationProgress(100);
    setCalculationStatus('');

    // Log cache stats if using parallel calculator
    const cacheStats = flowCalculatorParallelRef.current?.getCacheStats();
    if (cacheStats) {
      console.log(`Flow calculation complete: ${result.totalTrips} trips, ${result.streetFlows.length} segments`);
      console.log(`  Cache: ${cacheStats.hits} hits, ${cacheStats.misses} misses (${(cacheStats.hitRate * 100).toFixed(1)}% hit rate)`);
    } else {
      console.log(`Flow calculation complete: ${result.totalTrips} trips, ${result.streetFlows.length} segments`);
    }
  }, [enabledLandUses, transportMode]);

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
        console.log('Flow calculation will use direct paths between buildings');
      }

      // Load blocks for natural elements
      setLoadingStatus('Loading natural elements...');
      let blockData: BlockCollection | null = null;
      try {
        blockData = await loadBlocks();
        if (blockData) {
          const cityConfig = getCityConfig();
          if (cityConfig.coordinateSystem === 'utm32n') {
            blockData = transformFeatureCollection(blockData) as BlockCollection;
          }
          console.log(`Loaded ${blockData.features.length} blocks`);
        }
      } catch (e) {
        console.warn('Could not load blocks:', e);
      }

      // Add MapLibre layers
      setLoadingStatus('Adding map layers...');

      if (blockData) {
        mapView.addNaturalElementsLayer(blockData);
      }

      if (streetData) {
        mapView.addStreetsLayer(streetData);
      }

      mapView.addHeatmapLayer();
      mapView.addDisabledStreetsLayer();
      mapView.addPathPreviewLayer();

      const enrichedBuildings = enrichBuildingGeoJSON(buildingData, buildingStore);
      enrichedBuildingsRef.current = enrichedBuildings;

      mapView.addLowWalkabilityLayer();
      mapView.addBuildingsLayer(enrichedBuildings);

      // Calculate walkability scores
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

        // Build fid → segment info index for the street editor
        const segmentsMap = new Map<string, DisabledStreetInfo>();
        for (const feature of streetData.features) {
          if (feature.geometry.type !== 'LineString') continue;
          const props = feature.properties as Record<string, unknown>;
          const fid = String(props?.fid ?? props?.id ?? '');
          if (!fid) continue;
          const coords = feature.geometry.coordinates as [number, number][];
          const segments: DisabledStreetInfo['segments'] = [];
          for (let i = 0; i < coords.length - 1; i++) {
            segments.push({
              from: coords[i],
              to: coords[i + 1],
              streetClass: props?.class as string | undefined,
            });
          }
          segmentsMap.set(fid, {
            fid,
            segments,
            coordinates: coords,
            name: props?.['names.primary'] as string | undefined,
            streetClass: props?.class as string | undefined,
          });
        }
        streetSegmentsRef.current = segmentsMap;

        // Restore saved disabled streets
        try {
          const savedDisabled = localStorage.getItem(DISABLED_STREETS_STORAGE_KEY);
          if (savedDisabled) {
            const fids: string[] = JSON.parse(savedDisabled);
            const restoredDisabled = new Map<string, DisabledStreetInfo>();
            for (const fid of fids) {
              const info = segmentsMap.get(fid);
              if (info) {
                for (const { from, to } of info.segments) {
                  streetGraph.removeStreetEdge(from, to);
                }
                restoredDisabled.set(fid, info);
              }
            }
            if (restoredDisabled.size > 0) setDisabledStreets(restoredDisabled);
          }
        } catch { /* ignore corrupt data */ }

        // Restore saved added streets
        try {
          const savedAdded = localStorage.getItem(ADDED_STREETS_STORAGE_KEY);
          if (savedAdded) {
            const list: AddedStreetInfo[] = JSON.parse(savedAdded);
            const restoredAdded = new Map<string, AddedStreetInfo>();
            for (const seg of list) {
              streetGraph.addStreetEdge(seg.from, seg.to);
              restoredAdded.set(seg.key, seg);
            }
            if (restoredAdded.size > 0) setAddedStreets(restoredAdded);
          }
        } catch { /* ignore corrupt data */ }
      }
      streetGraphRef.current = streetGraph;

      // Initialize partitioning for faster pathfinding
      setLoadingStatus('Building spatial partition...');
      const partitioner = new GraphPartitioner(streetGraph);
      partitioner.buildPartition(buildingStore);
      partitionerRef.current = partitioner;

      const incrementalManager = new IncrementalManager(partitioner, streetGraph);
      incrementalManagerRef.current = incrementalManager;

      streetGraph.setPartitioner(partitioner);
      streetGraph.setIncrementalManager(incrementalManager);

      const stats = partitioner.getStats();
      console.log(`Partition built: ${stats.nonEmptyCells} non-empty cells, ${stats.totalBoundaryNodes} boundary nodes`);
      setIsPartitioningEnabled(true);

      // Initialize parallel flow calculator with partitioning
      setLoadingStatus('Initializing flow calculator...');
      const flowCalculatorParallel = new FlowCalculatorParallel(buildingStore, streetGraph, {
        useParallelWorkers: false, // Disable workers for now, use hierarchical pathfinding
      });
      flowCalculatorParallel.enablePartitioning(partitioner, incrementalManager);
      flowCalculatorParallelRef.current = flowCalculatorParallel;

      // Keep old flow calculator for backwards compatibility
      const flowCalculator = new FlowCalculator(buildingStore, streetGraph);
      flowCalculatorRef.current = flowCalculator;

      // Create legend
      createLegend();

      // Wire up street segment click callback for edit mode
      mapView.onSegmentClick = (fid) => {
        // toggleStreet mutates streetGraph synchronously then triggers recalc
        // We use the ref to avoid stale closure issues
        const info = streetSegmentsRef.current.get(fid);
        const graph = streetGraphRef.current;
        if (!info || !graph) return;

        setDisabledStreets(prev => {
          const next = new Map(prev);
          if (next.has(fid)) {
            for (const { from, to, streetClass } of info.segments) {
              graph.addStreetEdge(from, to, streetClass);
            }
            next.delete(fid);
          } else {
            for (const { from, to } of info.segments) {
              graph.removeStreetEdge(from, to);
            }
            next.set(fid, info);
          }
          return next;
        });
      };

      // Wire up add-segment callback
      mapView.onAddSegment = (from, to) => {
        const graph = streetGraphRef.current;
        if (!graph) return;
        graph.addStreetEdge(from, to);
        const a = `${from[0].toFixed(6)},${from[1].toFixed(6)}`;
        const b = `${to[0].toFixed(6)},${to[1].toFixed(6)}`;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        setAddedStreets(prev => {
          const next = new Map(prev);
          next.set(key, { key, from, to });
          return next;
        });
      };

      // Wire up building click callback
      mapView.onBuildingClick = (buildingId, coordinates) => {
        const building = buildingStore.getBuildingById(buildingId);
        const generated = flowResult?.buildingGenerated.get(buildingId) || 0;
        const attracted = flowResult?.buildingAttracted.get(buildingId) || 0;

        if (building) {
          setSelectedBuildingStats({
            building,
            tripsGenerated: generated,
            tripsAttracted: attracted,
            clickPosition: coordinates,
          });
        }
      };

      // Skip auto-calculation - user will click "Calculate" button
      // Show heatmap layer (empty until calculation)
      mapView.setLayerVisibility('street-usage-heatmap', true);

      setLoadingStatus('Ready!');
      setIsLoading(false);

      console.log('Flow model ready. Click "Calculate Flows" to start.');

    } catch (error) {
      console.error('Error initializing flow model:', error);
      setLoadingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [enrichBuildingGeoJSON, flowResult]);

  // Update heatmap visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.setLayerVisibility('street-usage-heatmap', showUsageHeatmap);

    if (showUsageHeatmap && flowResult) {
      mapView.updateHeatmapData(flowResult.streetFlows);
    }
  }, [showUsageHeatmap, isLoading, flowResult]);

  // Update heatmap gradient
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.updateHeatmapGradient(heatmapGradient);
  }, [heatmapGradient, isLoading]);

  // Update top streets visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.setLayerVisibility('top-streets-glow', showTopStreets);
    mapView.setLayerVisibility('top-streets-core', showTopStreets);

    if (showTopStreets && flowResult) {
      const sorted = [...flowResult.streetFlows].sort((a, b) => b.count - a.count);
      const [minPercent, maxPercent] = topStreetsRange;
      const minIndex = Math.floor(sorted.length * minPercent / 100);
      const maxIndex = Math.ceil(sorted.length * maxPercent / 100);
      mapView.updateTopStreets(sorted.slice(minIndex, maxIndex));
    }
  }, [showTopStreets, topStreetsRange, isLoading, flowResult]);

  // Update low walkability visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    const enrichedBuildings = enrichedBuildingsRef.current;
    if (!mapView || isLoading) return;

    mapView.setLayerVisibility('low-walkability-glow', showLowWalkability);

    if (showLowWalkability && buildingWalkabilityScores.size > 0 && enrichedBuildings) {
      const lowestIds = getWalkabilityBuildingsInRange(buildingWalkabilityScores, lowWalkabilityRange);
      mapView.updateLowWalkabilityBuildings(lowestIds, enrichedBuildings);
    }
  }, [showLowWalkability, lowWalkabilityRange, buildingWalkabilityScores, isLoading]);

  // Update path preview visibility
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.setPathPreviewVisibility(showPathPreview);
  }, [showPathPreview, isLoading]);

  // Update monochrome buildings mode
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    mapView.setMonochromeBuildings(monochromeBuildings);
  }, [monochromeBuildings, isLoading]);

  // Sync disabled streets overlay and trigger recalculation when segments change
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;

    const streets = Array.from(disabledStreets.values()).map(info => ({
      fid: info.fid,
      coordinates: info.coordinates,
    }));
    mapView.updateDisabledStreets(streets);

    // Recalculate if we've already run a calculation
    if (hasCalculated) {
      recalculateFlows();
    }
  }, [disabledStreets, isLoading, hasCalculated, recalculateFlows]);

  // Mark unsaved whenever edits change (skip initial mount while loading)
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isLoading) return;
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    setStreetEditsUnsaved(true);
  }, [disabledStreets, addedStreets, isLoading]);

  // Sync added-streets overlay and trigger recalculation
  useEffect(() => {
    const mapView = mapViewRef.current;
    if (!mapView || isLoading) return;
    mapView.updateAddedStreets(Array.from(addedStreets.values()));
    if (hasCalculated) recalculateFlows();
  }, [addedStreets, isLoading, hasCalculated, recalculateFlows]);

  // Sync edit mode on the map view (mutually exclusive modes)
  useEffect(() => {
    const mode = isRemoveMode ? 'remove' : isAddMode ? 'add' : 'none';
    mapViewRef.current?.setEditMode(mode as 'none' | 'remove' | 'add');
  }, [isRemoveMode, isAddMode]);

  // Compute path when preview points change
  useEffect(() => {
    const mapView = mapViewRef.current;
    const flowCalculator = flowCalculatorRef.current;
    if (!mapView || !flowCalculator || isLoading) return;

    if (!showPathPreview || !pathPreviewStart || !pathPreviewEnd) {
      setPathPreviewPath(null);
      mapView.updatePathPreviewLine([]);
      return;
    }

    const path = flowCalculator.findPath(pathPreviewStart, pathPreviewEnd);
    setPathPreviewPath(path);
    mapView.updatePathPreviewLine(path.points);
  }, [showPathPreview, pathPreviewStart, pathPreviewEnd, isLoading]);

  // Recalculate flows when land uses change
  useEffect(() => {
    if (!isLoading && flowCalculatorRef.current && mapViewRef.current) {
      recalculateFlows();
      // Update map filter
      mapViewRef.current.setLandUseFilter(enabledLandUses);
    }
  }, [enabledLandUses, isLoading, recalculateFlows]);

  // Recalculate flows when transport mode changes
  useEffect(() => {
    if (!isLoading && flowCalculatorRef.current && mapViewRef.current && hasCalculated) {
      recalculateFlows();
    }
  }, [transportMode, isLoading, hasCalculated, recalculateFlows]);

  // Actions
  const toggleLandUse = useCallback((landUse: LandUse, enabled: boolean) => {
    setEnabledLandUsesState(prev => {
      const next = new Set(prev);
      if (enabled) {
        next.add(landUse);
      } else {
        next.delete(landUse);
      }
      return next;
    });
  }, []);

  const setEnabledLandUses = useCallback((landUses: Set<LandUse>) => {
    setEnabledLandUsesState(new Set(landUses));
  }, []);

  const setTransportMode = useCallback((mode: TransportMode) => {
    setTransportModeState(mode);
  }, []);

  // Gradient actions with localStorage persistence
  const setHeatmapGradient = useCallback((gradient: HeatmapGradient) => {
    setHeatmapGradientState(gradient);
    try {
      localStorage.setItem(GRADIENT_STORAGE_KEY, JSON.stringify(gradient));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const resetGradientToDefault = useCallback(() => {
    setHeatmapGradient(DEFAULT_GRADIENT);
  }, [setHeatmapGradient]);

  const resizeMap = useCallback(() => {
    mapViewRef.current?.resizeCanvas();
  }, []);

  const getStreetUsage = useCallback((): SegmentUsage[] => {
    return flowResult?.streetFlows || [];
  }, [flowResult]);

  const getStreetUsageMax = useCallback((): number => {
    if (!flowResult?.streetFlows.length) return 0;
    return Math.max(...flowResult.streetFlows.map(s => s.count));
  }, [flowResult]);

  const getAverageDistancesByLandUse = useCallback((): Map<LandUse, { avgDistance: number; count: number }> => {
    return flowCalculatorRef.current?.getAverageDistancesByLandUse() || new Map();
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

  const clearSelectedBuilding = useCallback(() => {
    setSelectedBuildingStats(null);
  }, []);

  const findPath = useCallback((from: [number, number], to: [number, number]): Path | null => {
    return flowCalculatorRef.current?.findPath(from, to) ?? null;
  }, []);

  const getMapView = useCallback(() => {
    return mapViewRef.current;
  }, []);

  // Graph editing methods
  const addStreet = useCallback((from: [number, number], to: [number, number]) => {
    const streetGraph = streetGraphRef.current;
    if (!streetGraph) return;

    streetGraph.addStreetEdge(from, to);
    setHasPendingUpdates(true);
  }, []);

  const removeStreet = useCallback((from: [number, number], to: [number, number]) => {
    const streetGraph = streetGraphRef.current;
    if (!streetGraph) return;

    streetGraph.removeStreetEdge(from, to);
    setHasPendingUpdates(true);
  }, []);

  const applyPendingUpdates = useCallback(async () => {
    const incrementalManager = incrementalManagerRef.current;
    const flowCalculatorParallel = flowCalculatorParallelRef.current;
    const mapView = mapViewRef.current;

    if (!incrementalManager || !flowCalculatorParallel || !mapView) return;
    if (!hasPendingUpdates) return;

    setIsUpdating(true);

    // Recompute dirty cells
    const recomputedCells = incrementalManager.recomputeDirtyCells();
    console.log(`Recomputed ${recomputedCells.size} cells`);

    // Recalculate flows if we've already calculated once
    if (hasCalculated) {
      const result = await flowCalculatorParallel.calculateAsync(enabledLandUses, (percent, status) => {
        setCalculationProgress(percent);
        setCalculationStatus(status);
      }, transportMode);
      setFlowResult(result);

      setStats({
        totalTrips: result.totalTrips,
        avgDistance: Math.round(result.avgDistance),
      });

      mapView.updateHeatmapData(result.streetFlows);
    }

    setHasPendingUpdates(false);
    setIsUpdating(false);
  }, [hasPendingUpdates, hasCalculated, enabledLandUses, transportMode]);

  // Street segment editor — remove mode actions
  const toggleRemoveMode = useCallback(() => {
    setIsRemoveModeState(prev => {
      if (!prev) setIsAddModeState(false); // turn off add mode when enabling remove
      return !prev;
    });
  }, []);
  const toggleSegmentEditMode = toggleRemoveMode; // backward compat alias

  // Street segment editor — add mode actions
  const toggleAddMode = useCallback(() => {
    setIsAddModeState(prev => {
      if (!prev) setIsRemoveModeState(false); // turn off remove mode when enabling add
      return !prev;
    });
  }, []);

  const addSegment = useCallback((from: [number, number], to: [number, number]) => {
    const graph = streetGraphRef.current;
    if (!graph) return;
    graph.addStreetEdge(from, to);
    const a = `${from[0].toFixed(6)},${from[1].toFixed(6)}`;
    const b = `${to[0].toFixed(6)},${to[1].toFixed(6)}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    setAddedStreets(prev => {
      const next = new Map(prev);
      next.set(key, { key, from, to });
      return next;
    });
  }, []);

  const removeAddedSegment = useCallback((key: string) => {
    setAddedStreets(prev => {
      const info = prev.get(key);
      if (!info) return prev;
      streetGraphRef.current?.removeStreetEdge(info.from, info.to);
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const saveStreetEdits = useCallback(() => {
    try {
      const disabledFids = Array.from(disabledStreets.keys());
      localStorage.setItem(DISABLED_STREETS_STORAGE_KEY, JSON.stringify(disabledFids));
      const addedList = Array.from(addedStreets.values()).map(s => ({
        key: s.key, from: s.from, to: s.to,
      }));
      localStorage.setItem(ADDED_STREETS_STORAGE_KEY, JSON.stringify(addedList));
      setStreetEditsUnsaved(false);
    } catch { /* ignore */ }
  }, [disabledStreets, addedStreets]);

  const clearAllAddedSegments = useCallback(() => {
    setAddedStreets(prev => {
      for (const info of prev.values()) {
        streetGraphRef.current?.removeStreetEdge(info.from, info.to);
      }
      return new Map();
    });
  }, []);

  const toggleStreet = useCallback((fid: string) => {
    const info = streetSegmentsRef.current.get(fid);
    const graph = streetGraphRef.current;
    if (!info || !graph) return;

    setDisabledStreets(prev => {
      const next = new Map(prev);
      if (next.has(fid)) {
        for (const { from, to, streetClass } of info.segments) {
          graph.addStreetEdge(from, to, streetClass);
        }
        next.delete(fid);
      } else {
        for (const { from, to } of info.segments) {
          graph.removeStreetEdge(from, to);
        }
        next.set(fid, info);
      }
      return next;
    });
  }, []);

  const restoreStreet = useCallback((fid: string) => {
    const info = streetSegmentsRef.current.get(fid);
    const graph = streetGraphRef.current;
    if (!info || !graph) return;

    setDisabledStreets(prev => {
      if (!prev.has(fid)) return prev;
      const next = new Map(prev);
      for (const { from, to, streetClass } of info.segments) {
        graph.addStreetEdge(from, to, streetClass);
      }
      next.delete(fid);
      return next;
    });
  }, []);

  const restoreAllStreets = useCallback(() => {
    const graph = streetGraphRef.current;
    if (!graph) return;

    setDisabledStreets(prev => {
      for (const info of prev.values()) {
        for (const { from, to, streetClass } of info.segments) {
          graph.addStreetEdge(from, to, streetClass);
        }
      }
      return new Map();
    });
  }, []);

  const getPartitionStats = useCallback((): PartitionStats | null => {
    return partitionerRef.current?.getStats() ?? null;
  }, []);

  const value: FlowContextValue = {
    isLoading,
    loadingStatus,
    stats,
    enabledLandUses,
    transportMode,
    showUsageHeatmap,
    showTopStreets,
    topStreetsRange,
    showLowWalkability,
    lowWalkabilityRange,
    isCalculating,
    calculationProgress,
    calculationStatus,
    hasCalculated,
    showPathPreview,
    pathPreviewStart,
    pathPreviewEnd,
    pathPreviewPath,
    monochromeBuildings,
    selectedBuildingStats,
    toggleLandUse,
    setEnabledLandUses,
    setTransportMode,
    setShowUsageHeatmap,
    setShowTopStreets,
    heatmapGradient,
    setHeatmapGradient,
    resetGradientToDefault,
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
    setMonochromeBuildings,
    getMapView,
    initializeMap,
    resizeMap,
    getStreetUsage,
    getStreetUsageMax,
    getAverageDistancesByLandUse,
    getLandUseAreas,
    recalculateFlows,
    startCalculation,
    addStreet,
    removeStreet,
    applyPendingUpdates,
    hasPendingUpdates,
    isUpdating,
    disabledStreets,
    isRemoveMode,
    toggleRemoveMode,
    toggleStreet,
    restoreStreet,
    restoreAllStreets,
    addedStreets,
    isAddMode,
    toggleAddMode,
    addSegment,
    removeAddedSegment,
    clearAllAddedSegments,
    saveStreetEdits,
    streetEditsUnsaved,
    // deprecated aliases
    isSegmentEditMode: isRemoveMode,
    toggleSegmentEditMode,
    getPartitionStats,
    isPartitioningEnabled,
  };

  return (
    <FlowContext.Provider value={value}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within FlowProvider');
  }
  return context;
}

// Alias for backward compatibility during transition
export const SimulationProvider = FlowProvider;
export const useSimulation = useFlow;
