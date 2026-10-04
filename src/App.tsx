import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { QueueProvider } from "@/hooks/useQueue";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";

const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Upload = lazy(() => import("./pages/Upload.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Watch = lazy(() => import("./pages/Watch.tsx"));
const Search = lazy(() => import("./pages/Search.tsx"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Creators = lazy(() => import("./pages/Creators.tsx"));
const Advertise = lazy(() => import("./pages/Advertise.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Subscriptions = lazy(() => import("./pages/Subscriptions.tsx"));
const Playlist = lazy(() => import("./pages/Playlist.tsx"));
const Playlists = lazy(() => import("./pages/Playlists.tsx"));
const BrowsePlaylists = lazy(() => import("./pages/BrowsePlaylists.tsx"));
const Mix = lazy(() => import("./pages/Mix.tsx"));
const History = lazy(() => import("./pages/History.tsx"));
const Shorts = lazy(() => import("./pages/Shorts.tsx"));
const Live = lazy(() => import("./pages/Live.tsx"));
const LiveWatch = lazy(() => import("./pages/LiveWatch.tsx"));
const LiveStudio = lazy(() => import("./pages/LiveStudio.tsx"));
const StreamSetup = lazy(() => import("./pages/StreamSetup.tsx"));
const StudioSEO = lazy(() => import("./pages/StudioSEO.tsx"));
const Moderation = lazy(() => import("./pages/Moderation.tsx"));
const Monitoring = lazy(() => import("./pages/Monitoring.tsx"));
const AdsManager = lazy(() => import("./pages/AdsManager.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QueueProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/watch/:id" element={<Watch />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/creator/:userId" element={<CreatorProfile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/creators" element={<Creators />} />
                  <Route path="/advertise" element={<Advertise />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/playlists" element={<Playlists />} />
                  <Route path="/playlist/:id" element={<Playlist />} />
                  <Route path="/browse-playlists" element={<BrowsePlaylists />} />
                  <Route path="/mix" element={<Mix />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/shorts" element={<Shorts />} />
                  <Route path="/live" element={<Live />} />
                  <Route path="/live/studio/:id" element={<LiveStudio />} />
                  <Route path="/live/setup" element={<StreamSetup />} />
                  <Route path="/live/:id" element={<LiveWatch />} />
                  <Route path="/studio/seo" element={<StudioSEO />} />
                  <Route path="/moderation" element={<Moderation />} />
                  <Route path="/admin/monitoring" element={<Monitoring />} />
                  <Route path="/ads" element={<AdsManager />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueueProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
