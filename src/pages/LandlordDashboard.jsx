import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  ArrowLeft, 
  Building2, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  LogOut,
  PieChart,
  ClipboardList,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Calculator
} from 'lucide-react';

export default function LandlordDashboard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  // Verify landlord session
  useEffect(() => {
    const storedPropertyId = sessionStorage.getItem('landlord_property_id');
    if (!storedPropertyId || storedPropertyId !== propertyId) {
      navigate(createPageUrl('LandlordLogin'));
    }
  }, [propertyId, navigate]);

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ id: propertyId });
      return properties[0];
    },
    enabled: !!propertyId
  });

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      return await base44.entities.Business.filter({ property_id: propertyId });
    },
    enabled: !!propertyId
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', propertyId],
    queryFn: async () => {
      return await base44.entities.Recommendation.filter({ property_id: propertyId }, '-created_date');
    },
    enabled: !!propertyId
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', propertyId],
    queryFn: async () => {
      return await base44.entities.Lease.filter({ property_id: propertyId }, 'end_date');
    },
    enabled: !!propertyId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', propertyId],
    queryFn: async () => {
      return await base44.entities.Payment.filter({ property_id: propertyId }, '-due_date');
    },
    enabled: !!propertyId
  });

  const handleLogout = () => {
    sessionStorage.removeItem('landlord_property_id');
    navigate(createPageUrl('Welcome'));
  };

  // Calculate occupancy
  const occupancyRate = property?.total_units 
    ? ((businesses.length / property.total_units) * 100).toFixed(1)
    : 0;

  // Calculate category distribution
  const categoryStats = businesses.reduce((acc, business) => {
    const category = business.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const categoryLabels = {
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

  // Recommendation stats
  const requestStats = {
    total: recommendations.length,
    submitted: recommendations.filter(r => r.status === 'submitted').length,
    in_progress: recommendations.filter(r => r.status === 'in_progress').length,
    resolved: recommendations.filter(r => r.status === 'resolved').length,
    high_priority: recommendations.filter(r => r.priority === 'high').length
  };

  // Lease stats
  const today = new Date();
  const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringLeases = leases.filter(lease => {
    const endDate = new Date(lease.end_date);
    return endDate >= today && endDate <= threeMonthsFromNow;
  });

  // Payment stats
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const monthlyRevenue = payments
    .filter(p => p.status === 'paid' && new Date(p.paid_date).getMonth() === today.getMonth())
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpectedRevenue = leases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  if (propertyLoading || businessesLoading) {
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Unit</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">{property?.name}</h1>
            </div>
            <p className="text-gray-600">
              {property?.address}, {property?.city}, {property?.state}
            </p>
          </motion.div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{occupancyRate}%</div>
                <div className="text-sm text-gray-500">Occupancy Rate</div>
                <div className="text-xs text-gray-400 mt-2">
                  {businesses.length} of {property?.total_units} units occupied
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{businesses.length}</div>
                <div className="text-sm text-gray-500">Total Tenants</div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">${totalExpectedRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Monthly Revenue</div>
                <div className="text-xs text-gray-400 mt-2">
                  ${monthlyRevenue.toLocaleString()} collected this month
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  {expiringLeases.length > 0 && (
                    <Badge className="bg-orange-50 text-orange-700">Action Needed</Badge>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{expiringLeases.length}</div>
                <div className="text-sm text-gray-500">Expiring Leases</div>
                <div className="text-xs text-gray-400 mt-2">
                  Within next 90 days
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Payment Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-900">Payment Status</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-700">
                      ${payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Paid</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-700">
                      ${overduePayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Overdue</div>
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3">Recent Payments</h3>
                  {payments.slice(0, 4).map((payment) => {
                    const business = businesses.find(b => b.id === payment.business_id);
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{business?.business_name}</div>
                          <div className="text-xs text-gray-500">Due {new Date(payment.due_date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">${payment.amount.toLocaleString()}</div>
                          <Badge className={
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                            payment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {payments.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No payments recorded
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Tenant Category Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <Card className="p-6 bg-white border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <PieChart className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Tenant Distribution by Category</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(categoryStats).map(([category, count]) => {
                  const percentage = ((count / businesses.length) * 100).toFixed(1);
                  return (
                    <div key={category} className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
                      <div className="text-sm text-gray-600 mt-1">{categoryLabels[category]}</div>
                      <div className="text-xs text-gray-400 mt-1">{count} tenant{count !== 1 ? 's' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <Card className="p-6 bg-white border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => navigate(createPageUrl('Accounting') + `?propertyId=${propertyId}`)}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  <Calculator className="w-6 h-6 text-emerald-600" />
                  <span className="font-medium">Accounting</span>
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('Accounting') + `?propertyId=${propertyId}&tab=leases`)}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span className="font-medium">Lease Management</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  <ClipboardList className="w-6 h-6 text-purple-600" />
                  <span className="font-medium">Requests</span>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Requests Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="p-6 bg-white border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-900">Tenant Requests</h2>
                </div>
                <Badge variant="outline">{requestStats.total} total</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-700">{requestStats.submitted}</div>
                  <div className="text-sm text-gray-500 mt-1">Submitted</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700">{requestStats.in_progress}</div>
                  <div className="text-sm text-blue-600 mt-1">In Progress</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-700">{requestStats.resolved}</div>
                  <div className="text-sm text-green-600 mt-1">Resolved</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-700">{requestStats.high_priority}</div>
                  <div className="text-sm text-red-600 mt-1">High Priority</div>
                </div>
              </div>

              {/* Recent Requests */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Recent Requests</h3>
                {recommendations.slice(0, 5).map((rec) => {
                  const business = businesses.find(b => b.id === rec.business_id);
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{rec.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {business?.business_name} • {rec.type.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">
                          {rec.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {recommendations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No requests submitted yet
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