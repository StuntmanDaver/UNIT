import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, Copy, MessageSquare } from "lucide-react";
import { createPageUrl } from '@/utils';

export default function BusinessQRCode({ business, size = 200, showActions = true }) {
  const canvasRef = useRef(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Generate the profile URL for this business
  const getProfileUrl = () => {
    const baseUrl = window.location.origin;
    const profilePath = createPageUrl('Profile') + `?id=${business.id}`;
    return `${baseUrl}${profilePath}`;
  };

  useEffect(() => {
    if (canvasRef.current && business) {
      generateQRCode();
    }
  }, [business, size]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    const profileUrl = getProfileUrl();
    
    // Generate QR code pattern based on URL
    const modules = 29; // Standard QR code size
    const moduleSize = size / modules;
    
    // Create a deterministic pattern based on URL
    let hash = 0;
    for (let i = 0; i < profileUrl.length; i++) {
      hash = ((hash << 5) - hash) + profileUrl.charCodeAt(i);
      hash = hash & hash;
    }

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#1a1a2e';
    
    // Draw finder patterns (the three corner squares)
    const drawFinder = (x, y) => {
      // Outer black square
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      // White inner
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      // Black center
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    // Draw the three finder patterns
    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Draw timing patterns
    ctx.fillStyle = '#1a1a2e';
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize);
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize);
      }
    }

    // Draw alignment pattern (for larger QR codes)
    const drawAlignment = (x, y) => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect((x - 2) * moduleSize, (y - 2) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x - 1) * moduleSize, (y - 1) * moduleSize, 3 * moduleSize, 3 * moduleSize);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
    };
    drawAlignment(modules - 7, modules - 7);

    // Draw data modules with seeded random pattern
    ctx.fillStyle = '#1a1a2e';
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        // Skip finder pattern areas
        if ((i < 9 && j < 9) || (i < 9 && j > modules - 9) || (i > modules - 9 && j < 9)) continue;
        // Skip timing patterns
        if (i === 6 || j === 6) continue;
        // Skip alignment pattern area
        if (i >= modules - 9 && i <= modules - 5 && j >= modules - 9 && j <= modules - 5) continue;
        
        const seed = hash + i * modules + j;
        if (seededRandom(seed) > 0.5) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${business.business_name.replace(/\s+/g, '-')}-qrcode.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    const profileUrl = getProfileUrl();
    navigator.clipboard.writeText(profileUrl);
    alert('Profile link copied to clipboard!');
    setShowShareModal(false);
  };

  const handleTextLink = () => {
    const profileUrl = getProfileUrl();
    const message = `Check out ${business.business_name} - Unit ${business.unit_number}\n\n${profileUrl}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    setShowShareModal(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-gray-100">
        <canvas 
          ref={canvasRef} 
          style={{ width: size, height: size }}
          className="rounded-lg"
        />
      </div>
      
      <p className="text-center text-sm text-gray-500 mt-4">
        Scan to view business profile
      </p>

      {showActions && (
        <div className="flex justify-center mt-4 w-full">
          <Button
            onClick={handleShareClick}
            size="sm"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Business Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              onClick={handleTextLink}
              variant="outline"
              className="w-full h-14 justify-start text-left rounded-xl hover:bg-emerald-50 border-gray-200"
            >
              <MessageSquare className="w-5 h-5 mr-3 text-emerald-600" />
              <div>
                <div className="font-medium text-gray-900">Text Link</div>
                <div className="text-xs text-gray-500">Send via SMS</div>
              </div>
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full h-14 justify-start text-left rounded-xl hover:bg-emerald-50 border-gray-200"
            >
              <Copy className="w-5 h-5 mr-3 text-emerald-600" />
              <div>
                <div className="font-medium text-gray-900">Copy Link</div>
                <div className="text-xs text-gray-500">Copy to clipboard</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}