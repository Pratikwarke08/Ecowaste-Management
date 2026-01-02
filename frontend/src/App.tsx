import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const MapPage = lazy(() => import('./pages/Map'));

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

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    bootstrapThemeFromStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/capture" element={<Capture />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/keep-alive" element={<KeepMeAlive />} />
              <Route path="/smog-tower" element={<SmogTowerWizard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/dustbins" element={<Dustbins />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dustbins-list" element={<DustbinsList />} />
              <Route path="/pending-reviews" element={<PendingReviews />} />
              <Route path="/add-dustbin" element={<AddDustbin />} />
              <Route path="/capture-incident" element={<CaptureIncident />} />
              <Route path="/incidents" element={<IncidentsReview />} />
              <Route path="/map" element={<MapPage />} />
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
