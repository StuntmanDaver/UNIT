import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { BRAND } from '@/lib/colors';
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
      const profileUrl = getProfileUrl();
      QRCode.toCanvas(canvasRef.current, profileUrl, {
        width: size,
        margin: 2,
        color: {
          dark: BRAND.navy,
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }).catch(err => console.error('QR generation failed:', err));
    }
  }, [business, size]);

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
      <div className="p-4 bg-white rounded-2xl shadow-lg shadow-brand-gray/50 border border-gray-100">
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
            className="rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light text-white"
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
              className="w-full h-14 justify-start text-left rounded-xl hover:bg-brand-gray border-gray-200"
            >
              <MessageSquare className="w-5 h-5 mr-3 text-brand-slate" />
              <div>
                <div className="font-medium text-gray-900">Text Link</div>
                <div className="text-xs text-gray-500">Send via SMS</div>
              </div>
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full h-14 justify-start text-left rounded-xl hover:bg-brand-gray border-gray-200"
            >
              <Copy className="w-5 h-5 mr-3 text-brand-slate" />
              <div>
                <div className="font-medium text-gray-900">Copy Link</div>
                <div className="text-xs text-gray-500">Copy to clipboard</div>
              </div>
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full h-14 justify-start text-left rounded-xl hover:bg-brand-gray border-gray-200"
            >
              <Download className="w-5 h-5 mr-3 text-brand-slate" />
              <div>
                <div className="font-medium text-gray-900">Download QR</div>
                <div className="text-xs text-gray-500">Save as PNG image</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}