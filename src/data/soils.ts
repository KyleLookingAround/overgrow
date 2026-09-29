// Soils: the textures the garden's beds and lawn are made of, and what a soil starts with. Texture is the share of sand
// and clay, from which the soil model (src/sim/models/soil.ts) works out how much water it holds by Saxton & Rawls
// (2006); the surface layer's readily and totally evaporable water are FAO-56's table 19 (Allen et al. 1998) for the
// texture. Starting nutrients are the middle of RB209's soil index 2 for phosphorus and potassium in a field (AHDB
// Nutrient Management Guide, section 1, 2023), and the middle of its index 4 in the back garden: the RHS finds
// long-cultivated garden soils usually hold plenty of phosphorus and potassium, often more than crops need, after years
// of manure, compost and feed, and RB209's indices put that at 3 or above; a spring soil mineral nitrogen of about
// 40 kg N/ha; starting organic matter is a well-kept garden topsoil's (Loveland & Webb 2003 put the line for trouble at
// about 2 % organic carbon, 3.4 % matter).

export interface Texture {
  name: string;
  /** Sand and clay, fractions of the mineral soil by weight (silt is the rest). */
  sand: number;
  clay: number;
  /** FAO-56 table 19: water the surface can lose before evaporation slows (readily evaporable) and in all, mm. */
  rew: number;
  tew: number;
}

export const TEXTURES = {
  'sandy loam': {name: 'sandy loam', sand: 0.65, clay: 0.1, rew: 8, tew: 18},
  loam: {name: 'loam', sand: 0.4, clay: 0.2, rew: 9, tew: 20},
  'clay loam': {name: 'clay loam', sand: 0.3, clay: 0.33, rew: 10, tew: 24},
  clay: {name: 'clay', sand: 0.2, clay: 0.5, rew: 11, tew: 27},
} as const satisfies Record<string, Texture>;

export type TextureName = keyof typeof TEXTURES;

/** A soil as a place starts with it. */
export interface SoilSpec {
  texture: TextureName;
  /** Organic matter, % of the soil's dry weight. */
  organicMatter: number;
  /** Plant-available phosphorus (Olsen) and exchangeable potassium, mg/L of soil: RB209's index 2 if not given. */
  p?: number;
  k?: number;
}

/** The layer the models count, m: the roots of salad and grass, the spade's depth, and most of the organic matter. */
export const DEPTH = 0.3;
/** Dry bulk density of a garden topsoil, kg per m³. */
export const BULK_DENSITY = 1300;

/** RB209's soil index 2, middle: Olsen phosphorus 20 mg/L and exchangeable potassium 150 mg/L of soil (a field's). */
export const START_P_MG_L = 20;
export const START_K_MG_L = 150;
/** A long-kept garden's: RB209's index 4, middle (Olsen P 46–70 mg/L, K 401–600 mg/L). */
export const GARDEN_P_MG_L = 58;
export const GARDEN_K_MG_L = 500;
/** Soil mineral nitrogen in spring, kg N a hectare in the layer. */
export const START_NITRATE_KG_HA = 40;
