import React from 'react';
import { CloudSun, ArrowLeftRight, Download, Code2 } from 'lucide-react';
import { UnitSystem } from '../types/weather';

interface HeaderProps {
  unitSystem: UnitSystem;
  onToggleUnit: () => void;
  isComparisonMode: boolean;
  onToggleComparison: () => void;
  onExportData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unitSystem,
  onToggleUnit,
  isComparisonMode,
  onToggleComparison,
  onExportData
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <CloudSun size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Weather Pattern Explorer
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                Open-Meteo Archive
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Historical Climatological Analytics & Decadal Warming Visualization
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Unit Toggle */}
          <button
            onClick={onToggleUnit}
            className="flex items-center text-xs font-mono font-semibold rounded-lg bg-slate-900 border border-slate-700 p-0.5"
            title="Toggle Metric (°C, mm) / Imperial (°F, in)"
          >
            <span
              className={`px-2.5 py-1 rounded-md transition-all ${
                unitSystem === 'metric' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              °C / mm
            </span>
            <span
              className={`px-2.5 py-1 rounded-md transition-all ${
                unitSystem === 'imperial' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              °F / in
            </span>
          </button>

          {/* Comparison Mode Toggle */}
          <button
            onClick={onToggleComparison}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
              isComparisonMode
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <ArrowLeftRight size={14} />
            <span className="hidden sm:inline">Compare</span>
          </button>

          {/* Export Data */}
          <button
            onClick={onExportData}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
            title="Export Cleaned Meteorological Dataset as CSV"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* GitHub link */}
          <a
            href="https://github.com/weather-pattern-explorer"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="GitHub Repository"
          >
            <Code2 size={16} />
          </a>
        </div>
      </div>
    </header>
  );
};
