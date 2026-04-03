import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { propertiesService } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { recommendationsService } from '@/services/recommendations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import UnitLogo from '@/components/UnitLogo';
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useProperty } from '@/lib/PropertyContext';
import { useAuth } from '@/lib/AuthContext';
import AuditLogTimeline from '@/components/AuditLogTimeline';
import { supabase } from '@/services/supabaseClient';
import { writeAudit } from '@/lib/AuditLogger';
import SlaDeadlineBadge from '@/components/requests/SlaDeadlineBadge';
import AssigneeField from '@/components/requests/AssigneeField';
import { toast } from 'sonner';

export default function LandlordRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const { user } = useAuth();

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      return await propertiesService.getById(propertyId);
    },
    enabled: !!propertyId
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: () => businessesService.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', propertyId],
    queryFn: () => recommendationsService.filter({ property_id: propertyId }, 'created_date', false),
    enabled: !!propertyId
  });

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (a.escalated && !b.escalated) return -1;
    if (!a.escalated && b.escalated) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => recommendationsService.update(id, { status }),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['audit_log'] });
      writeAudit({
        entityType: 'recommendation',
        entityId: variables.id,
        action: 'status_changed',
        oldValue: null,
        newValue: { status: variables.status },
        userId: user?.id,
        userEmail: user?.email
      }).catch(() => {});
      toast.success(`Request status updated to ${variables.status.replace('_', ' ')}`);
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }) =>
      recommendationsService.update(id, { assigned_to: assignedTo }),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      writeAudit({
        entityType: 'recommendation',
        entityId: variables.id,
        action: 'assigned',
        oldValue: null,
        newValue: { assigned_to: variables.assignedTo },
        userId: user?.id,
        userEmail: user?.email
      }).catch(() => {});
      toast.success(`Request assigned to ${variables.assignedTo}`);
    }
  });

  const [expandedRequestId, setExpandedRequestId] = React.useState(null);

  const { data: requestAuditEntries = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit_log', 'recommendation', expandedRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', 'recommendation')
        .eq('entity_id', expandedRequestId)
        .order('performed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedRequestId
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
      <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-steel" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy">
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/LandlordDashboard')}
              className="text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <UnitLogo size={28} />
            <h1 className="text-xl font-bold text-white">Tenant Requests</h1>
          </div>
          <span className="text-sm text-zinc-400">{property?.name}</span>
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
            <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{requestStats.submitted}</div>
                <div className="text-sm text-zinc-400 mt-1">Submitted</div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20 backdrop-blur-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{requestStats.in_progress}</div>
                <div className="text-sm text-blue-300 mt-1">In Progress</div>
              </div>
            </Card>
            <Card className="p-4 bg-green-500/10 border-green-500/20 backdrop-blur-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{requestStats.resolved}</div>
                <div className="text-sm text-green-300 mt-1">Resolved</div>
              </div>
            </Card>
            <Card className="p-4 bg-red-500/10 border-red-500/20 backdrop-blur-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{requestStats.high_priority}</div>
                <div className="text-sm text-red-300 mt-1">High Priority</div>
              </div>
            </Card>
          </motion.div>

          {/* Requests List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-brand-steel" />
                <h2 className="text-xl font-bold text-white">All Requests</h2>
                <Badge variant="outline" className="ml-auto border-white/10 text-zinc-300">{requestStats.total} total</Badge>
              </div>

              <div className="space-y-4">
                {sortedRecommendations.map((rec) => {
                  const StatusIcon = statusIcons[rec.status] || Clock;
                  return (
                    <div
                      key={rec.id}
                      className="p-5 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedRequestId(expandedRequestId === rec.id ? null : rec.id)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusIcon className={`w-4 h-4 ${
                              rec.status === 'resolved' || rec.status === 'closed' ? 'text-green-400' :
                              rec.status === 'in_progress' ? 'text-blue-400' :
                              'text-zinc-400'
                            }`} />
                            <h3 className="font-semibold text-white">{rec.title}</h3>
                            <SlaDeadlineBadge slaDeadline={rec.sla_deadline} escalated={rec.escalated} />
                          </div>
                          <p className="text-sm text-zinc-300 mb-2">{rec.description}</p>
                          <div className="flex items-center gap-3 text-sm text-zinc-400">
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
                            rec.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            'bg-slate-500/20 text-slate-300 border-slate-500/30'
                          }>
                            {rec.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-zinc-400 mr-2">Status:</span>
                        <Select
                          value={rec.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: rec.id, status: value })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-brand-navy border-white/10">
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {expandedRequestId === rec.id && (
                        <div className="mt-4 pt-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                          <ErrorBoundary variant="section">
                            <div className="mt-3 mb-3">
                              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Assignment</h4>
                              <AssigneeField
                                assignedTo={rec.assigned_to}
                                onAssign={(assignedTo) => assignMutation.mutate({ id: rec.id, assignedTo })}
                                isLoading={assignMutation.isPending}
                              />
                            </div>
                          </ErrorBoundary>
                          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Activity</h4>
                          <AuditLogTimeline entries={requestAuditEntries} isLoading={auditLoading} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {recommendations.length === 0 && (
                  <div className="text-center py-12 text-zinc-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
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
