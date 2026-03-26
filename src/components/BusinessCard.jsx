import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, MapPin, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_COLORS } from '@/lib/colors';

export default function BusinessCard({ business, onViewCard, compact = false, isFeatured = false }) {
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
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-brand-slate/30 transition-all cursor-pointer group" onClick={onViewCard}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-slate to-brand-navy flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-slate/20 group-hover:shadow-brand-slate/40 transition-shadow">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {business.business_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{business.business_name}</h3>
              <div className="flex items-center gap-1 text-sm text-zinc-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                Unit {business.unit_number}
              </div>
              {business.category && (
                <Badge className="mt-2 bg-brand-slate/20 text-brand-slate-light border-brand-slate/30 text-xs">
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
      className={isFeatured ? "relative" : ""}
    >
      {isFeatured && (
        <>
          <div className="absolute -inset-[2px] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-2xl blur-md opacity-75 animate-pulse" />
          <div className="absolute -inset-[2px] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-2xl" />
        </>
      )}
      <Card className={`overflow-hidden bg-brand-navy/50 backdrop-blur-xl transition-all group relative ${
        isFeatured 
          ? "border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/30" 
          : "border-white/10 hover:bg-brand-navy/70 hover:border-brand-slate/30"
      }`}>
        <div className="h-24 bg-gradient-to-br from-brand-slate via-brand-steel to-brand-navy relative">
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-navyshadow-xl shadow-black/50 flex items-center justify-center border-4 border-brand-navy group-hover:border-brand-slate/30 transition-colors">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-br from-brand-slate-light to-brand-steel bg-clip-text text-transparent">
                  {business.business_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-12 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{business.business_name}</h3>
              <div className="flex items-center gap-1 text-zinc-400 mt-1">
                <MapPin className="w-4 h-4" />
                <span>Unit {business.unit_number}</span>
              </div>
            </div>
            {business.category && (
              <Badge className="bg-brand-slate/20 text-brand-slate-light border-brand-slate/30">
                {getCategoryLabel(business.category)}
              </Badge>
            )}
          </div>

          {business.business_description && (
            <p className="text-zinc-300 mt-4 line-clamp-2">{business.business_description}</p>
          )}

          <div className="mt-6 space-y-2">
            {business.contact_email && (
              <a href={`mailto:${business.contact_email}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-brand-slate-light transition-colors">
                <Mail className="w-4 h-4" />
                {business.contact_email}
              </a>
            )}
            {business.contact_phone && (
              <a href={`tel:${business.contact_phone}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-brand-slate-light transition-colors">
                <Phone className="w-4 h-4" />
                {business.contact_phone}
              </a>
            )}
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-brand-slate-light transition-colors">
                <Globe className="w-4 h-4" />
                {business.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <Button 
            onClick={onViewCard}
            className="w-full mt-6 bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light text-white rounded-xl border-0 shadow-lg shadow-brand-slate/20"
          >
            <QrCode className="w-4 h-4 mr-2" />
            View Business Card
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}