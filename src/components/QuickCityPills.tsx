import React from 'react';
import { SAMPLE_CITIES } from '../data/sampleCities';
import { CityLocation } from '../types/weather';

interface QuickCityPillsProps {
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
}

export const QuickCityPills: React.FC<QuickCityPillsProps> = ({ currentCity, onSelectCity }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap mr-1">
        Featured:
      </span>
      {SAMPLE_CITIES.map((city) => {
        const isSelected = city.name === currentCity.name;
        return (
          <button
            key={city.id}
            onClick={() => onSelectCity(city)}
            className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition-all border ${
              isSelected
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20 scale-105'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {city.name}
          </button>
        );
      })}
    </div>
  );
};
