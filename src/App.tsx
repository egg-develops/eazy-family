import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./pages/App";
import Calendar from "./pages/Calendar";
import ToDoList from "./pages/ToDoList";
import Events from "./pages/Events";
import Memories from "./pages/Memories";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import FamilyProfile from "./pages/FamilyProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<AppLayout />}>
            <Route path="calendar" element={<Calendar />} />
            <Route path="todos" element={<ToDoList />} />
            <Route path="events" element={<Events />} />
            <Route path="memories" element={<Memories />} />
            <Route path="community" element={<Community />} />
            <Route path="settings" element={<Settings />} />
            <Route path="family" element={<FamilyProfile />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
