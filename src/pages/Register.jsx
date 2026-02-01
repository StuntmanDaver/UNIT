import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Loader2, CheckCircle, Sparkles, MapPin } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    unit_number: '',
    business_name: '',
    business_description: '',
    category: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: ''
  });

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: propertyId });
      return properties[0];
    },
    enabled: !!propertyId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        return await base44.auth.me();
      }
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contact_email: user.email || '',
        contact_name: user.full_name || ''
      }));
    }
  }, [user]);

  const createBusinessMutation = useMutation({
    mutationFn: async (data) => {
      const businessData = {
        ...data,
        property_id: propertyId,
        owner_email: user?.email || data.contact_email
      };
      return await base44.entities.Business.create(businessData);
    },
    onSuccess: (newBusiness) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      navigate(createPageUrl('MyCard') + `?businessId=${newBusiness.id}`);
    }
  });

  const categories = [
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'logistics', label: 'Logistics & Warehousing' },
    { value: 'retail', label: 'Retail' },
    { value: 'food_service', label: 'Food Service' },
    { value: 'professional_services', label: 'Professional Services' },
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'construction', label: 'Construction' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      createBusinessMutation.mutate(formData);
    }
  };

  if (!propertyId) {
    navigate(createPageUrl('Welcome'));
    return null;
  }

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => step === 1 ? navigate(createPageUrl('Welcome')) : setStep(1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Unit</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-lg mx-auto">
          {/* Property Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-4 bg-white/60 backdrop-blur-sm border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{property?.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {property?.address}, {property?.city}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium">
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium text-gray-900">Business Info</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 rounded-full">
              <div className={`h-full bg-emerald-500 rounded-full transition-all ${step > 1 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 2 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                2
              </div>
              <span className={`text-sm font-medium ${step === 2 ? 'text-gray-900' : 'text-gray-500'}`}>Contact</span>
            </div>
          </div>

          {/* Form */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {step === 1 ? 'Business Information' : 'Contact Details'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 1 ? (
                  <>
                    <div>
                      <Label htmlFor="unit_number" className="text-sm font-medium text-gray-700">
                        Unit Number *
                      </Label>
                      <Input
                        id="unit_number"
                        value={formData.unit_number}
                        onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                        placeholder="e.g., 101, A-5, Building 2 Suite 300"
                        className="mt-1.5 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_name" className="text-sm font-medium text-gray-700">
                        Business Name *
                      </Label>
                      <Input
                        id="business_name"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="Your business name"
                        className="mt-1.5 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Category
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="business_description" className="text-sm font-medium text-gray-700">
                        Description
                      </Label>
                      <Textarea
                        id="business_description"
                        value={formData.business_description}
                        onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                        placeholder="Tell others about your business..."
                        className="mt-1.5 rounded-xl min-h-[100px]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="contact_name" className="text-sm font-medium text-gray-700">
                        Contact Name
                      </Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Primary contact person"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="email@business.com"
                        className="mt-1.5 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                        Website
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.yourbusiness.com"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full mt-6 py-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-base font-medium"
                  disabled={createBusinessMutation.isPending}
                >
                  {createBusinessMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : step === 1 ? (
                    'Continue'
                  ) : (
                    'Create Business Profile'
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}