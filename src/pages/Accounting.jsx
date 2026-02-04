import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RecurringPaymentModal from '@/components/accounting/RecurringPaymentModal';
import InvoiceModal from '@/components/accounting/InvoiceModal';
import ExpenseModal from '@/components/accounting/ExpenseModal';
import LeaseModal from '@/components/accounting/LeaseModal';
import FinancialReports from '@/components/accounting/FinancialReports';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Repeat, 
  FileText, 
  Receipt,
  Loader2,
  BarChart3
} from 'lucide-react';

export default function Accounting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  const initialTab = urlParams.get('tab') || 'reports';

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);

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

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', propertyId],
    queryFn: () => base44.entities.Lease.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const { data: recurringPayments = [] } = useQuery({
    queryKey: ['recurringPayments', propertyId],
    queryFn: () => base44.entities.RecurringPayment.filter({ property_id: propertyId }, '-created_date'),
    enabled: !!propertyId
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', propertyId],
    queryFn: () => base44.entities.Invoice.filter({ property_id: propertyId }, '-invoice_date'),
    enabled: !!propertyId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', propertyId],
    queryFn: () => base44.entities.Expense.filter({ property_id: propertyId }, '-expense_date'),
    enabled: !!propertyId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', propertyId],
    queryFn: () => base44.entities.Payment.filter({ property_id: propertyId }),
    enabled: !!propertyId
  });

  const createRecurringPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      setShowRecurringModal(false);
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowInvoiceModal(false);
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowExpenseModal(false);
    }
  });

  const createLeaseMutation = useMutation({
    mutationFn: (data) => base44.entities.Lease.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowLeaseModal(false);
      setEditingLease(null);
    }
  });

  const updateLeaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lease.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setShowLeaseModal(false);
      setEditingLease(null);
    }
  });

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
            <h1 className="text-xl font-bold text-gray-900">Accounting</h1>
          </div>
          <span className="text-sm text-gray-600">{property?.name}</span>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full bg-white border border-gray-200">
              <TabsTrigger value="reports" className="flex-col gap-1 py-3">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="leases" className="flex-col gap-1 py-3">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Leases</span>
              </TabsTrigger>
              <TabsTrigger value="recurring" className="flex-col gap-1 py-3">
                <Repeat className="w-4 h-4" />
                <span className="text-xs">Recurring</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex-col gap-1 py-3">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Invoices</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex-col gap-1 py-3">
                <Receipt className="w-4 h-4" />
                <span className="text-xs">Expenses</span>
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
              <Card className="p-6 bg-white border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Lease Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {leases.length} total leases • {expiringLeases.length} expiring soon
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateLease}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recurring Payments</h2>
                  <Button
                    onClick={() => setShowRecurringModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recurring Payment
                  </Button>
                </div>

                <div className="space-y-3">
                  {recurringPayments.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{rp.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {getBusinessName(rp.business_id)} • {rp.frequency} • Day {rp.day_of_month}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">${rp.amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">/{rp.frequency}</div>
                        </div>
                        <Badge className={
                          rp.status === 'active' ? 'bg-green-100 text-green-700' :
                          rp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {rp.status}
                        </Badge>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
                  <Button
                    onClick={() => setShowInvoiceModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Invoice
                  </Button>
                </div>

                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {getBusinessName(invoice.business_id)} • Due {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{invoice.description}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">${invoice.amount.toLocaleString()}</div>
                        </div>
                        <Badge className={
                          invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {invoice.status}
                        </Badge>
                      </div>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
                  <Button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Record Expense
                  </Button>
                </div>

                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
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
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-700">-${expense.amount.toLocaleString()}</div>
                        {expense.payment_method && (
                          <div className="text-xs text-gray-500">{expense.payment_method}</div>
                        )}
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
        onClose={() => setShowRecurringModal(false)}
        onSubmit={(data) => createRecurringPaymentMutation.mutate(data)}
        isLoading={createRecurringPaymentMutation.isPending}
        businesses={businesses}
        leases={leases}
        propertyId={propertyId}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSubmit={(data) => createInvoiceMutation.mutate(data)}
        isLoading={createInvoiceMutation.isPending}
        businesses={businesses}
        leases={leases}
        propertyId={propertyId}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={(data) => createExpenseMutation.mutate(data)}
        isLoading={createExpenseMutation.isPending}
        propertyId={propertyId}
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