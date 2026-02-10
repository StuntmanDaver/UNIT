import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdPopup({ propertyId }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [hasShown, setHasShown] = useState(false);

  const { data: ads = [] } = useQuery({
    queryKey: ['popup-ads', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const today = new Date().toISOString().split('T')[0];
      return await base44.entities.Ad.filter({
        property_id: propertyId,
        active: true
      });
    },
    enabled: !!propertyId
  });

  // Filter active ads based on dates
  const activeAds = ads.filter(ad => {
    const today = new Date().toISOString().split('T')[0];
    const isAfterStart = !ad.start_date || ad.start_date <= today;
    const isBeforeEnd = !ad.end_date || ad.end_date >= today;
    return isAfterStart && isBeforeEnd;
  });

  useEffect(() => {
    // Show popup 2 seconds after page load if there are ads and it hasn't been shown
    if (activeAds.length > 0 && !hasShown) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasShown(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeAds, hasShown]);

  if (activeAds.length === 0) return null;

  const currentAd = activeAds[currentAdIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsVisible(false)}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Close Button */}
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all group"
              >
                <X className="w-4 h-4 text-white/70 group-hover:text-white" />
              </button>

              {/* Ad Image */}
              {currentAd.image_url && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={currentAd.image_url}
                    alt={currentAd.headline}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-300 font-medium mb-3">
                  {currentAd.business_type}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  {currentAd.headline}
                </h3>
                
                <p className="text-zinc-400 text-sm mb-4">
                  {currentAd.description}
                </p>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">
                    {currentAd.business_name}
                  </span>
                  
                  {currentAd.cta_link && (
                    <a
                      href={currentAd.cta_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsVisible(false)}
                    >
                      <Button className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0">
                        {currentAd.cta_text || 'Learn More'}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>

                {/* Pagination Dots */}
                {activeAds.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/5">
                    {activeAds.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentAdIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentAdIndex
                            ? 'w-6 bg-gradient-to-r from-indigo-500 to-purple-500'
                            : 'w-1.5 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}