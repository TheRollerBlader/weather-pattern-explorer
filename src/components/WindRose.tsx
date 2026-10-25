import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Wind, Compass, Gauge } from 'lucide-react';
import { DailyWeatherRecord, UnitConversion, WindRoseBin } from '../types/weather';
import { calculateWindRose } from '../services/climateMath';

interface WindRoseProps {
  records: DailyWeatherRecord[];
  converters: UnitConversion;
  cityName: string;
}

const SPEED_CLASSES = [
  { key: '0-5', label: '< 5 km/h', color: '#38bdf8' },
  { key: '5-10', label: '5 - 10 km/h', color: '#0ea5e9' },
  { key: '10-15', label: '10 - 15 km/h', color: '#0284c7' },
  { key: '15-20', label: '15 - 20 km/h', color: '#eab308' },
  { key: '20-30', label: '20 - 30 km/h', color: '#f97316' },
  { key: '30+', label: '> 30 km/h', color: '#ef4444' }
] as const;

export const WindRose: React.FC<WindRoseProps> = ({
  records,
  converters,
  cityName
}) => {
  const [hoveredBin, setHoveredBin] = useState<WindRoseBin | null>(null);

  const { bins, calmPercentage } = useMemo(() => {
    return calculateWindRose(records);
  }, [records]);

  // Find dominant direction
  const dominantBin = useMemo(() => {
    let max = bins[0];
    for (const b of bins) {
      if (b.percentage > max.percentage) max = b;
    }
    return max;
  }, [bins]);

  // Peak wind record
  const maxWindRecord = useMemo(() => {
    let maxW = 0;
    let rec: DailyWeatherRecord | null = null;
    for (const r of records) {
      if (r.windSpeedMax > maxW) {
        maxW = r.windSpeedMax;
        rec = r;
      }
    }
    return rec;
  }, [records]);

  // Polar chart dimensions
  const size = 460;
  const center = size / 2;
  const innerRadius = 38;
  const outerRadius = center - 40;

  // Maximum bin percentage for radial scale
  const maxPct = useMemo(() => {
    const highest = bins.reduce((m, b) => Math.max(m, b.percentage), 5);
    return Math.ceil(highest / 5) * 5; // round up to nearest 5%
  }, [bins]);

  // Radius scale
  const rScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, maxPct])
      .range([innerRadius, outerRadius]);
  }, [maxPct, innerRadius, outerRadius]);

  // Concentric circle ticks (e.g. 5%, 10%, 15%)
  const circleTicks = useMemo(() => {
    const list: number[] = [];
    const step = maxPct <= 10 ? 2 : maxPct <= 20 ? 5 : 10;
    for (let p = step; p <= maxPct; p += step) {
      list.push(p);
    }
    return list;
  }, [maxPct]);

  // Arc generator for 16 sectors
  const sectorAngle = (2 * Math.PI) / 16;
  const halfAngle = sectorAngle / 2;

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              Wind Rose Direction & Speed Distribution
            </h3>
            <p className="text-xs text-slate-400">
              16-sector polar climatology of prevailing winds and velocity tiers for {cityName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-sky-400 border border-slate-700 flex items-center gap-1.5">
              <Compass size={13} />
              Prevailing: <strong>{dominantBin.directionLabel} ({dominantBin.percentage.toFixed(1)}%)</strong>
            </span>
          </div>
        </div>

        {/* Polar SVG Canvas */}
        <div className="relative flex justify-center items-center py-1">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[420px] h-auto select-none overflow-visible"
          >
            <g transform={`translate(${center}, ${center})`}>
              {/* Concentric rings */}
              {circleTicks.map(pct => {
                const r = rScale(pct);
                return (
                  <g key={`ring-${pct}`}>
                    <circle
                      r={r}
                      fill="none"
                      stroke="#334155"
                      strokeWidth="0.75"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={3}
                      y={-r + 10}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* 16 Radial lines for directions */}
              {bins.map((bin) => {
                const angleRad = ((bin.angle - 90) * Math.PI) / 180;
                const x2 = Math.cos(angleRad) * (outerRadius + 8);
                const y2 = Math.sin(angleRad) * (outerRadius + 8);
                const xLabel = Math.cos(angleRad) * (outerRadius + 22);
                const yLabel = Math.sin(angleRad) * (outerRadius + 22);

                const isCardinal = ['N', 'E', 'S', 'W'].includes(bin.directionLabel);

                return (
                  <g key={`dir-${bin.directionLabel}`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={x2}
                      y2={y2}
                      stroke="#1e293b"
                      strokeWidth="0.75"
                    />
                    <text
                      x={xLabel}
                      y={yLabel + 3.5}
                      textAnchor="middle"
                      fill={isCardinal ? '#38bdf8' : '#64748b'}
                      fontSize={isCardinal ? '11' : '8.5'}
                      fontWeight={isCardinal ? '700' : '500'}
                      fontFamily="monospace"
                    >
                      {bin.directionLabel}
                    </text>
                  </g>
                );
              })}

              {/* Stacked Bars for each of the 16 sectors */}
              {bins.map((bin) => {
                // Angle in radians centered on bin.angle
                // SVG 0 is right (East), so rotate -90 deg for North at top
                const midAngle = ((bin.angle - 90) * Math.PI) / 180;
                const startAngle = midAngle - halfAngle * 0.88;
                const endAngle = midAngle + halfAngle * 0.88;

                const isHovered = hoveredBin?.directionLabel === bin.directionLabel;

                // Total count in this bin
                const totalInBin = bin.totalCount;
                if (totalInBin === 0) return null;

                // Stack from innerRadius upwards
                let currentRadius = innerRadius;

                return (
                  <g
                    key={`stacked-${bin.directionLabel}`}
                    className="cursor-pointer transition-opacity duration-200"
                    opacity={isHovered ? 1.0 : hoveredBin ? 0.45 : 0.9}
                    onMouseEnter={() => setHoveredBin(bin)}
                    onMouseLeave={() => setHoveredBin(null)}
                  >
                    {SPEED_CLASSES.map(cls => {
                      const count = bin.speedCounts[cls.key];
                      if (count === 0) return null;

                      // fraction of total valid records
                      const fraction = count / (records.length || 1);
                      const barThickness = rScale(fraction * 100) - innerRadius;
                      const segmentInner = currentRadius;
                      const segmentOuter = currentRadius + barThickness;
                      currentRadius = segmentOuter;

                      const arcGen = d3.arc()
                        .innerRadius(segmentInner)
                        .outerRadius(segmentOuter)
                        .startAngle(startAngle + Math.PI / 2) // d3.arc has 0 at 12 o'clock
                        .endAngle(endAngle + Math.PI / 2);

                      return (
                        <path
                          key={cls.key}
                          d={arcGen(null as any) || ''}
                          fill={cls.color}
                          stroke="#0f172a"
                          strokeWidth="0.5"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Center Calm Circle */}
              <circle
                r={innerRadius - 4}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <text
                textAnchor="middle"
                y={-4}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                CALM
              </text>
              <text
                textAnchor="middle"
                y={10}
                fill="#38bdf8"
                fontSize="11"
                fontWeight="700"
                fontFamily="monospace"
              >
                {calmPercentage.toFixed(1)}%
              </text>
            </g>
          </svg>
        </div>

        {/* Hover detail box */}
        {hoveredBin && (
          <div className="mt-2 p-2.5 rounded-lg bg-slate-800/95 border border-sky-500/40 text-xs flex items-center justify-between animate-fadeIn">
            <div>
              <span className="font-bold text-sky-300 font-mono text-sm mr-2">{hoveredBin.directionLabel}</span>
              <span className="text-slate-300">({hoveredBin.angle}° az)</span>
              <span className="text-slate-400 ml-2">Freq: <strong className="text-white font-mono">{hoveredBin.percentage.toFixed(1)}%</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-orange-400">&gt;20km/h: {hoveredBin.speedCounts['20-30'] + hoveredBin.speedCounts['30+']}</span>
              <span className="text-sky-300">&lt;15km/h: {hoveredBin.speedCounts['0-5'] + hoveredBin.speedCounts['5-10'] + hoveredBin.speedCounts['10-15']}</span>
            </div>
          </div>
        )}
      </div>

      {/* Speed Class Legend & Records */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Speed Tiers:</span>
          <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
            {SPEED_CLASSES.map(cls => (
              <span key={cls.key} className="flex items-center gap-1 font-mono">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cls.color }}></span>
                {cls.label}
              </span>
            ))}
          </div>
        </div>

        {maxWindRecord && (
          <div className="flex items-center justify-between text-[11px] bg-slate-800/40 px-3 py-1.5 rounded-md border border-slate-700/40 text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Gauge size={13} className="text-red-400" />
              Peak Gust Recorded:
            </span>
            <span className="font-mono text-white font-medium">
              {converters.formatWind(maxWindRecord.windSpeedMax, 1)} on {maxWindRecord.date} ({maxWindRecord.windDirectionDominant}°)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
