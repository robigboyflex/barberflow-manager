import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { StaffAuthProvider } from "./contexts/StaffAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages for code splitting
const Welcome = lazy(() => import("./pages/Welcome"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ShopDetail = lazy(() => import("./pages/ShopDetail"));
const OwnerAnalytics = lazy(() => import("./pages/OwnerAnalytics"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const BarberPortal = lazy(() => import("./pages/BarberPortal"));
const CashierPortal = lazy(() => import("./pages/CashierPortal"));
const CleanerPortal = lazy(() => import("./pages/CleanerPortal"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Clients = lazy(() => import("./pages/Clients"));
const Services = lazy(() => import("./pages/Services"));
const ShopSettings = lazy(() => import("./pages/ShopSettings"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // Data stays fresh for 30s
      gcTime: 5 * 60_000,       // Cache for 5 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-32 mx-auto rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <StaffAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route index element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/staff-login" element={<StaffLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
          </Suspense>
        </BrowserRouter>
        </StaffAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
