import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LogOut, 
  Clock, 
  DollarSign,
  CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import AnimatedPage from "@/components/AnimatedPage";
import RecordPaymentModal from "@/components/cashier/RecordPaymentModal";
import CloseShiftModal from "@/components/cashier/CloseShiftModal";
import { getUserFriendlyError, isSessionExpiredError, logError } from "@/lib/errorHandler";

interface ActivityItem {
  id: string;
  type: "clock_in" | "clock_out" | "payment";
  description: string;
  timestamp: string;
  amount?: number;
  paymentMethod?: string;
}

interface DailySummary {
  myServicesCount: number;
  myEarnings: number;
  shopServicesCount: number;
  shopRevenue: number;
}

export default function CashierPortal() {
  const navigate = useNavigate();
  const { staff, logout, isAuthenticated, getSessionToken } = useStaffAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  const [currentShiftStart, setCurrentShiftStart] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary>({
    myServicesCount: 0,
    myEarnings: 0,
    shopServicesCount: 0,
    shopRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !staff) {
      navigate("/staff-login");
      return;
    }
    if (staff.role !== "cashier") {
      toast.error("Access denied. Cashiers only.");
      navigate("/staff-login");
      return;
    }
    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel("cashier-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cuts",
          filter: `shop_id=eq.${staff.shop_id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, staff]);

  const fetchData = async () => {
    if (!staff) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Session expired. Please log in again.");
      navigate("/staff-login");
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for active shift using secure RPC
      const { data: activeShift, error: shiftError } = await supabase.rpc('get_staff_active_shift', {
        p_staff_id: staff.id,
        p_session_token: sessionToken
      });

      if (shiftError) {
        logError('CashierPortal.getActiveShift', shiftError);
      }

      if (activeShift && activeShift.length > 0) {
        setIsClockedIn(true);
        setCurrentShiftId(activeShift[0].shift_id);
        setCurrentShiftStart(activeShift[0].clock_in);
      } else {
        setIsClockedIn(false);
        setCurrentShiftId(null);
        setCurrentShiftStart(null);
      }

      // Fetch cashier's confirmed cuts using secure RPC
      if (sessionToken) {
        const { data: allShopCuts, error: cutsError } = await supabase.rpc('get_shop_cuts_for_cashier', {
          p_cashier_id: staff.id,
          p_session_token: sessionToken,
          p_start_date: today.toISOString(),
          p_end_date: tomorrow.toISOString()
        });

        if (cutsError) throw cutsError;

        // Filter my confirmed cuts
        const myCuts = allShopCuts?.filter((c: any) => c.status === 'confirmed') || [];
        const myServicesCount = myCuts.length;
        const myEarnings = myCuts.reduce((sum: number, c: any) => sum + Number(c.price), 0);

        // Shop totals
        const confirmedCuts = allShopCuts?.filter((c: any) => c.status === 'confirmed') || [];
        const shopServicesCount = confirmedCuts.length;
        const shopRevenue = confirmedCuts.reduce((sum: number, c: any) => sum + Number(c.price), 0);

        setSummary({
          myServicesCount,
          myEarnings,
          shopServicesCount,
          shopRevenue,
        });

        // Build recent activity
        const activities: ActivityItem[] = [];

        // Add payment activities
        myCuts.forEach((cut: any) => {
          const clientPart = cut.client_name ? ` for ${cut.client_name}` : "";
          activities.push({
            id: cut.id,
            type: "payment",
            description: `${cut.service_name}${clientPart} - GH₵${Number(cut.price).toFixed(0)} (${cut.payment_method || "cash"})`,
            timestamp: cut.created_at,
            amount: Number(cut.price),
            paymentMethod: cut.payment_method || "cash",
          });
        });

        // Add shift activities using secure RPC
        const { data: todayShifts } = await supabase.rpc('get_staff_today_shifts', {
          p_staff_id: staff.id,
          p_session_token: sessionToken
        });

        todayShifts?.forEach((shift: { shift_id: string; clock_in: string; clock_out: string | null }) => {
          activities.push({
            id: `${shift.shift_id}-in`,
            type: "clock_in",
            description: `${staff.name} clocked in`,
            timestamp: shift.clock_in,
          });
          if (shift.clock_out) {
            activities.push({
              id: `${shift.shift_id}-out`,
              type: "clock_out",
              description: `${staff.name} clocked out`,
              timestamp: shift.clock_out,
            });
          }
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivity(activities.slice(0, 10));
      }
    } catch (error) {
      logError('CashierPortal.fetchData', error);
      if (isSessionExpiredError(error)) {
        toast.error(getUserFriendlyError(error, 'load data'));
        logout();
        navigate('/staff-login');
        return;
      }
      toast.error(getUserFriendlyError(error, 'load data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!staff) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Session expired. Please log in again.");
      navigate("/staff-login");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('staff_clock_in', {
        p_staff_id: staff.id,
        p_shop_id: staff.shop_id,
        p_session_token: sessionToken
      });

      if (error) throw error;

      setIsClockedIn(true);
      setCurrentShiftId(data);
      setCurrentShiftStart(new Date().toISOString());
      toast.success("Clocked in successfully!");
      fetchData();
    } catch (error) {
      logError('CashierPortal.handleClockIn', error);
      if (isSessionExpiredError(error)) {
        toast.error(getUserFriendlyError(error, 'clock in'));
        logout();
        navigate('/staff-login');
        return;
      }
      toast.error(getUserFriendlyError(error, 'clock in'));
    }
  };

  // Cashiers must close their shift when clocking out
  const handleClockOut = () => {
    if (!currentShiftId || !currentShiftStart) {
      toast.error("No active shift found");
      return;
    }
    // Open the close shift modal instead of directly clocking out
    setShowCloseShiftModal(true);
  };

  const handleShiftClosed = (result: { dayCloded: boolean }) => {
    setShowCloseShiftModal(false);
    setIsClockedIn(false);
    setCurrentShiftId(null);
    setCurrentShiftStart(null);
    fetchData();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
  };

  if (!staff) return null;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background pb-8">
        {/* Header */}
        <header className="bg-background px-5 py-4 sticky top-0 z-40 safe-area-top">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{staff.shop?.name}</p>
              <h1 className="font-display text-2xl tracking-wide text-foreground">
                {staff.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cashier</span>
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              className="w-12 h-12 rounded-full border border-destructive/30 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-5 h-5 text-destructive" />
            </motion.button>
          </div>
        </header>

        <div className="px-5 space-y-4">
          {/* My Services Today Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">My Services Today</p>
                <h2 className="text-4xl font-display text-white mt-1">
                  {summary.myServicesCount}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">Earnings</p>
                <h2 className="text-3xl font-display text-white mt-1">
                  GH₵{summary.myEarnings.toFixed(0)}
                </h2>
              </div>
            </div>
          </motion.div>

          {/* Clock In/Out Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              onClick={handleClockIn}
              disabled={isClockedIn}
              className={`h-14 rounded-xl text-base font-medium gap-2 ${
                isClockedIn
                  ? "bg-muted text-muted-foreground"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              <Clock className="w-5 h-5" />
              Clock In
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={!isClockedIn}
              variant="outline"
              className={`h-14 rounded-xl text-base font-medium gap-2 border-2 ${
                !isClockedIn
                  ? "border-muted text-muted-foreground"
                  : "border-muted-foreground text-foreground hover:bg-muted"
              }`}
            >
              <Clock className="w-5 h-5" />
              Clock Out
            </Button>
          </motion.div>

          {/* Record Payment Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Button
              onClick={() => setShowPaymentModal(true)}
              disabled={!isClockedIn}
              className={`w-full h-14 rounded-xl text-lg font-medium gap-2 ${
                isClockedIn
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Record Payment
            </Button>
          </motion.div>

          {/* Shop Today Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border p-5"
          >
            <h3 className="font-display text-lg text-foreground mb-3">Shop Today</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-display text-foreground">{summary.shopServicesCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-display text-green-500">
                  GH₵{summary.shopRevenue.toFixed(0)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="font-display text-lg text-foreground mb-3">My Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <div className="rounded-2xl bg-card border border-border p-4 text-center">
                  <p className="text-muted-foreground text-sm">No activity yet today</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="rounded-2xl bg-card border border-border p-4"
                  >
                    <p className="text-foreground text-sm">{activity.description}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {formatTime(activity.timestamp)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Record Payment Modal */}
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          shopId={staff.shop_id}
          cashierId={staff.id}
          onSuccess={fetchData}
        />

        {/* Close Shift Modal */}
        {currentShiftId && currentShiftStart && (
          <CloseShiftModal
            isOpen={showCloseShiftModal}
            onClose={() => setShowCloseShiftModal(false)}
            staffId={staff.id}
            shiftId={currentShiftId}
            shiftStartTime={currentShiftStart}
            sessionToken={getSessionToken() || ''}
            onSuccess={handleShiftClosed}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
