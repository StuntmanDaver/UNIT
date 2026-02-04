import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LandlordNotificationBell({ propertyId, recommendations, payments, leases, businesses }) {
  const [showPanel, setShowPanel] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const navigate = useNavigate();

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`landlord_dismissed_${propertyId}`);
    if (stored) {
      setDismissedIds(JSON.parse(stored));
    }
  }, [propertyId]);

  // Generate notifications from data
  const generateNotifications = () => {
    const notifications = [];

    // New tenant requests (submitted status)
    const newRequests = recommendations.filter(r => 
      r.status === 'submitted' && !dismissedIds.includes(`request_${r.id}`)
    );
    newRequests.forEach(req => {
      const business = businesses.find(b => b.id === req.business_id);
      notifications.push({
        id: `request_${req.id}`,
        type: 'request',
        title: 'New Tenant Request',
        message: `${business?.business_name || 'A tenant'} submitted: ${req.title}`,
        priority: req.priority,
        timestamp: req.created_date,
        action: () => navigate(createPageUrl('LandlordRequests') + `?propertyId=${propertyId}`)
      });
    });

    // Overdue payments
    const overduePayments = payments.filter(p => 
      p.status === 'overdue' && !dismissedIds.includes(`payment_${p.id}`)
    );
    overduePayments.forEach(payment => {
      const business = businesses.find(b => b.id === payment.business_id);
      notifications.push({
        id: `payment_${payment.id}`,
        type: 'payment',
        title: 'Overdue Payment',
        message: `${business?.business_name || 'A tenant'} has an overdue payment of $${payment.amount}`,
        priority: 'high',
        timestamp: payment.due_date,
        action: () => navigate(createPageUrl('Accounting') + `?propertyId=${propertyId}&tab=reports`)
      });
    });

    // Expiring leases (within 60 days)
    const today = new Date();
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringLeases = leases.filter(lease => {
      const endDate = new Date(lease.end_date);
      return endDate <= sixtyDaysFromNow && endDate > today && !dismissedIds.includes(`lease_${lease.id}`);
    });
    expiringLeases.forEach(lease => {
      const business = businesses.find(b => b.id === lease.business_id);
      const daysUntilExpiry = Math.ceil((new Date(lease.end_date) - today) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `lease_${lease.id}`,
        type: 'lease',
        title: 'Lease Expiring Soon',
        message: `${business?.business_name || 'A tenant'}'s lease expires in ${daysUntilExpiry} days`,
        priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
        timestamp: lease.end_date,
        action: () => navigate(createPageUrl('Accounting') + `?propertyId=${propertyId}&tab=leases`)
      });
    });

    // Sort by priority and timestamp
    return notifications.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  const notifications = generateNotifications();
  const unreadCount = notifications.length;

  const dismissNotification = (id) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem(`landlord_dismissed_${propertyId}`, JSON.stringify(newDismissed));
  };

  const dismissAll = () => {
    const allIds = notifications.map(n => n.id);
    const newDismissed = [...dismissedIds, ...allIds];
    setDismissedIds(newDismissed);
    localStorage.setItem(`landlord_dismissed_${propertyId}`, JSON.stringify(newDismissed));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'request': return AlertCircle;
      case 'payment': return DollarSign;
      case 'lease': return FileText;
      default: return Bell;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {showPanel && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={dismissAll}>
                      Dismiss All
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setShowPanel(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => {
                      const Icon = getIcon(notif.type);
                      return (
                        <div 
                          key={notif.id} 
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            notif.action();
                            setShowPanel(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              notif.type === 'request' ? 'bg-purple-100' :
                              notif.type === 'payment' ? 'bg-red-100' :
                              'bg-blue-100'
                            }`}>
                              <Icon className={`w-4 h-4 ${
                                notif.type === 'request' ? 'text-purple-600' :
                                notif.type === 'payment' ? 'text-red-600' :
                                'text-blue-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm text-gray-900">{notif.title}</h4>
                                {notif.priority === 'high' && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">High</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{notif.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  {new Date(notif.timestamp).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissNotification(notif.id);
                                  }}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}