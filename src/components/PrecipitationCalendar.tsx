import React, { useState, useMemo } from 'react';
import { CloudRain, Droplets, Sun, Calendar } from 'lucide-react';
import { DailyWeatherRecord, UnitConversion } from '../types/weather';

interface PrecipitationCalendarProps {
  records: DailyWeatherRecord[];
  converters: UnitConversion;
  cityName: string;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PrecipitationCalendar: React.FC<PrecipitationCalendarProps> = ({
  records,
  converters,
  cityName
}) => {
  // Get available years
  const years = useMemo(() => {
    const set = new Set<number>();
    records.forEach(r => set.add(r.year));
    return Array.from(set).sort((a, b) => b - a); // Descending order
  }, [records]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0] || 2023);
  const [hoveredDay, setHoveredDay] = useState<DailyWeatherRecord | null>(null);

  // Filter records for selected year
  const yearRecords = useMemo(() => {
    return records.filter(r => r.year === selectedYear);
  }, [records, selectedYear]);

  // Map by date string YYYY-MM-DD
  const dateMap = useMemo(() => {
    const map = new Map<string, DailyWeatherRecord>();
    yearRecords.forEach(r => map.set(r.date, r));
    return map;
  }, [yearRecords]);

  // Statistics for the selected year
  const stats = useMemo(() => {
    if (yearRecords.length === 0) {
      return { totalPrecip: 0, rainyDays: 0, maxPrecipDay: null, maxDryStreak: 0 };
    }

    let total = 0;
    let rainy = 0;
    let maxDay: DailyWeatherRecord | null = null;
    let currentDry = 0;
    let maxDry = 0;

    for (const r of yearRecords) {
      total += r.precipitation;
      if (r.precipitation >= 0.1) {
        rainy++;
        if (currentDry > maxDry) maxDry = currentDry;
        currentDry = 0;
      } else {
        currentDry++;
      }

      if (!maxDay || r.precipitation > maxDay.precipitation) {
        maxDay = r;
      }
    }
    if (currentDry > maxDry) maxDry = currentDry;

    return {
      totalPrecip: total,
      rainyDays: rainy,
      maxPrecipDay: maxDay,
      maxDryStreak: maxDry
    };
  }, [yearRecords]);

  // Construct 53-week grid for the selected year
  const { weeks, monthHeaders } = useMemo(() => {
    const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0;
    const daysInYear = isLeap ? 366 : 365;

    // First day of the year
    const jan1 = new Date(Date.UTC(selectedYear, 0, 1));
    // getDay() gives 0 for Sunday, 1 for Monday... adjust to 0=Monday, 6=Sunday
    let startDayOfWeek = (jan1.getUTCDay() + 6) % 7;

    const weekCols: ({ dateStr: string; record: DailyWeatherRecord | null } | null)[][] = [];
    let currentWeek: ({ dateStr: string; record: DailyWeatherRecord | null } | null)[] = [];

    // Pad first week before Jan 1
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    const monthPositions: { month: string; colIndex: number }[] = [];
    let lastMonth = -1;

    for (let doy = 1; doy <= daysInYear; doy++) {
      const d = new Date(Date.UTC(selectedYear, 0, doy));
      const m = d.getUTCMonth();
      const day = d.getUTCDate();
      const dateStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rec = dateMap.get(dateStr) || null;

      if (m !== lastMonth) {
        monthPositions.push({ month: MONTHS[m], colIndex: weekCols.length });
        lastMonth = m;
      }

      currentWeek.push({ dateStr, record: rec });

      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weekCols.push(currentWeek);
    }

    return { weeks: weekCols, monthHeaders: monthPositions };
  }, [selectedYear, dateMap]);

