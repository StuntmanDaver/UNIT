import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import BottomNav from '@/components/BottomNav';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Loader2,
  Sparkles,
  Users,
  MessageSquare,
  Home,
  Plus,
  Megaphone,
  Calendar,
  Tag,
  HelpCircle
} from 'lucide-react';

export default function Community() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const { data: userBusiness } = useQuery({
    queryKey: ['userBusiness', user?.email, propertyId],
    queryFn: async () => {
      if (!user?.email || !propertyId) return null;
      const businesses = await base44.entities.Business.filter({ 
        owner_email: user.email,
        property_id: propertyId
      });
      return businesses[0] || null;
    },
    enabled: !!user?.email && !!propertyId
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return await base44.entities.Post.filter({ property_id: propertyId }, '-created_date');
    },
    enabled: !!propertyId,
    initialData: []
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return await base44.entities.Business.filter({ property_id: propertyId });
    },
    enabled: !!propertyId,
    initialData: []
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      return await base44.entities.Post.create({
        ...postData,
        property_id: propertyId,
        business_id: userBusiness?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', propertyId] });
      setShowCreateModal(false);
    }
  });

  const getBusinessById = (businessId) => {
    return businesses.find(b => b.id === businessId);
  };

  const filteredPosts = posts.filter(post => {
    return selectedType === 'all' || post.type === selectedType;
  });

  const postTypes = [
    { value: 'all', label: 'All', icon: MessageSquare },
    { value: 'announcement', label: 'Announcements', icon: Megaphone },
    { value: 'event', label: 'Events', icon: Calendar },
    { value: 'offer', label: 'Offers', icon: Tag },
    { value: 'request', label: 'Requests', icon: HelpCircle }
  ];

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center px-6">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No property selected</h2>
          <p className="text-gray-500 mt-2">Please select a property to view its community.</p>
          <Button
            onClick={() => navigate(createPageUrl('Welcome'))}
            className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600"
          >
            Find Your Property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697e319135e62b1a097e0674/52d9677df_Screenshot2026-01-31at92613PM.png" 
              alt="Unit" 
              className="h-20 w-auto"
            />
          </div>
          
          <nav className="hidden sm:flex items-center gap-1">
            <Link to={createPageUrl('Welcome')}>
              <Button variant="ghost" size="sm" className="rounded-xl text-gray-600">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link to={createPageUrl('Directory') + `?propertyId=${propertyId}`}>
              <Button variant="ghost" size="sm" className="rounded-xl text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                Directory
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="rounded-xl bg-indigo-50 text-emerald-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Community
            </Button>
          </nav>
        </div>
      </header>

      <BottomNav propertyId={propertyId} />

      <main className="pt-24 pb-24 sm:pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Property Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Community</h1>
                  <p className="text-gray-500">{property?.name}</p>
                </div>
              </div>
              
              {userBusiness && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create Post</span>
                  <span className="sm:hidden">Post</span>
                </Button>
              )}
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {postTypes.map(type => {
                const Icon = type.icon;
                return (
                  <Badge
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`cursor-pointer whitespace-nowrap px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                      selectedType === type.value
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                  </Badge>
                );
              })}
            </div>
          </motion.div>

          {/* Posts */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredPosts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <PostCard
                    post={post}
                    business={getBusinessById(post.business_id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No posts yet</h3>
              <p className="text-gray-500 mt-2">
                {userBusiness 
                  ? 'Be the first to share something with the community!'
                  : 'Create a business profile to start posting'}
              </p>
              {!userBusiness && (
                <Button
                  onClick={() => navigate(createPageUrl('Register') + `?propertyId=${propertyId}`)}
                  className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600"
                >
                  Create Business Profile
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createPostMutation.mutate(data)}
        isLoading={createPostMutation.isPending}
      />
    </div>
  );
}