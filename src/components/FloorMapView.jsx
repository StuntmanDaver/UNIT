import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_GRADIENTS } from '@/lib/colors';

export default function FloorMapView({ businesses, onBusinessClick, isLandlord = false, onPositionUpdate }) {
  const [hoveredBusiness, setHoveredBusiness] = useState(null);
  const containerRef = useRef(null);
  const dragging = useRef(null); // { id, startX, startY, currentX, currentY, el }

  const categoryColors = CATEGORY_GRADIENTS;

  // Better auto-layout: evenly spaced grid with 10% padding from edges
  const getPosition = (business, index) => {
    if (business.floor_position_x != null && business.floor_position_y != null) {
      return { x: business.floor_position_x, y: business.floor_position_y, isPlaced: true };
    }
    const cols = Math.ceil(Math.sqrt(businesses.length)) || 1;
    const rows = Math.ceil(businesses.length / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    // 10% padding from edges, distribute evenly in remaining 80%
    const x = cols === 1 ? 50 : 10 + (col / (cols - 1)) * 80;
    const y = rows === 1 ? 50 : 10 + (row / (rows - 1)) * 80;
    return { x, y, isPlaced: false };
  };

  // Drag handlers for landlord mode
  const handlePointerDown = useCallback((e, business) => {
    if (!isLandlord) return;
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragging.current = {
      id: business.id,
      el: e.currentTarget,
      offsetX: clientX - e.currentTarget.getBoundingClientRect().left - e.currentTarget.offsetWidth / 2,
      offsetY: clientY - e.currentTarget.getBoundingClientRect().top - e.currentTarget.offsetHeight / 2,
      containerRect: rect,
    };

    e.currentTarget.style.cursor = 'grabbing';
    e.currentTarget.style.zIndex = '50';

    const handlePointerMove = (moveEvent) => {
      if (!dragging.current) return;
      moveEvent.preventDefault();

      const mx = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const my = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const r = dragging.current.containerRect;
      const pctX = Math.min(95, Math.max(5, ((mx - r.left) / r.width) * 100));
      const pctY = Math.min(95, Math.max(5, ((my - r.top) / r.height) * 100));

      const el = dragging.current.el;
      el.style.left = `${pctX}%`;
      el.style.top = `${pctY}%`;
      dragging.current.finalX = pctX;
      dragging.current.finalY = pctY;
    };

    const handlePointerUp = () => {
      if (dragging.current && dragging.current.finalX != null && onPositionUpdate) {
        onPositionUpdate(dragging.current.id, {
          floor_position_x: Math.round(dragging.current.finalX * 100) / 100,
          floor_position_y: Math.round(dragging.current.finalY * 100) / 100,
        });
      }
      if (dragging.current?.el) {
        dragging.current.el.style.cursor = 'grab';
        dragging.current.el.style.zIndex = '';
      }
      dragging.current = null;

      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove, { passive: false });
      document.removeEventListener('touchend', handlePointerUp);
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
  }, [isLandlord, onPositionUpdate]);

  // Empty state
  if (!businesses || businesses.length === 0) {
    return (
      <div className="relative w-full h-[60vh] min-h-[400px] max-h-[700px] bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-brand-steel">No businesses to display</h3>
          <p className="text-sm text-zinc-500 mt-1">Businesses will appear here once added.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[60vh] min-h-[400px] max-h-[700px] bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
    >
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
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-navy/80 backdrop-blur-xl rounded-xl border border-white/10">
          <Building2 className="w-4 h-4 text-brand-steel" />
          <span className="text-sm text-white font-medium">Floor Plan View</span>
          <Badge className="bg-brand-slate/20 text-brand-steel border-brand-slate/30">
            {businesses.length} units
          </Badge>
        </div>
      </div>

      {/* Landlord drag hint */}
      {isLandlord && (
        <div className="absolute top-4 right-4 z-10">
          <div className="px-3 py-2 bg-brand-slate/20 backdrop-blur-xl rounded-xl border border-brand-slate/30">
            <span className="text-xs text-brand-steel font-medium">Drag pins to arrange</span>
          </div>
        </div>
      )}

      {/* Business Pins */}
      {businesses.map((business, index) => {
        const { x, y, isPlaced } = getPosition(business, index);
        const gradient = categoryColors[business.category] || categoryColors.other;

        return (
          <motion.div
            key={business.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`absolute group ${isLandlord ? 'cursor-grab' : 'cursor-pointer'}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => { if (!dragging.current) setHoveredBusiness(business); }}
            onMouseLeave={() => setHoveredBusiness(null)}
            onClick={() => { if (!dragging.current) onBusinessClick(business); }}
            onMouseDown={(e) => handlePointerDown(e, business)}
            onTouchStart={(e) => handlePointerDown(e, business)}
          >
            {/* Pin with visual distinction: solid ring = placed, dashed ring = auto-positioned */}
            <div
              className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${gradient} p-[2px] shadow-lg group-hover:scale-125 transition-transform`}
              style={!isPlaced ? { border: '2px dashed rgba(255,255,255,0.4)', padding: 0 } : {}}
            >
              <div className="w-full h-full rounded-full bg-brand-navyflex items-center justify-center">
                <span className="text-xs font-bold text-white">{business.unit_number}</span>
              </div>
            </div>

            {/* Solid ring indicator for placed pins */}
            {isPlaced && (
              <div className={`absolute inset-[-3px] rounded-full border-2 border-white/30 pointer-events-none`} />
            )}

            {/* Pulse Effect */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-30 animate-ping`} />

            {/* Tooltip */}
            {hoveredBusiness?.id === business.id && !dragging.current && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-navy/95 backdrop-blur-xl rounded-lg border border-white/20 shadow-xl whitespace-nowrap z-20"
              >
                <div className="text-xs font-semibold text-white">{business.business_name}</div>
                <div className="text-[10px] text-brand-steel">Unit {business.unit_number}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-brand-navy/95" />
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-brand-navy/80 backdrop-blur-xl rounded-xl border border-white/10 p-3">
        <div className="text-xs text-brand-steel mb-2">Categories</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(categoryColors).slice(0, 6).map(([category, gradient]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
              <span className="text-[10px] text-brand-steel capitalize">{category.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
