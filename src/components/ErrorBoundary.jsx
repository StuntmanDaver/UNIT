import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

function PageFallback({ error, resetErrorBoundary }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
      <Card className="p-8 text-center max-w-md bg-white/5 backdrop-blur-xl border-white/10">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-zinc-400 mt-2 text-sm">{error?.message}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light"
        >
          Reload page
        </Button>
      </Card>
    </div>
  );
}

function SectionFallback({ error, resetErrorBoundary }) {
  return (
    <Card className="p-4 border-red-900/20 bg-red-950/10">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <p className="text-sm font-medium text-zinc-300">This section could not load</p>
      </div>
      <p className="text-xs text-zinc-500 mb-3">{error?.message}</p>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </Card>
  );
}

const FALLBACK_MAP = {
  page: PageFallback,
  section: SectionFallback,
};

export default function ErrorBoundary({ children, variant = 'page', onError }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={FALLBACK_MAP[variant] || PageFallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
