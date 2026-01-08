# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # TypeScript compile + Vite production build
npm run preview  # Preview the production build
```

No test framework is configured.

## Architecture

This is a browser-based pedestrian flow simulation for the city of Weimar, built with React, TypeScript, and Vite. The UI uses shadcn/ui components with Tailwind CSS. The simulation models trips from residential buildings to various destination types using an origin-destination matrix with distance decay.

### UI Layer (`src/components/`)

**shadcn/ui Components** (`src/components/ui/`)
- `Button`, `Slider`, `Checkbox`, `Label`, `Tooltip`, `Collapsible` - Radix UI primitives styled with Tailwind

**Panel Components** (`src/components/panels/`)
- `ControlPanel` - Resizable sidebar (280-480px) wrapped in a card with collapsible sections organized into groups:
  - **Controls**: Playback, Parameters
  - **Filters**: Land Use Types, Display Options
  - **Information**: Statistics, Legend
- `PlaybackControls` - Play/Pause/Reset buttons
- `SimulationParams` - Speed and spawn rate sliders
- `LandUseToggles` - Checkboxes to filter destination types
- `VisualizationToggles` - Show/hide agents and street usage heatmap
- `StatsDisplay` - Active agents and total trips counters
- `Legend` - Color-coded land use legend (collapsed by default)

**Other Components**
- `App` - Root component with flex layout
- `MapCanvas` - Canvas container with ResizeObserver for responsive canvas sizing
- `LoadingOverlay` - Full-screen loading spinner

**State Management** (`src/context/`)
- `SimulationContext` - React context wrapping SimulationEngine, exposes state and actions to components
- `useSimulation` hook - Access simulation state and controls from any component

**Theming** (`src/index.css`, `tailwind.config.js`)
- Roboto Mono monospace font throughout
- CSS variables for colors (background, foreground, primary, muted, accent, sidebar, etc.)
- Primary accent color: `#f57f5b` (warm coral)
- Supports light/dark mode via CSS variables

### Core Components

**Data Layer** (`src/data/`)
- `BuildingStore` - Loads and indexes building GeoJSON, categorizes by land use. Uses RBush for spatial queries.
- `StreetGraph` - Builds a graph from street GeoJSON for pathfinding. Nodes are coordinate-keyed, edges are bidirectional.
- `midMobilityData` - MiD 2023 (Mobilität in Deutschland) calibration data for land use weights and distance decay.

**Simulation Layer** (`src/simulation/`)
- `SimulationEngine` - Main loop using `requestAnimationFrame`. Manages agent spawning, updates, and lifecycle.
- `ODMatrix` - Computes origin-destination probabilities using gravity model: `D_i = W / e^(α × d)` where W is floor area and α is decay beta.
- `Pathfinder` - A* algorithm over the street graph with LRU caching. Falls back to direct paths when graph unavailable.
- `TripGenerator` - Probabilistically generates trips based on residential building floors and O-D matrix.
- `StreetUsageTracker` - Tracks how often each street segment is used by agents for heatmap visualization.

**Agent System** (`src/agents/`)
- `Agent` - State machine: `toDestination` → `atDestination` → `returning` → `completed`. Interpolates position along path waypoints.
- `AgentPool` - Object pool pattern to avoid allocation during simulation.

**Visualization** (`src/visualization/`)
- `MapView` - Dual-canvas system (static layer for buildings/streets, overlay for agents). Handles pan/zoom transforms.
- `AgentRenderer` - Draws agents on the overlay canvas, colored by destination land use.
- `buildingLayer`/`streetLayer` - Render GeoJSON features to canvas.
- `streetUsageLayer` - Renders street usage heatmap (blue→yellow→red gradient based on frequency).

### Data Flow

1. GeoJSON files loaded from `public/data/` (weimar-buildings.geojson, weimar-streets.geojson)
2. Buildings indexed by land use; street graph constructed
3. O-D matrix calculated from residential→destination pairs with decay function
4. Simulation loop spawns agents, each following A* path through street network
5. Agents rendered each frame on separate canvas layer

### Coordinate System

Coordinates are in degrees (WGS84) - the Heron plugin converts Rhino's meter coordinates to geographic coordinates during GeoJSON export. Distance calculations internally convert degrees to meters using 1° ≈ 111km. The coordinate precision constant (`COORD_PRECISION = 6`) provides ~10cm precision for node merging.

### Key Configuration

See `src/config/constants.ts` for tunable parameters:
- `WALKING_SPEED`: 1.167 m/s (4.2 km/h)
- `TIME_SCALE`: 5 (1 real second = 5 simulated seconds)
- `MAX_ACTIVE_AGENTS`: based on 10% of estimated residents

### Gravity Model

The O-D matrix uses a gravity model for destination attractiveness:
```
D_i = W_i / e^(α × d_i)
```
Where:
- `W_i` = floor area of destination (sqm) from GeoJSON
- `α` = decay beta (per land use, calibrated from MiD 2023)
- `d_i` = distance in meters

### MiD 2023 Calibration

The simulation uses empirical data from "Mobilität in Deutschland 2023" (German national mobility survey) for realistic pedestrian behavior:
- **Per-land-use distance decay** - each destination type has its own decay beta based on observed trip durations
- **Per-land-use max distance** - sports/culture trips can be longer than retail trips

See `src/data/midMobilityData.ts` for the calibration parameters.

### Land Use Types

16 land use categories defined in `src/config/types.ts`. Residential buildings generate trips; all others are potential destinations. Each building stores floor area per land use in `landUseAreas: Map<LandUse, number>`.
