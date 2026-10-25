import { HistoricalWeatherData } from '../types/weather';

const CACHE_PREFIX = 'wpe_cache_v1_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const memoryCache = new Map<string, { data: HistoricalWeatherData; timestamp: number }>();

export function getCacheKey(lat: number, lon: number, startYear: number, endYear: number): string {
  return `${lat.toFixed(3)}_${lon.toFixed(3)}_${startYear}_${endYear}`;
}

export function getCachedWeather(key: string): HistoricalWeatherData | null {
  // Check memory cache first
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_EXPIRY_MS) {
    return { ...mem.data, fromCache: true };
  }

  // Check localStorage
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
      memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
      return { ...parsed.data, fromCache: true };
    } else {
      localStorage.removeItem(CACHE_PREFIX + key);
    }
  } catch (err) {
    console.warn('Failed to read from localStorage cache:', err);
  }

  return null;
}

export function setCachedWeather(key: string, data: HistoricalWeatherData): void {
  const timestamp = Date.now();
  memoryCache.set(key, { data, timestamp });

  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp })
    );
  } catch (err) {
    console.warn('Failed to write to localStorage (likely quota exceeded):', err);
    // If quota exceeded, clean old items
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
          break;
        }
      }
    } catch {
      // ignore
    }
  }
}
