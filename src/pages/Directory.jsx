import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessCard from '@/components/BusinessCard';
import QRCodeCard from '@/components/QRCodeCard';
import BottomNav from '@/components/BottomNav';
import NotificationBell from '@/components/NotificationBell';
import FloorMapView from '@/components/FloorMapView';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Building2, 
  Loader2,
  Users,
  MessageSquare,
  Home,
  Filter,
  X,
  Map,
  Grid3x3,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Directory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: propertyId });
      return properties[0];
    },
    enabled: !!propertyId
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return await base44.entities.Business.filter({ property_id: propertyId });
    },
    enabled: !!propertyId,
    initialData: []
  });

  const isLandlord = !!sessionStorage.getItem('landlord_property_id');

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Business.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] })
  });

  const handlePositionUpdate = (businessId, position) => {
    updatePositionMutation.mutate({ id: businessId, data: position });
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'retail', label: 'Retail' },
    { value: 'food_service', label: 'Food' },
    { value: 'professional_services', label: 'Services' },
    { value: 'technology', label: 'Tech' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'construction', label: 'Construction' },
    { value: 'automotive', label: 'Auto' },
    { value: 'other', label: 'Other' }
  ];

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = 
      business.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.business_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || business.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredBusinesses = filteredBusinesses.filter(b => b.is_featured);
  const regularBusinesses = filteredBusinesses.filter(b => !b.is_featured);

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-gray via-white to-brand-gray/30 flex items-center justify-center px-6">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No property selected</h2>
          <p className="text-gray-500 mt-2">Please select a property to view its directory.</p>
          <Button
            onClick={() => navigate(createPageUrl('Welcome'))}
            className="mt-6 rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy"
          >
            Find Your Property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-slate via-brand-steel to-brand-gray p-[2px]">
              <div className="w-full h-full rounded-lg bg-brand-navy flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-br from-brand-steel to-brand-gray bg-clip-text text-transparent">U</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white">Unit</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell propertyId={propertyId} />
            <nav className="hidden sm:flex items-center gap-1">
              <Link to={createPageUrl('Welcome')}>
                <Button variant="ghost" size="sm" className="rounded-xl text-zinc-400 hover:text-white hover:bg-white/5">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="rounded-xl bg-brand-slate/10 text-brand-steel border border-brand-slate/20">
                <Users className="w-4 h-4 mr-2" />
                Directory
              </Button>
              <Link to={createPageUrl('Community') + `?propertyId=${propertyId}`}>
                <Button variant="ghost" size="sm" className="rounded-xl text-zinc-400 hover:text-white hover:bg-white/5">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Community
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <BottomNav propertyId={propertyId} />

      <main className="pt-24 pb-24 sm:pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Property Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-slate to-brand-navy flex items-center justify-center shadow-lg shadow-brand-slate/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{property?.name}</h1>
                  <p className="text-zinc-400">{businesses.length} businesses</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-brand-slate text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    viewMode === 'map'
                      ? 'bg-brand-slate text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-slate/50 focus:border-brand-slate/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              {categories.map(cat => (
                <Badge
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-1.5 rounded-full transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-brand-slate text-white hover:bg-brand-slate-light border-0'
                      : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-brand-slate/50 hover:text-white'
                  }`}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-steel" />
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <>
              {/* Featured Businesses */}
              {featuredBusinesses.length > 0 && viewMode === 'grid' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <h2 className="text-xl font-bold text-white">Featured Businesses</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredBusinesses.map((business, index) => (
                      <motion.div
                        key={business.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="relative"
                      >
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                            <Star className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>
                        <BusinessCard
                          business={business}
                          onViewCard={() => setSelectedBusiness(business)}
                          isFeatured={true}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Map or Grid View */}
              {viewMode === 'map' ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FloorMapView
                    businesses={filteredBusinesses}
                    onBusinessClick={(business) => setSelectedBusiness(business)}
                    isLandlord={isLandlord}
                    onPositionUpdate={handlePositionUpdate}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {regularBusinesses.length > 0 && featuredBusinesses.length > 0 && (
                    <h2 className="text-lg font-semibold text-white mb-4">All Businesses</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularBusinesses.map((business, index) => (
                      <motion.div
                        key={business.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <BusinessCard
                          business={business}
                          onViewCard={() => setSelectedBusiness(business)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No businesses found</h3>
              <p className="text-gray-500 mt-2">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to join this community!'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedBusiness && (
          <QRCodeCard
            business={selectedBusiness}
            onClose={() => setSelectedBusiness(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}