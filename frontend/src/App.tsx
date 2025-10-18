import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Capture from "./pages/Capture";
import Rewards from "./pages/Rewards";
import Community from "./pages/Community";
import Dustbins from "./pages/Dustbins";
import Verify from "./pages/Verify";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DustbinsList from './pages/DustbinsList';
import PendingReviews from './pages/PendingReviews';
import AddDustbin from './pages/AddDustbin';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/community" element={<Community />} />
          <Route path="/dustbins" element={<Dustbins />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dustbins-list" element={<DustbinsList />} />
          <Route path="/pending-reviews" element={<PendingReviews />} />
          <Route path="/add-dustbin" element={<AddDustbin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
