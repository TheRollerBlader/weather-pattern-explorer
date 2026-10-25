import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Play, Pause, RotateCcw, FastForward, Info } from 'lucide-react';
import { DailyWeatherRecord, UnitConversion, ClimateSummary } from '../types/weather';

interface TemperatureSpiralProps {
  records: DailyWeatherRecord[];
  summary: ClimateSummary;
  converters: UnitConversion;
  cityName: string;
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const TemperatureSpiral: React.FC<TemperatureSpiralProps> = ({
  records,
  summary,
  converters,
  cityName
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentYearIndex, setCurrentYearIndex] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Group records by year
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    records.forEach(r => yearSet.add(r.year));
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [records]);

  // Set default currentYearIndex to the end when years load
  useEffect(() => {
    if (years.length > 0) {
      setCurrentYearIndex(years.length - 1);
    }
  }, [years]);

  const yearlyRecords = useMemo(() => {
    const map = new Map<number, DailyWeatherRecord[]>();
    for (const yr of years) {
      map.set(yr, []);
    }
    for (const r of records) {
      const list = map.get(r.year);
      if (list) list.push(r);
    }
    return map;
  }, [records, years]);

  // Global min and max temperature for radial scaling
  const { minT, maxT } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const r of records) {
      if (r.tempMean < min) min = r.tempMean;
      if (r.tempMean > max) max = r.tempMean;
    }
    return {
      minT: Math.min(-5, Math.floor(min - 2)),
      maxT: Math.max(35, Math.ceil(max + 2))
    };
  }, [records]);

  // Dimensions
  const size = 520;
  const center = size / 2;
  const innerRadius = 45;
  const outerRadius = center - 45;

  // Scales
  const rScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([minT, maxT])
      .range([innerRadius, outerRadius]);
  }, [minT, maxT, innerRadius, outerRadius]);

  const angleScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([1, 366])
      .range([0, 2 * Math.PI]);
  }, []);

  // Color scale by year or temperature
  const yearColorScale = useMemo(() => {
    return d3.scaleSequential()
      .domain([years[0] || 1990, years[years.length - 1] || 2023])
      .interpolator(d3.interpolateTurbo);
  }, [years]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const intervalMs = 120 / speed;

    const loop = (timestamp: number) => {
      if (timestamp - lastTickRef.current >= intervalMs) {
        lastTickRef.current = timestamp;
        setCurrentYearIndex(prev => {
          if (prev >= years.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, speed, years.length]);

  // Reference rings
  const referenceTemps = useMemo(() => {
    const list: number[] = [];
    const step = (maxT - minT) > 40 ? 10 : 5;
    const start = Math.ceil(minT / step) * step;
    for (let t = start; t <= maxT; t += step) {
      list.push(t);
    }
    return list;
  }, [minT, maxT]);

  // Active year details
  const activeYear = years[currentYearIndex] || years[years.length - 1];
  const activeYearRecords = yearlyRecords.get(activeYear) || [];
  const activeYearMean = activeYearRecords.length > 0
    ? activeYearRecords.reduce((s, r) => s + r.tempMean, 0) / activeYearRecords.length
    : 0;
  const activeYearAnomaly = summary.annualAnomalies.find(a => a.year === activeYear)?.anomaly ?? 0;

  // Build radial spiral paths for visible years
  const lineRadial = useMemo(() => {
    return d3.lineRadial<DailyWeatherRecord>()
      .angle(d => angleScale(d.dayOfYear))
      .radius(d => rScale(d.tempMean))
      .curve(d3.curveCatmullRom.alpha(0.5));
  }, [angleScale, rScale]);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Climate Temperature Spiral
            </h3>
            <p className="text-xs text-slate-400">
              Polar spiral representing annual seasonality and progressive decadal warming for {cityName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              Year: <strong className="text-cyan-400 text-sm">{activeYear}</strong>
            </span>
            <span className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
              activeYearAnomaly >= 0
                ? 'bg-red-950/60 text-red-400 border-red-800/60'
                : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
            }`}>
              {activeYearAnomaly >= 0 ? '+' : ''}{activeYearAnomaly.toFixed(2)}°C anomaly
            </span>
          </div>
        </div>

        {/* Spiral Visualization Canvas / SVG */}
        <div className="relative flex justify-center items-center py-2">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[460px] h-auto select-none overflow-visible"
          >
            <defs>
              <radialGradient id="spiral-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#0f172a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={size} height={size} fill="transparent" />

            <g transform={`translate(${center}, ${center})`}>
              {/* Radial month dividers and labels */}
              {MONTH_LABELS.map((month, idx) => {
                const angle = (idx / 12) * 2 * Math.PI - Math.PI / 2;
                const xInner = Math.cos(angle) * (innerRadius - 8);
                const yInner = Math.sin(angle) * (innerRadius - 8);
                const xOuter = Math.cos(angle) * (outerRadius + 8);
                const yOuter = Math.sin(angle) * (outerRadius + 8);
                const xLabel = Math.cos(angle) * (outerRadius + 22);
                const yLabel = Math.sin(angle) * (outerRadius + 22);

                return (
                  <g key={month}>
                    <line
                      x1={xInner}
                      y1={yInner}
                      x2={xOuter}
                      y2={yOuter}
                      stroke="#334155"
                      strokeWidth="0.75"
                      strokeDasharray="2 4"
                      opacity="0.5"
                    />
                    <text
                      x={xLabel}
                      y={yLabel + 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {month}
                    </text>
                  </g>
                );
              })}

              {/* Concentric temperature reference rings */}
              {referenceTemps.map(tempVal => {
                const r = rScale(tempVal);
                const isZero = tempVal === 0;
                return (
                  <g key={`ring-${tempVal}`}>
                    <circle
                      r={r}
                      fill="none"
                      stroke={isZero ? '#38bdf8' : '#334155'}
                      strokeWidth={isZero ? 1.5 : 0.75}
                      strokeDasharray={isZero ? '4 3' : '2 3'}
                      opacity={isZero ? 0.7 : 0.4}
                    />
                    <text
                      x={4}
                      y={-r - 3}
                      fill={isZero ? '#38bdf8' : '#64748b'}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {converters.formatTemp(tempVal, 0)}
                    </text>
                  </g>
                );
              })}

              {/* Historical Spiral Lines up to currentYearIndex */}
              {years.slice(0, currentYearIndex + 1).map((yr, idx) => {
                const recs = yearlyRecords.get(yr) || [];
                if (recs.length === 0) return null;
                const isCurrent = idx === currentYearIndex;
                const strokeColor = yearColorScale(yr);
                const pathData = lineRadial(recs);
                if (!pathData) return null;

                return (
                  <path
                    key={`spiral-${yr}`}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isCurrent ? 2.5 : 1.1}
                    opacity={isCurrent ? 1.0 : 0.22 + (idx / years.length) * 0.4}
                    strokeLinecap="round"
                    className="transition-opacity duration-300"
                  />
                );
              })}

              {/* Center Year Badge */}
              <circle r={innerRadius - 12} fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text
                textAnchor="middle"
                y={-6}
                fill="#f8fafc"
                fontSize="14"
                fontWeight="700"
                fontFamily="monospace"
              >
                {activeYear}
              </text>
              <text
                textAnchor="middle"
                y={10}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
              >
                {converters.formatTemp(activeYearMean, 1)}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg shadow-cyan-900/30"
            title={isPlaying ? 'Pause' : 'Play animation'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentYearIndex(0);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw size={14} />
          </button>

          {/* Scrubber slider */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">{years[0]}</span>
            <input
              type="range"
              min={0}
              max={years.length - 1}
              value={currentYearIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentYearIndex(parseInt(e.target.value, 10));
              }}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-500">{years[years.length - 1]}</span>
          </div>

          {/* Speed selector */}
          <button
            onClick={() => {
              setSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80"
            title="Toggle playback speed"
          >
            <FastForward size={12} />
            <span>{speed}x</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info size={12} className="text-cyan-400" />
            <span>Each complete 360° rotation represents one calendar year (Jan-Dec)</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-slate-500">
            <span>{currentYearIndex + 1} of {years.length} years</span>
          </div>
        </div>
      </div>
    </div>
  );
};
