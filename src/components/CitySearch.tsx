import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { CityLocation } from '../types/weather';
import { searchCities } from '../services/openMeteoApi';

interface CitySearchProps {
  onSelectCity: (city: CityLocation) => void;
  selectedCity: CityLocation;
}

export const CitySearch: React.FC<CitySearchProps> = ({ onSelectCity, selectedCity }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CityLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchCities(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search world cities (e.g. Berlin, Mumbai, Chicago)..."
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-inner"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        ) : isLoading ? (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin"
          />
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
          {results.map((city) => {
            const isCurrent =
              city.name === selectedCity.name &&
              city.country === selectedCity.country;

            return (
              <button
                key={`${city.name}_${city.latitude}_${city.longitude}`}
                onClick={() => {
                  onSelectCity(city);
                  setQuery('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-800/80 transition-colors border-b border-slate-800/50 last:border-none ${
                  isCurrent ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin size={14} className={isCurrent ? 'text-cyan-400' : 'text-slate-500'} />
                  <div>
                    <div className="font-medium text-slate-100">{city.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
