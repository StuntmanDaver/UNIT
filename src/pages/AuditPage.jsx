import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import AuditLogTimeline from '@/components/AuditLogTimeline';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'lease', label: 'Lease' },
  { value: 'expense', label: 'Expense' },
  { value: 'payment', label: 'Payment' },
  { value: 'recurring_payment', label: 'Recurring payment' },
  { value: 'recommendation', label: 'Request' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'status_changed', label: 'Status changed' },
];

export default function AuditPage() {
  const { user } = useAuth();
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit_log', entityTypeFilter, actionFilter, searchEmail],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);

      if (entityTypeFilter !== 'all') {
        query = query.eq('entity_type', entityTypeFilter);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (searchEmail.trim()) {
        query = query.ilike('performed_by_email', `%${searchEmail.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Audit history tracked from March 2026. Earlier changes are not recorded.
        </p>
      </div>

      <Card className="p-4 bg-brand-navy/50 backdrop-blur-xl border-white/10">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Filter by actor email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
            />
          </div>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-zinc-300">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-zinc-300">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <AuditLogTimeline entries={entries} isLoading={isLoading} />
    </div>
  );
}
