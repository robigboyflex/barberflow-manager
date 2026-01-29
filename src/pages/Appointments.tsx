import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Calendar, Phone, User, Clock, Check, X, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AnimatedPage from "@/components/AnimatedPage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: string;
  created_at: string;
  service: { name: string; price: number } | null;
  barber: { name: string } | null;
  shop: { id: string; name: string };
}

interface Shop {
  id: string;
  name: string;
}

const tabs = ["All", "Pending", "Completed", "Cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-muted",
};

export default function Appointments() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShops();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, selectedDate, selectedShop]);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", user?.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("appointments")
        .select(`
          id,
          customer_name,
          customer_phone,
          preferred_date,
          preferred_time,
          notes,
          status,
          created_at,
          service:services(name, price),
          barber:staff!preferred_barber_id(name),
          shop:shops!inner(id, name)
        `)
        .eq("preferred_date", format(selectedDate, "yyyy-MM-dd"))
        .order("preferred_time", { ascending: true });

      if (selectedShop !== "all") {
        query = query.eq("shop_id", selectedShop);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Appointment cancelled");
      fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.customer_phone.includes(searchQuery) ||
      apt.service?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "All") return matchesSearch;
    if (activeTab === "Pending") return matchesSearch && apt.status === "pending";
    if (activeTab === "Completed") return matchesSearch && apt.status === "completed";
    if (activeTab === "Cancelled") return matchesSearch && (apt.status === "cancelled" || apt.status === "no_show");
    return matchesSearch;
  });

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  return (
    <AnimatedPage>
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl tracking-wide">Appointments</h1>
          {shops.length > 1 && (
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="w-[180px]">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>

        {/* Date Selector */}
        <motion.div
          className="flex items-center justify-between mobile-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button 
            onClick={goToPreviousDay}
            whileTap={{ scale: 0.9 }} 
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-center">
                <div>
                  <p className="font-semibold">
                    {format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                      ? "Today" 
                      : format(selectedDate, "EEEE")}
                  </p>
                  <p className="text-sm text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <motion.button 
            onClick={goToNextDay}
            whileTap={{ scale: 0.9 }} 
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </motion.div>

        {/* Search */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-secondary border-0 text-base"
          />
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2 overflow-x-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-2xl font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              {tab}
            </motion.button>
          ))}
        </motion.div>

        {/* Appointments List */}
        <motion.div 
          className="space-y-3"
          initial="initial"
          animate="animate"
          key={`${activeTab}-${format(selectedDate, "yyyy-MM-dd")}`}
        >
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No appointments found</p>
              <p className="text-sm">
                {activeTab === "All" 
                  ? "No appointments for this date"
                  : `No ${activeTab.toLowerCase()} appointments`}
              </p>
            </motion.div>
          ) : (
            filteredAppointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mobile-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.customer_name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {appointment.customer_phone}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                    statusColors[appointment.status]
                  )}>
                    {appointment.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {appointment.preferred_time}
                    </div>
                    {appointment.service && (
                      <span className="text-foreground">{appointment.service.name}</span>
                    )}
                  </div>
                  {appointment.service && (
                    <span className="font-semibold text-primary">
                      GH₵{appointment.service.price}
                    </span>
                  )}
                </div>

                {shops.length > 1 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    {appointment.shop.name}
                  </p>
                )}

                {appointment.barber && (
                  <p className="text-xs text-muted-foreground">
                    Preferred barber: {appointment.barber.name}
                  </p>
                )}

                {appointment.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    "{appointment.notes}"
                  </p>
                )}

                {appointment.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelAppointment(appointment.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
