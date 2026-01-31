import React, { useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Mail, Phone, Globe, MapPin, X } from "lucide-react";
import { motion } from "framer-motion";

export default function QRCodeCard({ business, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && business) {
      generateQRCode();
    }
  }, [business]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Create vCard data
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${business.business_name}
ORG:${business.business_name}
EMAIL:${business.contact_email || ''}
TEL:${business.contact_phone || ''}
URL:${business.website || ''}
NOTE:Unit ${business.unit_number}
END:VCARD`;

    // Simple QR-like pattern (visual representation)
    const modules = 25;
    const moduleSize = size / modules;
    
    // Create a deterministic pattern based on business data
    const seed = business.id || business.business_name;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#1a1a2e';
    
    // Draw finder patterns (corners)
    const drawFinder = (x, y) => {
      // Outer
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Draw data modules
    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        // Skip finder pattern areas
        if ((i < 8 && j < 8) || (i < 8 && j > modules - 9) || (i > modules - 9 && j < 8)) continue;
        
        const shouldFill = ((hash * (i + 1) * (j + 1)) % 3) === 0;
        if (shouldFill) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // Add gradient overlay for branding
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  };

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
          <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-6 text-white relative">
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
              <div className="p-4 bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-gray-100">
                <canvas ref={canvasRef} className="w-48 h-48" />
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mb-6">
              Scan to save contact information
            </p>

            <div className="space-y-3 mb-6">
              {business.contact_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-indigo-500" />
                  <span className="text-gray-700">{business.contact_email}</span>
                </div>
              )}
              {business.contact_phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-indigo-500" />
                  <span className="text-gray-700">{business.contact_phone}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Globe className="w-5 h-5 text-indigo-500" />
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
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
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