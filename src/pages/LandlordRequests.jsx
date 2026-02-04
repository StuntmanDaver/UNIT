import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function LandlordRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: propertyId });
      return properties[0];
    },
    enabled: !!propertyId
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: () => base44.entities.Business.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', propertyId],
    queryFn: () => base44.entities.Recommendation.filter({ property_id: propertyId }, '-created_date'),
    enabled: !!propertyId
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Recommendation.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    }
  });

  const getBusinessName = (businessId) => {
    const business = businesses.find(b => b.id === businessId);
    return business?.business_name || 'Unknown Business';
  };

  const requestStats = {
    total: recommendations.length,
    submitted: recommendations.filter(r => r.status === 'submitted').length,
    in_progress: recommendations.filter(r => r.status === 'in_progress').length,
    resolved: recommendations.filter(r => r.status === 'resolved').length,
    high_priority: recommendations.filter(r => r.priority === 'high').length
  };

  const statusIcons = {
    submitted: Clock,
    in_progress: AlertCircle,
    resolved: CheckCircle2,
    closed: CheckCircle2
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('LandlordDashboard') + `?propertyId=${propertyId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Tenant Requests</h1>
          </div>
          <span className="text-sm text-gray-600">{property?.name}</span>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="p-4 bg-white border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">{requestStats.submitted}</div>
                <div className="text-sm text-gray-500 mt-1">Submitted</div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{requestStats.in_progress}</div>
                <div className="text-sm text-blue-600 mt-1">In Progress</div>
              </div>
            </Card>
            <Card className="p-4 bg-green-50 border-green-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{requestStats.resolved}</div>
                <div className="text-sm text-green-600 mt-1">Resolved</div>
              </div>
            </Card>
            <Card className="p-4 bg-red-50 border-red-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700">{requestStats.high_priority}</div>
                <div className="text-sm text-red-600 mt-1">High Priority</div>
              </div>
            </Card>
          </motion.div>

          {/* Requests List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">All Requests</h2>
                <Badge variant="outline" className="ml-auto">{requestStats.total} total</Badge>
              </div>

              <div className="space-y-4">
                {recommendations.map((rec) => {
                  const StatusIcon = statusIcons[rec.status] || Clock;
                  return (
                    <div key={rec.id} className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className={`w-4 h-4 ${
                              rec.status === 'resolved' || rec.status === 'closed' ? 'text-green-600' :
                              rec.status === 'in_progress' ? 'text-blue-600' :
                              'text-gray-500'
                            }`} />
                            <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="font-medium">{getBusinessName(rec.business_id)}</span>
                            <span>•</span>
                            <span>{rec.type.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{rec.category}</span>
                            {rec.location && (
                              <>
                                <span>•</span>
                                <span>{rec.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-600'
                          }>
                            {rec.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600 mr-2">Status:</span>
                        <Select
                          value={rec.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: rec.id, status: value })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
                
                {recommendations.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No requests submitted yet</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}