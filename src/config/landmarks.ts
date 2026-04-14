// Curated landmark locations for Wolfsburg
// Coordinates in WGS84 [lng, lat]

export interface Landmark {
  id: string;
  name: string;
  shortName: string;       // used on the map pin label
  category: string;
  description: string;
  coordinates: [number, number];
  details: { label: string; value: string }[];
}

export const WOLFSBURG_LANDMARKS: Landmark[] = [
  {
    id: 'vw-plant',
    name: 'Volkswagen Plant',
    shortName: 'VW Plant',
    category: 'Industry',
    description: 'One of the largest car manufacturing plants in the world, producing over 1,500 vehicles per day. The factory spans ~6.5 km² and employs around 65,000 people.',
    coordinates: [10.7796, 52.4338],
    details: [
      { label: 'Founded', value: '1938' },
      { label: 'Area', value: '6.5 km²' },
      { label: 'Employees', value: '~65,000' },
      { label: 'Daily output', value: '~1,500 cars' },
    ],
  },
  {
    id: 'vw-konzernzentrale',
    name: 'Volkswagen Headquarters',
    shortName: 'VW HQ',
    category: 'Corporate',
    description: 'The iconic glass tower serves as the administrative headquarters of the Volkswagen Group, one of the world\'s largest automotive companies.',
    coordinates: [10.768331, 52.42948],
    details: [
      { label: 'Built', value: '1938 / renovated 1990s' },
      { label: 'Employees worldwide', value: '~675,000' },
      { label: 'Brands', value: '12 (VW, Audi, Porsche…)' },
    ],
  },
  {
    id: 'autostadt',
    name: 'Autostadt',
    shortName: 'Autostadt',
    category: 'Attraction',
    description: 'Volkswagen\'s flagship brand experience park on the Mittellandkanal, featuring pavilions for each VW Group brand, car towers, and a customer delivery centre.',
    coordinates: [10.7942009, 52.4326641],
    details: [
      { label: 'Opened', value: '2000' },
      { label: 'Area', value: '28 ha' },
      { label: 'Annual visitors', value: '~1 million' },
      { label: 'Car towers', value: '2 × 48 m' },
    ],
  },
  {
    id: 'phaeno',
    name: 'phaeno Science Center',
    shortName: 'phaeno',
    category: 'Culture',
    description: 'An award-winning science museum designed by Zaha Hadid (2005), one of the largest deconstructivist buildings in Germany. Hosts 300+ interactive experiments.',
    coordinates: [10.7900025, 52.428272],
    details: [
      { label: 'Architect', value: 'Zaha Hadid' },
      { label: 'Opened', value: '2005' },
      { label: 'Experiments', value: '300+' },
      { label: 'Prize', value: 'Stirling Prize 2006' },
    ],
  },
  {
    id: 'volkswagen-arena',
    name: 'Volkswagen Arena',
    shortName: 'VW Arena',
    category: 'Sport',
    description: 'Home stadium of VfL Wolfsburg, the Bundesliga football club founded by Volkswagen workers. The 30,000-seat arena also hosts major concerts and events.',
    coordinates: [10.803889, 52.4326521],
    details: [
      { label: 'Opened', value: '2002' },
      { label: 'Capacity', value: '30,000' },
      { label: 'Club', value: 'VfL Wolfsburg' },
      { label: 'Title', value: 'Bundesliga Champions 2009' },
    ],
  },
  {
    id: 'automuseum',
    name: 'AutoMuseum Volkswagen',
    shortName: 'AutoMuseum',
    category: 'Museum',
    description: 'Chronicles the 85-year history of Volkswagen with over 200 historic vehicles, from the original Beetle prototypes to modern concept cars.',
    coordinates: [10.80861381106002, 52.427771129728164],
    details: [
      { label: 'Vehicles', value: '200+' },
      { label: 'Founded', value: '1985' },
      { label: 'Area', value: '3,500 m²' },
    ],
  },
  {
    id: 'allerpark',
    name: 'Allerpark',
    shortName: 'Allerpark',
    category: 'Recreation',
    description: 'A large waterfront leisure park along the Aller river, offering beaches, water sports, playgrounds, and extensive green space — Wolfsburg\'s main recreational destination.',
    coordinates: [10.8161366, 52.4353797],
    details: [
      { label: 'Area', value: '~200 ha' },
      { label: 'Lake', value: 'Allersee' },
      { label: 'Features', value: 'Beach, water sports, trails' },
    ],
  },
  {
    id: 'planetarium',
    name: 'Planetarium Wolfsburg',
    shortName: 'Planetarium',
    category: 'Culture',
    description: 'A public planetarium and astronomy centre offering star shows, space exhibitions, and educational programmes for all ages.',
    coordinates: [10.7819169, 52.4170989],
    details: [
      { label: 'Dome diameter', value: '15 m' },
      { label: 'Seats', value: '100' },
    ],
  },
  {
    id: 'designer-outlets',
    name: 'Designer Outlets Wolfsburg',
    shortName: 'Outlets',
    category: 'Retail',
    description: 'One of Germany\'s premier outlet centres, located adjacent to the Autostadt with 80+ international brand stores in a purpose-built canal-side setting.',
    coordinates: [10.7929257, 52.4287759],
    details: [
      { label: 'Stores', value: '80+' },
      { label: 'Location', value: 'Next to Autostadt' },
    ],
  },
];

// Category colour mapping (matches app accent palette)
export const LANDMARK_CATEGORY_COLORS: Record<string, string> = {
  Industry:    '#8aaccc',
  Corporate:   '#98a8b8',
  Attraction:  '#f57f5b',
  Culture:     '#7ab8c8',
  Sport:       '#98c878',
  Museum:      '#e8c468',
  Recreation:  '#7cb89a',
  Retail:      '#e8a668',
};
