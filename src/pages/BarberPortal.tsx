import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Scissors, 
  LogOut, 
  Plus, 
  Check, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import AnimatedPage from "@/components/AnimatedPage";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Cut {
  id: string;
  service_id: string;
  client_name: string | null;
  price: number;
  status: "pending" | "confirmed" | "disputed" | "cancelled";
  created_at: string;
  service?: Service;
}

export default function BarberPortal() {
  const navigate = useNavigate();
  const { staff, logout, isAuthenticated } = useStaffAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [todayCuts, setTodayCuts] = useState<Cut[]>([]);
  const [weekCuts, setWeekCuts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingCut, setIsLoggingCut] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !staff) {
      navigate("/staff-login");
      return;
    }
    if (staff.role !== "barber") {
      toast.error("Access denied. Barbers only.");
      navigate("/staff-login");
      return;
    }
    fetchData();
  }, [isAuthenticated, staff]);

  const fetchData = async () => {
    if (!staff) return;

    try {
      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("shop_id", staff.shop_id)
        .eq("is_active", true)
        .order("name");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get week's date range
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);

      // Fetch today's cuts
      const { data: todayData, error: todayError } = await supabase
        .from("cuts")
        .select(`
          id,
          service_id,
          client_name,
          price,
          status,
          created_at,
          services:service_id (id, name, price)
        `)
        .eq("barber_id", staff.id)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .order("created_at", { ascending: false });

      if (todayError) throw todayError;
      setTodayCuts(todayData?.map(c => ({ ...c, service: c.services as unknown as Service })) || []);

      // Fetch week's cuts (just count)
      const { count: weekCount, error: weekError } = await supabase
        .from("cuts")
        .select("id", { count: "exact", head: true })
        .eq("barber_id", staff.id)
        .in("status", ["confirmed", "pending"])
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (weekError) throw weekError;
      setWeekCuts(weekCount || 0);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogCut = async () => {
    if (!selectedService || !staff) return;

    setIsLoggingCut(true);

    try {
      // Use server-side RPC function for secure cut logging
      const { error } = await supabase.rpc('log_cut', {
        p_shop_id: staff.shop_id,
        p_barber_id: staff.id,
        p_service_id: selectedService.id,
        p_price: selectedService.price,
        p_client_name: null
      });

      if (error) throw error;

      toast.success(`${selectedService.name} logged!`);
      setSelectedService(null);
      fetchData();
    } catch (error: any) {
      console.error("Error logging cut:", error);
      toast.error(error.message || "Failed to log cut");
    } finally {
      setIsLoggingCut(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Check className="w-4 h-4 text-success" />;
      case "disputed":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "pending":
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const confirmedToday = todayCuts.filter(c => c.status === "confirmed").length;
  const pendingToday = todayCuts.filter(c => c.status === "pending").length;
  const weekTotal = weekCuts;

  if (!staff) return null;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background pb-8">
        {/* Header */}
        <header className="bg-background px-5 py-4 sticky top-0 z-40 safe-area-top border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Welcome,</p>
              <h1 className="font-display text-2xl tracking-wide text-foreground">
                {staff.name}
              </h1>
              <p className="text-xs text-primary">{staff.shop?.name}</p>
            </div>
            <motion.button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-4 h-4 text-destructive" />
            </motion.button>
          </div>
        </header>

        <div className="px-5 py-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mobile-card text-center"
            >
              <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{confirmedToday}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mobile-card text-center"
            >
              <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{pendingToday}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mobile-card text-center"
            >
              <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{weekTotal}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </motion.div>
          </div>

          {/* Quick Log Cut */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mobile-card"
          >
            <h2 className="font-display text-lg mb-3">Quick Log Cut</h2>
            
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No services available</p>
                <p className="text-xs">Ask your shop owner to add services</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {services.map((service) => (
                    <motion.button
                      key={service.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedService(service)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedService?.id === service.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50"
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm truncate">{service.name}</p>
                      <p className="text-primary font-display">${service.price.toFixed(2)}</p>
                    </motion.button>
                  ))}
                </div>

                <Button
                  onClick={handleLogCut}
                  disabled={!selectedService || isLoggingCut}
                  className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold gap-2"
                >
                  {isLoggingCut ? (
                    "Logging..."
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      {selectedService ? `Log ${selectedService.name}` : "Select a Service"}
                    </>
                  )}
                </Button>
              </>
            )}
          </motion.div>

          {/* Today's Cuts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="font-display text-lg mb-3">Today's Cuts</h2>
            
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : todayCuts.length === 0 ? (
              <div className="mobile-card text-center py-6">
                <Scissors className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">No cuts logged today</p>
                <p className="text-xs text-muted-foreground/70">Start by logging your first cut above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayCuts.map((cut, index) => (
                  <motion.div
                    key={cut.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="mobile-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(cut.status)}
                      <div>
                        <p className="font-medium text-foreground">
                          {cut.service?.name || "Service"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(cut.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg text-primary">${cut.price.toFixed(2)}</p>
                      <p className={`text-xs capitalize ${
                        cut.status === "confirmed" ? "text-success" :
                        cut.status === "disputed" ? "text-destructive" :
                        "text-warning"
                      }`}>
                        {cut.status}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
}
