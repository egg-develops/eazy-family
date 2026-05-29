import { lazy, Suspense } from 'react';
import { Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
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
import NotFound from "./pages/NotFound";

// Lazy load heavy pages — retry on chunk-load failure, then force reload
// (iOS WebView can return stale chunks with wrong MIME type after an app update)
const lazyWithRetry = (fn: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazy(() =>
    fn().catch(() =>
      fn().catch(() => {
        window.location.reload();
        return new Promise<never>(() => {});
      })
    )
  );

const Calendar = lazyWithRetry(() => import("./pages/Calendar"));
const Lists = lazyWithRetry(() => import("./pages/Lists"));
const Rituals = lazyWithRetry(() => import("./pages/Rituals"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const FamilyProfile = lazyWithRetry(() => import("./pages/FamilyProfile"));
const FamilyAgenda = lazyWithRetry(() => import("./pages/FamilyAgendaView"));
const FamilyChannel = lazyWithRetry(() => import("./pages/FamilyChannel"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
              {/* Public marketing pages — light paper theme (no SplashThemeProvider) */}
              <Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />

              {/* Auth + Onboarding */}
              <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
              <Route path="/auth/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
              <Route path="/onboarding" element={<ErrorBoundary><Onboarding /></ErrorBoundary>} />
              
              {/* Logo splash after login/onboarding */}
              <Route path="/splash" element={<ProtectedRoute><Splash /></ProtectedRoute>} />

              {/* Other Pages - Default theme */}
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/join-family" element={<JoinFamily />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              <Route path="/download" element={<Download />} />
              
              {/* Main App - User's custom theme */}
              <Route path="/app" element={<ProtectedRoute><ErrorBoundary><AppLayout /></ErrorBoundary></ProtectedRoute>}>
                <Route path="calendar" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Calendar /></Suspense></ErrorBoundary>} />
                <Route path="calendar/outlook-callback" element={<ProtectedRoute><OutlookCallback /></ProtectedRoute>} />
                <Route path="lists" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Lists /></Suspense></ErrorBoundary>} />
                <Route path="todos" element={<Navigate to="/app/lists?tab=tasks" replace />} />
                <Route path="shopping" element={<Navigate to="/app/lists?tab=shopping" replace />} />
                <Route path="settings" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Settings /></Suspense></ErrorBoundary>} />
                <Route path="family" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyProfile /></Suspense></ErrorBoundary>} />
                <Route path="rituals" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Rituals /></Suspense></ErrorBoundary>} />
                <Route path="family-agenda" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyAgenda /></Suspense></ErrorBoundary>} />
                <Route path="family-channel" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><FamilyChannel /></Suspense></ErrorBoundary>} />
                <Route path="help" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><HelpCenter /></Suspense></ErrorBoundary>} />
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
);

export default App;
