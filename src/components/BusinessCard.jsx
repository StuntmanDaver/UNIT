import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, Globe, MapPin, QrCode } from "lucide-react";
import { motion } from "framer-motion";

export default function BusinessCard({ business, onViewCard, compact = false }) {
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
      professional_services: 'bg-purple-100 text-purple-700',
      technology: 'bg-indigo-100 text-indigo-700',
      healthcare: 'bg-red-100 text-red-700',
      construction: 'bg-amber-100 text-amber-700',
      automotive: 'bg-slate-100 text-slate-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all cursor-pointer" onClick={onViewCard}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {business.business_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{business.business_name}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                Unit {business.unit_number}
              </div>
              {business.category && (
                <Badge className={`mt-2 ${getCategoryColor(business.category)} border-0 text-xs`}>
                  {getCategoryLabel(business.category)}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-gray-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all">
        <div className="h-24 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 relative">
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">
                  {business.business_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-12 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{business.business_name}</h3>
              <div className="flex items-center gap-1 text-gray-500 mt-1">
                <MapPin className="w-4 h-4" />
                <span>Unit {business.unit_number}</span>
              </div>
            </div>
            {business.category && (
              <Badge className={`${getCategoryColor(business.category)} border-0`}>
                {getCategoryLabel(business.category)}
              </Badge>
            )}
          </div>

          {business.business_description && (
            <p className="text-gray-600 mt-4 line-clamp-2">{business.business_description}</p>
          )}

          <div className="mt-6 space-y-2">
            {business.contact_email && (
              <a href={`mailto:${business.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                <Mail className="w-4 h-4" />
                {business.contact_email}
              </a>
            )}
            {business.contact_phone && (
              <a href={`tel:${business.contact_phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                <Phone className="w-4 h-4" />
                {business.contact_phone}
              </a>
            )}
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                <Globe className="w-4 h-4" />
                {business.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <Button 
            onClick={onViewCard}
            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl"
          >
            <QrCode className="w-4 h-4 mr-2" />
            View Business Card
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}