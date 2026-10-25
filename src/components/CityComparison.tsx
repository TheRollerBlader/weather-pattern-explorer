import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, TrendingUp, CloudRain, Flame, Snowflake } from 'lucide-react';
import { CityLocation, HistoricalWeatherData, UnitConversion } from '../types/weather';
import { SAMPLE_CITIES } from '../data/sampleCities';
import { fetchHistoricalWeatherData } from '../services/openMeteoApi';

interface CityComparisonProps {
  cityAData: HistoricalWeatherData;
  converters: UnitConversion;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CityComparison: React.FC<CityComparisonProps> = ({
  cityAData,
  converters,
  onClose
}) => {
  // Default City B to a different sample city
  const defaultCityB = SAMPLE_CITIES.find(c => c.name !== cityAData.city.name) || SAMPLE_CITIES[1];
  const [selectedCityB, setSelectedCityB] = useState<CityLocation>(defaultCityB);
  const [cityBData, setCityBData] = useState<HistoricalWeatherData | null>(null);
  const [loadingB, setLoadingB] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    setLoadingB(true);

    fetchHistoricalWeatherData(selectedCityB, 1990, 2023)
      .then(res => {
        if (!isCancelled) {
          setCityBData(res);
          setLoadingB(false);
        }
      })
      .catch(err => {
        console.error('Failed to load City B comparison data:', err);
        setLoadingB(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCityB]);

  // Compute monthly means for both cities
  const monthlyComparison = useMemo(() => {
    if (!cityBData) return [];

    return MONTHS.map((monthName, idx) => {
      const recsA = cityAData.daily.filter(r => r.month === idx);
      const recsB = cityBData.daily.filter(r => r.month === idx);

      const meanA = recsA.length > 0 ? recsA.reduce((s, r) => s + r.tempMean, 0) / recsA.length : 0;
      const meanB = recsB.length > 0 ? recsB.reduce((s, r) => s + r.tempMean, 0) / recsB.length : 0;

      const precipA = recsA.length > 0 ? recsA.reduce((s, r) => s + r.precipitation, 0) / (cityAData.summary.annualAnomalies.length || 1) : 0;
      const precipB = recsB.length > 0 ? recsB.reduce((s, r) => s + r.precipitation, 0) / (cityBData.summary.annualAnomalies.length || 1) : 0;

      return {
        month: monthName,
        meanA,
        meanB,
        deltaTemp: meanA - meanB,
        precipA,
        precipB
      };
    });
  }, [cityAData, cityBData]);

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-cyan-500/30 rounded-xl p-5 shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="text-cyan-400" size={20} />
            Side-by-Side City Climate Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Comparative meteorological and climate trajectory analysis between two stations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Compare with:</span>
            <select
              value={selectedCityB.id}
              onChange={(e) => {
                const found = SAMPLE_CITIES.find(c => String(c.id) === e.target.value);
                if (found) setSelectedCityB(found);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {SAMPLE_CITIES.filter(c => c.name !== cityAData.city.name).map(c => (
                <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>

      {loadingB || !cityBData ? (
        <div className="py-16 text-center text-slate-400 font-mono text-sm animate-pulse">
          Loading comparison data for {selectedCityB.name}...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Comparative KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City A Card */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-cyan-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Station A</span>
                <span className="text-xs font-mono text-slate-400">{cityAData.city.country}</span>
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">{cityAData.city.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Mean Baseline</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {converters.formatTemp(cityAData.summary.baselineMeanTemp, 1)}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Warming Rate</span>
                  <span className="font-mono font-bold text-red-400">
                    +{cityAData.summary.decadalTrendRate.toFixed(2)}°C/dec
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Mean Precip</span>
                  <span className="font-mono font-bold text-sky-300">
                    {converters.formatPrecip(cityAData.summary.baselineMeanPrecip, 0)}/yr
                  </span>
                </div>
              </div>
            </div>

            {/* City B Card */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Station B</span>
                <span className="text-xs font-mono text-slate-400">{cityBData.city.country}</span>
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">{cityBData.city.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Mean Baseline</span>
                  <span className="font-mono font-bold text-amber-300">
                    {converters.formatTemp(cityBData.summary.baselineMeanTemp, 1)}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Warming Rate</span>
                  <span className="font-mono font-bold text-red-400">
                    +{cityBData.summary.decadalTrendRate.toFixed(2)}°C/dec
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-400 text-[10px] block">Mean Precip</span>
                  <span className="font-mono font-bold text-sky-300">
                    {converters.formatPrecip(cityBData.summary.baselineMeanPrecip, 0)}/yr
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Climatology Comparison Table / Chart */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800">
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" />
              Annual Thermal & Hydrological Profiles
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-700/80 text-slate-400 font-mono">
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3 text-cyan-400">{cityAData.city.name} Temp</th>
                    <th className="py-2 px-3 text-amber-400">{cityBData.city.name} Temp</th>
                    <th className="py-2 px-3">Thermal Delta (A - B)</th>
                    <th className="py-2 px-3 text-cyan-400">{cityAData.city.name} Precip</th>
                    <th className="py-2 px-3 text-amber-400">{cityBData.city.name} Precip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {monthlyComparison.map(row => (
                    <tr key={row.month} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-300">{row.month}</td>
                      <td className="py-2 px-3 text-cyan-300">{converters.formatTemp(row.meanA, 1)}</td>
                      <td className="py-2 px-3 text-amber-300">{converters.formatTemp(row.meanB, 1)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          row.deltaTemp > 0 ? 'bg-red-950/80 text-red-400' : 'bg-blue-950/80 text-blue-400'
                        }`}>
                          {row.deltaTemp > 0 ? '+' : ''}{row.deltaTemp.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{converters.formatPrecip(row.precipA, 1)}</td>
                      <td className="py-2 px-3 text-slate-300">{converters.formatPrecip(row.precipB, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Extremes Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-red-400 font-semibold mb-2">
                <Flame size={14} />
                <span>All-Time High</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityAData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatTemp(cityAData.summary.recordHigh.temp, 1)} ({cityAData.summary.recordHigh.date})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityBData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatTemp(cityBData.summary.recordHigh.temp, 1)} ({cityBData.summary.recordHigh.date})</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-2">
                <Snowflake size={14} />
                <span>All-Time Low</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityAData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatTemp(cityAData.summary.recordLow.temp, 1)} ({cityAData.summary.recordLow.date})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityBData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatTemp(cityBData.summary.recordLow.temp, 1)} ({cityBData.summary.recordLow.date})</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-2">
                <CloudRain size={14} />
                <span>Single-Day Rain Record</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityAData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatPrecip(cityAData.summary.wettestDay.precip, 1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{cityBData.city.name}:</span>
                  <span className="text-white font-bold">{converters.formatPrecip(cityBData.summary.wettestDay.precip, 1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
