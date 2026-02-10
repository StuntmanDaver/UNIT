import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Building2, MapPin, Users, ArrowLeft, Store } from 'lucide-react';

export default function BrowseProperties() {
  const [selectedProperty, setSelectedProperty] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['all-properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: []
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', selectedProperty?.id],
    queryFn: () => base44.entities.Business.filter({ property_id: selectedProperty.id }),
    enabled: !!selectedProperty?.id,
    initialData: []
  });

  const getPropertyTypeLabel = (type) => {
    const types = {
      industrial_park: 'Industrial Park',
      commercial_plaza: 'Commercial Plaza',
      office_building: 'Office Building'
    };
    return types[type] || type;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      manufacturing: 'Manufacturing',
      logistics: 'Logistics',
      retail: 'Retail',
      food_service: 'Food Service',
      professional_services: 'Professional Services',
      technology: 'Technology',
      healthcare: 'Healthcare',
      construction: 'Construction',
      automotive: 'Automotive',
      other: 'Other'
    };
    return labels[category] || category;
  };

  if (selectedProperty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
        <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                <div className="w-full h-full rounded-lg bg-zinc-900 flex items-center justify-center">
                  <span className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-pink-400 bg-clip-text text-transparent">U</span>
                </div>
              </div>
              <span className="text-xl font-bold text-white">Unit</span>
            </div>
            <Button
              onClick={() => setSelectedProperty(null)}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Properties
            </Button>
          </div>
        </header>

        <main className="pt-24 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Property Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              {selectedProperty.image_url && (
                <div className="h-64 rounded-2xl overflow-hidden mb-6">
                  <img 
                    src={selectedProperty.image_url} 
                    alt={selectedProperty.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-3 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    {getPropertyTypeLabel(selectedProperty.type)}
                  </Badge>
                  <h1 className="text-4xl font-bold text-white mb-2">{selectedProperty.name}</h1>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}</span>
                  </div>
                  {selectedProperty.total_units && (
                    <div className="flex items-center gap-2 text-zinc-400 mt-2">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedProperty.total_units} units</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Businesses */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Store className="w-6 h-6" />
                Businesses ({businesses.length})
              </h2>
              
              {businesses.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-zinc-500 mb-3" />
                    <p className="text-zinc-400">No businesses registered yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businesses.map((business, index) => (
                    <motion.div
                      key={business.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-white text-lg">{business.business_name}</CardTitle>
                              <p className="text-xs text-zinc-500 mt-1">Unit {business.unit_number}</p>
                            </div>
                            {business.logo_url && (
                              <img src={business.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Badge className="mb-3 bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {getCategoryLabel(business.category)}
                          </Badge>
                          <p className="text-sm text-zinc-400 line-clamp-2">{business.business_description}</p>
                          {business.website && (
                            <a 
                              href={business.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                            >
                              Visit Website →
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
              <div className="w-full h-full rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-pink-400 bg-clip-text text-transparent">U</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <Link to={createPageUrl('Welcome')}>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Explore Properties
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Browse our network of properties and discover businesses in your area
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group overflow-hidden h-full"
                    onClick={() => setSelectedProperty(property)}
                  >
                    {property.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={property.image_url} 
                          alt={property.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <Badge className="mb-2 w-fit bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        {getPropertyTypeLabel(property.type)}
                      </Badge>
                      <CardTitle className="text-white text-xl">{property.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">{property.city}, {property.state}</span>
                        </div>
                        {property.total_units && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Building2 className="w-4 h-4" />
                            <span>{property.total_units} units</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        onClick={() => setSelectedProperty(property)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}