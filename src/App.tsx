import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { QuickCityPills } from './components/QuickCityPills';
import { CitySearch } from './components/CitySearch';
import { MetricCards } from './components/MetricCards';
import { RidgelinePlot } from './components/RidgelinePlot';
import { TemperatureSpiral } from './components/TemperatureSpiral';
import { WarmingStripes } from './components/WarmingStripes';
import { PrecipitationCalendar } from './components/PrecipitationCalendar';
import { WindRose } from './components/WindRose';
import { WeatherMap } from './components/WeatherMap';
import { CityComparison } from './components/CityComparison';
import { RecordExtremesTable } from './components/RecordExtremesTable';
import { SkeletonLoader } from './components/SkeletonLoader';
import { SAMPLE_CITIES } from './data/sampleCities';
import { fetchHistoricalWeatherData } from './services/openMeteoApi';
import { getUnitConverters } from './utils/units';
import { CityLocation, HistoricalWeatherData, UnitSystem } from './types/weather';
import { getOrGeneratePreset } from './data/preloadedData';
import { Calendar, MapPin, Database, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<CityLocation>(SAMPLE_CITIES[0]);
  const [startYear, setStartYear] = useState<number>(1990);
  const [endYear, setEndYear] = useState<number>(2023);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);

  // Initial state loads instant preloaded dataset for New York
  const [weatherData, setWeatherData] = useState<HistoricalWeatherData>(() => {
    return getOrGeneratePreset('nyc');
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  const converters = getUnitConverters(unitSystem);

  // Load weather data when city or years change
  const loadData = useCallback(async (city: CityLocation, sYear: number, eYear: number) => {
    setIsLoading(true);
    setProgressMsg(`Loading meteorological data for ${city.name}...`);

    try {
      const data = await fetchHistoricalWeatherData(city, sYear, eYear, (msg) => {
        setProgressMsg(msg);
      });
      setWeatherData(data);
    } catch (err) {
      console.error('Failed to fetch historical weather data:', err);
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  const handleSelectCity = (city: CityLocation) => {
    setSelectedCity(city);
    loadData(city, startYear, endYear);
  };

  const handleExportCSV = () => {
    if (!weatherData || weatherData.daily.length === 0) return;

    const headers = [
      'date',
      'year',
      'month',
      'day',
      'temp_max_c',
      'temp_min_c',
      'temp_mean_c',
      'precipitation_mm',
      'wind_speed_max_kmh',
      'wind_direction_deg'
    ];

    const rows = weatherData.daily.map(r => [
      r.date,
      r.year,
      r.month + 1,
      r.day,
      r.tempMax,
      r.tempMin,
      r.tempMean,
      r.precipitation,
      r.windSpeedMax,
      r.windDirectionDominant
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${weatherData.city.name.toLowerCase().replace(/\s+/g, '_')}_climate_${startYear}_${endYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Header
        unitSystem={unitSystem}
        onToggleUnit={() => setUnitSystem(prev => (prev === 'metric' ? 'imperial' : 'metric'))}
        isComparisonMode={isComparisonMode}
        onToggleComparison={() => setIsComparisonMode(prev => !prev)}
        onExportData={handleExportCSV}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* City & Range Control Ribbon */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <CitySearch
              onSelectCity={handleSelectCity}
              selectedCity={selectedCity}
            />
            <QuickCityPills
              currentCity={selectedCity}
              onSelectCity={handleSelectCity}
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mono">
              <Calendar size={13} className="text-cyan-400" />
              <span>Range:</span>
              <select
                value={`${startYear}-${endYear}`}
                onChange={(e) => {
                  const [s, end] = e.target.value.split('-').map(Number);
                  setStartYear(s);
                  setEndYear(end);
                  loadData(selectedCity, s, end);
                }}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="1990-2023" className="bg-slate-900">1990 – 2023 (34 Years)</option>
                <option value="1980-2023" className="bg-slate-900">1980 – 2023 (44 Years)</option>
                <option value="2000-2023" className="bg-slate-900">2000 – 2023 (24 Years)</option>
                <option value="2010-2023" className="bg-slate-900">2010 – 2023 (Recent Decade)</option>
              </select>
            </div>

            <button
              onClick={() => loadData(selectedCity, startYear, endYear)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
              title="Refresh / Reload Dataset"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>
        </div>

        {/* Selected City Station Metadata Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/40 px-4 py-2.5 rounded-lg border border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <MapPin size={14} className="text-cyan-400" />
              {selectedCity.name}, {selectedCity.country}
            </span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-[11px]">
              {selectedCity.latitude.toFixed(3)}°N, {selectedCity.longitude.toFixed(3)}°E
            </span>
            {selectedCity.elevation !== undefined && (
              <>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-[11px]">{selectedCity.elevation}m ASL</span>
              </>
            )}
            <span className="text-slate-500">•</span>
            <span className="font-mono text-[11px]">{selectedCity.timezone}</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Database size={13} className="text-cyan-400" />
            <span className="text-slate-300">
              {weatherData.daily.length.toLocaleString()} daily observations
            </span>
            {weatherData.fromCache && (
              <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                Cached / Verified
              </span>
            )}
          </div>
        </div>

        {/* Loading Progress State */}
        {isLoading && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              {progressMsg || 'Fetching meteorological telemetry...'}
            </span>
            <span className="font-mono text-[11px] text-cyan-400">ERA5 Reanalysis</span>
          </div>
        )}

        {/* High-level Metric Ribbon */}
        {isLoading && !weatherData ? (
          <SkeletonLoader />
        ) : (
          <>
            <MetricCards
              summary={weatherData.summary}
              converters={converters}
            />

            {/* Side-by-Side City Comparison (Toggleable) */}
            {isComparisonMode && (
              <CityComparison
                cityAData={weatherData}
                converters={converters}
                onClose={() => setIsComparisonMode(false)}
              />
            )}

            {/* Grid 1: Ridgeline & Temperature Spiral */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RidgelinePlot
                records={weatherData.daily}
                converters={converters}
                cityName={selectedCity.name}
              />
              <TemperatureSpiral
                records={weatherData.daily}
                summary={weatherData.summary}
                converters={converters}
                cityName={selectedCity.name}
              />
            </div>

            {/* Grid 2: Warming Stripes */}
            <WarmingStripes
              summary={weatherData.summary}
              converters={converters}
              cityName={selectedCity.name}
            />

            {/* Grid 3: Precipitation Calendar & Wind Rose */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PrecipitationCalendar
                records={weatherData.daily}
                converters={converters}
                cityName={selectedCity.name}
              />
              <WindRose
                records={weatherData.daily}
                converters={converters}
                cityName={selectedCity.name}
              />
            </div>

            {/* Grid 4: Interactive Station Map & Climatology */}
            <WeatherMap
              currentCity={selectedCity}
              currentRecords={weatherData.daily}
              converters={converters}
              onSelectCity={handleSelectCity}
            />

            {/* Grid 5: Extreme Records Table & Decade Trends */}
            <RecordExtremesTable
              records={weatherData.daily}
              summary={weatherData.summary}
              converters={converters}
              cityName={selectedCity.name}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Weather Pattern Explorer</span>
            <span>•</span>
            <span>Powered by Open-Meteo Historical Archive API (ERA5 Reanalysis)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>WMO 30-Year Climatological Baselines</span>
            <span>•</span>
            <span>Gaussian KDE Density Estimation</span>
            <span>•</span>
            <span>D3 & Leaflet Visual Analytics</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
