import React from 'react';
import { propertiesService } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { recommendationsService } from '@/services/recommendations';
import { leasesService, paymentsService } from '@/services/accounting';
import { unitsService } from '@/services/units';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Building2,
  Users,
  TrendingUp,
  Loader2,
  LogOut,
  PieChart,
  ClipboardList,
  DollarSign,
  Calendar,
  Calculator,
  Grid3X3
} from 'lucide-react';
import LandlordNotificationBell from '../components/LandlordNotificationBell';
import UnitLogo from '@/components/UnitLogo';
import { useProperty } from '@/lib/PropertyContext';
import { useAuth } from '@/lib/AuthContext';
import PropertySwitcher from '@/components/PropertySwitcher';

export default function LandlordDashboard() {
  const navigate = useNavigate();
  const { activePropertyId: propertyId } = useProperty();
  const { logout } = useAuth();

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      return await propertiesService.getById(propertyId);
    },
    enabled: !!propertyId
  });

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses', propertyId],
    queryFn: async () => {
      return await businessesService.filter({ property_id: propertyId });
    },
    enabled: !!propertyId
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', propertyId],
    queryFn: async () => {
      return await recommendationsService.filter({ property_id: propertyId }, 'created_date', false);
    },
    enabled: !!propertyId
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', propertyId],
    queryFn: async () => {
      return await leasesService.filter({ property_id: propertyId }, 'end_date', true);
    },
    enabled: !!propertyId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', propertyId],
    queryFn: async () => {
      return await paymentsService.filter({ property_id: propertyId }, 'due_date', false);
    },
    enabled: !!propertyId
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', propertyId],
    queryFn: () => unitsService.listByProperty(propertyId),
    enabled: !!propertyId
  });

  const handleLogout = () => {
    logout();
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

  // Unit occupancy data
  const unitsByBuilding = units.reduce((acc, unit) => {
    const building = unit.building || 'General';
    if (!acc[building]) acc[building] = [];
    const tenant = businesses.find(b =>
      b.unit_id === unit.id ||
      (!b.unit_id && b.unit_number === unit.unit_number)
    );
    acc[building].push({ ...unit, tenant });
    return acc;
  }, {});

  const occupancySummary = {
    occupied: units.filter(u => u.status === 'occupied').length,
    vacant: units.filter(u => u.status === 'vacant').length,
    maintenance: units.filter(u => u.status === 'maintenance').length
  };

  const CHART_COLORS = ['#101B29', '#1D263A', '#465A75', '#7C8DA7', '#E0E1DE', '#3b82f6', '#f59e0b', '#ef4444', '#84cc16', '#f97316'];
  const categoryChartData = Object.entries(categoryStats).map(([category, count]) => ({
    name: categoryLabels[category] || category,
    value: count
  }));

  const getBusinessName = (businessId) => {
    const business = businesses.find(b => b.id === businessId);
    return business?.business_name || 'Unknown';
  };

  if (propertyLoading || businessesLoading) {
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
            <UnitLogo size={32} />
            <span className="text-xl font-bold text-white">Unit</span>
          </div>
          <div className="flex items-center gap-2">
            <PropertySwitcher />
            <LandlordNotificationBell
              propertyId={propertyId}
              recommendations={recommendations}
              payments={payments}
              leases={leases}
              businesses={businesses}
            />
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
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
              <Building2 className="w-8 h-8 text-brand-steel" />
              <h1 className="text-3xl font-bold text-white">{property?.name}</h1>
            </div>
            <p className="text-zinc-400">
              {property?.address}, {property?.city}, {property?.state}
            </p>
          </motion.div>

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-brand-steel" />
                <h2 className="text-xl font-bold text-white">Property Overview</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Active</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{occupancyRate}%</div>
                  <div className="text-sm text-zinc-400">Occupancy</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {businesses.length}/{property?.total_units} units
                  </div>
                </div>

                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{businesses.length}</div>
                  <div className="text-sm text-zinc-400">Tenants</div>
                </div>

                <div>
                  <div className="w-8 h-8 rounded-lg bg-brand-slate/20 flex items-center justify-center mb-2">
                    <DollarSign className="w-4 h-4 text-brand-steel" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">${totalExpectedRevenue.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">Monthly Revenue</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    ${monthlyRevenue.toLocaleString()} collected
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    {expiringLeases.length > 0 && (
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">!</Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{expiringLeases.length}</div>
                  <div className="text-sm text-zinc-400">Expiring Leases</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Next 90 days
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Request Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-brand-steel" />
                <h2 className="text-xl font-bold text-white">Requests Overview</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-white">{requestStats.total}</div>
                  <div className="text-xs text-zinc-400 mt-1">Total</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-yellow-400">{requestStats.submitted}</div>
                  <div className="text-xs text-zinc-400 mt-1">Submitted</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-400">{requestStats.in_progress}</div>
                  <div className="text-xs text-zinc-400 mt-1">In Progress</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-emerald-400">{requestStats.resolved}</div>
                  <div className="text-xs text-zinc-400 mt-1">Resolved</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-red-400">{requestStats.high_priority}</div>
                  <div className="text-xs text-zinc-400 mt-1">High Priority</div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Unit Occupancy */}
          {units.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-brand-steel" />
                    <h2 className="text-xl font-bold text-white">Unit Occupancy</h2>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-zinc-400">{occupancySummary.occupied} Occupied</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-zinc-600" />
                      <span className="text-zinc-400">{occupancySummary.vacant} Vacant</span>
                    </div>
                    {occupancySummary.maintenance > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-zinc-400">{occupancySummary.maintenance} Maintenance</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(unitsByBuilding).sort(([a], [b]) => a.localeCompare(b)).map(([building, buildingUnits]) => (
                    <div key={building}>
                      <div className="text-sm font-medium text-zinc-400 mb-3">
                        {building !== 'General' ? `Building ${building}` : 'Units'}
                        <span className="text-zinc-600 ml-2">({buildingUnits.length})</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {buildingUnits.map(unit => (
                          <div
                            key={unit.id}
                            className={`p-2 rounded-lg border text-center cursor-default transition-colors ${
                              unit.status === 'occupied'
                                ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                                : unit.status === 'maintenance'
                                ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                            title={unit.tenant ? `${unit.unit_number} — ${unit.tenant.business_name}` : `${unit.unit_number} — Vacant`}
                          >
                            <div className="text-xs font-mono font-medium text-white truncate">
                              {unit.building && unit.unit_number.startsWith(`${unit.building}-`)
                                ? unit.unit_number.slice(unit.building.length + 1)
                                : unit.unit_number}
                            </div>
                            {unit.tenant && (
                              <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                                {unit.tenant.business_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tenant Category Distribution & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="w-5 h-5 text-brand-steel" />
                  <h2 className="text-xl font-bold text-white">Tenant Distribution by Category</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    {categoryChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <RechartsPieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-zinc-500">No tenants yet</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(categoryStats).map(([category, count], index) => {
                      const percentage = ((count / businesses.length) * 100).toFixed(1);
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <div className="flex-1 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-sm text-zinc-300">{categoryLabels[category] || category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">{count} tenant{count !== 1 ? 's' : ''}</span>
                              <span className="text-sm font-bold text-white">{percentage}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-4">
                  <Button
                    onClick={() => navigate('/LandlordRequests')}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  >
                    <ClipboardList className="w-6 h-6 text-brand-steel" />
                    <span className="font-medium">Requests</span>
                  </Button>
                  <Button
                    onClick={() => navigate('/Accounting')}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Calculator className="w-6 h-6 text-brand-steel" />
                    <span className="font-medium">Accounting</span>
                  </Button>
                  <Button
                    onClick={() => navigate(`/Directory?propertyId=${propertyId}`)}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Users className="w-6 h-6 text-blue-400" />
                    <span className="font-medium">Directory</span>
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6"
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="w-5 h-5 text-brand-steel" />
                <h2 className="text-xl font-bold text-white">Recent Payments</h2>
                {overduePayments.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">{overduePayments.length} overdue</Badge>
                )}
              </div>
              <div className="space-y-3">
                {payments.slice(0, 5).map(payment => (
                  <div key={payment.id} className={`flex items-center justify-between p-4 rounded-xl ${payment.status === 'overdue' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10'}`}>
                    <div>
                      <div className="font-medium text-white">{getBusinessName(payment.business_id)}</div>
                      <div className="text-sm text-zinc-400 mt-1">Due {new Date(payment.due_date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-white">${payment.amount?.toLocaleString()}</div>
                      <Badge className={
                        payment.status === 'paid' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        payment.status === 'overdue' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      }>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">No payment records yet</div>
                )}
              </div>
            </Card>
          </motion.div>

        </div>
      </main>
    </div>
  );
}