import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LandlordGuard from '@/components/guards/LandlordGuard';
import { PropertyProvider } from '@/lib/PropertyContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const { Pages, Layout, mainPage } = pagesConfig;

const LazyLandlordDashboard = lazy(() => import('./pages/LandlordDashboard'));
const LazyLandlordRequests = lazy(() => import('./pages/LandlordRequests'));
const LazyAccounting = lazy(() => import('./pages/Accounting'));
const LazyAuditPage = lazy(() => import('./pages/AuditPage'));

const LAZY_LANDLORD_PAGES = {
  LandlordDashboard: LazyLandlordDashboard,
  LandlordRequests: LazyLandlordRequests,
  Accounting: LazyAccounting,
  AuditPage: LazyAuditPage,
};

const LandlordLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
    <Loader2 className="w-8 h-8 animate-spin text-brand-slate-light" />
  </div>
);
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  const LANDLORD_PAGES = ['LandlordDashboard', 'LandlordRequests', 'Accounting', 'AuditPage'];

  // Render the main app
  return (
    <ErrorBoundary variant="page">
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages)
          .filter(([path]) => !LANDLORD_PAGES.includes(path))
          .map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          ))}
        <Route element={<LandlordGuard />}>
          {LANDLORD_PAGES.map(name => {
            const Page = LAZY_LANDLORD_PAGES[name];
            return (
              <Route
                key={name}
                path={`/${name}`}
                element={
                  <PropertyProvider>
                    <LayoutWrapper currentPageName={name}>
                      <Suspense fallback={<LandlordLoadingFallback />}>
                        <Page />
                      </Suspense>
                    </LayoutWrapper>
                  </PropertyProvider>
                }
              />
            );
          })}
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
