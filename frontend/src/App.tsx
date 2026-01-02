import { Suspense, lazy, useEffect, useState, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { bootstrapThemeFromStorage } from "@/lib/theme";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Capture = lazy(() => import("./pages/Capture"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Community = lazy(() => import("./pages/Community"));
const Complaints = lazy(() => import("./pages/Complaints"));
const Dustbins = lazy(() => import("./pages/Dustbins"));
const Verify = lazy(() => import("./pages/Verify"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DustbinsList = lazy(() => import('./pages/DustbinsList'));
const PendingReviews = lazy(() => import('./pages/PendingReviews'));
const AddDustbin = lazy(() => import('./pages/AddDustbin'));
const CaptureIncident = lazy(() => import('./pages/CaptureIncident'));
const IncidentsReview = lazy(() => import('./pages/IncidentsReview'));
const KeepMeAlive = lazy(() => import('./pages/KeepMeAlive'));
const SmogTowerWizard = lazy(() => import('./pages/smogtower'));
const MapPage = lazy(() => import("./pages/Map"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
      refetchOnMount: false, // Use cached data if available
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    // Hard redirect + history replacement
    window.history.replaceState(null, "", "/");
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

const getAuthKey = () => localStorage.getItem("token") || "guest";

const App = () => {
  const [authKey, setAuthKey] = useState(getAuthKey());
  useEffect(() => {
    bootstrapThemeFromStorage();

    const syncAuth = () => setAuthKey(getAuthKey());
    window.addEventListener("storage", syncAuth);

    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  useEffect(() => {
    const enforceAuth = () => {
      const token = localStorage.getItem("token");
      const path = window.location.pathname;

      // If user is NOT authenticated and tries to access anything except "/"
      if (!token && path !== "/") {
        window.history.replaceState(null, "", "/");
        window.location.replace("/");
      }
    };

    enforceAuth();
    window.addEventListener("popstate", enforceAuth);

    return () => window.removeEventListener("popstate", enforceAuth);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes key={authKey}>
              <Route path="/" element={<Index />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/capture"
                element={
                  <ProtectedRoute>
                    <Capture />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rewards"
                element={
                  <ProtectedRoute>
                    <Rewards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/keep-alive"
                element={
                  <ProtectedRoute>
                    <KeepMeAlive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/smog-tower"
                element={
                  <ProtectedRoute>
                    <SmogTowerWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <Community />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints"
                element={
                  <ProtectedRoute>
                    <Complaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dustbins"
                element={
                  <ProtectedRoute>
                    <Dustbins />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify"
                element={
                  <ProtectedRoute>
                    <Verify />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <Progress />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dustbins-list"
                element={
                  <ProtectedRoute>
                    <DustbinsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending-reviews"
                element={
                  <ProtectedRoute>
                    <PendingReviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-dustbin"
                element={
                  <ProtectedRoute>
                    <AddDustbin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/capture-incident"
                element={
                  <ProtectedRoute>
                    <CaptureIncident />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <IncidentsReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapPage />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
