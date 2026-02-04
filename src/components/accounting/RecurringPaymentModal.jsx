import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RecurringPaymentModal({ isOpen, onClose, onSubmit, isLoading, businesses, leases, propertyId }) {
  const [formData, setFormData] = useState({
    property_id: propertyId,
    business_id: '',
    lease_id: '',
    name: '',
    amount: '',
    frequency: 'monthly',
    start_date: '',
    day_of_month: 1,
    status: 'active',
    auto_generate_invoice: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectedBusinessLeases = leases.filter(l => l.business_id === formData.business_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Up Recurring Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="business_id">Tenant *</Label>
            <Select
              value={formData.business_id}
              onValueChange={(value) => setFormData({...formData, business_id: value, lease_id: ''})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(business => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.business_name} - Unit {business.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.business_id && (
            <div>
              <Label htmlFor="lease_id">Lease</Label>
              <Select
                value={formData.lease_id}
                onValueChange={(value) => setFormData({...formData, lease_id: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select lease (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {selectedBusinessLeases.map(lease => (
                    <SelectItem key={lease.id} value={lease.id}>
                      Unit {lease.unit_number} - ${lease.monthly_rent}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="name">Payment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Monthly Rent, CAM Charges"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                placeholder="0.00"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({...formData, frequency: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="day_of_month">Due Day of Month *</Label>
              <Input
                id="day_of_month"
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month}
                onChange={(e) => setFormData({...formData, day_of_month: parseInt(e.target.value)})}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Recurring Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}