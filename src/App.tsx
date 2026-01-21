import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider, useRole } from "./contexts/RoleContext";
import Layout from "./components/Layout";
import CashierDashboard from "./pages/CashierDashboard";
import CashierAppointments from "./pages/CashierAppointments";
import CashierClients from "./pages/CashierClients";
import CashierServices from "./pages/CashierServices";
import BarberDashboard from "./pages/BarberDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { role } = useRole();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={role === 'barber' ? <BarberDashboard /> : <CashierDashboard />} />
        <Route path="appointments" element={<CashierAppointments />} />
        <Route path="clients" element={<CashierClients />} />
        <Route path="services" element={<CashierServices />} />
        <Route path="queue" element={<BarberDashboard />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RoleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