  // Color generator for rainfall amount
  const getPrecipColor = (precip: number | undefined) => {
    if (precip === undefined || precip === null) return '#1e293b'; // slate-800
    if (precip === 0) return '#0f172a'; // slate-900 (dry)
    if (precip < 1.0) return '#0e7490'; // cyan-700
    if (precip < 5.0) return '#06b6d4'; // cyan-500
    if (precip < 15.0) return '#38bdf8'; // sky-400
    if (precip < 30.0) return '#60a5fa'; // blue-400
    return '#c084fc'; // purple-400 (extreme downpour)
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Daily Precipitation Calendar Heatmap
          </h3>
          <p className="text-xs text-slate-400">
            Day-by-day precipitation intensity matrix and drought-spell analysis for {cityName}
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-mono font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CloudRain size={12} className="text-cyan-400" />
            <span>Annual Total</span>
          </div>
          <div className="text-base font-semibold text-cyan-300 font-mono mt-0.5">
            {converters.formatPrecip(stats.totalPrecip, 1)}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Droplets size={12} className="text-sky-400" />
            <span>Precipitation Days</span>
          </div>
          <div className="text-base font-semibold text-sky-300 font-mono mt-0.5">
            {stats.rainyDays} <span className="text-xs font-normal text-slate-400">days ({((stats.rainyDays / 365) * 100).toFixed(0)}%)</span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CloudRain size={12} className="text-purple-400" />
            <span>Wettest Day</span>
          </div>
          <div className="text-base font-semibold text-purple-300 font-mono mt-0.5">
            {stats.maxPrecipDay ? converters.formatPrecip(stats.maxPrecipDay.precipitation, 1) : '0 mm'}
          </div>
          <div className="text-[10px] text-slate-500">{stats.maxPrecipDay?.date}</div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sun size={12} className="text-amber-400" />
            <span>Longest Dry Spell</span>
          </div>
          <div className="text-base font-semibold text-amber-300 font-mono mt-0.5">
            {stats.maxDryStreak} <span className="text-xs font-normal text-slate-400">consecutive days</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          {/* Month Header row */}
          <div className="flex text-[10px] font-mono text-slate-400 mb-1 pl-8 relative h-4">
            {monthHeaders.map(mh => (
              <div
                key={mh.month}
                style={{ left: `${mh.colIndex * 13.5 + 32}px` }}
                className="absolute text-slate-400 font-medium"
              >
                {mh.month}
              </div>
            ))}
          </div>

          {/* Grid with Day of Week labels on left */}
          <div className="flex gap-1.5">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] text-[9px] font-mono text-slate-500 pt-[1px] w-6 text-right select-none">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} className="h-3 flex items-center justify-end">
                  {i % 2 === 0 ? d : ''}
                </div>
              ))}
            </div>

            {/* Matrix of days */}
            <div className="flex gap-[3px]">
              {weeks.map((col, colIdx) => (
                <div key={`col-${colIdx}`} className="flex flex-col gap-[3px]">
                  {col.map((cell, rowIdx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${rowIdx}`}
                          className="w-3 h-3 rounded-[2px] bg-transparent"
                        />
                      );
                    }

                    const precip = cell.record ? cell.record.precipitation : 0;
                    const color = getPrecipColor(precip);
                    const isHovered = hoveredDay?.date === cell.dateStr;

                    return (
                      <div
                        key={cell.dateStr}
                        style={{ backgroundColor: color }}
                        onMouseEnter={() => setHoveredDay(cell.record)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3 h-3 rounded-[2px] cursor-pointer transition-all ${
                          isHovered
                            ? 'ring-2 ring-white scale-125 z-10'
                            : 'hover:brightness-125 border border-slate-900/60'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover info banner */}
        {hoveredDay && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-800/95 border border-cyan-500/40 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{hoveredDay.date}</span>
              <span className="text-slate-400">({DAYS_OF_WEEK[(new Date(hoveredDay.date).getUTCDay() + 6) % 7]})</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-cyan-300 font-bold">
                Precipitation: {converters.formatPrecip(hoveredDay.precipitation, 1)}
              </span>
              <span className="text-slate-300">
                Temp: {converters.formatTemp(hoveredDay.tempMean, 1)} ({converters.formatTemp(hoveredDay.tempMin, 0)} / {converters.formatTemp(hoveredDay.tempMax, 0)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Dry</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0f172a] border border-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0e7490]"></div>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#06b6d4]"></div>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#38bdf8]"></div>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#60a5fa]"></div>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#c084fc]"></div>
          <span className="text-purple-400 text-[11px]">&gt;30 mm (Extreme)</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Thresholds: &lt;1mm, 1-5mm, 5-15mm, 15-30mm, 30mm+
        </div>
      </div>
    </div>
  );
};
