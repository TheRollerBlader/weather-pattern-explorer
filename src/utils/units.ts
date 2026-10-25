import { UnitSystem, UnitConversion } from '../types/weather';

export function getUnitConverters(system: UnitSystem): UnitConversion {
  if (system === 'imperial') {
    return {
      temp: (c: number) => (c * 9) / 5 + 32,
      tempUnit: '°F',
      precip: (mm: number) => mm * 0.0393701,
      precipUnit: 'in',
      wind: (kmh: number) => kmh * 0.621371,
      windUnit: 'mph',
      formatTemp: (c: number, decimals: number = 1) => `${((c * 9) / 5 + 32).toFixed(decimals)}°F`,
      formatPrecip: (mm: number, decimals: number = 2) => `${(mm * 0.0393701).toFixed(decimals)} in`,
      formatWind: (kmh: number, decimals: number = 1) => `${(kmh * 0.621371).toFixed(decimals)} mph`,
    };
  }

  return {
    temp: (c: number) => c,
    tempUnit: '°C',
    precip: (mm: number) => mm,
    precipUnit: 'mm',
    wind: (kmh: number) => kmh,
    windUnit: 'km/h',
    formatTemp: (c: number, decimals: number = 1) => `${c.toFixed(decimals)}°C`,
    formatPrecip: (mm: number, decimals: number = 1) => `${mm.toFixed(decimals)} mm`,
    formatWind: (kmh: number, decimals: number = 1) => `${kmh.toFixed(decimals)} km/h`,
  };
}
