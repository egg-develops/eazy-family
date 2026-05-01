import { lazy, Suspense } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SplashThemeProvider } from "./contexts/SplashThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import JoinFamily from "./pages/JoinFamily";
import Onboarding from "./pages/Onboarding";
import Splash from "./pages/Splash";
import OutlookCallback from "./pages/OutlookCallback";
import AppLayout from "./pages/App";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Download from "./pages/Download";
import EventsPublic from "./pages/EventsPublic";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages
const Calendar = lazy(() => import("./pages/Calendar"));
const ToDoList = lazy(() => import("./pages/ToDoList"));
const Events = lazy(() => import("./pages/Events"));

const Community = lazy(() => import("./pages/Community"));
const Messaging = lazy(() => import("./pages/Messaging"));
const Settings = lazy(() => import("./pages/Settings"));
const FamilyProfile = lazy(() => import("./pages/FamilyProfile"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              {/* Splash Pages - Dark Navy + Warm Coral Theme */}
              <Route 
                path="/" 
                element={
                  <SplashThemeProvider>
                    <Index />
                  </SplashThemeProvider>
                } 
              />
              <Route 
                path="/auth" 
                element={
                  <SplashThemeProvider>
                    <Auth />
                  </SplashThemeProvider>
                } 
              />
              
              {/* Onboarding - Also uses splash theme */}
              <Route 
                path="/onboarding" 
                element={
                  <SplashThemeProvider>
                    <Onboarding />
                  </SplashThemeProvider>
                } 
              />
              
              {/* Logo splash after login/onboarding */}
              <Route path="/splash" element={<ProtectedRoute><Splash /></ProtectedRoute>} />

              {/* Other Pages - Default theme */}
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/join-family" element={<JoinFamily />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<SplashThemeProvider><About /></SplashThemeProvider>} />
              <Route path="/download" element={<SplashThemeProvider><Download /></SplashThemeProvider>} />
              <Route path="/events" element={<SplashThemeProvider><EventsPublic /></SplashThemeProvider>} />
              
              {/* Main App - User's custom theme */}
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="calendar" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Calendar /></Suspense></ErrorBoundary>} />
                <Route path="calendar/outlook-callback" element={<ProtectedRoute><OutlookCallback /></ProtectedRoute>} />
                <Route path="todos" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ToDoList /></Suspense></ErrorBoundary>} />
                <Route path="events" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Events /></Suspense></ErrorBoundary>} />

                <Route path="community" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Community /></Suspense></ErrorBoundary>} />
                <Route path="messaging" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Messaging /></Suspense></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Settings /></Suspense></ErrorBoundary>} />
                <Route path="family" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyProfile /></Suspense></ErrorBoundary>} />
              </Route>
              
              {/* Admin Dashboard */}
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
