import type { LandUse } from './types';

/**
 * Mapping configuration for Wolfsburg GeoJSON data
 * Maps German building codes (gfk), POI categories, and block land uses
 * to the unified 16-category land use system
 */

// Building classification codes (gfk) to LandUse mapping
// Based on German ALKIS building classification
export const gfkToLandUse: Record<string, LandUse> = {
  // Residential buildings (1xxx)
  '1000': 'Generic Residential', // Wohngebäude
  '1010': 'Generic Residential', // Wohnhaus
  '1020': 'Generic Residential', // Wohnheim
  '1110': 'Generic Residential', // Wohngebäude mit Gemeinbedarf (treat as residential)
  '1120': 'Generic Residential', // Wohngebäude mit Handel und Dienstleistungen (mixed, primary residential)
  '1130': 'Generic Residential', // Wohngebäude mit Gewerbe und Industrie

  // Commercial/Business buildings (2xxx)
  '2000': 'Undefined Land use', // Gebäude für Wirtschaft oder Gewerbe (too generic, exclude)
  '2010': 'Generic Retail', // Gebäude für Handel und Dienstleistungen
  '2020': 'Generic Office Building', // Bürogebäude
  '2030': 'Generic Retail', // Kaufhaus
  '2040': 'Generic Retail', // Einkaufszentrum
  '2050': 'Generic Retail', // Markthalle
  '2051': 'Generic Retail', // Messehalle
  '2070': 'Generic Accommodation', // Gebäude für Beherbergung
  '2071': 'Generic Accommodation', // Hotel
  '2072': 'Generic Accommodation', // Jugendherberge
  '2073': 'Generic Accommodation', // Hütte
  '2074': 'Generic Accommodation', // Campingplatzgebäude

  // Industrial buildings
  '2100': 'Generic Light Industrial', // Gebäude für Gewerbe und Industrie
  '2110': 'Generic Light Industrial', // Fabrik
  '2111': 'Generic Light Industrial', // Fabrikgebäude
  '2112': 'Generic Light Industrial', // Werkstatt
  '2113': 'Generic Light Industrial', // Lagergebäude
  '2120': 'Generic Light Industrial', // Produktionsgebäude
  '2130': 'Generic Service', // Tankstelle
  '2131': 'Generic Service', // Waschstraße, Waschanlage
  '2140': 'Generic Light Industrial', // Brauerei
  '2143': 'Generic Light Industrial', // Brennerei
  '2150': 'Generic Light Industrial', // Sägewerk

  // Mixed commercial/residential
  '2310': 'Generic Retail', // Gebäude für Handel und Dienstleistung mit Wohnen
  '2320': 'Generic Light Industrial', // Gebäude für Gewerbe und Industrie mit Wohnen

  // Transportation buildings
  '2410': 'Generic Transportation Service', // Betriebsgebäude für Straßenverkehr
  '2411': 'Generic Transportation Service', // Straßenmeisterei
  '2420': 'Generic Transportation Service', // Betriebsgebäude für Schienenverkehr
  '2421': 'Generic Transportation Service', // Bahnwärterhaus
  '2430': 'Generic Transportation Service', // Betriebsgebäude für Flugverkehr
  '2440': 'Generic Transportation Service', // Betriebsgebäude für Schiffsverkehr
  '2460': 'Generic Transportation Service', // Gebäude zum Parken
  '2461': 'Generic Transportation Service', // Parkhaus
  '2462': 'Generic Transportation Service', // Parkdeck
  '2463': 'Generic Transportation Service', // Garage
  '2464': 'Generic Transportation Service', // Fahrzeughalle
  '2465': 'Generic Transportation Service', // Tiefgarage

  // Utilities
  '2500': 'Generic Utilities', // Gebäude zur Versorgung
  '2501': 'Generic Utilities', // Gebäude zur Energieversorgung
  '2510': 'Generic Utilities', // Versorgungsgebäude
  '2520': 'Generic Utilities', // Gebäude für Wasserversorgung
  '2530': 'Generic Utilities', // Gebäude zur Elektrizitätsversorgung
  '2540': 'Generic Utilities', // Umspannwerk
  '2570': 'Generic Utilities', // Wasserwerk
  '2571': 'Generic Utilities', // Pumpstation

  // Waste management
  '2600': 'Generic Utilities', // Gebäude zur Entsorgung
  '2610': 'Generic Utilities', // Müllbunker
  '2611': 'Generic Utilities', // Gebäude zur Müllverbrennung
  '2612': 'Generic Utilities', // Gebäude der Abfallwirtschaft
  '2620': 'Generic Utilities', // Gebäude zur Abwasserbeseitigung
  '2621': 'Generic Utilities', // Gebäude der Kläranlage

  // Agricultural
  '2700': 'Generic Light Industrial', // Land- und forstwirtschaftliches Gebäude
  '2720': 'Generic Light Industrial', // Land- und forstwirtschaftliches Betriebsgebäude
  '2721': 'Generic Light Industrial', // Scheune
  '2723': 'Generic Light Industrial', // Schuppen
  '2724': 'Generic Light Industrial', // Stall
  '2726': 'Generic Light Industrial', // Scheune und Stall
  '2727': 'Generic Light Industrial', // Stall für Großviehzucht
  '2728': 'Generic Light Industrial', // Stall für Kleinviehzucht
  '2740': 'Generic Light Industrial', // Treibhaus, Gewächshaus

  // Public buildings (3xxx)
  '3000': 'Generic Civic Function', // Gebäude für öffentliche Zwecke
  '3010': 'Generic Civic Function', // Verwaltungsgebäude
  '3011': 'Generic Civic Function', // Parlament
  '3012': 'Generic Civic Function', // Rathaus
  '3013': 'Generic Civic Function', // Post
  '3014': 'Generic Office Building', // Zollamt
  '3015': 'Generic Civic Function', // Gericht
  '3016': 'Generic Civic Function', // Botschaft, Konsulat

  // Education
  '3020': 'Generic Education', // Gebäude für Bildung und Forschung
  '3021': 'Generic Education', // Allgemein bildende Schule
  '3022': 'Generic Education', // Berufsbildende Schule
  '3023': 'Generic Education', // Hochschulgebäude
  '3024': 'Generic Education', // Forschungsinstitut
  '3025': 'Generic Education', // Hochschule und Forschung

  // Culture
  '3030': 'Generic Culture', // Gebäude für kulturelle Zwecke
  '3031': 'Generic Culture', // Schloss
  '3032': 'Generic Culture', // Theater, Oper
  '3033': 'Generic Culture', // Konzertgebäude
  '3034': 'Generic Culture', // Museum
  '3035': 'Generic Culture', // Rundfunk, Fernsehen
  '3036': 'Generic Entertainment', // Veranstaltungsgebäude
  '3037': 'Generic Culture', // Bibliothek
  '3038': 'Generic Culture', // Burg, Festung

  // Religious
  '3040': 'Generic Culture', // Religiöses Gebäude
  '3041': 'Generic Culture', // Kirche
  '3042': 'Generic Culture', // Synagoge
  '3043': 'Generic Culture', // Kapelle
  '3044': 'Generic Culture', // Moschee
  '3045': 'Generic Culture', // Gotteshaus
  '3046': 'Generic Culture', // Kloster
  '3047': 'Generic Culture', // Tempel

  // Health
  '3050': 'Generic Health and Wellbeing', // Gebäude für Gesundheitswesen
  '3051': 'Generic Health and Wellbeing', // Krankenhaus
  '3052': 'Generic Health and Wellbeing', // Heilanstalt, Pflegeanstalt
  '3053': 'Generic Health and Wellbeing', // Ärztehaus
  '3054': 'Generic Health and Wellbeing', // Gesundheitszentrum

  // Childcare/Youth
  '3060': 'Generic Education', // Gebäude für soziale Zwecke
  '3061': 'Generic Civic Function', // Jugendfreizeitheim
  '3062': 'Generic Civic Function', // Freizeit-, Vereinsheim
  '3063': 'Generic Civic Function', // Seniorenfreizeitheim
  '3064': 'Generic Civic Function', // Obdachlosenheim
  '3065': 'Generic Education', // Kinderkrippe, Kindergarten, Kindertagesstätte
  '3066': 'Generic Civic Function', // Asylbewerberheim

  // Emergency services
  '3070': 'Generic Civic Function', // Gebäude für Sicherheit und Ordnung
  '3071': 'Generic Civic Function', // Polizei
  '3072': 'Generic Civic Function', // Feuerwehr
  '3073': 'Generic Civic Function', // Kaserne
  '3074': 'Generic Civic Function', // Justizvollzugsanstalt

  // Transportation stations
  '3080': 'Generic Transportation Service', // Gebäude des Geld- und Kreditwesens
  '3090': 'Generic Transportation Service', // Empfangsgebäude
  '3091': 'Generic Transportation Service', // Bahnhofsgebäude
  '3092': 'Generic Transportation Service', // Flughafengebäude
  '3094': 'Generic Transportation Service', // Gebäude zum U-Bahnhof

  // Public with residential
  '3100': 'Generic Civic Function', // Gebäude für öffentliche Zwecke mit Wohnen

  // Recreation
  '3200': 'Generic Entertainment', // Gebäude für Erholungszwecke
  '3210': 'Generic Sport Facility', // Gebäude für Sportzwecke
  '3211': 'Generic Sport Facility', // Sport-, Turnhalle
  '3212': 'Generic Sport Facility', // Gebäude zum Sportplatz
  '3220': 'Generic Sport Facility', // Badegebäude
  '3221': 'Generic Sport Facility', // Hallenbad
  '3222': 'Generic Sport Facility', // Gebäude im Freibad
  '3230': 'Generic Sport Facility', // Gebäude im Stadion
  '3240': 'Generic Entertainment', // Gebäude für Kurbetrieb
  '3241': 'Generic Health and Wellbeing', // Badegebäude für medizinische Zwecke
  '3242': 'Generic Entertainment', // Sanatorium
  '3260': 'Generic Entertainment', // Gebäude im Zoo
  '3261': 'Generic Entertainment', // Empfangsgebäude des Zoos
  '3262': 'Generic Entertainment', // Aquarium, Terrarium
  '3263': 'Generic Entertainment', // Vogelhaus, Großvoliere
  '3264': 'Generic Entertainment', // Elefantenhaus
  '3265': 'Generic Entertainment', // Affenhaus
  '3266': 'Generic Entertainment', // Raubtierhaus
  '3270': 'Generic Entertainment', // Gebäude im botanischen Garten
  '3280': 'Generic Entertainment', // Gebäude im Schlosspark
  '3290': 'Generic Entertainment', // Touristisches Informationszentrum
};

