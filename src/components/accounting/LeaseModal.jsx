import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function LeaseModal({ isOpen, onClose, onSubmit, isLoading, businesses, propertyId, lease = null }) {
  const [formData, setFormData] = useState(lease || {
    property_id: propertyId,
    business_id: '',
    unit_number: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    status: 'active',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBusinessChange = (businessId) => {
    const selectedBusiness = businesses.find(b => b.id === businessId);
    setFormData({
      ...formData,
      business_id: businessId,
      unit_number: selectedBusiness?.unit_number || ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lease ? 'Edit Lease' : 'Create New Lease'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="business_id">Tenant *</Label>
            <Select
              value={formData.business_id}
              onValueChange={handleBusinessChange}
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

          <div>
            <Label htmlFor="unit_number">Unit Number *</Label>
            <Input
              id="unit_number"
              value={formData.unit_number}
              onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
              placeholder="e.g., 101, A-5"
              required
              className="mt-1"
            />
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
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly_rent">Monthly Rent *</Label>
              <Input
                id="monthly_rent"
                type="number"
                step="0.01"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({...formData, monthly_rent: parseFloat(e.target.value)})}
                placeholder="0.00"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="security_deposit">Security Deposit</Label>
              <Input
                id="security_deposit"
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => setFormData({...formData, security_deposit: parseFloat(e.target.value)})}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({...formData, status: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional lease notes..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {lease ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                lease ? 'Update Lease' : 'Create Lease'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}