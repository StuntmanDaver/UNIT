import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessQRCode from '@/components/BusinessQRCode';
import BottomNav from '@/components/BottomNav';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  MessageSquare,
  Sparkles,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Plus
} from 'lucide-react';

export default function MyCard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const businessIdFromUrl = urlParams.get('businessId');

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        return await base44.auth.me();
      }
      return null;
    }
  });

  // If businessId is in URL, fetch that specific business
  // Otherwise, fetch the user's business by their email
  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ['myBusiness', businessIdFromUrl, user?.email],
    queryFn: async () => {
      if (businessIdFromUrl) {
        const businesses = await base44.entities.Business.filter({ id: businessIdFromUrl });
        return businesses[0];
      } else if (user?.email) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        return businesses[0];
      }
      return null;
    },
    enabled: !!businessIdFromUrl || !!user?.email
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

  const isLoading = userLoading || businessLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // No business profile yet - prompt to create one
  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Unit</span>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-24 px-6 flex items-center justify-center min-h-screen">
          <Card className="p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">No Business Profile Yet</h2>
            <p className="text-gray-500 mt-2">
              Create your business profile to get your digital business card with a shareable QR code.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Welcome'))}
              className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Business Profile
            </Button>
          </Card>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697e319135e62b1a097e0674/2791cb4ed_2b7f0462-95ab-428e-a8d6-0636b82d062c.png" 
              alt="Unit" 
              className="h-20 w-auto"
            />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 px-6">
        <div className="max-w-lg mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900">My Business Card</h1>
            <p className="text-gray-500 mt-1">Share your profile with others</p>
          </motion.div>

          {/* Digital Business Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden bg-white border-gray-100 shadow-xl shadow-emerald-100/30">
              {/* Card Header */}
              <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-2xl font-bold">
                        {business.business_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{business.business_name}</h2>
                    <div className="flex items-center gap-1 text-white/80 mt-1">
                      <MapPin className="w-4 h-4" />
                      Unit {business.unit_number}
                    </div>
                    {business.category && (
                      <Badge className="mt-2 bg-white/20 text-white border-0 hover:bg-white/30">
                        {getCategoryLabel(business.category)}
                      </Badge>
                    )}
                  </div>
                </div>
                {property && (
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-white/70" />
                    <span className="text-white/80 text-sm">{property.name}</span>
                  </div>
                )}
              </div>

              {/* QR Code Section */}
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center mb-4">
                    Scan to View Profile
                  </h3>
                  <BusinessQRCode business={business} size={180} />
                </div>

                {/* Contact Info */}
                <div className="space-y-2 border-t border-gray-100 pt-6">
                  {business.contact_email && (
                    <a href={`mailto:${business.contact_email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                      <Mail className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 text-sm">{business.contact_email}</span>
                    </a>
                  )}
                  {business.contact_phone && (
                    <a href={`tel:${business.contact_phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                      <Phone className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 text-sm">{business.contact_phone}</span>
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                      <Globe className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 text-sm truncate">{business.website}</span>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 grid grid-cols-2 gap-3"
          >
            <Link to={createPageUrl('Directory') + `?propertyId=${business.property_id}`}>
              <Card className="p-4 bg-white/60 backdrop-blur-sm border-gray-100 hover:shadow-lg transition-all cursor-pointer h-full">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Directory</span>
                </div>
              </Card>
            </Link>

            <Link to={createPageUrl('Community') + `?propertyId=${business.property_id}`}>
              <Card className="p-4 bg-white/60 backdrop-blur-sm border-gray-100 hover:shadow-lg transition-all cursor-pointer h-full">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Community</span>
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>
      </main>

      <BottomNav propertyId={business?.property_id} />
    </div>
  );
}