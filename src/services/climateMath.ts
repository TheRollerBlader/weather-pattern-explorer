import { DailyWeatherRecord, ClimateSummary, ClimateAnomaly, WindRoseBin } from '../types/weather';

export const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW'
] as const;

// Ed Hawkins Warming Stripes Color Palette (16 discrete intervals from deep blue to deep red)
export const WARMING_STRIPES_COLORS = [
  '#08306b', '#08519c', '#2171b5', '#4292c6',
  '#6baed6', '#9ecae1', '#c6dbef', '#deebf7',
  '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a',
  '#ef3b2c', '#cb181d', '#a50f15', '#67000d'
];

/**
 * Returns color on a divergent blue-red scale for a temperature anomaly in °C
 */
export function getAnomalyColor(anomaly: number, maxAbsAnomaly: number = 2.0): string {
  // Normalize anomaly between -maxAbsAnomaly and +maxAbsAnomaly
  const clamped = Math.max(-maxAbsAnomaly, Math.min(maxAbsAnomaly, anomaly));
  const normalized = (clamped + maxAbsAnomaly) / (2 * maxAbsAnomaly); // 0 to 1
  const index = Math.min(
    WARMING_STRIPES_COLORS.length - 1,
    Math.floor(normalized * WARMING_STRIPES_COLORS.length)
  );
  return WARMING_STRIPES_COLORS[index];
}

/**
 * Calculates Silverman's rule-of-thumb bandwidth for Kernel Density Estimation
 */
export function calculateBandwidth(values: number[]): number {
  if (values.length < 2) return 1.0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 1.0;
  return 1.06 * stdDev * Math.pow(values.length, -0.2);
}

/**
 * Computes Gaussian Kernel Density Estimation over a set of grid points
 */
export function kernelDensityEstimator(
  kernel: (v: number) => number,
  bandwidth: number,
  samples: number[]
) {
  return function (x: number): number {
    if (samples.length === 0) return 0;
    const invH = 1 / bandwidth;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += kernel((x - samples[i]) * invH);
    }
    return (sum * invH) / samples.length;
  };
}

export function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

/**
 * Compute KDE density points for a month across a min/max temperature domain
 */
export function computeMonthlyKDE(
  records: DailyWeatherRecord[],
  monthIndex: number,
  minX: number,
  maxX: number,
  steps: number = 60
): { temp: number; density: number }[] {
  const monthRecords = records.filter(r => r.month === monthIndex && !isNaN(r.tempMean));
  const temps = monthRecords.map(r => r.tempMean);
  if (temps.length === 0) return [];

  const bw = Math.max(0.75, calculateBandwidth(temps));
  const kde = kernelDensityEstimator(gaussianKernel, bw, temps);
  const stepSize = (maxX - minX) / (steps - 1);

  const points: { temp: number; density: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const x = minX + i * stepSize;
    points.push({ temp: x, density: kde(x) });
  }
  return points;
}

/**
 * Calculates Ordinary Least Squares linear regression for annual temperature series.
 * Returns slope per decade and R^2.
 */
