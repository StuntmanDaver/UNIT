import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { BRAND } from '@/lib/colors';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Mail, Phone, Globe, MapPin, X } from "lucide-react";
import { motion } from "framer-motion";

export default function QRCodeCard({ business, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && business) {
      const vCardData = `BEGIN:VCARD\nVERSION:3.0\nFN:${business.business_name}\nORG:${business.business_name}\nEMAIL:${business.contact_email || ''}\nTEL:${business.contact_phone || ''}\nURL:${business.website || ''}\nNOTE:Unit ${business.unit_number}\nEND:VCARD`;

      QRCode.toCanvas(canvasRef.current, vCardData, {
        width: 200,
        margin: 2,
        color: {
          dark: BRAND.navy,
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }).catch(err => console.error('QR generation failed:', err));
    }
  }, [business]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${business.business_name}-qr.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleShare = async () => {
    const shareData = {
      title: business.business_name,
      text: `Check out ${business.business_name} - Unit ${business.unit_number}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${business.business_name} - Unit ${business.unit_number}\nEmail: ${business.contact_email}\nPhone: ${business.contact_phone || 'N/A'}`);
      alert('Business info copied to clipboard!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card className="bg-white overflow-hidden">
          <div className="bg-gradient-to-br from-brand-slate via-brand-steel to-brand-navy p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
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
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-2xl shadow-lg shadow-brand-gray/50 border border-gray-100">
                <canvas ref={canvasRef} className="w-48 h-48" />
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mb-6">
              Scan to save contact information
            </p>

            <div className="space-y-3 mb-6">
              {business.contact_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-brand-slate" />
                  <span className="text-gray-700">{business.contact_email}</span>
                </div>
              )}
              {business.contact_phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-brand-slate" />
                  <span className="text-gray-700">{business.contact_phone}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Globe className="w-5 h-5 text-brand-slate" />
                  <span className="text-gray-700 truncate">{business.website}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                className="rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}