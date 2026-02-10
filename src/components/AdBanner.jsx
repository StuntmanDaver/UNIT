import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdBanner({ propertyId }) {
  const [currentAdIndex, setCurrentAdIndex] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', propertyId],
    queryFn: async () => {
      const allAds = await base44.entities.Ad.filter({ 
        property_id: propertyId,
        active: true 
      });
      const now = new Date();
      return allAds.filter(ad => {
        const startDate = ad.start_date ? new Date(ad.start_date) : null;
        const endDate = ad.end_date ? new Date(ad.end_date) : null;
        return (!startDate || now >= startDate) && (!endDate || now <= endDate);
      });
    },
    enabled: !!propertyId,
    initialData: []
  });

  React.useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  if (!ads.length || dismissed) return null;

  const currentAd = ads[currentAdIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentAd.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 overflow-hidden group"
      >
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {currentAd.image_url && (
            <div className="w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
              <img 
                src={currentAd.image_url} 
                alt={currentAd.business_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-indigo-300 font-medium mb-1">
                  {currentAd.business_type === 'restaurant' ? '🍽️ Local Restaurant' : 
                   currentAd.business_type === 'cafe' ? '☕ Local Cafe' : 
                   currentAd.business_type === 'shop' ? '🛍️ Local Shop' : 
                   '📍 Local Business'}
                </div>
                <h3 className="text-lg font-bold text-white">{currentAd.headline}</h3>
              </div>
            </div>
            <p className="text-sm text-zinc-300 line-clamp-2">{currentAd.description}</p>
            
            {currentAd.cta_link && (
              <a 
                href={currentAd.cta_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                >
                  {currentAd.cta_text || 'Learn More'}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {ads.length > 1 && (
          <div className="flex gap-1.5 mt-4 justify-center">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`h-1 rounded-full transition-all ${
                  index === currentAdIndex ? 'w-8 bg-indigo-400' : 'w-1 bg-white/20'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}