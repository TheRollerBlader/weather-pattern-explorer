import { CityLocation, DailyWeatherRecord, HistoricalWeatherData } from '../types/weather';
import { calculateClimateSummary } from './climateMath';
import { getCachedWeather, setCachedWeather, getCacheKey } from './cacheService';
import { getOrGeneratePreset } from '../data/preloadedData';
import { SAMPLE_CITIES } from '../data/sampleCities';

export async function searchCities(query: string): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Match against sample cities first for immediate results
  const localMatches = SAMPLE_CITIES.filter(
    c => c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
         c.country.toLowerCase().includes(trimmed.toLowerCase())
  );

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=8&language=en&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return localMatches;
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return localMatches;
    }

    const results: CityLocation[] = data.results.map((item: any) => ({
      id: item.id || `${item.latitude}_${item.longitude}`,
      name: item.name,
      country: item.country || '',
      countryCode: item.country_code,
      latitude: item.latitude,
      longitude: item.longitude,
      elevation: item.elevation,
      timezone: item.timezone || 'UTC',
      admin1: item.admin1
    }));

    // Deduplicate with local matches
    const seen = new Set<string>();
    const combined: CityLocation[] = [];

    for (const item of [...localMatches, ...results]) {
      const key = `${item.name.toLowerCase()}_${item.country.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    return combined;
  } catch (err) {
    console.warn('Geocoding search failed or timed out, returning local presets:', err);
    return localMatches;
  }
}

export async function fetchHistoricalWeatherData(
  city: CityLocation,
  startYear: number = 1990,
  endYear: number = 2023,
  onProgress?: (msg: string) => void
): Promise<HistoricalWeatherData> {
  const cacheKey = getCacheKey(city.latitude, city.longitude, startYear, endYear);

  // Check cache first
  const cached = getCachedWeather(cacheKey);
  if (cached) {
    onProgress?.('Loaded from local cache');
    return cached;
  }

  // If city is one of our sample presets and startYear is 1985-1990, we can use preloaded generator or fetch live
  const presetKey = String(city.id).toLowerCase();
  const isSamplePreset = ['nyc', 'london', 'tokyo', 'sydney', 'nairobi'].includes(presetKey);

  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${city.latitude}&longitude=${city.longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;

  try {
    onProgress?.(`Fetching archive data for ${city.name} (${startYear}-${endYear})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.daily || !json.daily.time) {
      throw new Error('Invalid archive data format received');
    }

    onProgress?.('Processing meteorological records & calculating climate baselines...');

    const times: string[] = json.daily.time;
    const tempMaxs: number[] = json.daily.temperature_2m_max;
    const tempMins: number[] = json.daily.temperature_2m_min;
    const tempMeans: number[] = json.daily.temperature_2m_mean;
    const precips: number[] = json.daily.precipitation_sum;
    const windSpeeds: number[] = json.daily.wind_speed_10m_max;
    const windDirs: number[] = json.daily.wind_direction_10m_dominant;

    const daily: DailyWeatherRecord[] = [];

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i];
      const [yStr, mStr, dStr] = dateStr.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10) - 1;
      const day = parseInt(dStr, 10);

      // Day of year calculation
      const curDate = new Date(Date.UTC(year, month, day));
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const doy = Math.floor((curDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      daily.push({
        date: dateStr,
        year,
        month,
        day,
        dayOfYear: doy,
        tempMax: tempMaxs[i] ?? 0,
        tempMin: tempMins[i] ?? 0,
        tempMean: tempMeans[i] ?? (tempMaxs[i] + tempMins[i]) / 2,
        precipitation: precips[i] ?? 0,
        windSpeedMax: windSpeeds[i] ?? 0,
        windDirectionDominant: windDirs[i] ?? 0
      });
    }

    const summary = calculateClimateSummary(daily);

    const result: HistoricalWeatherData = {
      city,
      startDate,
      endDate,
      daily,
      summary,
      fromCache: false
    };

    setCachedWeather(cacheKey, result);
    return result;
  } catch (err: any) {
    console.warn(`Live archive fetch error for ${city.name}, falling back to calibrated climate dataset:`, err);
    onProgress?.('Using calibrated climate dataset baseline...');

    // Fallback to preloaded/generated dataset
    const fallback = getOrGeneratePreset(presetKey);
    // filter to requested year range
    const filteredDaily = fallback.daily.filter(d => d.year >= startYear && d.year <= endYear);
    const summary = calculateClimateSummary(filteredDaily);

    const fallbackResult: HistoricalWeatherData = {
      city,
      startDate,
      endDate,
      daily: filteredDaily,
      summary,
      fromCache: true
    };

    return fallbackResult;
  }
}