export function calculateDecadalTrend(annualData: { year: number; meanTemp: number }[]): {
  ratePerDecade: number;
  r2: number;
  slope: number;
  intercept: number;
} {
  const n = annualData.length;
  if (n < 2) return { ratePerDecade: 0, r2: 0, slope: 0, intercept: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const pt of annualData) {
    sumX += pt.year;
    sumY += pt.meanTemp;
    sumXY += pt.year * pt.meanTemp;
    sumX2 += pt.year * pt.year;
    sumY2 += pt.meanTemp * pt.meanTemp;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { ratePerDecade: 0, r2: 0, slope: 0, intercept: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation coefficient r and R^2
  const numeratorR = n * sumXY - sumX * sumY;
  const denomR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = denomR !== 0 ? numeratorR / denomR : 0;
  const r2 = r * r;

  return {
    slope,
    intercept,
    ratePerDecade: slope * 10,
    r2
  };
}

/**
 * Generates 16-bin Wind Rose distributions with 6 speed classes
 */
export function calculateWindRose(records: DailyWeatherRecord[]): {
  bins: WindRoseBin[];
  calmPercentage: number;
} {
  const bins: WindRoseBin[] = COMPASS_DIRECTIONS.map((dir, idx) => ({
    directionLabel: dir,
    angle: idx * 22.5,
    speedCounts: {
      '0-5': 0,
      '5-10': 0,
      '10-15': 0,
      '15-20': 0,
      '20-30': 0,
      '30+': 0,
    },
    totalCount: 0,
    percentage: 0,
  }));

  let totalValid = 0;
  let calmCount = 0;

  for (const r of records) {
    if (isNaN(r.windSpeedMax) || isNaN(r.windDirectionDominant)) continue;
    totalValid++;

    if (r.windSpeedMax < 1.0) {
      calmCount++;
      continue;
    }

    // Direction bin: 16 directions, 22.5 deg each. Centered at 0, 22.5, etc.
    // Normalized angle: (dir + 11.25) % 360 / 22.5
    let deg = (r.windDirectionDominant + 11.25) % 360;
    if (deg < 0) deg += 360;
    const binIdx = Math.floor(deg / 22.5) % 16;
    const bin = bins[binIdx];

    bin.totalCount++;
    const spd = r.windSpeedMax;
    if (spd < 5) bin.speedCounts['0-5']++;
    else if (spd < 10) bin.speedCounts['5-10']++;
    else if (spd < 15) bin.speedCounts['10-15']++;
    else if (spd < 20) bin.speedCounts['15-20']++;
    else if (spd < 30) bin.speedCounts['20-30']++;
    else bin.speedCounts['30+']++;
  }

  // Calculate percentages
  const calmPercentage = totalValid > 0 ? (calmCount / totalValid) * 100 : 0;
  for (const bin of bins) {
    bin.percentage = totalValid > 0 ? (bin.totalCount / totalValid) * 100 : 0;
  }

  return { bins, calmPercentage };
}

/**
 * Calculates comprehensive climate summary statistics
 */
export function calculateClimateSummary(daily: DailyWeatherRecord[]): ClimateSummary {
  if (daily.length === 0) {
    return {
      recordHigh: { temp: 0, date: '' },
      recordLow: { temp: 0, date: '' },
      wettestDay: { precip: 0, date: '' },
      windiestDay: { speed: 0, date: '', direction: 0 },
      baselineYears: [1981, 2010],
      baselineMeanTemp: 0,
      baselineMeanPrecip: 0,
      decadalTrendRate: 0,
      decadalTrendR2: 0,
      annualAnomalies: [],
      hottestYears: [],
      coldestYears: [],
      totalDaysRecorded: 0,
      calmWindPercentage: 0
    };
  }

  let recordHigh = { temp: -999, date: '' };
  let recordLow = { temp: 999, date: '' };
  let wettestDay = { precip: 0, date: '' };
  let windiestDay = { speed: 0, date: '', direction: 0 };

  const yearlyMap = new Map<number, { temps: number[]; precips: number[] }>();

  for (const r of daily) {
    if (r.tempMax > recordHigh.temp) {
      recordHigh = { temp: r.tempMax, date: r.date };
    }
    if (r.tempMin < recordLow.temp) {
      recordLow = { temp: r.tempMin, date: r.date };
    }
    if (r.precipitation > wettestDay.precip) {
      wettestDay = { precip: r.precipitation, date: r.date };
    }
    if (r.windSpeedMax > windiestDay.speed) {
      windiestDay = { speed: r.windSpeedMax, date: r.date, direction: r.windDirectionDominant };
    }

    if (!yearlyMap.has(r.year)) {
      yearlyMap.set(r.year, { temps: [], precips: [] });
    }
    const entry = yearlyMap.get(r.year)!;
    if (!isNaN(r.tempMean)) entry.temps.push(r.tempMean);
    if (!isNaN(r.precipitation)) entry.precips.push(r.precipitation);
  }

  const allYears = Array.from(yearlyMap.keys()).sort((a, b) => a - b);
  const minYear = allYears[0];
  const maxYear = allYears[allYears.length - 1];

  // Baseline selection: prefer 1981-2010 if covered, else available 1990-2020 or all years
  let baseStart = 1981;
  let baseEnd = 2010;
  if (minYear > 1981 || maxYear < 2010) {
    baseStart = minYear;
    baseEnd = Math.min(minYear + 29, maxYear);
  }

  // Calculate baseline averages
  let baselineTempSum = 0;
  let baselineTempCount = 0;
  let baselinePrecipSum = 0;
  let baselinePrecipCount = 0;

  for (let yr = baseStart; yr <= baseEnd; yr++) {
    const yrData = yearlyMap.get(yr);
    if (yrData) {
      for (const t of yrData.temps) {
        baselineTempSum += t;
        baselineTempCount++;
      }
      baselinePrecipSum += yrData.precips.reduce((a, b) => a + b, 0);
      baselinePrecipCount++;
    }
  }

  const baselineMeanTemp = baselineTempCount > 0 ? baselineTempSum / baselineTempCount : 15;
  const baselineMeanPrecip = baselinePrecipCount > 0 ? baselinePrecipSum / baselinePrecipCount : 800;

  // Annual anomalies
  const annualAnomalies: ClimateAnomaly[] = [];
  const annualTrendData: { year: number; meanTemp: number }[] = [];

  for (const yr of allYears) {
    const yrData = yearlyMap.get(yr)!;
    if (yrData.temps.length > 100) {
      const yrMean = yrData.temps.reduce((a, b) => a + b, 0) / yrData.temps.length;
      const yrPrecip = yrData.precips.reduce((a, b) => a + b, 0);
      const anomaly = yrMean - baselineMeanTemp;
      const precipAnomaly = yrPrecip - baselineMeanPrecip;

      annualTrendData.push({ year: yr, meanTemp: yrMean });
      annualAnomalies.push({
        year: yr,
        meanTemp: yrMean,
        anomaly,
        anomalyColor: getAnomalyColor(anomaly),
        precipitationTotal: yrPrecip,
        precipAnomaly
      });
    }
  }

  // Decadal trend linear regression
  const trend = calculateDecadalTrend(annualTrendData);

  // Hottest & coldest years
  const sortedByTemp = [...annualAnomalies].sort((a, b) => b.meanTemp - a.meanTemp);
  const hottestYears = sortedByTemp.slice(0, 5).map(a => ({ year: a.year, meanTemp: a.meanTemp, anomaly: a.anomaly }));
  const coldestYears = [...sortedByTemp].reverse().slice(0, 5).map(a => ({ year: a.year, meanTemp: a.meanTemp, anomaly: a.anomaly }));

  const { calmPercentage } = calculateWindRose(daily);

  return {
    recordHigh,
    recordLow,
    wettestDay,
    windiestDay,
    baselineYears: [baseStart, baseEnd],
    baselineMeanTemp,
    baselineMeanPrecip,
    decadalTrendRate: trend.ratePerDecade,
    decadalTrendR2: trend.r2,
    annualAnomalies,
    hottestYears,
    coldestYears,
    totalDaysRecorded: daily.length,
    calmWindPercentage: calmPercentage
  };
}
