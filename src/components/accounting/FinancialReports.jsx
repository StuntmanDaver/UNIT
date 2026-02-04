import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calendar, Filter } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinancialReports({ payments, expenses, leases, businesses }) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedTenant, setSelectedTenant] = useState('all');
  // Filter data by date range and tenant
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const paidDate = p.paid_date ? new Date(p.paid_date) : null;
      const inRange = paidDate && paidDate >= new Date(dateRange.startDate) && paidDate <= new Date(dateRange.endDate);
      const tenantMatch = selectedTenant === 'all' || p.business_id === selectedTenant;
      return p.status === 'paid' && inRange && tenantMatch;
    });
  }, [payments, dateRange, selectedTenant]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      return expenseDate >= new Date(dateRange.startDate) && expenseDate <= new Date(dateRange.endDate);
    });
  }, [expenses, dateRange]);

  // Calculate totals
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Expected revenue from active leases
  const expectedMonthlyRevenue = leases
    .filter(l => l.status === 'active' && (selectedTenant === 'all' || l.business_id === selectedTenant))
    .reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  // Cash Flow data by month
  const cashFlowData = useMemo(() => {
    const monthlyData = {};
    
    filteredPayments.forEach(p => {
      const month = new Date(p.paid_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expenses: 0 };
      monthlyData[month].income += p.amount;
    });
    
    filteredExpenses.forEach(e => {
      const month = new Date(e.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expenses: 0 };
      monthlyData[month].expenses += e.amount;
    });
    
    return Object.values(monthlyData).map(d => ({
      ...d,
      netCashFlow: d.income - d.expenses
    }));
  }, [filteredPayments, filteredExpenses]);

  // Expense breakdown by category
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  // Balance Sheet data
  const totalAssets = totalRevenue; // Simplified: cash from revenue
  const totalLiabilities = leases
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.security_deposit || 0), 0); // Security deposits as liability
  const equity = totalAssets - totalLiabilities;

  const categoryLabels = {
    maintenance: 'Maintenance',
    repairs: 'Repairs',
    utilities: 'Utilities',
    insurance: 'Insurance',
    taxes: 'Taxes',
    marketing: 'Marketing',
    legal: 'Legal',
    other: 'Other'
  };

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Pie chart data for expenses
  const expensePieData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: categoryLabels[category],
    value: amount
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-6 bg-white border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-gray-900">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Tenant</Label>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {businesses?.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.business_name} - Unit {b.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profitloss" className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="profitloss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
        </TabsList>

        {/* Profit & Loss Statement */}
        <TabsContent value="profitloss">
          <Card className="p-6 bg-white border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Profit & Loss Statement</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Total Revenue</span>
                <span className="text-2xl font-bold text-green-700">${totalRevenue.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">Total Expenses</span>
                <span className="text-2xl font-bold text-red-700">-${totalExpenses.toLocaleString()}</span>
              </div>
              
              <div className="h-px bg-gray-200" />
              
              <div className={`flex justify-between items-center p-5 rounded-lg ${
                netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-900">Net Profit</span>
                  {netProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <span className={`text-3xl font-bold ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  ${Math.abs(netProfit).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Revenue vs Expenses Chart */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Expenses Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expected Revenue */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-700">Expected Monthly Revenue</div>
                  <div className="text-xs text-gray-500 mt-1">From active leases</div>
                </div>
                <span className="text-2xl font-bold text-blue-700">${expectedMonthlyRevenue.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Expense Breakdown with Pie Chart */}
          {Object.keys(expensesByCategory).length > 0 && (
            <Card className="p-6 bg-white border-gray-100 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Breakdown</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {Object.entries(expensesByCategory)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount], index) => {
                      const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">{categoryLabels[category]}</span>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{percentage}%</Badge>
                              <span className="text-sm font-bold text-gray-900">${amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Cash Flow Statement */}
        <TabsContent value="cashflow">
          <Card className="p-6 bg-white border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Cash Flow Statement</h3>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-sm text-gray-600">Cash Inflow</div>
                <div className="text-2xl font-bold text-green-700 mt-1">${totalRevenue.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-sm text-gray-600">Cash Outflow</div>
                <div className="text-2xl font-bold text-red-700 mt-1">${totalExpenses.toLocaleString()}</div>
              </div>
              <div className={`p-4 rounded-lg text-center ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                <div className="text-sm text-gray-600">Net Cash Flow</div>
                <div className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                  ${netProfit.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow</h4>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Cash Inflow" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Cash Outflow" />
                  <Line type="monotone" dataKey="netCashFlow" stroke="#8b5cf6" strokeWidth={2} name="Net Cash Flow" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Operating Activities */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Operating Activities</h4>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Rent Collections</span>
                  <span className="font-bold text-green-700">+${totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Operating Expenses</span>
                  <span className="font-bold text-red-700">-${totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-4 bg-emerald-50 rounded-lg border-t-2 border-emerald-200">
                  <span className="font-semibold text-gray-900">Net Cash from Operations</span>
                  <span className="font-bold text-emerald-700">${netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance">
          <Card className="p-6 bg-white border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Balance Sheet</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Assets */}
              <div>
                <h4 className="font-bold text-lg text-gray-900 mb-4">Assets</h4>
                <div className="space-y-3">
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Assets</span>
                    </div>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Cash (Revenue Collected)</span>
                        <span className="font-semibold">${totalRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between p-4 bg-emerald-100 rounded-lg border-t-2 border-emerald-300">
                    <span className="font-bold text-gray-900">Total Assets</span>
                    <span className="font-bold text-emerald-700 text-xl">${totalAssets.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div>
                <h4 className="font-bold text-lg text-gray-900 mb-4">Liabilities & Equity</h4>
                <div className="space-y-3">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Liabilities</span>
                    </div>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Security Deposits</span>
                        <span className="font-semibold">${totalLiabilities.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Equity</span>
                    </div>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Owner's Equity</span>
                        <span className="font-semibold">${equity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between p-4 bg-blue-100 rounded-lg border-t-2 border-blue-300">
                    <span className="font-bold text-gray-900">Total Liabilities & Equity</span>
                    <span className="font-bold text-blue-700 text-xl">${(totalLiabilities + equity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Sheet Visualization */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Financial Position</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Assets', value: totalAssets },
                  { name: 'Liabilities', value: totalLiabilities },
                  { name: 'Equity', value: equity }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}