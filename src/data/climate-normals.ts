// The garden's climate: monthly normals for an invented lowland station in southern England, about 60 m up at 51.5° N,
// with the daily spread the weather generator (src/sim/models/weather.ts) draws around them. No real place is named: the
// figures sit inside the ranges of the Met Office's 1991–2020 climate normals for southern English lowland stations
// (Met Office, UK climate averages 1991–2020, Open Government Licence v3.0), rounded. The daily spreads and the
// wet-day shifts are the rough sizes a station's daily records give; the generator's own constants are in its file.

export interface MonthNormal {
  /** Mean daily maximum temperature, °C. */
  tmax: number;
  /** Mean daily minimum temperature, °C. */
  tmin: number;
  /** Rainfall, mm in the month. */
  rain: number;
  /** Days with 1 mm of rain or more (the Met Office's rain days). */
  rainDays: number;
  /** Bright sunshine, hours in the month. */
  sun: number;
  /** Days when the air falls below 0 °C: a reference for the tests, not an input. */
  airFrostDays: number;
  /** Day-to-day spread (standard deviation) of the maximum and the minimum around their means, °C. */
  sdMax: number;
  sdMin: number;
}

export const STATION = {
  /** Latitude, degrees north: the sun's height and the day's length. */
  latitude: 51.5,
  /** Height above sea level, m: the air pressure in the evapotranspiration. */
  altitude: 60,
};

/** January to December. */
export const NORMALS: readonly MonthNormal[] = [
  {tmax: 8.1, tmin: 2.1, rain: 60, rainDays: 11.5, sun: 62, airFrostDays: 7, sdMax: 2.6, sdMin: 3.3},
  {tmax: 8.8, tmin: 2.0, rain: 45, rainDays: 9.7, sun: 80, airFrostDays: 7, sdMax: 2.7, sdMin: 3.3},
  {tmax: 11.6, tmin: 3.3, rain: 41, rainDays: 8.9, sun: 118, airFrostDays: 4, sdMax: 2.9, sdMin: 3.0},
  {tmax: 14.7, tmin: 5.0, rain: 47, rainDays: 8.9, sun: 170, airFrostDays: 2, sdMax: 3.1, sdMin: 2.7},
  {tmax: 18.0, tmin: 8.0, rain: 54, rainDays: 8.9, sun: 200, airFrostDays: 0.2, sdMax: 3.2, sdMin: 2.5},
  {tmax: 21.0, tmin: 10.9, rain: 50, rainDays: 8.4, sun: 198, airFrostDays: 0, sdMax: 3.3, sdMin: 2.2},
  {tmax: 23.4, tmin: 13.0, rain: 51, rainDays: 8.1, sun: 212, airFrostDays: 0, sdMax: 3.3, sdMin: 2.0},
  {tmax: 22.9, tmin: 12.8, rain: 58, rainDays: 8.6, sun: 195, airFrostDays: 0, sdMax: 3.0, sdMin: 2.0},
  {tmax: 19.8, tmin: 10.6, rain: 52, rainDays: 8.6, sun: 145, airFrostDays: 0, sdMax: 2.7, sdMin: 2.4},
  {tmax: 15.4, tmin: 7.9, rain: 70, rainDays: 10.6, sun: 110, airFrostDays: 0.5, sdMax: 2.5, sdMin: 2.9},
  {tmax: 11.3, tmin: 4.6, rain: 68, rainDays: 11.3, sun: 72, airFrostDays: 3, sdMax: 2.4, sdMin: 3.2},
  {tmax: 8.5, tmin: 2.4, rain: 63, rainDays: 11.2, sun: 53, airFrostDays: 7, sdMax: 2.5, sdMin: 3.3},
];

/**
 * How far a wet day's temperatures sit from a dry day's, °C, by season (winter Dec–Feb, spring, summer, autumn): cloud
 * cools the afternoon (more in summer) and keeps the night warmer (more in winter). The generator splits the monthly
 * mean between wet and dry days so the month's mean stays the normal.
 */
export const WET_SHIFT = {
  tmax: [-0.8, -1.8, -2.6, -1.4],
  tmin: [1.6, 0.6, 0.4, 1.2],
};

/**
 * How a warming index of 1 °C above the 1991–2020 baseline shifts the station, by season (winter, spring, summer,
 * autumn), in the direction and rough size IPCC AR6 (WGI, chapters 11 and 12, and the Atlas for northern Europe) and
 * the Met Office's UKCP18 projections give for southern England: summers warm more than winters, winters get wetter and
 * summers drier, each wet day's rain heavier by about 7 % a degree (Clausius–Clapeyron), and hot summer days hotter
 * than the mean shift alone.
 */
export const PER_DEGREE = {
  /** °C added to the mean maximum and minimum. */
  warming: [0.9, 1.0, 1.3, 1.1],
  /** Fraction added to the season's rainfall. */
  rain: [0.06, 0.01, -0.1, -0.01],
  /** Fraction added to each wet day's amount (the rest of the rainfall change comes from fewer or more wet days). */
  intensity: 0.07,
  /** Fraction added to the day-to-day spread of the maximum. */
  spread: [0.02, 0.04, 0.1, 0.04],
};
