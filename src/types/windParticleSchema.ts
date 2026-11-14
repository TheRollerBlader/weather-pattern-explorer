/**
 * Strict TypeScript types, domain contracts, and mathematical validators
 * for GPU/Canvas wind vector particles and meteorological isobar fields.
 * Scheduled Milestone: Type Safety, Linting & Polish (2026-11-14).
 */

import type { DailyWeatherRecord } from './weather';

export interface WindParticleState {
  readonly id: number;
  x: number;          // Normalized canvas viewport coordinate [0, 1]
  y: number;          // Normalized canvas viewport coordinate [0, 1]
  vx: number;         // U-component (zonal velocity, eastward)
  vy: number;         // V-component (meridional velocity, northward)
  age: number;        // Current particle lifetime frame counter
  maxAge: number;     // Maximum particle lifetime before respawn
  speedKmH: number;   // Scalar wind velocity magnitude
}

export interface IsobarContourLevel {
  readonly pressureHPa: number;
  readonly contourPoints: readonly [number, number][]; // [lat, lon] coordinates
  readonly gradientMagnitude: number;
  readonly label: string;
}

export type NumericalWeatherModel = 'GFS' | 'ECMWF' | 'HRRR' | 'ICON';

export interface EnsembleForecastPoint {
  readonly timestampIso: string;
  readonly model: NumericalWeatherModel;
  readonly temperatureC: number;
  readonly windSpeedKmH: number;
  readonly precipitationProbabilityPct: number;
  readonly surfacePressureHPa: number;
}

export interface EnsembleComparisonSummary {
  readonly targetLocation: string;
  readonly ensembleMeanTempC: number;
  readonly tempP10: number; // 10th percentile (cold spread bound)
  readonly tempP90: number; // 90th percentile (warm spread bound)
  readonly modelAgreementScore: number; // [0.0 - 1.0] measure of forecast convergence
}

/**
 * Validates whether an unknown object strictly conforms to the DailyWeatherRecord schema.
 */
export function isDailyWeatherRecord(val: unknown): val is DailyWeatherRecord {
  if (!val || typeof val !== 'object') return false;
  const r = val as Record<string, unknown>;

  return (
    typeof r.date === 'string' &&
    typeof r.year === 'number' &&
    typeof r.month === 'number' &&
    typeof r.tempMax === 'number' &&
    typeof r.tempMin === 'number' &&
    typeof r.windSpeedMax === 'number' &&
    typeof r.windDirectionDominant === 'number' &&
    Number.isFinite(r.tempMax) &&
    Number.isFinite(r.tempMin) &&
    r.windSpeedMax >= 0 &&
    r.windDirectionDominant >= 0 &&
    r.windDirectionDominant <= 360
  );
}

/**
 * Converts meteorological wind speed and direction into standard meteorological
 * Cartesian U (eastward) and V (northward) vector components.
 * Note: Meteorological direction is direction FROM which the wind is blowing.
 */
export function calculateWindVectorComponents(
  speedKmH: number,
  directionDeg: number
): { u: number; v: number } {
  if (speedKmH <= 0 || !Number.isFinite(speedKmH) || !Number.isFinite(directionDeg)) {
    return { u: 0.0, v: 0.0 };
  }

  // Convert from "direction blowing from" to mathematical flow direction in radians
  const rad = ((270 - directionDeg) * Math.PI) / 180.0;
  const u = Math.round(speedKmH * Math.cos(rad) * 1000) / 1000;
  const v = Math.round(speedKmH * Math.sin(rad) * 1000) / 1000;

  return { u, v };
}

/**
 * Computes statistical ensemble agreement score across multi-model forecast points.
 * Higher agreement (near 1.0) indicates high confidence / tight clustering.
 */
export function computeEnsembleAgreement(
  forecasts: readonly EnsembleForecastPoint[]
): EnsembleComparisonSummary | null {
  if (!forecasts || forecasts.length === 0) return null;

  const temps = forecasts.map(f => f.temperatureC).sort((a, b) => a - b);
  const n = temps.length;
  const mean = temps.reduce((acc, v) => acc + v, 0) / n;

  const p10 = temps[Math.floor(n * 0.1)] ?? temps[0];
  const p90 = temps[Math.floor(n * 0.9)] ?? temps[n - 1];
  const spread = Math.max(0.1, p90 - p10);

  // Score decreases as multi-model spread widens (e.g. 1.0 at 0.5C spread, drops at >5C spread)
  const agreement = Math.max(0.0, Math.min(1.0, 1.0 / (1.0 + spread * 0.25)));

  return {
    targetLocation: 'Regional Ensemble Cell',
    ensembleMeanTempC: Math.round(mean * 10) / 10,
    tempP10: Math.round(p10 * 10) / 10,
    tempP90: Math.round(p90 * 10) / 10,
    modelAgreementScore: Math.round(agreement * 100) / 100,
  };
}
