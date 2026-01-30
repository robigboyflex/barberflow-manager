import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ShopDetail from "./pages/ShopDetail";
import OwnerAnalytics from "./pages/OwnerAnalytics";
import StaffLogin from "./pages/StaffLogin";
import BarberPortal from "./pages/BarberPortal";
import CashierPortal from "./pages/CashierPortal";
import CleanerPortal from "./pages/CleanerPortal";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Services from "./pages/Services";
import ShopSettings from "./pages/ShopSettings";
import BookAppointment from "./pages/BookAppointment";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { StaffAuthProvider } from "./contexts/StaffAuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StaffAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route index element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/barber" element={<BarberPortal />} />
            <Route path="/cashier" element={<CashierPortal />} />
            <Route path="/cleaner" element={<CleanerPortal />} />
            <Route path="/book/:shopId" element={<BookAppointment />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="shop/:shopId" element={<ShopDetail />} />
              <Route path="shop/:shopId/settings" element={<ShopSettings />} />
              <Route path="analytics" element={<OwnerAnalytics />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="clients" element={<Clients />} />
              <Route path="services" element={<Services />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StaffAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
