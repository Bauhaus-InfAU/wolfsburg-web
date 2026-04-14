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

This is a browser-based pedestrian flow visualization tool for the city of Weimar, built with React, TypeScript, and Vite. The UI uses shadcn/ui components with Tailwind CSS. The tool models trip distribution from residential buildings to various destination types using an origin-destination matrix with distance decay.

**Note:** This is a **static flow model**, not an agent-based simulation. Instead of animating individual agents, it calculates expected trip flows upfront and displays them as a heatmap. This provides instant feedback when land use filters change and uses significantly less memory (~50-100 MB vs ~1.5 GB for agent simulation).

### UI Layer (`src/components/`)

**shadcn/ui Components** (`src/components/ui/`)
- `Button`, `Slider`, `Checkbox`, `Label`, `Tooltip`, `Collapsible` - Radix UI primitives styled with Tailwind
- `BottomSheet` - Mobile-only slide-up panel (40vh height) with close button

**Panel Components** (`src/components/panels/`) - Desktop only
- `ControlPanel` - Resizable sidebar (300-500px) wrapped in a card with collapsible sections:
  - **Flow Statistics**: Total trips and average distance
  - **Display Options**: Heatmap and A-B path toggles
  - **Land Use Types**: Checkboxes to filter destination types
- `LandUseToggles` - Checkboxes to filter destination types
- `VisualizationToggles` - Show/hide flow heatmap and path preview
- `StatsDisplay` - Total trips and average distance counters
- `Legend` - Color-coded land use legend (collapsed by default)

**Mobile Components** (`src/components/mobile/`)
- `MobileFloatingControls` - Bottom floating bar with Settings and Insights buttons
- `MobileControlsContent` - Settings panel content for bottom sheet (reuses panel components)
- `MobileDataContent` - Insights panel content for bottom sheet (reuses chart components)

**Other Components**
- `App` - Root component with responsive layout (conditionally renders desktop panels or mobile UI)
- `MapCanvas` - Canvas container with ResizeObserver for responsive canvas sizing
- `LoadingOverlay` - Full-screen loading spinner
- `PathPreview` - Interactive path preview with draggable A/B markers
- `BuildingInfo` - Floating popup showing building stats on click (land uses, trip counts, residents)

**State Management** (`src/context/`)
- `FlowContext` - React context wrapping FlowCalculator, exposes state and actions to components
- `useSimulation` / `useFlow` hooks - Access flow state and controls from any component

**Hooks** (`src/hooks/`)
- `useMobileLayout` - Detects mobile viewport (<768px) and manages bottom sheet panel state
- `useUrbanInsights` - Computes derived analytics from flow data

**Custom Icons** (`public/icons/`)
- `settings.svg` - Settings panel icon
- `insights.svg` - Data/Insights panel icon
- `main.svg` - App logo (coral crosshair)
- `cursor.svg`, `cursor-active.svg` - Map cursor icons

**Theming** (`src/index.css`, `tailwind.config.js`)
- Roboto Mono monospace font throughout
- CSS variables for colors (background, foreground, primary, muted, accent, sidebar, etc.)
- Primary accent color: `#f57f5b` (warm coral)
- Supports light/dark mode via CSS variables

### Core Components

**Data Layer** (`src/data/`)
- `BuildingStore` - Loads and indexes building GeoJSON, categorizes by land use. Uses RBush for spatial queries.
- `StreetGraph` - Builds a graph from street GeoJSON for pathfinding. Nodes are coordinate-keyed, edges are bidirectional.
- `StreetUsageTracker` - Accumulates flow counts for each street segment.
- `midMobilityData` - MiD 2023 (Mobilität in Deutschland) calibration data for land use weights and distance decay.

**Flow Calculation** (`src/simulation/`)
- `FlowCalculator` - Computes expected trip distribution and assigns flows to street segments. Recalculates instantly when land uses change.
- `ODMatrix` - Computes origin-destination probabilities using gravity model: `D_i = W / e^(α × d)` where W is floor area and α is decay beta.
- `Pathfinder` - A* algorithm over the street graph with LRU caching. Falls back to direct paths when graph unavailable.

**Visualization** (`src/visualization/`)
- `MapLibreView` - WebGL-accelerated map using MapLibre GL JS. Renders 3D extruded buildings and streets via GPU. Handles building click events via `onBuildingClick` callback.
- `buildingLayer` - Provides `createLegend()` for land use color legend.

### Data Flow

1. GeoJSON files loaded from `public/data/` (weimar-buildings.geojson, weimar-streets.geojson)
2. Buildings indexed by land use; street graph constructed
3. O-D matrix calculated from residential→destination pairs with decay function
4. FlowCalculator computes expected trip counts for each O-D pair
5. Trips assigned to street segments along shortest paths
6. Heatmap layer updated with flow data

### Rendering Architecture

MapLibre GL JS handles all geometry (buildings, streets, flow heatmap) via WebGL for smooth 60fps pan/zoom.

```
Container (#map)
├── MapLibre GL Map (WebGL)
│   ├── Layer: natural elements (water, vegetation)
│   ├── Layer: street-shadow (line)
│   ├── Layer: street-base (line)
│   ├── Layer: street-usage-heatmap (data-driven line, shows flow intensity)
│   ├── Layer: top-streets-glow/core (highlight layers)
│   ├── Layer: path-preview (A-B path visualization)
│   └── Layer: buildings-fill (fill-extrusion, 3D)
└── Canvas Overlay (z-index: 10, pointer-events: none)
    └── Reserved for future overlays
```

Buildings use `fill-extrusion` layer with height from GeoJSON `Height` property. Colors are data-driven based on `primaryLandUse` property.

### Coordinate System

Coordinates are in degrees (WGS84) - the Heron plugin converts Rhino's meter coordinates to geographic coordinates during GeoJSON export. Distance calculations internally convert degrees to meters using 1° ≈ 111km. The coordinate precision constant (`COORD_PRECISION = 6`) provides ~10cm precision for node merging.

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

The flow model uses empirical data from "Mobilität in Deutschland 2023" (German national mobility survey) for realistic pedestrian behavior:
- **Per-land-use distance decay** - each destination type has its own decay beta based on observed trip durations
- **Per-land-use max distance** - sports/culture trips can be longer than retail trips

See `src/data/midMobilityData.ts` for the calibration parameters.

### Land Use Types

16 land use categories defined in `src/config/types.ts`. Residential buildings generate trips; all others are potential destinations. Each building stores floor area per land use in `landUseAreas: Map<LandUse, number>`.

### Responsive Layout

The app uses conditional rendering based on viewport width (breakpoint: 768px).

**Desktop (≥768px)**
- Three-column layout: ControlPanel (left) | Map (center) | DataPanel (right)
- Panels are resizable with drag handles
- DataPanel can be collapsed

**Mobile (<768px)**
- Map fills entire viewport
- Floating control bar at bottom with 2 buttons: Settings | Insights
- Panels open as bottom sheets (40vh height) that slide up from bottom
- Map remains visible and interactive when panels are open
- Bottom sheet content only renders when open (fixes chart dimension issues)
