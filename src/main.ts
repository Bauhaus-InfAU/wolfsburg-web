import './style.css';
import {
  loadBuildings,
  loadStreets,
  updateLoadingStatus,
  hideLoading,
} from './data/dataLoader';
import { BuildingStore } from './data/buildingStore';
import { StreetGraph } from './data/streetGraph';
import { MapView } from './visualization/mapView';
import { renderBuildings, createLegend } from './visualization/buildingLayer';
import { renderStreets } from './visualization/streetLayer';
import { renderStreetUsage } from './visualization/streetUsageLayer';
import { SimulationEngine } from './simulation/SimulationEngine';
import { AgentRenderer } from './visualization/agentRenderer';
import { ControlPanel } from './ui/controlPanel';
import { StatsPanel } from './ui/statsPanel';
import type { BuildingCollection, StreetCollection } from './config/types';

async function main() {
  try {
    // Initialize map view
    updateLoadingStatus('Initializing view...');
    const mapView = new MapView('map');

    // Load data
    updateLoadingStatus('Loading buildings...');
    let buildingData: BuildingCollection;
    try {
      buildingData = await loadBuildings();
    } catch (e) {
      console.warn('Could not load buildings:', e);
      updateLoadingStatus('Buildings data not found. Please add weimar-buildings.geojson to public/data/');
      hideLoading();
      return;
    }

    updateLoadingStatus('Processing buildings...');
    const buildingStore = new BuildingStore();
    buildingStore.loadFromGeoJSON(buildingData);
    console.log(`Loaded ${buildingStore.buildings.size} buildings`);
    console.log(`Residential: ${buildingStore.residential.length}`);
    console.log(`Destinations: ${buildingStore.destinations.length}`);
    console.log(`Total residential area: ${Math.round(buildingStore.getTotalResidentialArea()).toLocaleString()} sqm`);
    console.log(`Estimated residents: ${Math.round(buildingStore.getTotalResidents()).toLocaleString()} (@ 40.9 sqm/person)`);

    // Calculate data bounds
    const bounds = buildingStore.getBounds();
    if (bounds) {
      // bounds is [[minLat, minLng], [maxLat, maxLng]] but our data uses [x, y] = [lng, lat]
      mapView.setDataBounds(bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]);
      mapView.fitToData();
      console.log(`Building bounds: X [${bounds[0][1].toFixed(2)}, ${bounds[1][1].toFixed(2)}], Y [${bounds[0][0].toFixed(2)}, ${bounds[1][0].toFixed(2)}]`);
    }

    // Load streets
    updateLoadingStatus('Loading streets...');
    let streetData: StreetCollection | null = null;
    try {
      streetData = await loadStreets();
    } catch (e) {
      console.warn('Could not load streets:', e);
      console.log('Simulation will use direct paths between buildings');
    }

    // Build street graph
    updateLoadingStatus('Building street network...');
    const streetGraph = new StreetGraph();
    if (streetData) {
      streetGraph.buildFromGeoJSON(streetData);
      console.log(`Street graph: ${streetGraph.nodeCount} nodes, ${streetGraph.edgeCount} edges`);
    }

    // State for visualization toggles
    let showUsageHeatmap = false;
    let showAgents = true;

    // Render function for static layers
    function renderStaticLayers() {
      mapView.clearCanvas();
      if (streetData) {
        renderStreets(mapView, streetData);
      }
      // Render usage heatmap on top of streets if enabled
      if (showUsageHeatmap) {
        renderStreetUsage(mapView, engine.getUsageTracker());
      }
      renderBuildings(mapView, buildingData, buildingStore);
    }

    // Initial render
    renderStaticLayers();

    // Re-render on view change
    mapView.onViewChange = () => {
      renderStaticLayers();
      if (showAgents) {
        agentRenderer.render(engine.getAgents());
      }
    };

    // Initialize simulation engine
    updateLoadingStatus('Initializing simulation...');
    const engine = new SimulationEngine(buildingStore, streetGraph);
    console.log(`Max active agents: ${engine.getMaxActiveAgents().toLocaleString()} (10% of residents)`);

    // Initialize renderer
    const agentRenderer = new AgentRenderer(mapView);

    // Initialize UI
    const controlPanel = new ControlPanel(engine);
    const statsPanel = new StatsPanel();
    createLegend();

    // Set up visualization toggles
    controlPanel.onUsageToggle = (enabled) => {
      showUsageHeatmap = enabled;
      renderStaticLayers();
    };

    controlPanel.onAgentsToggle = (visible) => {
      showAgents = visible;
      if (visible) {
        agentRenderer.render(engine.getAgents());
      } else {
        mapView.clearAgentCanvas();
      }
    };

    // Set up render loop
    engine.onUpdate = (agents) => {
      if (showAgents) {
        agentRenderer.render(agents);
      }
    };

    engine.onStatsUpdate = (stats) => {
      statsPanel.update(stats);
    };

    updateLoadingStatus('Ready!');
    hideLoading();

    console.log('Simulation ready. Click "Play" to start.');

  } catch (error) {
    console.error('Error initializing simulation:', error);
    updateLoadingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Start the application
main();
