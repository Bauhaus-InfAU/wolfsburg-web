// Wolfsburg population data
// Sources: Wolfsburg Statistical Office, Destatis, Stadt Wolfsburg Statistikberichte

export interface PopulationByYear {
  year: number;
  population: number;
}

export interface AgeGroup {
  label: string;
  count: number;
  percent: number;
}

export interface District {
  name: string;
  population: number;
  area_km2: number; // km²
}

// Historical population trend (1945–2023)
export const POPULATION_TREND: PopulationByYear[] = [
  { year: 1945, population: 25000 },
  { year: 1950, population: 63000 },
  { year: 1960, population: 85000 },
  { year: 1970, population: 130000 },
  { year: 1980, population: 128000 },
  { year: 1990, population: 128500 },
  { year: 2000, population: 121683 },
  { year: 2005, population: 120514 },
  { year: 2010, population: 121109 },
  { year: 2015, population: 123914 },
  { year: 2020, population: 124054 },
  { year: 2022, population: 124681 },
  { year: 2023, population: 125821 },
];

// Age distribution (2023 estimate)
export const AGE_DISTRIBUTION: AgeGroup[] = [
  { label: 'Under 18',  count: 17732, percent: 14.1 },
  { label: '18 – 29',  count: 16044, percent: 12.7 },
  { label: '30 – 44',  count: 25164, percent: 20.0 },
  { label: '45 – 59',  count: 30196, percent: 24.0 },
  { label: '60 – 74',  count: 22479, percent: 17.9 },
  { label: '75 +',     count: 14206, percent: 11.3 },
];

// Population by district / Ortsteil (2023 estimate, 10 largest)
export const DISTRICT_POPULATION: District[] = [
  { name: 'Mitte',         population: 24100, area_km2: 6.2 },
  { name: 'Vorsfelde',     population: 13800, area_km2: 28.4 },
  { name: 'Detmerode',     population: 11200, area_km2: 4.9 },
  { name: 'Fallersleben',  population: 10900, area_km2: 18.3 },
  { name: 'Westhagen',     population:  9100, area_km2: 3.8 },
  { name: 'Laagberg',      population:  8300, area_km2: 5.1 },
  { name: 'Klieversberg',  population:  7200, area_km2: 4.0 },
  { name: 'Barnstorf',     population:  6800, area_km2: 6.7 },
  { name: 'Neuhaus',       population:  6400, area_km2: 7.2 },
  { name: 'Brackstedt',    population:  4900, area_km2: 12.6 },
];

// Summary KPIs
export const POPULATION_SUMMARY = {
  totalPopulation: 125821,
  areaKm2: 204,
  populationDensity: 617,          // per km²
  avgHouseholdSize: 1.94,
  foreignNationalsPct: 22.1,       // %
  growthRate2015_2023: 1.5,        // % total change
  referenceYear: 2023,
} as const;
