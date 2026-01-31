import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy } from "lucide-react";
import { createPageUrl } from '@/utils';

export default function BusinessQRCode({ business, size = 200, showActions = true }) {
  const canvasRef = useRef(null);

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

  const handleShare = async () => {
    const profileUrl = getProfileUrl();
    const shareData = {
      title: business.business_name,
      text: `Check out ${business.business_name} - Unit ${business.unit_number}`,
      url: profileUrl
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        copyToClipboard(profileUrl);
      }
    } else {
      copyToClipboard(profileUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    alert('Profile link copied to clipboard!');
  };

  const handleCopyLink = () => {
    copyToClipboard(getProfileUrl());
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
        <div className="flex gap-2 mt-4 w-full max-w-xs">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            size="sm"
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  );
}