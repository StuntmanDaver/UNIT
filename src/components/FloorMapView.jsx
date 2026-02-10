import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FloorMapView({ businesses, onBusinessClick }) {
  const [hoveredBusiness, setHoveredBusiness] = useState(null);

  const categoryColors = {
    manufacturing: 'from-blue-500 to-cyan-500',
    logistics: 'from-green-500 to-emerald-500',
    retail: 'from-purple-500 to-pink-500',
    food_service: 'from-orange-500 to-red-500',
    professional_services: 'from-indigo-500 to-violet-500',
    technology: 'from-cyan-500 to-blue-500',
    healthcare: 'from-red-500 to-pink-500',
    construction: 'from-yellow-500 to-orange-500',
    automotive: 'from-slate-500 to-zinc-500',
    other: 'from-gray-500 to-slate-500'
  };

  return (
    <div className="relative w-full h-[600px] bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Floor Plan Grid */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Property Label */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-white/10">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-white font-medium">Floor Plan View</span>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
            {businesses.length} units
          </Badge>
        </div>
      </div>

      {/* Business Pins */}
      {businesses.map((business, index) => {
        const x = business.floor_position_x || (20 + (index % 4) * 20);
        const y = business.floor_position_y || (20 + Math.floor(index / 4) * 20);
        const gradient = categoryColors[business.category] || categoryColors.other;

        return (
          <motion.div
            key={business.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="absolute cursor-pointer group"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => setHoveredBusiness(business)}
            onMouseLeave={() => setHoveredBusiness(null)}
            onClick={() => onBusinessClick(business)}
          >
            {/* Pin */}
            <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${gradient} p-[2px] shadow-lg group-hover:scale-125 transition-transform`}>
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{business.unit_number}</span>
              </div>
            </div>

            {/* Pulse Effect */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-30 animate-ping`} />

            {/* Tooltip */}
            {hoveredBusiness?.id === business.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-white/20 shadow-xl whitespace-nowrap z-20"
              >
                <div className="text-xs font-semibold text-white">{business.business_name}</div>
                <div className="text-[10px] text-zinc-400">Unit {business.unit_number}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95" />
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-white/10 p-3">
        <div className="text-xs text-zinc-400 mb-2">Categories</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(categoryColors).slice(0, 6).map(([category, gradient]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
              <span className="text-[10px] text-zinc-400 capitalize">{category.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}