// POI categories to LandUse mapping
// Based on Overture Maps / OpenStreetMap POI taxonomy
export const poiCategoryToLandUse: Record<string, LandUse> = {
  // Retail
  clothing_store: 'Generic Retail',
  supermarket: 'Generic Retail',
  grocery_store: 'Generic Retail',
  shoe_store: 'Generic Retail',
  jewelry_store: 'Generic Retail',
  furniture_store: 'Generic Retail',
  electronics: 'Generic Retail',
  computer_store: 'Generic Retail',
  mobile_phone_store: 'Generic Retail',
  hardware_store: 'Generic Retail',
  building_supply_store: 'Generic Retail',
  home_improvement_store: 'Generic Retail',
  bookstore: 'Generic Retail',
  toy_store: 'Generic Retail',
  pet_store: 'Generic Retail',
  flowers_and_gifts_shop: 'Generic Retail',
  florist: 'Generic Retail',
  pharmacy: 'Generic Retail',
  drugstore: 'Generic Retail',
  eyewear_and_optician: 'Generic Retail',
  cosmetic_and_beauty_supplies: 'Generic Retail',
  sporting_goods: 'Generic Retail',
  bicycle_shop: 'Generic Retail',
  outlet_store: 'Generic Retail',
  discount_store: 'Generic Retail',
  department_store: 'Generic Retail',
  shopping_center: 'Generic Retail',
  convenience_store: 'Generic Retail',
  retail: 'Generic Retail',
  shopping: 'Generic Retail',
  gift_shop: 'Generic Retail',
  boutique: 'Generic Retail',
  fashion_accessories_store: 'Generic Retail',
  womens_clothing_store: 'Generic Retail',
  mens_clothing_store: 'Generic Retail',
  childrens_clothing_store: 'Generic Retail',
  designer_clothing: 'Generic Retail',
  lingerie_store: 'Generic Retail',
  beverage_store: 'Generic Retail',
  liquor_store: 'Generic Retail',
  antique_store: 'Generic Retail',
  pawn_shop: 'Generic Retail',

  // Food & Beverage
  restaurant: 'Generic Food and Beverage Service',
  cafe: 'Generic Food and Beverage Service',
  coffee_shop: 'Generic Food and Beverage Service',
  bakery: 'Generic Food and Beverage Service',
  fast_food_restaurant: 'Generic Food and Beverage Service',
  pizza_restaurant: 'Generic Food and Beverage Service',
  italian_restaurant: 'Generic Food and Beverage Service',
  asian_restaurant: 'Generic Food and Beverage Service',
  chinese_restaurant: 'Generic Food and Beverage Service',
  japanese_restaurant: 'Generic Food and Beverage Service',
  thai_restaurant: 'Generic Food and Beverage Service',
  vietnamese_restaurant: 'Generic Food and Beverage Service',
  indian_restaurant: 'Generic Food and Beverage Service',
  greek_restaurant: 'Generic Food and Beverage Service',
  turkish_restaurant: 'Generic Food and Beverage Service',
  mediterranean_restaurant: 'Generic Food and Beverage Service',
  german_restaurant: 'Generic Food and Beverage Service',
  american_restaurant: 'Generic Food and Beverage Service',
  mexican_restaurant: 'Generic Food and Beverage Service',
  burger_restaurant: 'Generic Food and Beverage Service',
  sushi_restaurant: 'Generic Food and Beverage Service',
  steakhouse: 'Generic Food and Beverage Service',
  seafood_restaurant: 'Generic Food and Beverage Service',
  barbecue_restaurant: 'Generic Food and Beverage Service',
  vegetarian_restaurant: 'Generic Food and Beverage Service',
  health_food_restaurant: 'Generic Food and Beverage Service',
  doner_kebab: 'Generic Food and Beverage Service',
  bar: 'Generic Food and Beverage Service',
  pub: 'Generic Food and Beverage Service',
  cocktail_bar: 'Generic Food and Beverage Service',
  beer_bar: 'Generic Food and Beverage Service',
  sports_bar: 'Generic Food and Beverage Service',
  hookah_bar: 'Generic Food and Beverage Service',
  hotel_bar: 'Generic Food and Beverage Service',
  lounge: 'Generic Food and Beverage Service',
  ice_cream_shop: 'Generic Food and Beverage Service',
  diner: 'Generic Food and Beverage Service',
  bistro: 'Generic Food and Beverage Service',
  gastropub: 'Generic Food and Beverage Service',
  bar_and_grill_restaurant: 'Generic Food and Beverage Service',
  tapas_bar: 'Generic Food and Beverage Service',
  delicatessen: 'Generic Food and Beverage Service',
  sandwich_shop: 'Generic Food and Beverage Service',
  bubble_tea: 'Generic Food and Beverage Service',
  tea_room: 'Generic Food and Beverage Service',
  beer_garden: 'Generic Food and Beverage Service',
  irish_pub: 'Generic Food and Beverage Service',
  butcher_shop: 'Generic Food and Beverage Service',
  meat_shop: 'Generic Food and Beverage Service',
  candy_store: 'Generic Food and Beverage Service',
  donuts: 'Generic Food and Beverage Service',
  food_truck: 'Generic Food and Beverage Service',
  salad_bar: 'Generic Food and Beverage Service',
  european_restaurant: 'Generic Food and Beverage Service',
  syrian_restaurant: 'Generic Food and Beverage Service',
  lebanese_restaurant: 'Generic Food and Beverage Service',
  korean_restaurant: 'Generic Food and Beverage Service',
  pancake_house: 'Generic Food and Beverage Service',
  friterie: 'Generic Food and Beverage Service',
  bagel_restaurant: 'Generic Food and Beverage Service',

  // Services
  hair_salon: 'Generic Service',
  beauty_salon: 'Generic Service',
  nail_salon: 'Generic Service',
  barber: 'Generic Service',
  tanning_salon: 'Generic Service',
  tattoo_and_piercing: 'Generic Service',
  beauty_and_spa: 'Generic Service',
  skin_care: 'Generic Service',
  massage_therapy: 'Generic Service',
  massage: 'Generic Service',
  spas: 'Generic Service',
  day_spa: 'Generic Service',
  bank_credit_union: 'Generic Service',
  bank: 'Generic Service',
  banks: 'Generic Service',
  credit_union: 'Generic Service',
  atms: 'Generic Service',
  insurance_agency: 'Generic Service',
  real_estate_agent: 'Generic Service',
  real_estate: 'Generic Service',
  real_estate_service: 'Generic Service',
  financial_service: 'Generic Service',
  financial_advising: 'Generic Service',
  tax_services: 'Generic Service',
  mortgage_broker: 'Generic Service',
  legal_services: 'Generic Service',
  lawyer: 'Generic Service',
  notary_public: 'Generic Service',
  laundry_services: 'Generic Service',
  dry_cleaning: 'Generic Service',
  printing_services: 'Generic Service',
  shipping_center: 'Generic Service',
  package_locker: 'Generic Service',
  post_office: 'Generic Service',
  gas_station: 'Generic Service',
  ev_charging_station: 'Generic Service',
  car_wash: 'Generic Service',
  automotive_repair: 'Generic Service',
  auto_glass_service: 'Generic Service',
  auto_body_shop: 'Generic Service',
  auto_detailing: 'Generic Service',
  tire_dealer_and_repair: 'Generic Service',
  car_rental_agency: 'Generic Service',
  car_dealer: 'Generic Service',
  automotive_dealer: 'Generic Service',
  motorcycle_dealer: 'Generic Service',
  key_and_locksmith: 'Generic Service',
  contractor: 'Generic Service',
  electrician: 'Generic Service',
  plumbing: 'Generic Service',
  hvac_services: 'Generic Service',
  roofing: 'Generic Service',
  painting: 'Generic Service',
  carpenter: 'Generic Service',
  home_cleaning: 'Generic Service',
  cleaning_services: 'Generic Service',
  janitorial_services: 'Generic Service',
  pet_groomer: 'Generic Service',
  pet_sitting: 'Generic Service',
  pet_services: 'Generic Service',
  veterinarian: 'Generic Service',
  funeral_services_and_cemeteries: 'Generic Service',
  sewing_and_alterations: 'Generic Service',
  gents_tailor: 'Generic Service',
  travel_agents: 'Generic Service',
  travel: 'Generic Service',
  travel_services: 'Generic Service',
  taxi_service: 'Generic Service',
  courier_and_delivery_services: 'Generic Service',
  freight_and_cargo_service: 'Generic Service',

  // Office / Professional Services
  professional_services: 'Generic Office Building',
  advertising_agency: 'Generic Office Building',
  information_technology_company: 'Generic Office Building',
  software_development: 'Generic Office Building',
  engineering_services: 'Generic Office Building',
  architectural_designer: 'Generic Office Building',
  architect: 'Generic Office Building',
  web_designer: 'Generic Office Building',
  business_consulting: 'Generic Office Building',
  business_management_services: 'Generic Office Building',
  employment_agencies: 'Generic Office Building',
  human_resource_services: 'Generic Office Building',
  trusts: 'Generic Office Building',
  corporate_office: 'Generic Office Building',
  auto_company: 'Generic Office Building',
  business: 'Generic Office Building',
  automation_services: 'Generic Office Building',
  telecommunications_company: 'Generic Office Building',
  telecommunications: 'Generic Office Building',
  it_service_and_computer_repair: 'Generic Office Building',
  property_management: 'Generic Office Building',
  event_planning: 'Generic Office Building',
  event_technology_service: 'Generic Office Building',
  translation_services: 'Generic Office Building',
  interior_design: 'Generic Office Building',
  security_services: 'Generic Office Building',
  business_to_business: 'Generic Office Building',
  business_to_business_services: 'Generic Office Building',
  coworking_space: 'Generic Office Building',
  land_surveying: 'Generic Office Building',
  appraisal_services: 'Generic Office Building',

  // Health
  doctor: 'Generic Health and Wellbeing',
  dentist: 'Generic Health and Wellbeing',
  general_dentistry: 'Generic Health and Wellbeing',
  oral_surgeon: 'Generic Health and Wellbeing',
  orthodontist: 'Generic Health and Wellbeing',
  hospital: 'Generic Health and Wellbeing',
  medical_center: 'Generic Health and Wellbeing',
  health_and_medical: 'Generic Health and Wellbeing',
  physical_therapy: 'Generic Health and Wellbeing',
  chiropractor: 'Generic Health and Wellbeing',
  psychologist: 'Generic Health and Wellbeing',
  psychiatrist: 'Generic Health and Wellbeing',
  psychotherapist: 'Generic Health and Wellbeing',
  counseling_and_mental_health: 'Generic Health and Wellbeing',
  optometrist: 'Generic Health and Wellbeing',
  ophthalmologist: 'Generic Health and Wellbeing',
  eye_care_clinic: 'Generic Health and Wellbeing',
  pediatrician: 'Generic Health and Wellbeing',
  internal_medicine: 'Generic Health and Wellbeing',
  family_practice: 'Generic Health and Wellbeing',
  cardiologist: 'Generic Health and Wellbeing',
  neurologist: 'Generic Health and Wellbeing',
  dermatologist: 'Generic Health and Wellbeing',
  urologist: 'Generic Health and Wellbeing',
  orthopedist: 'Generic Health and Wellbeing',
  surgeon: 'Generic Health and Wellbeing',
  radiologist: 'Generic Health and Wellbeing',
  obstetrician_and_gynecologist: 'Generic Health and Wellbeing',
  audiologist: 'Generic Health and Wellbeing',
  ear_nose_and_throat: 'Generic Health and Wellbeing',
  nutritionist: 'Generic Health and Wellbeing',
  nurse_practitioner: 'Generic Health and Wellbeing',
  occupational_therapy: 'Generic Health and Wellbeing',
  naturopathic_holistic: 'Generic Health and Wellbeing',
  emergency_room: 'Generic Health and Wellbeing',
  rehabilitation_center: 'Generic Health and Wellbeing',
  abuse_and_addiction_treatment: 'Generic Health and Wellbeing',
  skilled_nursing: 'Generic Health and Wellbeing',
  home_health_care: 'Generic Health and Wellbeing',
  laboratory_testing: 'Generic Health and Wellbeing',
  hearing_aids: 'Generic Health and Wellbeing',
  medical_supply: 'Generic Health and Wellbeing',
  health_insurance_office: 'Generic Health and Wellbeing',
  health_consultant: 'Generic Health and Wellbeing',
  health_and_wellness_club: 'Generic Health and Wellbeing',
  medical_spa: 'Generic Health and Wellbeing',
  life_coach: 'Generic Health and Wellbeing',

  // Education
  school: 'Generic Education',
  elementary_school: 'Generic Education',
  high_school: 'Generic Education',
  college_university: 'Generic Education',
  preschool: 'Generic Education',
  day_care_preschool: 'Generic Education',
  vocational_and_technical_school: 'Generic Education',
  driving_school: 'Generic Education',
  dance_school: 'Generic Education',
  music_school: 'Generic Education',
  language_school: 'Generic Education',
  tutoring_center: 'Generic Education',
  adult_education: 'Generic Education',
  education: 'Generic Education',
  campus_building: 'Generic Education',

  // Culture
  museum: 'Generic Culture',
  history_museum: 'Generic Culture',
  art_museum: 'Generic Culture',
  science_museum: 'Generic Culture',
  art_gallery: 'Generic Culture',
  church_cathedral: 'Generic Culture',
  evangelical_church: 'Generic Culture',
  baptist_church: 'Generic Culture',
  mosque: 'Generic Culture',
  religious_organization: 'Generic Culture',
  landmark_and_historical_building: 'Generic Culture',
  palace: 'Generic Culture',
  library: 'Generic Culture',
  cultural_center: 'Generic Culture',
  theatre: 'Generic Culture',
  theatrical_productions: 'Generic Culture',

  // Entertainment
  cinema: 'Generic Entertainment',
  casino: 'Generic Entertainment',
  arcade: 'Generic Entertainment',
  dance_club: 'Generic Entertainment',
  attractions_and_activities: 'Generic Entertainment',
  arts_and_entertainment: 'Generic Entertainment',
  amusement_park: 'Generic Entertainment',
  zoo: 'Generic Entertainment',
  planetarium: 'Generic Entertainment',
  bowling_alley: 'Generic Entertainment',
  topic_concert_venue: 'Generic Entertainment',
  fair: 'Generic Entertainment',
  betting_center: 'Generic Entertainment',
  circus: 'Generic Entertainment',
  ticket_sales: 'Generic Entertainment',

  // Sports
  gym: 'Generic Sport Facility',
  sports_club_and_league: 'Generic Sport Facility',
  sports_and_recreation_venue: 'Generic Sport Facility',
  stadium_arena: 'Generic Sport Facility',
  football_stadium: 'Generic Sport Facility',
  swimming_pool: 'Generic Sport Facility',
  ice_skating_rink: 'Generic Sport Facility',
  martial_arts_club: 'Generic Sport Facility',
  yoga_studio: 'Generic Sport Facility',
  pilates_studio: 'Generic Sport Facility',
  cycling_classes: 'Generic Sport Facility',
  active_life: 'Generic Sport Facility',
  tennis_court: 'Generic Sport Facility',
  soccer_field: 'Generic Sport Facility',
  skate_park: 'Generic Sport Facility',
  rock_climbing_spot: 'Generic Sport Facility',
  adventure_sports_center: 'Generic Sport Facility',
  equestrian_facility: 'Generic Sport Facility',
  amateur_sports_team: 'Generic Sport Facility',

  // Civic
  community_services_non_profits: 'Generic Civic Function',
  social_service_organizations: 'Generic Civic Function',
  social_and_human_services: 'Generic Civic Function',
  youth_organizations: 'Generic Civic Function',
  charity_organization: 'Generic Civic Function',
  fire_department: 'Generic Civic Function',
  police_department: 'Generic Civic Function',
  public_service_and_government: 'Generic Civic Function',
  central_government_office: 'Generic Civic Function',
  board_of_education_offices: 'Generic Civic Function',
  department_of_motor_vehicles: 'Generic Civic Function',
  courthouse: 'Generic Civic Function',
  town_hall: 'Generic Civic Function',
  embassy: 'Generic Civic Function',
  organization: 'Generic Civic Function',
  labor_union: 'Generic Civic Function',
  political_party_office: 'Generic Civic Function',
  political_organization: 'Generic Civic Function',
  public_and_government_association: 'Generic Civic Function',
  non_governmental_association: 'Generic Civic Function',
  social_club: 'Generic Civic Function',
  retirement_home: 'Generic Civic Function',
  assisted_living_facility: 'Generic Civic Function',
  housing_cooperative: 'Generic Civic Function',
  environmental_conservation_organization: 'Generic Civic Function',

  // Accommodation
  hotel: 'Generic Accommodation',
  hostel: 'Generic Accommodation',
  resort: 'Generic Accommodation',
  accommodation: 'Generic Accommodation',
  service_apartments: 'Generic Accommodation',
  campground: 'Generic Accommodation',

  // Transportation
  parking: 'Generic Transportation Service',
  train_station: 'Generic Transportation Service',
  bus_station: 'Generic Transportation Service',
  transportation: 'Generic Transportation Service',
  automotive: 'Generic Transportation Service',
  auto_manufacturers_and_distributors: 'Generic Transportation Service',
  motorsport_vehicle_dealer: 'Generic Transportation Service',

  // Parks / Recreation (map to Entertainment or Sport)
  park: 'Generic Entertainment',
  playground: 'Generic Entertainment',
  water_park: 'Generic Entertainment',
  lake: 'Generic Entertainment',
  beach: 'Generic Entertainment',
  hiking_trail: 'Generic Entertainment',
  marina: 'Generic Entertainment',
  sculpture_statue: 'Generic Culture',
  fountain: 'Generic Culture',
  public_plaza: 'Generic Civic Function',
};

