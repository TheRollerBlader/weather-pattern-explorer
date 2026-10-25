import React, { useMemo } from 'react';
import { Flame, Snowflake, Trophy, TrendingUp, Calendar, Zap } from 'lucide-react';
import { DailyWeatherRecord, ClimateSummary, UnitConversion } from '../types/weather';

interface RecordExtremesTableProps {
  records: DailyWeatherRecord[];
  summary: ClimateSummary;
  converters: UnitConversion;
  cityName: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export const RecordExtremesTable: React.FC<RecordExtremesTableProps> = ({
  records,
  summary,
  converters,
  cityName
}) => {
  // Compute monthly records
  const monthlyRecords = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const monthRecs = records.filter(r => r.month === idx);

      let recordHigh = { temp: -999, date: '' };
      let recordLow = { temp: 999, date: '' };
      let maxRain = { precip: 0, date: '' };
      let meanSum = 0;

      for (const r of monthRecs) {
        if (r.tempMax > recordHigh.temp) recordHigh = { temp: r.tempMax, date: r.date };
        if (r.tempMin < recordLow.temp) recordLow = { temp: r.tempMin, date: r.date };
        if (r.precipitation > maxRain.precip) maxRain = { precip: r.precipitation, date: r.date };
        meanSum += r.tempMean;
      }

      const mean = monthRecs.length > 0 ? meanSum / monthRecs.length : 0;

      return {
        month: name,
        mean,
        recordHigh,
        recordLow,
        maxRain
      };
    });
  }, [records]);

  // Compute decadal grouping
  const decadalGroups = useMemo(() => {
    const map = new Map<number, { temps: number[]; precips: number[] }>();

    for (const a of summary.annualAnomalies) {
      const decade = Math.floor(a.year / 10) * 10;
      if (!map.has(decade)) {
        map.set(decade, { temps: [], precips: [] });
      }
      const entry = map.get(decade)!;
      entry.temps.push(a.meanTemp);
      entry.precips.push(a.precipitationTotal);
    }

    const result: { decade: number; meanTemp: number; meanPrecip: number; anomaly: number }[] = [];
    const decades = Array.from(map.keys()).sort((a, b) => a - b);

    for (const d of decades) {
      const data = map.get(d)!;
      const meanTemp = data.temps.reduce((s, v) => s + v, 0) / data.temps.length;
      const meanPrecip = data.precips.reduce((s, v) => s + v, 0) / data.precips.length;
      result.push({
        decade: d,
        meanTemp,
        meanPrecip,
        anomaly: meanTemp - summary.baselineMeanTemp
      });
    }

    return result;
  }, [summary]);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Trophy className="text-amber-400" size={18} />
            Meteorological Extremes & Decadal Trends
          </h3>
          <p className="text-xs text-slate-400">
            All-time records, monthly extremes, and decade-by-decade climatological shifts for {cityName}
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700/60">
          Decadal Trend: <span className="text-red-400 font-semibold">+{summary.decadalTrendRate.toFixed(2)}°C / decade</span>
        </div>
      </div>

      {/* Top 5 Hottest & Coldest Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hottest Years */}
        <div className="bg-slate-800/40 rounded-xl p-4 border border-red-900/30">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
            <Flame size={14} />
            Top 5 Warmest Years on Record
          </h4>
          <div className="space-y-2">
            {summary.hottestYears.map((item, idx) => (
              <div
                key={item.year}
                className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/50 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-950 text-red-300 font-mono text-[10px] flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-white">{item.year}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300">{converters.formatTemp(item.meanTemp, 2)}</span>
                  <span className="text-red-400 font-bold bg-red-950/80 px-1.5 py-0.5 rounded text-[11px]">
                    +{item.anomaly.toFixed(2)}°C
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coldest Years */}
        <div className="bg-slate-800/40 rounded-xl p-4 border border-sky-900/30">
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-1.5">
            <Snowflake size={14} />
            Top 5 Coldest Years on Record
          </h4>
          <div className="space-y-2">
            {summary.coldestYears.map((item, idx) => (
              <div
                key={item.year}
                className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/50 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-300 font-mono text-[10px] flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-white">{item.year}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300">{converters.formatTemp(item.meanTemp, 2)}</span>
                  <span className="text-sky-400 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded text-[11px]">
                    {item.anomaly.toFixed(2)}°C
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decadal Shift Summary */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-cyan-400" />
          Decadal Climate Means & Shift from Baseline
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {decadalGroups.map(d => (
            <div key={d.decade} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-xs font-mono text-slate-400 block">{d.decade}s</span>
              <div className="text-base font-bold font-mono text-white mt-1">
                {converters.formatTemp(d.meanTemp, 2)}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                <span className={d.anomaly >= 0 ? 'text-red-400' : 'text-blue-400'}>
                  {d.anomaly >= 0 ? '+' : ''}{d.anomaly.toFixed(2)}°C
                </span>
                <span className="text-slate-500">
                  {converters.formatPrecip(d.meanPrecip, 0)}/yr
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Records Table */}
      <div className="overflow-x-auto">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <Calendar size={14} className="text-cyan-400" />
          Monthly Record Highs, Lows, and Peak Rainfall
        </h4>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-700/80 text-slate-400 font-mono">
              <th className="py-2.5 px-3">Month</th>
              <th className="py-2.5 px-3">Climatological Mean</th>
              <th className="py-2.5 px-3 text-red-400">Record High Max</th>
              <th className="py-2.5 px-3 text-sky-400">Record Low Min</th>
              <th className="py-2.5 px-3 text-cyan-400">Peak Single-Day Rain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {monthlyRecords.map(row => (
              <tr key={row.month} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 font-semibold text-slate-200">{row.month}</td>
                <td className="py-2 px-3 text-slate-400">{converters.formatTemp(row.mean, 1)}</td>
                <td className="py-2 px-3">
                  <span className="text-red-300 font-bold">{converters.formatTemp(row.recordHigh.temp, 1)}</span>
                  <span className="text-slate-500 text-[10px] ml-2">({row.recordHigh.date})</span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-sky-300 font-bold">{converters.formatTemp(row.recordLow.temp, 1)}</span>
                  <span className="text-slate-500 text-[10px] ml-2">({row.recordLow.date})</span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-cyan-300 font-bold">{converters.formatPrecip(row.maxRain.precip, 1)}</span>
                  <span className="text-slate-500 text-[10px] ml-2">({row.maxRain.date})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
