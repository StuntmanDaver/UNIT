import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";

export default function FinancialReports({ payments, expenses, leases }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Calculate revenue (paid payments)
  const monthlyRevenue = payments
    .filter(p => p.status === 'paid' && new Date(p.paid_date).getMonth() === currentMonth && new Date(p.paid_date).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);

  const yearlyRevenue = payments
    .filter(p => p.status === 'paid' && new Date(p.paid_date).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate expenses
  const monthlyExpenses = expenses
    .filter(e => new Date(e.expense_date).getMonth() === currentMonth && new Date(e.expense_date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + e.amount, 0);

  const yearlyExpenses = expenses
    .filter(e => new Date(e.expense_date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate profit/loss
  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  const yearlyProfit = yearlyRevenue - yearlyExpenses;

  // Expected revenue from active leases
  const expectedMonthlyRevenue = leases
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  // Expense breakdown by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

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

  return (
    <div className="space-y-6">
      {/* Profit & Loss Summary */}
      <Card className="p-6 bg-white border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Profit & Loss Statement</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase">This Month</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Revenue</span>
                <span className="text-lg font-bold text-green-700">${monthlyRevenue.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">Expenses</span>
                <span className="text-lg font-bold text-red-700">-${monthlyExpenses.toLocaleString()}</span>
              </div>
              
              <div className="h-px bg-gray-200" />
              
              <div className={`flex justify-between items-center p-4 rounded-lg ${
                monthlyProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Net Profit</span>
                  {monthlyProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <span className={`text-xl font-bold ${
                  monthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  ${Math.abs(monthlyProfit).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Yearly */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase">Year to Date</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Revenue</span>
                <span className="text-lg font-bold text-green-700">${yearlyRevenue.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">Expenses</span>
                <span className="text-lg font-bold text-red-700">-${yearlyExpenses.toLocaleString()}</span>
              </div>
              
              <div className="h-px bg-gray-200" />
              
              <div className={`flex justify-between items-center p-4 rounded-lg ${
                yearlyProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Net Profit</span>
                  {yearlyProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <span className={`text-xl font-bold ${
                  yearlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  ${Math.abs(yearlyProfit).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
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

      {/* Expense Breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <Card className="p-6 bg-white border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Breakdown</h3>
          
          <div className="space-y-2">
            {Object.entries(expensesByCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => {
                const percentage = ((amount / yearlyExpenses) * 100).toFixed(1);
                return (
                  <div key={category} className="flex items-center gap-4">
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
        </Card>
      )}
    </div>
  );
}