// Block land use (tn__bez) to LandUse mapping
// Based on German ALKIS land use classification
export const blockLandUseToLandUse: Record<string, LandUse> = {
  // Residential
  'Wohnbaufläche': 'Generic Residential',
  'Wohnbaufläche, Offen': 'Generic Residential',
  'Wohnbaufläche, Geschlossen': 'Generic Residential',

  // Commercial / Retail
  'Industrie- und Gewerbefläche, Handel und Dienstleistung': 'Generic Retail',
  'Fläche gemischter Nutzung': 'Generic Retail',

  // Industrial
  'Industrie- und Gewerbefläche': 'Generic Light Industrial',
  'Industrie- und Gewerbefläche, Industrie und Gewerbe': 'Generic Light Industrial',
  'Industrie- und Gewerbefläche, Lagerfläche': 'Generic Light Industrial',

  // Utilities
  'Industrie- und Gewerbefläche, Gebäude- und Freifläche Versorgungsanlage, Elektrizität': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Gebäude- und Freifläche Versorgungsanlage, Wasser': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Gebäude- und Freifläche Versorgungsanlage, Gas': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Gebäude- und Freifläche Versorgungsanlage, Wärme': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Gebäude- und Freifläche Versorgungsanlage, Funk- und Fernmeldewesen': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Betriebsfläche Versorgungsanlage, Elektrizität': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Betriebsfläche Versorgungsanlage, Gas': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Betriebsfläche Versorgungsanlage, Wasser': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Kläranlage, Klärwerk': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Umspannstation': 'Generic Utilities',
  'Industrie- und Gewerbefläche, Abfallbehandlungsanlage': 'Generic Utilities',

  // Education
  'Flächen besonderer funktionaler Prägung, Bildung und Wissenschaft': 'Generic Education',

  // Culture / Religious
  'Flächen besonderer funktionaler Prägung, Kultur': 'Generic Culture',
  'Flächen besonderer funktionaler Prägung, Religiöse Einrichtung': 'Generic Culture',
  'Flächen besonderer funktionaler Prägung, Historische Anlage': 'Generic Culture',
  'Friedhof': 'Generic Culture',

  // Civic / Government
  'Flächen besonderer funktionaler Prägung, Regierung und Verwaltung': 'Generic Civic Function',
  'Flächen besonderer funktionaler Prägung, Sicherheit und Ordnung': 'Generic Civic Function',
  'Flächen besonderer funktionaler Prägung, Öffentliche Zwecke': 'Generic Civic Function',
  'Flächen besonderer funktionaler Prägung, Soziales': 'Generic Civic Function',

  // Health
  'Flächen besonderer funktionaler Prägung, Gesundheit, Kur': 'Generic Health and Wellbeing',

  // Sports / Recreation
  'Sport-, Freizeit- und Erholungsfläche': 'Generic Sport Facility',
  'Sport-, Freizeit- und Erholungsfläche, Sportanlage': 'Generic Sport Facility',
  'Sport-, Freizeit- und Erholungsfläche, Gebäude- und Freifläche Sport, Freizeit und Erholung': 'Generic Sport Facility',
  'Sport-, Freizeit- und Erholungsfläche, Schwimmen': 'Generic Sport Facility',
  'Sport-, Freizeit- und Erholungsfläche, Verkehrsübungsplatz, Testgelände, Fahrsicherheit': 'Generic Sport Facility',

  // Entertainment / Parks
  'Sport-, Freizeit- und Erholungsfläche, Siedlungsgrünfläche': 'Generic Entertainment',
  'Sport-, Freizeit- und Erholungsfläche, Spielplatz, Bolzplatz': 'Generic Entertainment',
  'Sport-, Freizeit- und Erholungsfläche, Kleingarten': 'Generic Entertainment',
  'Sport-, Freizeit- und Erholungsfläche, Park': 'Generic Entertainment',
  'Sport-, Freizeit- und Erholungsfläche, Erholungsfläche': 'Generic Entertainment',
  'Sport-, Freizeit- und Erholungsfläche, Campingplatz': 'Generic Accommodation',

  // Transportation
  'Flächen besonderer funktionaler Prägung, Parken': 'Generic Transportation Service',
  'Bahnverkehr': 'Generic Transportation Service',
  'Bahnverkehr, Begleitfläche Bahnverkehr': 'Generic Transportation Service',
  'Bahnverkehr, Gebäude- und Freifläche zu Verkehrsanlagen, Schiene': 'Generic Transportation Service',
  'Strassenverkehr, Gebäude- und Freifläche zu Verkehrsanlagen, Straße': 'Generic Transportation Service',

  // Agricultural (map to industrial for simulation purposes)
  'Fläche gemischter Nutzung, Gebäude- und Freifläche Land- und Forstwirtschaft': 'Generic Light Industrial',
  'Fläche gemischter Nutzung, Landwirtschaftliche Betriebsfläche': 'Generic Light Industrial',
  'Landwirtschaft, Ackerland': 'Generic Light Industrial',
  'Landwirtschaft, Grünland': 'Generic Light Industrial',
  'Landwirtschaft, Gartenbauland': 'Generic Light Industrial',
  'Landwirtschaft, Brachland': 'Generic Light Industrial',
};

