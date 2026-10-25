import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { DailyWeatherRecord, UnitConversion } from '../types/weather';
import { computeMonthlyKDE } from '../services/climateMath';

interface RidgelinePlotProps {
  records: DailyWeatherRecord[];
  converters: UnitConversion;
  cityName: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export const RidgelinePlot: React.FC<RidgelinePlotProps> = ({
  records,
  converters,
  cityName
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredTemp, setHoveredTemp] = useState<number | null>(null);

  // Compute min/max temp across all records
  const { minTemp, maxTemp, monthlyDensities } = useMemo(() => {
    if (!records || records.length === 0) {
      return { minTemp: -10, maxTemp: 35, monthlyDensities: [] };
    }

    let min = Infinity;
    let max = -Infinity;
    for (const r of records) {
      if (r.tempMin < min) min = r.tempMin;
      if (r.tempMax > max) max = r.tempMax;
    }

    // Add padding to range
    const paddedMin = Math.floor(min - 3);
    const paddedMax = Math.ceil(max + 3);

    // Compute KDE curves for each month
    const densities = MONTH_NAMES.map((name, monthIndex) => {
      const monthRecords = records.filter(r => r.month === monthIndex);
      const mean = monthRecords.length > 0
        ? monthRecords.reduce((sum, r) => sum + r.tempMean, 0) / monthRecords.length
        : 0;

      const points = computeMonthlyKDE(records, monthIndex, paddedMin, paddedMax, 70);
      const maxDensity = points.reduce((m, p) => Math.max(m, p.density), 0);

      return {
        monthIndex,
        name,
        mean,
        points,
        maxDensity
      };
    });

    return {
      minTemp: paddedMin,
      maxTemp: paddedMax,
      monthlyDensities: densities
    };
  }, [records]);

  // Overall max density for scaling ridge height
  const globalMaxDensity = useMemo(() => {
    return monthlyDensities.reduce((m, d) => Math.max(m, d.maxDensity), 0.05);
  }, [monthlyDensities]);

  // SVG dimensions
  const width = 800;
  const height = 520;
  const margin = { top: 30, right: 35, bottom: 40, left: 95 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([minTemp, maxTemp])
      .range([0, innerWidth]);
  }, [minTemp, maxTemp, innerWidth]);

  // Vertical spacing per month
  const stepY = innerHeight / 12;
  // Ridge height can overlap with month above
  const ridgeHeight = stepY * 2.8;

