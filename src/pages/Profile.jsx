import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Sparkles,
  Loader2,
  ArrowLeft,
  Users,
  MessageSquare
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('id');

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: businessId });
      return businesses[0];
    },
    enabled: !!businessId
  });

  const { data: property } = useQuery({
    queryKey: ['property', business?.property_id],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: business.property_id });
      return properties[0];
    },
    enabled: !!business?.property_id
  });

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

  const getCategoryColor = (category) => {
    const colors = {
      manufacturing: 'bg-orange-100 text-orange-700',
      logistics: 'bg-blue-100 text-blue-700',
      retail: 'bg-pink-100 text-pink-700',
      food_service: 'bg-green-100 text-green-700',
      professional_services: 'bg-teal-100 text-purple-700',
      technology: 'bg-emerald-100 text-indigo-700',
      healthcare: 'bg-red-100 text-red-700',
      construction: 'bg-amber-100 text-amber-700',
      automotive: 'bg-slate-100 text-slate-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center px-6">
        <Card className="p-8 text-center max-w-md">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Business not found</h2>
          <p className="text-gray-500 mt-2">The business profile you're looking for doesn't exist.</p>
          <Button
            onClick={() => navigate(createPageUrl('Welcome'))}
            className="mt-6 rounded-xl"
          >
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
              <div className="w-full h-full rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-pink-400 bg-clip-text text-transparent">U</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-lg mx-auto">
          {/* Business Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden bg-zinc-900/50 border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-3xl font-bold">
                        {business.business_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{business.business_name}</h1>
                    <div className="flex items-center gap-1 text-white/80 mt-1">
                      <MapPin className="w-4 h-4" />
                      Unit {business.unit_number}
                    </div>
                    {business.category && (
                      <Badge className={`mt-2 ${getCategoryColor(business.category)} border-0`}>
                        {getCategoryLabel(business.category)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Property Info */}
                {property && (
                  <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="font-medium text-white">{property.name}</p>
                      <p className="text-sm text-zinc-400">{property.address}, {property.city}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {business.business_description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">About</h3>
                    <p className="text-zinc-300 leading-relaxed">{business.business_description}</p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Contact</h3>
                  
                  {business.contact_name && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-indigo-400">
                          {business.contact_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-medium">{business.contact_name}</span>
                    </div>
                  )}
                  
                  {business.contact_email && (
                    <a href={`mailto:${business.contact_email}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Mail className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300">{business.contact_email}</span>
                    </a>
                  )}
                  
                  {business.contact_phone && (
                    <a href={`tel:${business.contact_phone}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Phone className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300">{business.contact_phone}</span>
                    </a>
                  )}
                  
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Globe className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300 truncate">{business.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>

                {/* Actions */}
                {property && (
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <Link to={createPageUrl('Directory') + `?propertyId=${property.id}`}>
                      <Button variant="outline" className="w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
                        <Users className="w-4 h-4 mr-2" />
                        Directory
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Community') + `?propertyId=${property.id}`}>
                      <Button className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Community
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}