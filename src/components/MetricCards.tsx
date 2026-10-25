import React from 'react';
import { Flame, Snowflake, TrendingUp, CloudRain, Wind, ShieldCheck } from 'lucide-react';
import { ClimateSummary, UnitConversion } from '../types/weather';

interface MetricCardsProps {
  summary: ClimateSummary;
  converters: UnitConversion;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary, converters }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Record High */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Record High</span>
          <Flame size={14} className="text-red-400" />
        </div>
        <div className="text-xl font-bold font-mono text-red-400">
          {converters.formatTemp(summary.recordHigh.temp, 1)}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          {summary.recordHigh.date}
        </div>
      </div>

      {/* Record Low */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Record Low</span>
          <Snowflake size={14} className="text-sky-400" />
        </div>
        <div className="text-xl font-bold font-mono text-sky-400">
          {converters.formatTemp(summary.recordLow.temp, 1)}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          {summary.recordLow.date}
        </div>
      </div>

      {/* Climatological Baseline */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Baseline Normal</span>
          <ShieldCheck size={14} className="text-cyan-400" />
        </div>
        <div className="text-xl font-bold font-mono text-cyan-300">
          {converters.formatTemp(summary.baselineMeanTemp, 1)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
          {summary.baselineYears[0]}–{summary.baselineYears[1]} Normal
        </div>
      </div>

      {/* Decadal Trend */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Warming Trend</span>
          <TrendingUp size={14} className="text-amber-400" />
        </div>
        <div className="text-xl font-bold font-mono text-amber-400">
          +{summary.decadalTrendRate.toFixed(2)}°
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          per decade (R² {summary.decadalTrendR2.toFixed(2)})
        </div>
      </div>

      {/* Wettest Day */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Wettest Day</span>
          <CloudRain size={14} className="text-blue-400" />
        </div>
        <div className="text-xl font-bold font-mono text-blue-300">
          {converters.formatPrecip(summary.wettestDay.precip, 0)}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          {summary.wettestDay.date}
        </div>
      </div>

      {/* Prevailing Wind */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-[10px]">Max Wind Gust</span>
          <Wind size={14} className="text-teal-400" />
        </div>
        <div className="text-xl font-bold font-mono text-teal-300">
          {converters.formatWind(summary.windiestDay.speed, 0)}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          {summary.windiestDay.date}
        </div>
      </div>
    </div>
  );
};