  const yDensityScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, globalMaxDensity])
      .range([0, ridgeHeight]);
  }, [globalMaxDensity, ridgeHeight]);

  // Area and line generators
  const areaGenerators = useMemo(() => {
    return monthlyDensities.map(month => {
      const baseY = month.monthIndex * stepY + stepY;
      return d3.area<{ temp: number; density: number }>()
        .x(d => xScale(d.temp))
        .y0(baseY)
        .y1(d => baseY - yDensityScale(d.density))
        .curve(d3.curveBasis);
    });
  }, [monthlyDensities, stepY, xScale, yDensityScale]);

  const lineGenerators = useMemo(() => {
    return monthlyDensities.map(month => {
      const baseY = month.monthIndex * stepY + stepY;
      return d3.line<{ temp: number; density: number }>()
        .x(d => xScale(d.temp))
        .y(d => baseY - yDensityScale(d.density))
        .curve(d3.curveBasis);
    });
  }, [monthlyDensities, stepY, xScale, yDensityScale]);

  // Temperature axis ticks
  const xTicks = useMemo(() => {
    const ticks = xScale.ticks(10);
    return ticks;
  }, [xScale]);

  // Color generator based on monthly mean temperature
  const getMonthColor = (meanC: number) => {
    if (meanC < 0) return { fill: 'url(#cold-grad)', stroke: '#38bdf8' };
    if (meanC < 10) return { fill: 'url(#mild-grad)', stroke: '#60a5fa' };
    if (meanC < 20) return { fill: 'url(#warm-grad)', stroke: '#34d399' };
    if (meanC < 26) return { fill: 'url(#hot-grad)', stroke: '#fbbf24' };
    return { fill: 'url(#extreme-grad)', stroke: '#f87171' };
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Monthly Temperature Ridgeline Plot
          </h3>
          <p className="text-xs text-slate-400">
            Gaussian Kernel Density Estimation of daily temperatures across all recorded years for {cityName}
          </p>
        </div>
        <div className="text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
          Bandwidth: <span className="font-mono text-cyan-300">Silverman's rule</span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[620px] select-none"
          onMouseLeave={() => {
            setHoveredMonth(null);
            setHoveredTemp(null);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (width / rect.width) - margin.left;
            if (mouseX >= 0 && mouseX <= innerWidth) {
              const tempVal = xScale.invert(mouseX);
              setHoveredTemp(tempVal);
            }
          }}
        >
          <defs>
            {/* Gradients for thermal bands */}
            <linearGradient id="cold-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="mild-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="warm-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="hot-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#9a3412" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="extreme-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.1" />
            </linearGradient>

            {/* Zero degree freeze line gradient */}
            <linearGradient id="freeze-line" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Background grid lines for temperatures */}
            {xTicks.map(tick => {
              const xPos = xScale(tick);
              const isZero = tick === 0;
              return (
                <g key={`grid-${tick}`}>
                  <line
                    x1={xPos}
                    y1={0}
                    x2={xPos}
                    y2={innerHeight}
                    stroke={isZero ? '#38bdf8' : '#334155'}
                    strokeWidth={isZero ? 1.5 : 0.75}
                    strokeDasharray={isZero ? '4 3' : '2 4'}
                    opacity={isZero ? 0.75 : 0.4}
                  />
                  {isZero && (
                    <text
                      x={xPos + 3}
                      y={12}
                      fill="#38bdf8"
                      fontSize="9"
                      fontFamily="monospace"
                      opacity="0.8"
                    >
                      0°C (Freeze)
                    </text>
                  )}
                </g>
              );
            })}

            {/* Ridgeline areas rendered bottom to top or top to bottom */}
            {monthlyDensities.map((month, idx) => {
              const baseY = idx * stepY + stepY;
              const { fill, stroke } = getMonthColor(month.mean);
              const isHovered = hoveredMonth === idx;
              const areaPath = areaGenerators[idx](month.points) || '';
              const linePath = lineGenerators[idx](month.points) || '';

              return (
                <g
                  key={month.name}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredMonth(idx)}
                >
                  {/* Baseline separator */}
                  <line
                    x1={0}
                    y1={baseY}
                    x2={innerWidth}
                    y2={baseY}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />

                  {/* Month Label */}
                  <text
                    x={-12}
                    y={baseY - 4}
                    textAnchor="end"
                    fill={isHovered ? '#38bdf8' : '#94a3b8'}
                    fontSize="11"
                    fontWeight={isHovered ? '600' : '500'}
                    className="transition-colors"
                  >
                    {month.name.substring(0, 3)}
                  </text>

                  {/* Mean marker label */}
                  <text
                    x={-12}
                    y={baseY + 10}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    μ={converters.formatTemp(month.mean, 0)}
                  </text>

                  {/* Filled KDE Density Area */}
                  <path
                    d={areaPath}
                    fill={fill}
                    opacity={isHovered ? 0.95 : hoveredMonth !== null ? 0.45 : 0.75}
                    className="transition-opacity duration-200"
                  />

                  {/* Outline Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isHovered ? 1.0 : 0.85}
                  />

                  {/* Month Mean vertical indicator dot */}
                  <circle
                    cx={xScale(month.mean)}
                    cy={baseY}
                    r={isHovered ? 4 : 2.5}
                    fill={stroke}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

            {/* Interactive vertical hover line */}
            {hoveredTemp !== null && (
              <g pointerEvents="none">
                <line
                  x1={xScale(hoveredTemp)}
                  y1={0}
                  x2={xScale(hoveredTemp)}
                  y2={innerHeight}
                  stroke="#f8fafc"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <rect
                  x={xScale(hoveredTemp) - 34}
                  y={-22}
                  width="68"
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x={xScale(hoveredTemp)}
                  y={-8}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {converters.formatTemp(hoveredTemp, 1)}
                </text>
              </g>
            )}

            {/* Bottom X-axis */}
            <g transform={`translate(0, ${innerHeight + 5})`}>
              <line x1={0} y1={0} x2={innerWidth} y2={0} stroke="#475569" strokeWidth="1" />
              {xTicks.map(tick => (
                <g key={`axis-tick-${tick}`} transform={`translate(${xScale(tick)}, 0)`}>
                  <line y1={0} y2={5} stroke="#64748b" strokeWidth="1" />
                  <text
                    y={18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {converters.formatTemp(tick, 0)}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-2 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-sky-400 inline-block"></span> Cold (&lt;10°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-emerald-400 inline-block"></span> Mild (10-20°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-amber-400 inline-block"></span> Warm (20-26°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-red-400 inline-block"></span> Hot (&gt;26°C)
          </span>
        </div>
        <div className="text-slate-500 font-mono">
          Hover curves to isolate monthly density profiles
        </div>
      </div>
    </div>
  );
};
