import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessQRCode from '@/components/BusinessQRCode';
import BottomNav from '@/components/BottomNav';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  MessageSquare,
  Sparkles,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Plus,
  Settings
} from 'lucide-react';

export default function MyCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const businessIdFromUrl = urlParams.get('businessId');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        return await base44.auth.me();
      }
      return null;
    }
  });

  // If businessId is in URL, fetch that specific business
  // Otherwise, fetch the user's business by their email
  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ['myBusiness', businessIdFromUrl, user?.email],
    queryFn: async () => {
      if (businessIdFromUrl) {
        const businesses = await base44.entities.Business.filter({ id: businessIdFromUrl });
        return businesses[0];
      } else if (user?.email) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        return businesses[0];
      }
      return null;
    },
    enabled: !!businessIdFromUrl || !!user?.email
  });

  const { data: property } = useQuery({
    queryKey: ['property', business?.property_id],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: business.property_id });
      return properties[0];
    },
    enabled: !!business?.property_id
  });

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

  const updateBusinessMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Business.update(business.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBusiness'] });
      setShowEditModal(false);
    }
  });

  const handleEdit = () => {
    setFormData({
      business_name: business.business_name,
      contact_name: business.contact_name,
      contact_email: business.contact_email,
      contact_phone: business.contact_phone,
      unit_number: business.unit_number,
      website: business.website,
      business_description: business.business_description,
      category: business.category
    });
    setShowEditModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateBusinessMutation.mutate(formData);
  };

  const isLoading = userLoading || businessLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // No business profile yet - prompt to create one
  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
        <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                <div className="w-full h-full rounded-lg bg-zinc-900 flex items-center justify-center">
                  <span className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-pink-400 bg-clip-text text-transparent">U</span>
                </div>
              </div>
              <span className="text-xl font-bold text-white">Unit</span>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-24 px-6 flex items-center justify-center min-h-screen">
          <Card className="p-8 text-center max-w-md bg-zinc-900/50 backdrop-blur-xl border-white/10">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">No Business Profile Yet</h2>
            <p className="text-zinc-400 mt-2">
              Create your business profile to get your digital business card with a shareable QR code.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Welcome'))}
              className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Business Profile
            </Button>
          </Card>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="w-10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
              <div className="w-full h-full rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-pink-400 bg-clip-text text-transparent">U</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEdit}
            className="rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="pt-24 pb-24 px-6">
        <div className="max-w-lg mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-bold text-white">My Business Card</h1>
            <p className="text-zinc-400 mt-1">Share your profile with others</p>
          </motion.div>

          {/* Digital Business Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden bg-zinc-900/50 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50">
              {/* Card Header */}
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
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
                    {business.category && (
                      <Badge className="mt-2 bg-white/20 text-white border-0 hover:bg-white/30">
                        {getCategoryLabel(business.category)}
                      </Badge>
                    )}
                  </div>
                </div>
                {property && (
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-white/70" />
                    <span className="text-white/80 text-sm">{property.name}</span>
                  </div>
                )}
              </div>

              {/* QR Code Section */}
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide text-center mb-4">
                    Scan to View Profile
                  </h3>
                  <BusinessQRCode business={business} size={180} />
                </div>

                {/* Contact Info */}
                <div className="space-y-2 border-t border-white/10 pt-6">
                  {business.contact_email && (
                    <a href={`mailto:${business.contact_email}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Mail className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300 text-sm">{business.contact_email}</span>
                    </a>
                  )}
                  {business.contact_phone && (
                    <a href={`tel:${business.contact_phone}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Phone className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300 text-sm">{business.contact_phone}</span>
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-indigo-500/30 transition-colors">
                      <Globe className="w-5 h-5 text-indigo-400" />
                      <span className="text-zinc-300 text-sm truncate">{business.website}</span>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>


        </div>
      </main>

      <BottomNav propertyId={business?.property_id} />

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name || ''}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name || ''}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_number">Unit Number *</Label>
                <Input
                  id="unit_number"
                  value={formData.unit_number || ''}
                  onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="food_service">Food Service</SelectItem>
                    <SelectItem value="professional_services">Professional Services</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="business_description">Business Description</Label>
              <Textarea
                id="business_description"
                value={formData.business_description || ''}
                onChange={(e) => setFormData({...formData, business_description: e.target.value})}
                className="mt-1 h-24"
                placeholder="Describe what your business does..."
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Property:</strong> {property?.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                To change your property, please contact <a href="mailto:support@unitapp.com" className="text-emerald-600 hover:text-emerald-700 underline">support</a>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={updateBusinessMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={updateBusinessMutation.isPending}
              >
                {updateBusinessMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}