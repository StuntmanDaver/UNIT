import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { propertiesService } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { postsService } from '@/services/posts';
import { notificationsService } from '@/services/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import BottomNav from '@/components/BottomNav';
import NotificationBell from '@/components/NotificationBell';
import AdPopup from '@/components/AdPopup';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  Building2, 
  Loader2,
  Users,
  MessageSquare,
  Home,
  Plus,
  Megaphone,
  Calendar,
  Tag
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
      return await propertiesService.getById(propertyId);
    },
    enabled: !!propertyId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      }
      return null;
    }
  });

  const { data: userBusiness } = useQuery({
    queryKey: ['userBusiness', user?.email, propertyId],
    queryFn: async () => {
      if (!user?.email || !propertyId) return null;
      const businesses = await businessesService.filter({
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
      return await postsService.filter({ property_id: propertyId }, 'created_date', false);
    },
    enabled: !!propertyId,
    initialData: []
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return await businessesService.filter({ property_id: propertyId });
    },
    enabled: !!propertyId,
    initialData: []
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      const newPost = await postsService.create({
        ...postData,
        property_id: propertyId,
        business_id: userBusiness?.id
      });

      // Create notifications for all businesses in the property
      const otherBusinesses = businesses.filter(b => b.id !== userBusiness?.id);
      await Promise.all(
        otherBusinesses.map(business =>
          notificationsService.create({
            user_email: business.owner_email,
            property_id: propertyId,
            type: 'post',
            title: 'New Community Post',
            message: `${userBusiness?.business_name} posted: ${postData.title}`,
            related_id: newPost.id
          })
        )
      );

      return newPost;
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
    { value: 'offer', label: 'Offers', icon: Tag }
  ];

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-gray via-white to-brand-gray/30 flex items-center justify-center px-6">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No property selected</h2>
          <p className="text-gray-500 mt-2">Please select a property to view its community.</p>
          <Button
            onClick={() => navigate(createPageUrl('Welcome'))}
            className="mt-6 rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy"
          >
            Find Your Property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-slate via-brand-steel to-brand-gray p-[2px]">
              <div className="w-full h-full rounded-lg bg-brand-navy flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-br from-brand-steel to-brand-gray bg-clip-text text-transparent">U</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white">Unit</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell propertyId={propertyId} />
            <nav className="hidden sm:flex items-center gap-1">
              <Link to={createPageUrl('Welcome')}>
                <Button variant="ghost" size="sm" className="rounded-xl text-zinc-400 hover:text-white hover:bg-white/5">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link to={createPageUrl('Directory') + `?propertyId=${propertyId}`}>
                <Button variant="ghost" size="sm" className="rounded-xl text-zinc-400 hover:text-white hover:bg-white/5">
                  <Users className="w-4 h-4 mr-2" />
                  Directory
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="rounded-xl bg-brand-slate/10 text-brand-steel border border-brand-slate/20">
                <MessageSquare className="w-4 h-4 mr-2" />
                Community
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <BottomNav propertyId={propertyId} />
      <AdPopup propertyId={propertyId} />

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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-slate to-brand-navy flex items-center justify-center shadow-lg shadow-brand-slate/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Community</h1>
                  <p className="text-zinc-400">{property?.name}</p>
                </div>
              </div>
              
              {userBusiness && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light border-0 shadow-lg shadow-brand-slate/20"
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
                        ? 'bg-brand-slate text-white hover:bg-brand-slate-light border-0'
                        : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-brand-slate/50 hover:text-white'
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
              <Loader2 className="w-8 h-8 animate-spin text-brand-steel" />
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
                  className="mt-6 rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy"
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