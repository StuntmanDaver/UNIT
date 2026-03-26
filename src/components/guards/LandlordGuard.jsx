import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LandlordGuard() {
  const { user, isLoadingAuth, isLandlord } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
        <Loader2 className="w-8 h-8 animate-spin text-brand-slate-light" />
      </div>
    );
  }

  if (!user) return <Navigate to="/LandlordLogin" replace />;
  if (!isLandlord) return <Navigate to="/Welcome" replace />;

  return <Outlet />;
}
