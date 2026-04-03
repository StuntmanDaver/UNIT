import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const STATUS_ACTIONS = {
  draft: [
    {
      label: 'Send Invoice',
      newStatus: 'sent',
      className: 'bg-gradient-to-r from-brand-slate to-brand-navy hover:opacity-90 text-white'
    }
  ],
  sent: [
    {
      label: 'Mark as Paid',
      newStatus: 'paid',
      className: 'bg-green-600 hover:bg-green-700 text-white'
    }
  ],
  overdue: [
    {
      label: 'Mark as Paid',
      newStatus: 'paid',
      className: 'bg-green-600 hover:bg-green-700 text-white'
    }
  ],
  paid: [],
  void: []
};

export default function InvoiceStatusActions({ status, onTransition, isLoading }) {
  const actions = STATUS_ACTIONS[status] ?? [];
  const canVoid = !['paid', 'void'].includes(status);
  const isTerminal = ['paid', 'void'].includes(status);

  if (isTerminal) {
    return (
      <Badge
        className={
          status === 'paid'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-400'
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <Button
          key={action.newStatus}
          size="sm"
          className={action.className}
          disabled={isLoading}
          onClick={() => onTransition(action.newStatus)}
        >
          {isLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {action.label}
        </Button>
      ))}

      {canVoid && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={isLoading}
            >
              Void
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The invoice will be permanently voided and the tenant notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => onTransition('void')}
              >
                Void Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
