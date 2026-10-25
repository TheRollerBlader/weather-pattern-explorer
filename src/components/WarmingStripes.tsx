import React, { useState, useMemo } from 'react';
import { TrendingUp, Award, Layers } from 'lucide-react';
import { ClimateAnomaly, ClimateSummary, UnitConversion } from '../types/weather';
import { getAnomalyColor, calculateDecadalTrend } from '../services/climateMath';

interface WarmingStripesProps {
  summary: ClimateSummary;
  converters: UnitConversion;
  cityName: string;
}

export const WarmingStripes: React.FC<WarmingStripesProps> = ({
  summary,
  converters,
  cityName
}) => {
  const [hoveredYear, setHoveredYear] = useState<ClimateAnomaly | null>(null);
  const [baselineMode, setBaselineMode] = useState<'wmo' | 'full'>('wmo');

  // Compute anomalies according to selected baseline
  const { anomalies, baselineTemp, trendRate, trendR2 } = useMemo(() => {
    const rawAnomalies = summary.annualAnomalies;
    if (rawAnomalies.length === 0) {
      return { anomalies: [], baselineTemp: 15, trendRate: 0, trendR2: 0 };
    }

    let baseTemp = summary.baselineMeanTemp;

    if (baselineMode === 'full') {
      baseTemp = rawAnomalies.reduce((sum, a) => sum + a.meanTemp, 0) / rawAnomalies.length;
    }

    const maxAbs = 2.2;
    const computed = rawAnomalies.map(a => {
      const anom = a.meanTemp - baseTemp;
      return {
        ...a,
        anomaly: anom,
        anomalyColor: getAnomalyColor(anom, maxAbs)
      };
    });

    const trend = calculateDecadalTrend(computed.map(c => ({ year: c.year, meanTemp: c.meanTemp })));

    return {
      anomalies: computed,
      baselineTemp: baseTemp,
      trendRate: trend.ratePerDecade,
      trendR2: trend.r2
    };
  }, [summary, baselineMode]);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            Climate Warming Stripes & Anomaly Trajectory
          </h3>
          <p className="text-xs text-slate-400">
            Ed Hawkins visualization of annual temperature anomalies relative to historical baseline for {cityName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Baseline selector */}
          <div className="flex items-center text-xs bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setBaselineMode('wmo')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                baselineMode === 'wmo'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              WMO Baseline ({summary.baselineYears[0]}–{summary.baselineYears[1]})
            </button>
            <button
              onClick={() => setBaselineMode('full')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                baselineMode === 'full'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Series Average
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Baseline Reference</div>
          <div className="text-base font-semibold text-slate-100 font-mono mt-0.5">
            {converters.formatTemp(baselineTemp, 1)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {baselineMode === 'wmo' ? `${summary.baselineYears[0]}–${summary.baselineYears[1]} Climatological Normal` : 'Full Record Mean'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={12} className="text-red-400" />
            <span>Decadal Rate</span>
          </div>
          <div className="text-base font-semibold font-mono mt-0.5 text-red-400">
            {trendRate >= 0 ? '+' : ''}{trendRate.toFixed(2)}°C / decade
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Linear OLS Trend (R² = {trendR2.toFixed(3)})
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Award size={12} className="text-amber-400" />
            <span>Hottest Year</span>
          </div>
          <div className="text-base font-semibold text-amber-300 font-mono mt-0.5">
            {summary.hottestYears[0]?.year ?? 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary.hottestYears[0]
              ? `${converters.formatTemp(summary.hottestYears[0].meanTemp, 1)} (+${summary.hottestYears[0].anomaly.toFixed(2)}°C)`
              : ''}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={12} className="text-cyan-400" />
            <span>Recorded Span</span>
          </div>
          <div className="text-base font-semibold text-cyan-300 font-mono mt-0.5">
            {anomalies.length} Years
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {anomalies[0]?.year} – {anomalies[anomalies.length - 1]?.year}
          </div>
        </div>
      </div>

      {/* Interactive Warming Stripes Canvas */}
      <div className="relative">
        <div className="h-32 w-full flex rounded-lg overflow-hidden shadow-inner border border-slate-700/80">
          {anomalies.map((item) => {
            const isHovered = hoveredYear?.year === item.year;
            return (
              <div
                key={item.year}
                style={{ backgroundColor: item.anomalyColor }}
                onMouseEnter={() => setHoveredYear(item)}
                onMouseLeave={() => setHoveredYear(null)}
                className={`flex-1 h-full cursor-pointer transition-transform duration-100 relative ${
                  isHovered ? 'scale-y-105 z-10 brightness-125 ring-2 ring-white' : 'hover:opacity-90'
                }`}
              />
            );
          })}
        </div>

        {/* Decade Markers along bottom */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-2 px-1">
          {anomalies.map((item, idx) => {
            if (item.year % 10 === 0 || idx === 0 || idx === anomalies.length - 1) {
              return (
                <div key={item.year} className="flex flex-col items-center">
                  <div className="w-0.5 h-1.5 bg-slate-600 mb-0.5"></div>
                  <span>{item.year}</span>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Active Hover Floating Card */}
        {hoveredYear && (
          <div className="mt-3 p-3 rounded-lg bg-slate-800/95 border border-cyan-500/40 shadow-xl flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-sm border border-white/20"
                style={{ backgroundColor: hoveredYear.anomalyColor }}
              />
              <div>
                <span className="font-bold text-slate-100 text-sm">{hoveredYear.year}</span>
                <span className="text-slate-400 ml-2">
                  Annual Mean: <strong className="text-white font-mono">{converters.formatTemp(hoveredYear.meanTemp, 2)}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                hoveredYear.anomaly >= 0 ? 'bg-red-950 text-red-300' : 'bg-blue-950 text-blue-300'
              }`}>
                {hoveredYear.anomaly >= 0 ? '+' : ''}{hoveredYear.anomaly.toFixed(2)}°C vs Baseline
              </span>
              <span className="text-slate-400 text-[11px]">
                Precip: {converters.formatPrecip(hoveredYear.precipitationTotal, 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Color Scale Legend */}
      <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-mono">-2.0°C</span>
          <div className="w-36 h-2.5 rounded bg-gradient-to-r from-[#08306b] via-[#f7f7f7] to-[#67000d]"></div>
          <span className="text-red-400 font-mono">+2.0°C</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Source: WMO / NOAA Divergent Thermal Scale
        </div>
      </div>
    </div>
  );
};
