import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { invoicesService } from '@/services/accounting';
import { businessesService } from '@/services/businesses';
import BottomNav from '@/components/BottomNav';
import TenantInvoiceCard from '@/components/accounting/TenantInvoiceCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

export default function TenantInvoices() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      }
      return null;
    }
  });

  const { data: myBusiness } = useQuery({
    queryKey: ['myBusiness', user?.email],
    queryFn: async () => {
      if (user?.email) {
        const businesses = await businessesService.filter({ owner_email: user.email });
        return businesses[0];
      }
      return null;
    },
    enabled: !!user?.email
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', 'tenant', myBusiness?.id],
    queryFn: () => invoicesService.filter({ business_id: myBusiness.id }, 'invoice_date', false),
    enabled: !!myBusiness?.id
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy">
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <FileText className="w-5 h-5 text-zinc-400" />
          <h1 className="text-xl font-bold text-white">My Invoices</h1>
        </div>
      </header>

      <main className="pt-24 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <h2 className="text-lg font-semibold mb-2">No invoices</h2>
              <p className="text-sm">
                Your landlord hasn&apos;t generated any invoices for your unit yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <TenantInvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav propertyId={propertyId} />
    </div>
  );
}
