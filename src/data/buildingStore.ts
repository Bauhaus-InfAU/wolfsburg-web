import RBush from 'rbush';
import type {
  Building,
  BuildingCollection,
  BuildingFeature,
  BuildingProperties,
  LandUse,
  SpatialItem,
} from '../config/types';
import { LAND_USE_WEIGHTS, SQM_PER_PERSON } from '../config/constants';
import { getCityConfig, type CityConfig } from '../config/cityConfig';
import { utm32nToWgs84 } from '../utils/coordinateTransform';
import {
  getLandUseFromGfk,
  getDefaultHeight,
  getDefaultFloors,
  DEFAULT_BUILDING_FLOOR_AREA,
} from '../config/wolfsburgMapping';

// All land use keys to check
const LAND_USE_KEYS: LandUse[] = [
  'Generic Residential',
  'Generic Light Industrial',
  'Generic Service',
  'Generic Office Building',
  'Generic Education',
  'Generic Entertainment',
  'Generic Civic Function',
  'Generic Transportation Service',
  'Generic Culture',
  'Generic Utilities',
  'Generic Accommodation',
  'Generic Health and Wellbeing',
  'Generic Retail',
  'Generic Sport Facility',
  'Generic Food and Beverage Service',
  'Undefined Land use',
];

// Wolfsburg building properties (from gfk classification)
interface WolfsburgBuildingProperties {
  fid: number;
  objid: string;
  gfk: string;
  gfk__bez: string;
  baw?: string;
  baw__bez?: string;
  ofl?: string;
  ofl__bez?: string;
  bez?: string;  // Street name
  hnr?: string;  // House number
}

export class BuildingStore {
  public buildings: Map<string, Building> = new Map();
  public residential: Building[] = [];
  public destinations: Building[] = [];
  public spatialIndex: RBush<SpatialItem>;
  private cityConfig: CityConfig;

  constructor() {
    this.spatialIndex = new RBush();
    this.cityConfig = getCityConfig();
  }

  loadFromGeoJSON(collection: BuildingCollection): void {
    const spatialItems: SpatialItem[] = [];

    for (const feature of collection.features) {
      const building = this.cityConfig.dataFormat === 'wolfsburg'
        ? this.processWolfsburgFeature(feature as unknown as GeoJSON.Feature<GeoJSON.MultiPolygon, WolfsburgBuildingProperties>)
        : this.processFeature(feature);

      if (!building) continue;

      this.buildings.set(building.id, building);

      // Categorize by land use
      if (building.landUses.includes('Generic Residential')) {
        this.residential.push(building);
      }

      // Check if it's a potential destination (has non-residential land use)
      const hasDestinationUse = building.landUses.some(
        (lu) => lu !== 'Generic Residential' && LAND_USE_WEIGHTS[lu] > 0
      );
      if (hasDestinationUse) {
        this.destinations.push(building);
      }

      // Add to spatial index
      const [lng, lat] = building.centroid;
      spatialItems.push({
        minX: lng,
        minY: lat,
        maxX: lng,
        maxY: lat,
        id: building.id,
      });
    }

    this.spatialIndex.load(spatialItems);

    console.log(`BuildingStore loaded: ${this.buildings.size} buildings, ${this.residential.length} residential, ${this.destinations.length} destinations`);
  }

