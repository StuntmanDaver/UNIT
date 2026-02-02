import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '@/components/BottomNav';
import RecommendationCard from '@/components/RecommendationCard';
import CreateRecommendationModal from '@/components/CreateRecommendationModal';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Sparkles, Plus, Loader2, AlertCircle, Wrench, Lightbulb } from 'lucide-react';

export default function Recommendations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  const [selectedType, setSelectedType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('enhancement');

  const { data: property } = useQuery({
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

  const { data: myBusiness } = useQuery({
    queryKey: ['myBusiness', user?.email],
    queryFn: async () => {
      if (user?.email) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        return businesses[0];
      }
      return null;
    },
    enabled: !!user?.email
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', propertyId],
    queryFn: async () => {
      return await base44.entities.Recommendation.filter({ property_id: propertyId }, '-created_date');
    },
    enabled: !!propertyId
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      return await base44.entities.Business.filter({ property_id: propertyId });
    },
    enabled: !!propertyId
  });

  const createRecommendationMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Recommendation.create({
        ...data,
        property_id: propertyId,
        business_id: myBusiness.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setShowModal(false);
    }
  });

  const handleOpenModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const filteredRecommendations = selectedType === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.type === selectedType);

  if (!propertyId) {
    navigate(createPageUrl('Welcome'));
    return null;
  }

  if (!myBusiness) {
    return <UserNotRegisteredError />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697e319135e62b1a097e0674/f1a080168_Screenshot_2026-02-02_at_25726_PM-removebg-preview.png" alt="Unit" className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">Unit</span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recommendations</h1>
            <p className="text-gray-600">
              Submit enhancements, issues, or work orders for {property?.name}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 grid grid-cols-3 gap-3"
          >
            <Button
              onClick={() => handleOpenModal('enhancement')}
              className="bg-blue-500 hover:bg-blue-600 text-white h-auto py-4 flex flex-col gap-2"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="text-sm">Enhancement</span>
            </Button>
            <Button
              onClick={() => handleOpenModal('issue')}
              className="bg-orange-500 hover:bg-orange-600 text-white h-auto py-4 flex flex-col gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Report Issue</span>
            </Button>
            <Button
              onClick={() => handleOpenModal('work_order')}
              className="bg-purple-500 hover:bg-purple-600 text-white h-auto py-4 flex flex-col gap-2"
            >
              <Wrench className="w-5 h-5" />
              <span className="text-sm">Work Order</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex gap-2"
          >
            <Badge
              onClick={() => setSelectedType('all')}
              className={`cursor-pointer flex-1 text-center px-3 py-2 ${
                selectedType === 'all' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300' 
                  : 'bg-white text-gray-600 hover:border-gray-300 hover:text-gray-700'
              }`}
              variant="outline"
            >
              All
            </Badge>
            <Badge
              onClick={() => setSelectedType('enhancement')}
              className={`cursor-pointer flex-1 text-center px-3 py-2 ${
                selectedType === 'enhancement' 
                  ? 'bg-blue-50 text-blue-600 border-blue-300' 
                  : 'bg-white text-gray-600 hover:border-gray-300 hover:text-gray-700'
              }`}
              variant="outline"
            >
              Enhancements
            </Badge>
            <Badge
              onClick={() => setSelectedType('issue')}
              className={`cursor-pointer flex-1 text-center px-3 py-2 ${
                selectedType === 'issue' 
                  ? 'bg-orange-50 text-orange-600 border-orange-300' 
                  : 'bg-white text-gray-600 hover:border-gray-300 hover:text-gray-700'
              }`}
              variant="outline"
            >
              Issues
            </Badge>
            <Badge
              onClick={() => setSelectedType('work_order')}
              className={`cursor-pointer flex-1 text-center px-3 py-2 ${
                selectedType === 'work_order' 
                  ? 'bg-purple-50 text-purple-600 border-purple-300' 
                  : 'bg-white text-gray-600 hover:border-gray-300 hover:text-gray-700'
              }`}
              variant="outline"
            >
              Work Orders
            </Badge>
          </motion.div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h3>
              <p className="text-gray-500">Be the first to submit an enhancement, issue, or work order</p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredRecommendations.map((recommendation) => {
                const business = businesses.find(b => b.id === recommendation.business_id);
                return (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    business={business}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CreateRecommendationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={(data) => createRecommendationMutation.mutate(data)}
        type={modalType}
        isLoading={createRecommendationMutation.isPending}
      />

      <BottomNav propertyId={propertyId} />
    </div>
  );
}