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

export class BuildingStore {
  public buildings: Map<string, Building> = new Map();
  public residential: Building[] = [];
  public destinations: Building[] = [];
  public spatialIndex: RBush<SpatialItem>;

  constructor() {
    this.spatialIndex = new RBush();
  }

  loadFromGeoJSON(collection: BuildingCollection): void {
    const spatialItems: SpatialItem[] = [];

    for (const feature of collection.features) {
      const building = this.processFeature(feature);
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
      [minLat, minLng],
      [maxLat, maxLng],
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
