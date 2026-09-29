// Energy: what each fuel emits and costs, and the loads a smallholding puts on it. Emission factors are rough 2025–26
// figures from the UK Government's greenhouse gas conversion factors for company reporting (DESNZ, formerly BEIS, with
// DEFRA), published under the Open Government Licence v3.0: red diesel (gas oil) about 2.7 kg CO₂e a litre, petrol about
// 2.3, grid electricity about 0.2 kg a kWh (generation and losses, the recent low as gas and wind replace coal) and
// natural gas about 0.18 kg a kWh (gross). Energy contents are the same publication's gross calorific values. Prices are
// rough 2026 farm figures (red diesel and grid tariffs in pence, rounded). A pump's lift is physics (ρ·g·h over an
// efficiency); a cold store's and a tunnel heater's loads are typical farm energy audit figures (Carbon Trust and AHDB
// "Energy use on farm" style audits), rounded. Invented places only; nothing here names a real one.

export type Fuel = 'diesel' | 'petrol' | 'electricity' | 'gas';

export interface FuelSpec {
  name: string;
  /** What it is bought in: litres for the liquid fuels, kWh for electricity and gas. */
  per: 'L' | 'kWh';
  /** kg CO₂e per litre or per kWh bought. */
  co2e: number;
  /** kWh of energy in one litre or one kWh bought (a kWh is 1). */
  kWh: number;
  /** £ per litre or per kWh bought. */
  price: number;
  /** Where the fuel comes from in the graph: the grid supplies electricity, everything else is bought in. */
  from: 'grid' | 'bought';
}

export const FUELS: Record<Fuel, FuelSpec> = {
  diesel: {name: 'Diesel', per: 'L', co2e: 2.7, kWh: 10.7, price: 0.85, from: 'bought'},
  petrol: {name: 'Petrol', per: 'L', co2e: 2.3, kWh: 9.6, price: 1.4, from: 'bought'},
  electricity: {name: 'Electricity', per: 'kWh', co2e: 0.2, kWh: 1, price: 0.27, from: 'grid'},
  gas: {name: 'Gas', per: 'kWh', co2e: 0.18, kWh: 1, price: 0.07, from: 'bought'},
};

/** Pumping: water's density (kg/m³) and gravity (m/s²), and a small electric pump's wire-to-water efficiency. */
export const PUMP = {rho: 1000, g: 9.81, efficiency: 0.45};

/**
 * A cold store's electricity: a room held at about 4 °C loses heat through its walls and door and runs its
 * compressor against it. About 0.6 kWh a m³ a day at a 15 °C outside temperature (a 20 m³ farm-shop room uses about
 * 12 kWh a day), rising by 0.04 kWh a m³ for each degree warmer outside, and never below 0.1 kWh a m³ a day (compressor and fans against a 4 °C setpoint).
 */
export const COLD_STORE = {setpoint: 4, kWhPerM3Day: 0.6, refTemp: 15, perDegree: 0.04, floorPerM3Day: 0.1};

/**
 * A polytunnel's frost-free heater: heat lost through the cover, about 6 W per m² of single polythene cover and kelvin
 * (double-skinned about 4), with the cover about twice the floor's area (a hoop house's arch), held at a setpoint of
 * 5 °C; the heater's efficiency is 1 for an electric one and about 0.85 for gas.
 */
export const TUNNEL = {setpoint: 5, uCover: 6, coverPerFloor: 2.2, efficiency: {electricity: 1, gas: 0.85} as Record<string, number>};
