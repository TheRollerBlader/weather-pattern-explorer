import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Thermometer, CloudRain, Navigation, Eye } from 'lucide-react';
import { CityLocation, DailyWeatherRecord, UnitConversion } from '../types/weather';
import { SAMPLE_CITIES } from '../data/sampleCities';

interface WeatherMapProps {
  currentCity: CityLocation;
  currentRecords: DailyWeatherRecord[];
  converters: UnitConversion;
  onSelectCity: (city: CityLocation) => void;
}

export const WeatherMap: React.FC<WeatherMapProps> = ({
  currentCity,
  currentRecords,
  converters,
  onSelectCity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [overlayMode, setOverlayMode] = useState<'temp' | 'precip'>('temp');
  const [selectedSeasonMonth, setSelectedSeasonMonth] = useState<number>(6); // July default

  // Compute seasonal average for current city and sample cities
  const citySeasonalData = (city: CityLocation) => {
    // If it's the current city and we have records, calculate directly
    if (city.latitude === currentCity.latitude && city.longitude === currentCity.longitude) {
      const monthRecs = currentRecords.filter(r => r.month === selectedSeasonMonth);
      if (monthRecs.length > 0) {
        const meanT = monthRecs.reduce((s, r) => s + r.tempMean, 0) / monthRecs.length;
        const totalP = monthRecs.reduce((s, r) => s + r.precipitation, 0) / (monthRecs.length / 30 || 1);
        return { temp: meanT, precip: totalP };
      }
    }

    // Baseline approximation for other cities in selected month
    const isSouth = city.latitude < 0;
    const isSummerMonth = isSouth ? (selectedSeasonMonth <= 2 || selectedSeasonMonth >= 11) : (selectedSeasonMonth >= 5 && selectedSeasonMonth <= 8);
    const baseTemp = isSummerMonth ? 24 : 6;
    const latFactor = Math.cos((city.latitude * Math.PI) / 180);
    const temp = (baseTemp * latFactor) + (isSouth ? -2 : 0);
    const precip = Math.max(20, (Math.sin(selectedSeasonMonth) + 1.2) * 50);

    return { temp, precip };
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentCity.latitude, currentCity.longitude],
        zoom: 3,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter tiles (great for dark theme science dashboard)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if component unmounts
    };
  }, []);

  // Pan to current city when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([currentCity.latitude, currentCity.longitude], {
        animate: true,
        duration: 1.2
      });
    }
  }, [currentCity]);

  // Update map markers when season, overlayMode, or currentCity changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Color helper
    const getMarkerColor = (temp: number, precip: number) => {
      if (overlayMode === 'temp') {
        if (temp < 0) return '#38bdf8'; // cold blue
        if (temp < 15) return '#34d399'; // mild green
        if (temp < 25) return '#fbbf24'; // warm yellow
        return '#f87171'; // hot red
      } else {
        if (precip < 30) return '#64748b'; // dry
        if (precip < 80) return '#38bdf8'; // moderate
        return '#818cf8'; // heavy
      }
    };

    // Add all sample cities + current city
    const allCities = [...SAMPLE_CITIES];
    if (!allCities.some(c => c.latitude === currentCity.latitude && c.longitude === currentCity.longitude)) {
      allCities.push(currentCity);
    }

    allCities.forEach(c => {
      const isSelected = c.latitude === currentCity.latitude && c.longitude === currentCity.longitude;
      const metrics = citySeasonalData(c);
      const color = getMarkerColor(metrics.temp, metrics.precip);

      const radius = isSelected ? 12 : 8;

      const circle = L.circleMarker([c.latitude, c.longitude], {
        radius,
        fillColor: color,
        color: isSelected ? '#ffffff' : '#0f172a',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      const popupContent = `
        <div style="color: #0f172a; font-family: Inter, sans-serif; min-width: 150px; padding: 4px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 700;">${c.name}, ${c.country}</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
            ${c.latitude.toFixed(2)}°N, ${c.longitude.toFixed(2)}°E
          </p>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;">
            <div>Avg Temp: <span style="color: #0284c7;">${converters.formatTemp(metrics.temp, 1)}</span></div>
            <div>Avg Precip: <span style="color: #0284c7;">${converters.formatPrecip(metrics.precip, 0)}/mo</span></div>
          </div>
          <button id="btn-select-${c.id}" style="margin-top: 8px; width: 100%; background: #0284c7; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Explore City
          </button>
        </div>
      `;

      circle.bindPopup(popupContent);

      circle.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${c.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectCity(c);
            mapInstanceRef.current?.closePopup();
          };
        }
      });

      circle.addTo(markersLayerRef.current!);
    });
  }, [overlayMode, selectedSeasonMonth, currentCity, currentRecords]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Geographical Station Map & Climatology
            </h3>
            <p className="text-xs text-slate-400">
              Global weather stations and seasonal climatological markers
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center text-xs bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
              <button
                onClick={() => setOverlayMode('temp')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  overlayMode === 'temp'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Thermometer size={12} />
                <span>Thermal</span>
              </button>
              <button
                onClick={() => setOverlayMode('precip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  overlayMode === 'precip'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CloudRain size={12} />
                <span>Precipitation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 h-[360px] w-full">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Current Location Pill */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl text-xs flex items-center gap-2">
            <MapPin size={13} className="text-cyan-400" />
            <span className="text-white font-medium">{currentCity.name}, {currentCity.country}</span>
            <span className="text-slate-400 font-mono text-[10px]">
              {currentCity.latitude.toFixed(2)}°, {currentCity.longitude.toFixed(2)}°
            </span>
          </div>
        </div>

        {/* Season Month Slider */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Eye size={13} className="text-cyan-400" />
            <span>Climatology Month:</span>
            <span className="font-semibold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
              {monthNames[selectedSeasonMonth]}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {monthNames.map((m, idx) => (
              <button
                key={m}
                onClick={() => setSelectedSeasonMonth(idx)}
                className={`px-1.5 py-1 text-[10px] font-mono rounded transition-colors ${
                  selectedSeasonMonth === idx
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
