export interface CityLocation {
  id: number | string;
  name: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  admin1?: string;
}

export interface DailyWeatherRecord {
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 0-11
  day: number;
  dayOfYear: number; // 1-366
  tempMax: number; // °C
  tempMin: number; // °C
  tempMean: number; // °C
  precipitation: number; // mm
  windSpeedMax: number; // km/h
  windDirectionDominant: number; // degrees 0-360
}

export interface HistoricalWeatherData {
  city: CityLocation;
  startDate: string;
  endDate: string;
  daily: DailyWeatherRecord[];
  summary: ClimateSummary;
  fromCache?: boolean;
}

export interface ClimateAnomaly {
  year: number;
  meanTemp: number;
  anomaly: number; // deviation from baseline (°C)
  anomalyColor: string;
  precipitationTotal: number;
  precipAnomaly: number; // mm
}

export interface WindRoseBin {
  directionLabel: string;
  angle: number;
  speedCounts: {
    '0-5': number;
    '5-10': number;
    '10-15': number;
    '15-20': number;
    '20-30': number;
    '30+': number;
  };
  totalCount: number;
  percentage: number;
}

export interface ClimateSummary {
  recordHigh: { temp: number; date: string };
  recordLow: { temp: number; date: string };
  wettestDay: { precip: number; date: string };
  windiestDay: { speed: number; date: string; direction: number };
  baselineYears: [number, number]; // e.g. [1981, 2010]
  baselineMeanTemp: number;
  baselineMeanPrecip: number;
  decadalTrendRate: number; // °C per decade
  decadalTrendR2: number;
  annualAnomalies: ClimateAnomaly[];
  hottestYears: { year: number; meanTemp: number; anomaly: number }[];
  coldestYears: { year: number; meanTemp: number; anomaly: number }[];
  totalDaysRecorded: number;
  calmWindPercentage: number;
}

export type UnitSystem = 'metric' | 'imperial';

export interface UnitConversion {
  temp: (celsius: number) => number;
  tempUnit: string;
  precip: (mm: number) => number;
  precipUnit: string;
  wind: (kmh: number) => number;
  windUnit: string;
  formatTemp: (celsius: number, decimals?: number) => string;
  formatPrecip: (mm: number, decimals?: number) => string;
  formatWind: (kmh: number, decimals?: number) => string;
}