  /**
   * Process a Wolfsburg building feature
   * Handles UTM coordinates and gfk classification
   */
  private processWolfsburgFeature(
    feature: GeoJSON.Feature<GeoJSON.MultiPolygon, WolfsburgBuildingProperties>
  ): Building | null {
    const props = feature.properties;
    const id = props.objid || `building-${props.fid}`;

    if (!id) return null;

    // Calculate centroid from MultiPolygon (in UTM coordinates)
    const utmCentroid = this.calculateCentroid(feature as unknown as BuildingFeature);
    if (!utmCentroid) return null;

    // Transform UTM to WGS84
    const centroid = this.cityConfig.coordinateSystem === 'utm32n'
      ? utm32nToWgs84(utmCentroid[0], utmCentroid[1])
      : utmCentroid;

    // Get land use from gfk code
    const primaryLandUse = getLandUseFromGfk(props.gfk);
    const landUses: LandUse[] = [primaryLandUse];

    // Mixed-use buildings (codes like 1120, 2310) have multiple land uses
    if (props.gfk === '1120' || props.gfk === '1110') {
      // Residential with retail/services
      landUses.push('Generic Retail');
    } else if (props.gfk === '1130' || props.gfk === '2320') {
      // Residential with industrial
      landUses.push('Generic Light Industrial');
    } else if (props.gfk === '2310') {
      // Commercial with residential
      landUses.push('Generic Residential');
    } else if (props.gfk === '3100') {
      // Public with residential
      landUses.push('Generic Residential');
    }

    // Estimate building dimensions
    const floors = getDefaultFloors(props.gfk);
    const height = getDefaultHeight(props.gfk);

    // Calculate footprint area from geometry (rough estimate)
    const footprintArea = this.estimateFootprintArea(feature as unknown as BuildingFeature);

    // Calculate floor areas
    const totalFloorArea = footprintArea * floors;
    const landUseAreas = new Map<LandUse, number>();

    // Distribute floor area among land uses
    if (landUses.length === 1) {
      landUseAreas.set(primaryLandUse, totalFloorArea);
    } else {
      // For mixed use, assume primary use gets 70%, secondary 30%
      landUseAreas.set(primaryLandUse, totalFloorArea * 0.7);
      for (let i = 1; i < landUses.length; i++) {
        landUseAreas.set(landUses[i], totalFloorArea * 0.3 / (landUses.length - 1));
      }
    }

    // Calculate residential metrics
    const residentialArea = landUseAreas.get('Generic Residential') || 0;
    const estimatedResidents = residentialArea > 0 ? residentialArea / SQM_PER_PERSON : 0;

    // Create address from bez and hnr
    const address = [props.bez, props.hnr].filter(Boolean).join(' ') || id;

    // Create a modified feature with WGS84 coordinates for visualization
    const transformedFeature = this.transformFeatureCoordinates(feature as unknown as BuildingFeature);

    return {
      id,
      centroid,
      floors,
      height,
      residentialArea,
      estimatedResidents,
      landUses,
      landUseAreas,
      primaryLandUse,
      feature: {
        ...transformedFeature,
        properties: {
          'Building ID': id,
          Height: height,
          Floors: floors,
          Detached: false,
          Adress: address,
          'ofl__bez': props.ofl__bez || null, // Preserve surface level indicator
          ...Object.fromEntries(
            LAND_USE_KEYS.map(key => [key, landUseAreas.get(key) || 0])
          ),
        } as BuildingProperties,
      },
    };
  }

