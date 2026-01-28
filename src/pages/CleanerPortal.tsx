import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  LogOut, 
  Clock, 
  CheckCircle,
  Play,
  Square
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import AnimatedPage from "@/components/AnimatedPage";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";

interface Shift {
  shift_id: string;
  clock_in: string;
  clock_out: string | null;
}

export default function CleanerPortal() {
  const navigate = useNavigate();
  const { staff, logout, isAuthenticated, getSessionToken } = useStaffAuth();
  const [activeShift, setActiveShift] = useState<{ shift_id: string; clock_in: string } | null>(null);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !staff) {
      navigate("/staff-login");
      return;
    }
    if (staff.role !== "cleaner") {
      toast.error("Access denied. Cleaners only.");
      navigate("/staff-login");
      return;
    }
    fetchShiftData();
  }, [isAuthenticated, staff]);

  const fetchShiftData = async () => {
    if (!staff) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Session expired. Please login again.");
      navigate("/staff-login");
      return;
    }

    try {
      // Fetch active shift
      const { data: activeData, error: activeError } = await supabase.rpc('get_staff_active_shift', {
        p_staff_id: staff.id,
        p_session_token: sessionToken
      });

      if (activeError) throw activeError;
      setActiveShift(activeData && activeData.length > 0 ? activeData[0] : null);

      // Fetch today's shifts
      const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_staff_today_shifts', {
        p_staff_id: staff.id,
        p_session_token: sessionToken
      });

      if (shiftsError) throw shiftsError;
      setTodayShifts(shiftsData || []);

    } catch (error) {
      logError('CleanerPortal.fetchShiftData', error);
      toast.error(getUserFriendlyError(error, 'load shift data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!staff) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Session expired. Please login again.");
      navigate("/staff-login");
      return;
    }

    setIsClockingIn(true);
    try {
      const { data, error } = await supabase.rpc('staff_clock_in', {
        p_staff_id: staff.id,
        p_shop_id: staff.shop_id,
        p_session_token: sessionToken
      });

      if (error) throw error;

      toast.success("Clocked in successfully!");
      fetchShiftData();
    } catch (error) {
      logError('CleanerPortal.handleClockIn', error);
      toast.error(getUserFriendlyError(error, 'clock in'));
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!staff || !activeShift) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Session expired. Please login again.");
      navigate("/staff-login");
      return;
    }

    setIsClockingOut(true);
    try {
      const { error } = await supabase.rpc('staff_clock_out', {
        p_staff_id: staff.id,
        p_shift_id: activeShift.shift_id,
        p_session_token: sessionToken
      });

      if (error) throw error;

      toast.success("Clocked out successfully!");
      fetchShiftData();
    } catch (error) {
      logError('CleanerPortal.handleClockOut', error);
      toast.error(getUserFriendlyError(error, 'clock out'));
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mobile-card text-center"
          >
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="font-display text-xl mb-2">Cleaner Portal</h2>
            <p className="text-muted-foreground text-sm">
              Track your work hours
            </p>
          </motion.div>

          {/* Clock In/Out */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mobile-card"
          >
            <h3 className="font-display text-lg mb-4">Time Clock</h3>
            
            {isLoading ? (
              <Skeleton className="h-12 rounded-xl" />
            ) : activeShift ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-success/10 rounded-xl border border-success/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-foreground">Currently Working</p>
                      <p className="text-xs text-muted-foreground">
                        Since {formatTime(activeShift.clock_in)} • {formatDuration(activeShift.clock_in, null)}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleClockOut}
                  disabled={isClockingOut}
                  className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold gap-2"
                >
                  {isClockingOut ? (
                    "Clocking Out..."
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      Clock Out
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold gap-2"
              >
                {isClockingIn ? (
                  "Clocking In..."
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Clock In
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Today's Shifts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display text-lg mb-3">Today's Shifts</h3>
            
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : todayShifts.length === 0 ? (
              <div className="mobile-card text-center py-6">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">No shifts logged today</p>
                <p className="text-xs text-muted-foreground/70">Clock in to start your shift</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayShifts.map((shift, index) => (
                  <motion.div
                    key={shift.shift_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="mobile-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {shift.clock_out ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning animate-pulse" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {formatTime(shift.clock_in)} - {shift.clock_out ? formatTime(shift.clock_out) : "Active"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {formatDuration(shift.clock_in, shift.clock_out)}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      shift.clock_out 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    }`}>
                      {shift.clock_out ? "Complete" : "Active"}
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
