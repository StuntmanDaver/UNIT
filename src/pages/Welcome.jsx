import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PropertySearch from '@/components/PropertySearch';
import BottomNav from '@/components/BottomNav';
import AdBanner from '@/components/AdBanner';
import UnitLogo from '@/components/UnitLogo';
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
    { icon: Building2, title: 'Find Your Park', description: 'Connect to your property' },
    { icon: Users, title: 'Meet Neighbors', description: 'Discover local businesses' },
    { icon: MessageSquare, title: 'Stay Connected', description: 'Share and engage' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UnitLogo size={32} />
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <Link to={createPageUrl('LandlordLogin')}>
            <Button variant="outline" size="sm" className="text-xs border-white/10 bg-white/5 text-white hover:bg-white/10">
              Landlord Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-20 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-300 rounded-full text-sm font-medium mb-6 backdrop-blur-xl">
              Connect • Discover • Grow
            </span>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Grow your business through
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                local connections
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Unlock new opportunities right in your park. Find B2B partners, 
              share exclusive offers, and collaborate with neighbors to expand your reach and revenue.
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
          className="max-w-4xl mx-auto mt-12"
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white text-center">{feature.title}</h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-base text-zinc-400 text-center">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Ad Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-4xl mx-auto mt-12"
        >
          <AdBanner propertyId={properties[0]?.id} />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="max-w-4xl mx-auto mt-12 text-center"
        >
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">{properties?.length || 0}+</div>
              <div className="text-sm text-zinc-500 mt-1">Properties</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent">500+</div>
              <div className="text-sm text-zinc-500 mt-1">Businesses</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-pink-400 to-rose-400 bg-clip-text text-transparent">1000+</div>
              <div className="text-sm text-zinc-500 mt-1">Connections</div>
            </div>
          </div>
        </motion.div>
        </main>

        {/* Footer */}
        <footer className="py-4 pb-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Unit. All rights reserved.
        </div>
        </footer>

      <BottomNav />
    </div>
  );
}