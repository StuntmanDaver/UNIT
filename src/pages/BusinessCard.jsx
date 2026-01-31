import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import QRCodeCard from '@/components/QRCodeCard';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  ArrowRight, 
  Building2, 
  Users, 
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function BusinessCardPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('businessId');

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Unit</span>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-lg mx-auto">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome to {property?.name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Your business profile has been created successfully.
            </p>
          </motion.div>

          {/* Digital Business Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden bg-white border-gray-100 shadow-xl shadow-indigo-100/30">
              <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {business.business_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{business.business_name}</h2>
                    <p className="text-white/80">Unit {business.unit_number}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* QR Code Preview */}
                <div className="flex justify-center mb-6">
                  <div className="w-40 h-40 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg" />
                      <p className="text-xs text-gray-500 mt-2">QR Code</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {business.contact_email && (
                    <p>📧 {business.contact_email}</p>
                  )}
                  {business.contact_phone && (
                    <p>📞 {business.contact_phone}</p>
                  )}
                  {business.website && (
                    <p>🌐 {business.website}</p>
                  )}
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Share your digital business card with others in the park
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 text-center">What's Next?</h3>
            
            <Link to={createPageUrl('Directory') + `?propertyId=${business.property_id}`}>
              <Card className="p-4 bg-white/60 backdrop-blur-sm border-gray-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Explore Directory</h4>
                    <p className="text-sm text-gray-500">Discover other businesses in your park</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>

            <Link to={createPageUrl('Community') + `?propertyId=${business.property_id}`}>
              <Card className="p-4 bg-white/60 backdrop-blur-sm border-gray-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Join Community</h4>
                    <p className="text-sm text-gray-500">Share updates and connect with neighbors</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}