  /**
   * Transform feature coordinates from UTM to WGS84
   */
  private transformFeatureCoordinates(feature: BuildingFeature): BuildingFeature {
    if (this.cityConfig.coordinateSystem !== 'utm32n') {
      return feature;
    }

    const transformCoords = (coords: number[][]): number[][] => {
      return coords.map(coord => {
        const [lng, lat] = utm32nToWgs84(coord[0], coord[1]);
        return coord.length > 2 ? [lng, lat, coord[2]] : [lng, lat];
      });
    };

    const transformRing = (ring: number[][][]): number[][][] => {
      return ring.map(transformCoords);
    };

    const newCoordinates = feature.geometry.coordinates.map(transformRing);

    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: newCoordinates,
      },
    };
  }

  /**
   * Estimate footprint area from polygon geometry (in sqm)
   */
  private estimateFootprintArea(feature: BuildingFeature): number {
    const coords = feature.geometry.coordinates;
    if (!coords || coords.length === 0) return DEFAULT_BUILDING_FLOOR_AREA;

    const exteriorRing = coords[0]?.[0];
    if (!exteriorRing || exteriorRing.length < 3) return DEFAULT_BUILDING_FLOOR_AREA;

    // Use Shoelace formula for polygon area
    // Note: For UTM coordinates, this gives area in square meters directly
    // For WGS84, we'd need to convert first
    let area = 0;
    const n = exteriorRing.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += exteriorRing[i][0] * exteriorRing[j][1];
      area -= exteriorRing[j][0] * exteriorRing[i][1];
    }

    area = Math.abs(area) / 2;

    // If coordinates are WGS84, convert from degrees to approximate sqm
    if (this.cityConfig.coordinateSystem === 'wgs84') {
      // At ~52° latitude (Wolfsburg), 1° ≈ 111km lat, 67km lng
      const avgLat = exteriorRing.reduce((sum, c) => sum + c[1], 0) / n;
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = metersPerDegreeLat * Math.cos(avgLat * Math.PI / 180);
      area = area * metersPerDegreeLat * metersPerDegreeLng;
    }

    return Math.max(area, DEFAULT_BUILDING_FLOOR_AREA);
  }

  private processFeature(feature: BuildingFeature): Building | null {
    const props = feature.properties;
    const id = props['Building ID'];

    if (!id) return null;

    // Calculate centroid from MultiPolygon
    const centroid = this.calculateCentroid(feature);
    if (!centroid) return null;

    // Extract land uses and their areas
    const landUses = this.extractLandUses(props);
    const landUseAreas = this.extractLandUseAreas(props);
    const primaryLandUse = this.getPrimaryLandUse(landUses);

    // Parse floors and height (may be strings)
    const floors = typeof props.Floors === 'string' ? parseInt(props.Floors, 10) : props.Floors;
    const height = typeof props.Height === 'string' ? parseFloat(props.Height) : props.Height;

    // Extract residential area (sqm) - stored as number or string in GeoJSON
    const residentialAreaRaw = props['Generic Residential'];
    const residentialArea =
      typeof residentialAreaRaw === 'string'
        ? parseFloat(residentialAreaRaw)
        : residentialAreaRaw || 0;

    // Calculate estimated residents based on German average (~40.9 sqm per person)
    const estimatedResidents = residentialArea > 0 ? residentialArea / SQM_PER_PERSON : 0;

    return {
      id,
      centroid,
      floors: floors || 1,
      height: height || 3,
      residentialArea,
      estimatedResidents,
      landUses,
      landUseAreas,
      primaryLandUse,
      feature,
    };
  }

  private calculateCentroid(feature: BuildingFeature): [number, number] | null {
    const coords = feature.geometry.coordinates;
    if (!coords || coords.length === 0) return null;

    // For MultiPolygon, use first polygon's exterior ring
    const exteriorRing = coords[0]?.[0];
    if (!exteriorRing || exteriorRing.length === 0) return null;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const coord of exteriorRing) {
      sumX += coord[0];
      sumY += coord[1];
      count++;
    }

    if (count === 0) return null;

    return [sumX / count, sumY / count];
  }

  private extractLandUses(props: BuildingProperties): LandUse[] {
    const landUses: LandUse[] = [];

    for (const key of LAND_USE_KEYS) {
      // Handle both number and string values (e.g., "671.88" or 1)
      const value = props[key];
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (numValue && numValue > 0) {
        landUses.push(key);
      }
    }

    if (landUses.length === 0) {
      landUses.push('Undefined Land use');
    }

    return landUses;
  }

  private extractLandUseAreas(props: BuildingProperties): Map<LandUse, number> {
    const areas = new Map<LandUse, number>();

    for (const key of LAND_USE_KEYS) {
      const value = props[key];
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (numValue && numValue > 0) {
        areas.set(key, numValue);
      }
    }

    return areas;
  }

  private getPrimaryLandUse(landUses: LandUse[]): LandUse {
    // Return the land use with highest weight (most important)
    let best: LandUse = landUses[0] || 'Undefined Land use';
    let bestWeight = LAND_USE_WEIGHTS[best];

    for (const lu of landUses) {
      const weight = LAND_USE_WEIGHTS[lu];
      if (weight > bestWeight) {
        best = lu;
        bestWeight = weight;
      }
    }

    return best;
  }

  getBuildingById(id: string): Building | undefined {
    return this.buildings.get(id);
  }

  getNearestBuilding(coord: [number, number]): Building | undefined {
    const [lng, lat] = coord;
    const searchRadius = 0.009; // ~1km in degrees (1km / 111km per degree)

    const nearby = this.spatialIndex.search({
      minX: lng - searchRadius,
      minY: lat - searchRadius,
      maxX: lng + searchRadius,
      maxY: lat + searchRadius,
    });

    if (nearby.length === 0) return undefined;

    let nearest: SpatialItem | undefined;
    let nearestDist = Infinity;

    for (const item of nearby) {
      const dx = item.minX - lng;
      const dy = item.minY - lat;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = item;
      }
    }

    return nearest ? this.buildings.get(nearest.id) : undefined;
  }

  getBounds(): [[number, number], [number, number]] | null {
    if (this.buildings.size === 0) return null;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const building of this.buildings.values()) {
      const [lng, lat] = building.centroid;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }

  /**
   * Get total estimated residents across all residential buildings.
   * Based on residential floor area / 40.9 sqm per person.
   */
  getTotalResidents(): number {
    return this.residential.reduce((sum, b) => sum + b.estimatedResidents, 0);
  }

  /**
   * Get total residential floor area in sqm.
   */
  getTotalResidentialArea(): number {
    return this.residential.reduce((sum, b) => sum + b.residentialArea, 0);
  }
}
