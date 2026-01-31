import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search, MapPin, Building2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PropertySearch({ properties, onSelect, isLoading }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredProperties = properties?.filter(p => 
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.address?.toLowerCase().includes(query.toLowerCase()) ||
    p.city?.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const showResults = isFocused && query.length > 0;

  const getPropertyTypeLabel = (type) => {
    const labels = {
      industrial_park: 'Industrial Park',
      commercial_plaza: 'Commercial Plaza',
      office_building: 'Office Building'
    };
    return labels[type] || type;
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search for your property..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="w-full pl-12 pr-4 py-6 text-lg bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-2xl shadow-lg shadow-gray-200/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden z-50"
          >
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {filteredProperties.map((property) => (
                  <motion.button
                    key={property.id}
                    whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                    onClick={() => onSelect(property)}
                    className="w-full p-4 flex items-center gap-4 border-b border-gray-50 last:border-0 text-left transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{property.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{property.address}, {property.city}</span>
                      </div>
                      <span className="inline-block mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {getPropertyTypeLabel(property.type)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No properties found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}