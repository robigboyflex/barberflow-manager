import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LogOut, 
  Clock, 
  DollarSign,
  CreditCard,
  TrendingDown,
  Scissors
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import AnimatedPage from "@/components/AnimatedPage";
import RecordPaymentModal from "@/components/cashier/RecordPaymentModal";
import CloseShiftModal from "@/components/cashier/CloseShiftModal";
import AddExpenseModal from "@/components/cashier/AddExpenseModal";
import PreviousDayRevenue from "@/components/cashier/PreviousDayRevenue";
import CashierChatSheet from "@/components/messaging/CashierChatSheet";
import LiveClock from "@/components/LiveClock";
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
  shopExpenses: number;
}

interface BarberCutCount {
  id: string;
  name: string;
  cutCount: number;
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
    shopExpenses: 0,
  });
  const [barberCuts, setBarberCuts] = useState<BarberCutCount[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAutoClockOutPrompt, setShowAutoClockOutPrompt] = useState(false);

  // 3AM auto clock-out check
  useEffect(() => {
    if (!isClockedIn) return;
    const checkAutoClockOut = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 3 && hour < 6) {
        setShowAutoClockOutPrompt(true);
      }
    };
    checkAutoClockOut();
    const interval = setInterval(checkAutoClockOut, 60000);
    return () => clearInterval(interval);
  }, [isClockedIn]);

  // Auto clock-out after 30s of no response
  useEffect(() => {
    if (!showAutoClockOutPrompt || !isClockedIn) return;
    const timeout = setTimeout(() => {
      handleClockOut();
      setShowAutoClockOutPrompt(false);
      toast.info("You have been automatically clocked out (past 3:00 AM)");
    }, 30000);
    return () => clearTimeout(timeout);
  }, [showAutoClockOutPrompt, isClockedIn]);

  // Detect stale shift on mount (shift from previous day)
  useEffect(() => {
    if (!isClockedIn || !currentShiftStart) return;
    const shiftDate = new Date(currentShiftStart);
    const today = new Date();
    // If shift started on a previous calendar day and it's past 3 AM, auto close
    if (shiftDate.toDateString() !== today.toDateString() && today.getHours() >= 3) {
      toast.warning("Your previous shift was not closed. Closing it now...");
      handleClockOut();
    }
  }, [isClockedIn, currentShiftStart]);

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

    // Debounced realtime: single channel, 500ms debounce to prevent rapid refetches
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchData(), 500);
    };

    const channel = supabase
      .channel("cashier-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cuts", filter: `shop_id=eq.${staff.shop_id}` }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `shop_id=eq.${staff.shop_id}` }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
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
      // Use local date components to avoid UTC date shift for date-only queries
      const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Check for active shift
      const { data: activeShift, error: shiftError } = await supabase.rpc('get_staff_active_shift', {
        p_staff_id: staff.id,
        p_session_token: sessionToken
      });
      if (shiftError) logError('CashierPortal.getActiveShift', shiftError);

      if (activeShift && activeShift.length > 0) {
        setIsClockedIn(true);
        setCurrentShiftId(activeShift[0].shift_id);
        setCurrentShiftStart(activeShift[0].clock_in);
      } else {
        setIsClockedIn(false);
        setCurrentShiftId(null);
        setCurrentShiftStart(null);
      }

      // Fetch all shop cuts for today
      const { data: allShopCuts, error: cutsError } = await supabase.rpc('get_shop_cuts_for_cashier', {
        p_cashier_id: staff.id,
        p_session_token: sessionToken,
        p_start_date: today.toISOString(),
        p_end_date: tomorrow.toISOString()
      });
      if (cutsError) throw cutsError;

      const confirmedCuts = allShopCuts?.filter((c: any) => c.status === 'confirmed') || [];
      // myServicesCount = cuts confirmed by this cashier specifically
      const myCuts = confirmedCuts.filter((c: any) => c.barber_id === staff.id || true); // all confirmed are "my services" since cashier recorded them
      const myServicesCount = confirmedCuts.length;
      const myEarnings = confirmedCuts.reduce((sum: number, c: any) => sum + Number(c.price), 0);
      const shopServicesCount = confirmedCuts.length;
      const shopRevenue = confirmedCuts.reduce((sum: number, c: any) => sum + Number(c.price), 0);

      // Fetch today's expenses via RPC (direct table query blocked by RLS for staff)
      const { data: expensesData } = await supabase.rpc('get_shop_expenses_for_cashier', {
        p_cashier_id: staff.id,
        p_session_token: sessionToken,
        p_start_date: todayDateStr,
        p_end_date: todayDateStr,
      });

      const shopExpenses = expensesData?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;

      setSummary({ myServicesCount, myEarnings, shopServicesCount, shopRevenue, shopExpenses });

      // Build barber cut counts
      const barberMap = new Map<string, { name: string; count: number }>();
      // Also fetch barbers list to show barbers with 0 cuts
      const { data: barbersData } = await supabase.rpc('get_shop_barbers', {
        p_shop_id: staff.shop_id,
        p_staff_id: staff.id,
        p_session_token: sessionToken
      });

      barbersData?.forEach((b: any) => {
        barberMap.set(b.id, { name: b.name, count: 0 });
      });

      confirmedCuts.forEach((cut: any) => {
        const existing = barberMap.get(cut.barber_id);
        if (existing) {
          existing.count += 1;
        } else {
          barberMap.set(cut.barber_id, { name: cut.barber_name, count: 1 });
        }
      });

      setBarberCuts(
        Array.from(barberMap.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          cutCount: data.count,
        }))
      );

      // Build recent activity
      const activities: ActivityItem[] = [];
      confirmedCuts.forEach((cut: any) => {
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

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10));
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

  const handleClockOut = () => {
    if (!currentShiftId || !currentShiftStart) {
      toast.error("No active shift found");
      return;
    }
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

  const netToday = summary.shopRevenue - summary.shopExpenses;

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
              <LiveClock className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <CashierChatSheet />
              <motion.button
                onClick={handleLogout}
                className="w-12 h-12 rounded-full border border-destructive/30 flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                <LogOut className="w-5 h-5 text-destructive" />
              </motion.button>
            </div>
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

          {/* Clock in to start prompt */}
          {!isClockedIn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-display text-foreground text-base">Clock in to start</p>
                <p className="text-sm text-muted-foreground">You need to clock in before recording services</p>
              </div>
            </motion.div>
          )}

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

          {/* Add Expense Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
          >
            <Button
              onClick={() => setShowExpenseModal(true)}
              disabled={!isClockedIn}
              variant="outline"
              className={`w-full h-14 rounded-xl text-lg font-medium gap-2 border-2 ${
                isClockedIn
                  ? "border-muted-foreground text-foreground hover:bg-muted"
                  : "border-muted text-muted-foreground"
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              Add Expense
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
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-display text-foreground">{summary.shopServicesCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-display text-green-500">
                  GH₵{summary.shopRevenue.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-display text-destructive">
                  GH₵{summary.shopExpenses.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Net Today</p>
              <p className={`text-2xl font-display ${netToday >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                GH₵{netToday.toFixed(0)}
              </p>
            </div>
          </motion.div>

          {/* Barber Cuts Today */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-card border border-border p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg text-foreground">Barber Cuts Today</h3>
            </div>
            <div className="space-y-0">
              {barberCuts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No barbers found</p>
              ) : (
                barberCuts.map((barber, index) => (
                  <div
                    key={barber.id}
                    className={`flex items-center justify-between py-3 ${
                      index < barberCuts.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Scissors className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-foreground font-medium">{barber.name}</span>
                    </div>
                    <span className="text-sm text-green-500 font-medium bg-green-500/10 px-3 py-1 rounded-full">
                      {barber.cutCount} cuts
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Previous Day Revenue */}
          <PreviousDayRevenue />

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
                    transition={{ delay: 0.35 + index * 0.05 }}
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

        {/* Add Expense Modal */}
        <AddExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
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

        {/* Auto Clock-Out Prompt */}
        {showAutoClockOutPrompt && isClockedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border shadow-2xl text-center space-y-4"
            >
              <Clock className="w-12 h-12 text-warning mx-auto" />
              <h3 className="font-display text-xl text-foreground">It's past 3:00 AM</h3>
              <p className="text-sm text-muted-foreground">
                Would you like to clock out? You will be automatically clocked out in 30 seconds.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAutoClockOutPrompt(false)}
                  className="h-12 rounded-xl"
                >
                  Stay Clocked In
                </Button>
                <Button
                  onClick={() => {
                    setShowAutoClockOutPrompt(false);
                    handleClockOut();
                  }}
                  className="h-12 rounded-xl bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  Clock Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
}
