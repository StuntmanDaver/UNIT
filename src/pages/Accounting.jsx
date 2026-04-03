import React, { useState } from 'react';
import { propertiesService } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { leasesService, recurringPaymentsService, invoicesService, expensesService, paymentsService, transitionInvoiceStatus } from '@/services/accounting';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { writeAudit } from '@/lib/AuditLogger';
import { useAuth } from '@/lib/AuthContext';
import InvoiceStatusActions from '@/components/accounting/InvoiceStatusActions';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import RecurringPaymentModal from '@/components/accounting/RecurringPaymentModal';
import InvoiceModal from '@/components/accounting/InvoiceModal';
import ExpenseModal from '@/components/accounting/ExpenseModal';
import LeaseModal from '@/components/accounting/LeaseModal';
import FinancialReports from '@/components/accounting/FinancialReports';
import UnitLogo from '@/components/UnitLogo';
import {
  ArrowLeft,
  Plus,
  Repeat,
  FileText,
  Receipt,
  BarChart3,
  Trash2
} from 'lucide-react';
import { useProperty } from '@/lib/PropertyContext';
import AuditLogTimeline from '@/components/AuditLogTimeline';
import { supabase } from '@/services/supabaseClient';

export default function Accounting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activePropertyId: propertyId } = useProperty();
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'reports';

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

  const { data: invoiceAuditEntries = [], isLoading: invoiceAuditLoading } = useQuery({
    queryKey: ['audit_log', 'invoice', expandedInvoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', 'invoice')
        .eq('entity_id', expandedInvoiceId)
        .order('performed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedInvoiceId
  });

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

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', propertyId],
    queryFn: () => leasesService.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const { data: recurringPayments = [] } = useQuery({
    queryKey: ['recurringPayments', propertyId],
    queryFn: () => recurringPaymentsService.filter({ property_id: propertyId }, 'created_date', false),
    enabled: !!propertyId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', propertyId],
    queryFn: () => invoicesService.filter({ property_id: propertyId }, 'invoice_date', false),
    enabled: !!propertyId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', propertyId],
    queryFn: () => expensesService.filter({ property_id: propertyId }, 'expense_date', false),
    enabled: !!propertyId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', propertyId],
    queryFn: () => paymentsService.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const createRecurringPaymentMutation = useMutation({
    mutationFn: (data) => recurringPaymentsService.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      setShowRecurringModal(false);
      writeAudit({ entityType: 'recurring_payment', entityId: created.id, action: 'created', oldValue: null, newValue: created, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => invoicesService.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowInvoiceModal(false);
      writeAudit({ entityType: 'invoice', entityId: created.id, action: 'created', oldValue: null, newValue: created, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => expensesService.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowExpenseModal(false);
      writeAudit({ entityType: 'expense', entityId: created.id, action: 'created', oldValue: null, newValue: created, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const createLeaseMutation = useMutation({
    mutationFn: (data) => leasesService.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowLeaseModal(false);
      setEditingLease(null);
      writeAudit({ entityType: 'lease', entityId: created.id, action: 'created', oldValue: null, newValue: created, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const updateLeaseMutation = useMutation({
    mutationFn: ({ id, data }) => leasesService.update(id, data),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowLeaseModal(false);
      setEditingLease(null);
      writeAudit({ entityType: 'lease', entityId: variables.id, action: 'updated', oldValue: null, newValue: updated, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => invoicesService.update(id, data),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowInvoiceModal(false);
      setEditingInvoice(null);
      writeAudit({ entityType: 'invoice', entityId: variables.id, action: 'updated', oldValue: null, newValue: updated, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => expensesService.update(id, data),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowExpenseModal(false);
      setEditingExpense(null);
      writeAudit({ entityType: 'expense', entityId: variables.id, action: 'updated', oldValue: null, newValue: updated, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const updateRecurringMutation = useMutation({
    mutationFn: ({ id, data }) => recurringPaymentsService.update(id, data),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      setShowRecurringModal(false);
      setEditingRecurring(null);
      writeAudit({ entityType: 'recurring_payment', entityId: variables.id, action: 'updated', oldValue: null, newValue: updated, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const deleteLeaseMutation = useMutation({
    mutationFn: (id) => leasesService.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      writeAudit({ entityType: 'lease', entityId: variables, action: 'deleted', oldValue: { id: variables }, newValue: null, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => invoicesService.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      writeAudit({ entityType: 'invoice', entityId: variables, action: 'deleted', oldValue: { id: variables }, newValue: null, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => expensesService.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      writeAudit({ entityType: 'expense', entityId: variables, action: 'deleted', oldValue: { id: variables }, newValue: null, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (id) => recurringPaymentsService.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      writeAudit({ entityType: 'recurring_payment', entityId: variables, action: 'deleted', oldValue: { id: variables }, newValue: null, userId: user?.id, userEmail: user?.email }).catch(() => {});
    }
  });

  const transitionMutation = useMutation({
    mutationFn: ({ invoiceId, newStatus }) =>
      transitionInvoiceStatus(invoiceId, newStatus, {
        userId: user?.id,
        userEmail: user?.email
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['audit_log', 'invoice', updated.id] });
      const messages = {
        sent: 'Invoice sent to tenant',
        paid: 'Invoice marked as paid',
        void: 'Invoice voided'
      };
      toast.success(messages[updated.status] || 'Invoice updated');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update invoice status');
    }
  });

  const handleInvoiceSubmit = (data) => {
    if (editingInvoice) {
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createInvoiceMutation.mutate(data);
    }
  };

  const handleExpenseSubmit = (data) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const handleRecurringSubmit = (data) => {
    if (editingRecurring) {
      updateRecurringMutation.mutate({ id: editingRecurring.id, data });
    } else {
      createRecurringPaymentMutation.mutate(data);
    }
  };

  const getBusinessName = (businessId) => {
    const business = businesses.find(b => b.id === businessId);
    return business?.business_name || 'Unknown';
  };

  const handleEditLease = (lease) => {
    setEditingLease(lease);
    setShowLeaseModal(true);
  };

  const handleCreateLease = () => {
    setEditingLease(null);
    setShowLeaseModal(true);
  };

  const handleLeaseSubmit = (data) => {
    if (editingLease) {
      updateLeaseMutation.mutate({ id: editingLease.id, data });
    } else {
      createLeaseMutation.mutate(data);
    }
  };

  // Calculate lease stats
  const today = new Date();
  const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringLeases = leases.filter(lease => {
    const endDate = new Date(lease.end_date);
    return endDate >= today && endDate <= threeMonthsFromNow && lease.status === 'active';
  });

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
            <h1 className="text-xl font-bold text-white">Accounting</h1>
          </div>
          <span className="text-sm text-zinc-400">{property?.name}</span>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10">
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="leases" className="gap-2">
                <FileText className="w-4 h-4" />
                Leases
              </TabsTrigger>
              <TabsTrigger value="recurring" className="gap-2">
                <Repeat className="w-4 h-4" />
                Recurring Payments
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2">
                <FileText className="w-4 h-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-2">
                <Receipt className="w-4 h-4" />
                Expenses
              </TabsTrigger>
            </TabsList>

            {/* Financial Reports */}
            <TabsContent value="reports">
              <FinancialReports 
                payments={payments} 
                expenses={expenses} 
                leases={leases}
                businesses={businesses}
              />
            </TabsContent>

            {/* Lease Management */}
            <TabsContent value="leases">
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex flex-col items-center mb-6">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-white">Lease Management</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {leases.length} total leases • {expiringLeases.length} expiring soon
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateLease}
                    className="bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lease
                  </Button>
                </div>

                {/* Lease Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {leases.filter(l => l.status === 'active').length}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Active</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-700">{expiringLeases.length}</div>
                    <div className="text-xs text-orange-600 mt-1">Expiring Soon</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {leases.filter(l => l.status === 'expired').length}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Expired</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      ${leases.filter(l => l.status === 'active').reduce((sum, l) => sum + (l.monthly_rent || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Monthly Revenue</div>
                  </div>
                </div>

                {/* Leases List */}
                <div className="space-y-3">
                  {leases.map((lease) => {
                    const business = businesses.find(b => b.id === lease.business_id);
                    const endDate = new Date(lease.end_date);
                    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;

                    return (
                      <div 
                        key={lease.id} 
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow ${
                          isExpiringSoon ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                        }`}
                        onClick={() => handleEditLease(lease)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{business?.business_name || 'Unknown Business'}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Unit {lease.unit_number} • {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}
                          </div>
                          {isExpiringSoon && lease.status === 'active' && (
                            <div className="text-xs text-orange-600 mt-1 font-medium">
                              ⚠️ Expires in {daysUntilExpiry} days
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">${lease.monthly_rent?.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">per month</div>
                          </div>
                          <Badge className={
                            lease.status === 'active' ? 'bg-green-100 text-green-700' :
                            lease.status === 'expiring_soon' ? 'bg-orange-100 text-orange-700' :
                            lease.status === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {lease.status.replace('_', ' ')}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lease</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete this lease.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteLeaseMutation.mutate(lease.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                  {leases.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No leases created yet
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Recurring Payments */}
            <TabsContent value="recurring">
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex flex-col items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recurring Payments</h2>
                  <Button
                    onClick={() => { setEditingRecurring(null); setShowRecurringModal(true); }}
                    className="bg-gradient-to-r from-brand-slate to-brand-navy"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recurring Payment
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {recurringPayments.filter(rp => rp.status === 'active').length}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Active</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-yellow-700">
                      {recurringPayments.filter(rp => rp.status === 'paused').length}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">Paused</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      ${recurringPayments.filter(rp => rp.status === 'active').reduce((sum, rp) => sum + (rp.amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Total Monthly</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {recurringPayments.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setEditingRecurring(rp); setShowRecurringModal(true); }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{rp.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {getBusinessName(rp.business_id)} • {rp.frequency} • Day {rp.day_of_month}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">${rp.amount?.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">/{rp.frequency}</div>
                        </div>
                        <Badge className={
                          rp.status === 'active' ? 'bg-green-100 text-green-700' :
                          rp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {rp.status}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Recurring Payment</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete this recurring payment.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteRecurringMutation.mutate(rp.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {recurringPayments.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No recurring payments set up yet
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices">
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex flex-col items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Invoices</h2>
                  <Button
                    onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true); }}
                    className="bg-gradient-to-r from-brand-slate to-brand-navy"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Invoice
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-700">{invoices.length}</div>
                    <div className="text-xs text-blue-600 mt-1">Total</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">{invoices.filter(i => i.status === 'paid').length}</div>
                    <div className="text-xs text-green-600 mt-1">Paid</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-700">{invoices.filter(i => i.status === 'overdue').length}</div>
                    <div className="text-xs text-red-600 mt-1">Overdue</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-700">
                      ${invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">Outstanding</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setExpandedInvoiceId(expandedInvoiceId === invoice.id ? null : invoice.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {getBusinessName(invoice.business_id)} • Due {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{invoice.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">${invoice.amount?.toLocaleString()}</div>
                          </div>
                          <Badge className={
                            invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {invoice.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); setEditingInvoice(invoice); setShowInvoiceModal(true); }}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete invoice {invoice.invoice_number}.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteInvoiceMutation.mutate(invoice.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {expandedInvoiceId === invoice.id && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mt-3 mb-3">
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Actions</h4>
                            <InvoiceStatusActions
                              status={invoice.status}
                              onTransition={(newStatus) => transitionMutation.mutate({ invoiceId: invoice.id, newStatus })}
                              isLoading={transitionMutation.isPending}
                            />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">Activity</h4>
                          <AuditLogTimeline entries={invoiceAuditEntries} isLoading={invoiceAuditLoading} />
                        </div>
                      )}
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No invoices generated yet
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Expenses */}
            <TabsContent value="expenses">
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex flex-col items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Expenses</h2>
                  <Button
                    onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
                    className="bg-gradient-to-r from-brand-slate to-brand-navy"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Record Expense
                  </Button>
                </div>

                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setEditingExpense(expense); setShowExpenseModal(true); }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{expense.description}</div>
                          <Badge variant="outline" className="text-xs">
                            {expense.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {expense.vendor && `${expense.vendor} • `}
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-700">-${expense.amount?.toLocaleString()}</div>
                          {expense.payment_method && (
                            <div className="text-xs text-gray-500">{expense.payment_method}</div>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete this expense record.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteExpenseMutation.mutate(expense.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No expenses recorded yet
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <RecurringPaymentModal
        isOpen={showRecurringModal}
        onClose={() => { setShowRecurringModal(false); setEditingRecurring(null); }}
        onSubmit={handleRecurringSubmit}
        isLoading={createRecurringPaymentMutation.isPending || updateRecurringMutation.isPending}
        businesses={businesses}
        leases={leases}
        propertyId={propertyId}
        payment={editingRecurring}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
        onSubmit={handleInvoiceSubmit}
        isLoading={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
        businesses={businesses}
        leases={leases}
        propertyId={propertyId}
        invoice={editingInvoice}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        onSubmit={handleExpenseSubmit}
        isLoading={createExpenseMutation.isPending || updateExpenseMutation.isPending}
        propertyId={propertyId}
        expense={editingExpense}
      />

      <LeaseModal
        isOpen={showLeaseModal}
        onClose={() => {
          setShowLeaseModal(false);
          setEditingLease(null);
        }}
        onSubmit={handleLeaseSubmit}
        isLoading={createLeaseMutation.isPending || updateLeaseMutation.isPending}
        businesses={businesses}
        propertyId={propertyId}
        lease={editingLease}
      />
    </div>
  );
}