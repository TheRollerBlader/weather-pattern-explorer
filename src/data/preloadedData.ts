import { CityLocation, DailyWeatherRecord, HistoricalWeatherData } from '../types/weather';
import { calculateClimateSummary } from '../services/climateMath';
import { SAMPLE_CITIES } from './sampleCities';

// Pseudo-random deterministic number generator with seed
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CityClimateProfile {
  winterMean: number;
  summerMean: number;
  dailySwing: number;
  annualPrecip: number; // mm
  peakRainMonth: number; // 0-11
  isSouthernHemisphere: boolean;
  warmingRate: number; // °C per decade
  meanWindSpeed: number; // km/h
  dominantWindDir: number; // degrees
}

const CITY_PROFILES: Record<string, CityClimateProfile> = {
  nyc: {
    winterMean: 0.5,
    summerMean: 24.8,
    dailySwing: 8.5,
    annualPrecip: 1220,
    peakRainMonth: 6,
    isSouthernHemisphere: false,
    warmingRate: 0.36,
    meanWindSpeed: 14.5,
    dominantWindDir: 290 // WNW
  },
  london: {
    winterMean: 5.2,
    summerMean: 18.7,
    dailySwing: 7.2,
    annualPrecip: 620,
    peakRainMonth: 10,
    isSouthernHemisphere: false,
    warmingRate: 0.28,
    meanWindSpeed: 16.0,
    dominantWindDir: 235 // SW
  },
  tokyo: {
    winterMean: 6.0,
    summerMean: 26.5,
    dailySwing: 8.0,
    annualPrecip: 1530,
    peakRainMonth: 8, // September
    isSouthernHemisphere: false,
    warmingRate: 0.33,
    meanWindSpeed: 13.0,
    dominantWindDir: 180 // South in summer, North in winter
  },
  sydney: {
    winterMean: 13.0,
    summerMean: 23.2,
    dailySwing: 7.8,
    annualPrecip: 1215,
    peakRainMonth: 5, // June
    isSouthernHemisphere: true,
    warmingRate: 0.24,
    meanWindSpeed: 17.5,
    dominantWindDir: 120 // ESE
  },
  nairobi: {
    winterMean: 16.8,
    summerMean: 19.5,
    dailySwing: 10.5,
    annualPrecip: 920,
    peakRainMonth: 3, // April (long rains)
    isSouthernHemisphere: true,
    warmingRate: 0.26,
    meanWindSpeed: 12.0,
    dominantWindDir: 70 // ENE
  }
};

export function generatePreloadedDataset(
  city: CityLocation,
  startYear: number = 1985,
  endYear: number = 2023
): HistoricalWeatherData {
  const profile = CITY_PROFILES[String(city.id).toLowerCase()] || {
    winterMean: city.latitude > 0 ? 5 : 20,
    summerMean: city.latitude > 0 ? 25 : 12,
    dailySwing: 8,
    annualPrecip: 800,
    peakRainMonth: 6,
    isSouthernHemisphere: city.latitude < 0,
    warmingRate: 0.3,
    meanWindSpeed: 14,
    dominantWindDir: 240
  };

  const seed = Math.abs(Math.round(city.latitude * 1000 + city.longitude * 100));
  const rng = mulberry32(seed);

  const daily: DailyWeatherRecord[] = [];

  for (let year = startYear; year <= endYear; year++) {
    // Decadal climate trend offset: +profile.warmingRate °C per 10 years relative to 1980
    const climateWarmingOffset = ((year - 1980) / 10) * profile.warmingRate;

    // Inter-annual variability (e.g. El Niño/La Niña cycles ~ 3-7 years)
    const ensoCycle = Math.sin((year - 1980) * 0.95) * 0.45;
    const yearAnomaly = (rng() - 0.5) * 0.6 + climateWarmingOffset + ensoCycle;

    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const daysInYear = isLeap ? 366 : 365;

    for (let doy = 1; doy <= daysInYear; doy++) {
      // Approximate date
      const dateObj = new Date(year, 0, doy);
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Seasonal temperature curve: peak in July (doy ~200) for northern hemisphere, Jan (doy ~20) for southern
      const peakDoy = profile.isSouthernHemisphere ? 25 : 205;
      const seasonalPhase = ((doy - peakDoy) / daysInYear) * 2 * Math.PI;
      const seasonalTemp =
        (profile.winterMean + profile.summerMean) / 2 +
        ((profile.summerMean - profile.winterMean) / 2) * Math.cos(seasonalPhase);

      // Weather front day-to-day synoptic noise
      const synopticNoise = (rng() - 0.5) * 5.0;
      const tempMean = Number((seasonalTemp + yearAnomaly + synopticNoise).toFixed(1));

      const diurnalSwing = profile.dailySwing + (rng() - 0.5) * 3;
      const tempMax = Number((tempMean + diurnalSwing / 2 + rng() * 1.5).toFixed(1));
      const tempMin = Number((tempMean - diurnalSwing / 2 - rng() * 1.5).toFixed(1));

      // Precipitation modeling: probability and intensity
      const monthDistFromPeak = Math.abs(month - profile.peakRainMonth);
      const rainProbability = Math.max(0.12, 0.42 - monthDistFromPeak * 0.035);
      let precipitation = 0;
      if (rng() < rainProbability) {
        // Exponential rainfall distribution
        const rainRaw = -Math.log(1 - rng()) * (profile.annualPrecip / 140);
        precipitation = Number(Math.min(130, rainRaw).toFixed(1));
      }

      // Wind speed & direction
      const windSpeedMax = Number(
        Math.max(2.5, profile.meanWindSpeed + (rng() - 0.45) * 12 + (precipitation > 10 ? 8 : 0)).toFixed(1)
      );
      // Wind direction biased towards dominant direction with variance
      const windDirOffset = (rng() - 0.5) * 110;
      const windDirectionDominant = Math.round((profile.dominantWindDir + windDirOffset + 360) % 360);

      daily.push({
        date: dateStr,
        year,
        month,
        day,
        dayOfYear: doy,
        tempMax,
        tempMin,
        tempMean,
        precipitation,
        windSpeedMax,
        windDirectionDominant
      });
    }
  }

  const summary = calculateClimateSummary(daily);

  return {
    city,
    startDate: `${startYear}-01-01`,
    endDate: `${endYear}-12-31`,
    daily,
    summary,
    fromCache: true
  };
}

// Pre-create datasets for default sample cities so initial render is lightning fast
export const PRELOADED_DATASETS: Record<string, HistoricalWeatherData> = {};

export function getOrGeneratePreset(cityId: string): HistoricalWeatherData {
  const normalizedId = cityId.toLowerCase();
  if (PRELOADED_DATASETS[normalizedId]) {
    return PRELOADED_DATASETS[normalizedId];
  }

  const city = SAMPLE_CITIES.find(c => String(c.id).toLowerCase() === normalizedId) || SAMPLE_CITIES[0];
  const dataset = generatePreloadedDataset(city, 1985, 2023);
  PRELOADED_DATASETS[normalizedId] = dataset;
  return dataset;
}