// Helper function to get land use from gfk code
export function getLandUseFromGfk(gfk: string | null | undefined): LandUse {
  if (!gfk) return 'Undefined Land use';
  return gfkToLandUse[gfk] || 'Undefined Land use';
}

// Helper function to get land use from POI category
export function getLandUseFromPoiCategory(category: string | null | undefined): LandUse {
  if (!category) return 'Undefined Land use';
  // Try exact match first
  if (poiCategoryToLandUse[category]) {
    return poiCategoryToLandUse[category];
  }
  // Try lowercase
  const lower = category.toLowerCase();
  if (poiCategoryToLandUse[lower]) {
    return poiCategoryToLandUse[lower];
  }
  return 'Undefined Land use';
}

// Helper function to get land use from block land use description
export function getLandUseFromBlockLandUse(tnBez: string | null | undefined): LandUse {
  if (!tnBez) return 'Undefined Land use';
  // Try exact match first
  if (blockLandUseToLandUse[tnBez]) {
    return blockLandUseToLandUse[tnBez];
  }
  // Try partial match (some block types have additional suffixes)
  for (const [key, landUse] of Object.entries(blockLandUseToLandUse)) {
    if (tnBez.startsWith(key) || tnBez.includes(key)) {
      return landUse;
    }
  }
  return 'Undefined Land use';
}

// Default floor area per building (sqm) when not available
// Based on average building footprint in Wolfsburg
export const DEFAULT_BUILDING_FLOOR_AREA = 150; // sqm per floor

// Default building heights by gfk code category
export const defaultHeightsByGfk: Record<string, number> = {
  '1': 12, // Residential: ~4 floors × 3m
  '2': 9,  // Commercial: ~3 floors × 3m
  '3': 12, // Public: ~4 floors × 3m
};

// Get default height from gfk code (uses first digit)
export function getDefaultHeight(gfk: string | null | undefined): number {
  if (!gfk) return 9;
  const category = gfk.charAt(0);
  return defaultHeightsByGfk[category] || 9;
}

// Get default floors from gfk code
export function getDefaultFloors(gfk: string | null | undefined): number {
  const height = getDefaultHeight(gfk);
  return Math.round(height / 3);
}
