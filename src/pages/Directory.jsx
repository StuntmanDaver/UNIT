import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessCard from '@/components/BusinessCard';
import QRCodeCard from '@/components/QRCodeCard';
import BottomNav from '@/components/BottomNav';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Building2, 
  Loader2,
  Sparkles,
  Users,
  MessageSquare,
  Home,
  Filter,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Directory() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState(null);

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

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center px-6">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No property selected</h2>
          <p className="text-gray-500 mt-2">Please select a property to view its directory.</p>
          <Button
            onClick={() => navigate(createPageUrl('Welcome'))}
            className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600"
          >
            Find Your Property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697e319135e62b1a097e0674/52d9677df_Screenshot2026-01-31at92613PM.png" 
              alt="Unit" 
              className="h-20 w-auto"
            />
          </div>
          
          <nav className="hidden sm:flex items-center gap-1">
            <Link to={createPageUrl('Welcome')}>
              <Button variant="ghost" size="sm" className="rounded-xl text-gray-600">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="rounded-xl bg-indigo-50 text-emerald-600">
              <Users className="w-4 h-4 mr-2" />
              Directory
            </Button>
            <Link to={createPageUrl('Community') + `?propertyId=${propertyId}`}>
              <Button variant="ghost" size="sm" className="rounded-xl text-gray-600">
                <MessageSquare className="w-4 h-4 mr-2" />
                Community
              </Button>
            </Link>
          </nav>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property?.name}</h1>
                <p className="text-gray-500">{businesses.length} businesses</p>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-white/80 backdrop-blur-sm border-gray-200/50 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {categories.map(cat => (
                <Badge
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-1.5 rounded-full transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-emerald-600'
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
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredBusinesses.map((business, index) => (
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
            </motion.div>
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