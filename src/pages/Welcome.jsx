import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PropertySearch from '@/components/PropertySearch';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Building2, Users, MessageSquare, Sparkles } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: []
  });

  const handlePropertySelect = (property) => {
    navigate(createPageUrl('Register') + `?propertyId=${property.id}`);
  };

  const features = [
    { icon: Building2, title: 'Find Your Park', description: 'Search and connect to your property' },
    { icon: Users, title: 'Meet Neighbors', description: 'Discover businesses in your area' },
    { icon: MessageSquare, title: 'Stay Connected', description: 'Share updates and announcements' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Unit</span>
          </div>
          <Link to={createPageUrl('LandlordLogin')}>
            <Button variant="outline" size="sm" className="text-xs">
              Landlord Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
              Connect • Discover • Grow
            </span>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Discover businesses
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                in your park
              </span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Find and connect with businesses in your industrial park. 
              Explore services, share updates, and build a stronger community.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12"
          >
            <PropertySearch
              properties={properties}
              onSelect={handlePropertySelect}
              isLoading={isLoading}
            />
            <p className="mt-4 text-sm text-gray-500">
              Search for your property by name or address
            </p>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto mt-24"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-emerald-100/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="max-w-4xl mx-auto mt-24 text-center"
        >
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">{properties?.length || 0}+</div>
              <div className="text-sm text-gray-500 mt-1">Properties</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-500 mt-1">Businesses</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900">1000+</div>
              <div className="text-sm text-gray-500 mt-1">Connections</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 pb-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Unit. All rights reserved.
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}