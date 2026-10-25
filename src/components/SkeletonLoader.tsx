import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-900/80 rounded-xl border border-slate-800 p-3">
            <div className="w-16 h-3 bg-slate-800 rounded mb-2"></div>
            <div className="w-20 h-6 bg-slate-800 rounded mb-2"></div>
            <div className="w-12 h-2.5 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Visualizations Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[480px] bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="w-48 h-5 bg-slate-800 rounded mb-2"></div>
          <div className="w-72 h-3 bg-slate-800 rounded mb-6"></div>
          <div className="w-full h-80 bg-slate-800/40 rounded-lg"></div>
        </div>
        <div className="h-[480px] bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="w-48 h-5 bg-slate-800 rounded mb-2"></div>
          <div className="w-72 h-3 bg-slate-800 rounded mb-6"></div>
          <div className="w-full h-80 bg-slate-800/40 rounded-lg"></div>
        </div>
      </div>

      <div className="h-44 bg-slate-900/80 rounded-xl border border-slate-800 p-5">
        <div className="w-48 h-5 bg-slate-800 rounded mb-2"></div>
        <div className="w-full h-24 bg-slate-800/40 rounded-lg"></div>
      </div>
    </div>
  );
};
