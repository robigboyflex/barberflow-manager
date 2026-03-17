import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Scissors, Receipt, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { formatCurrency } from "@/lib/currency";
import { logError } from "@/lib/errorHandler";

interface PastDaySummary {
  totalRevenue: number;
  totalExpenses: number;
  totalTransactions: number;
  barberBreakdown: { name: string; cuts: number; revenue: number }[];
}

export default function PreviousDayRevenue() {
  const { staff, getSessionToken } = useStaffAuth();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [summary, setSummary] = useState<PastDaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const navigateDate = (direction: -1 | 1) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction);
      if (isFuture(next)) return prev;
      return next;
    });
  };

  const formatDateLabel = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  useEffect(() => {
    if (!staff || isToday(selectedDate)) return;
    fetchPastData();
  }, [selectedDate, staff]);

  const fetchPastData = async () => {
    if (!staff) return;
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    setIsLoading(true);
    try {
      // Use local timezone boundaries to prevent cross-day bleeding
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      const dateStr = startOfDay.toISOString().split("T")[0];

      const [cutsResult, expensesResult] = await Promise.all([
        supabase.rpc("get_shop_cuts_for_cashier", {
          p_cashier_id: staff.id,
          p_session_token: sessionToken,
          p_start_date: startOfDay.toISOString(),
          p_end_date: endOfDay.toISOString(),
        }),
        supabase.rpc("get_shop_expenses_for_cashier", {
          p_cashier_id: staff.id,
          p_session_token: sessionToken,
          p_start_date: dateStr,
          p_end_date: dateStr,
        }),
      ]);

      if (cutsResult.error) throw cutsResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const confirmedCuts = (cutsResult.data || []).filter((c: any) => c.status === "confirmed");
      const totalRevenue = confirmedCuts.reduce((s: number, c: any) => s + Number(c.price), 0);
      const totalExpenses = (expensesResult.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

      const barberMap = new Map<string, { name: string; cuts: number; revenue: number }>();
      confirmedCuts.forEach((cut: any) => {
        const existing = barberMap.get(cut.barber_id);
        if (existing) {
          existing.cuts += 1;
          existing.revenue += Number(cut.price);
        } else {
          barberMap.set(cut.barber_id, { name: cut.barber_name, cuts: 1, revenue: Number(cut.price) });
        }
      });

      setSummary({
        totalRevenue,
        totalExpenses,
        totalTransactions: confirmedCuts.length,
        barberBreakdown: Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue),
      });
    } catch (error) {
      logError("PreviousDayRevenue.fetchPastData", error);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const net = summary ? summary.totalRevenue - summary.totalExpenses : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-base text-foreground">Past Revenue</h3>
            <p className="text-xs text-muted-foreground">View previous day earnings</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          className="text-muted-foreground"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Date Navigator */}
              <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => navigateDate(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium text-sm text-foreground">
                  {formatDateLabel(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => navigateDate(1)}
                  disabled={isFuture(new Date(selectedDate.getTime() + 86400000))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="py-6 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Loading...</p>
                </div>
              ) : summary ? (
                <>
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-xl font-display text-foreground">{formatCurrency(summary.totalRevenue)}</p>
                      <p className="text-[11px] text-muted-foreground">Revenue</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Receipt className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-xl font-display text-foreground">{summary.totalTransactions}</p>
                      <p className="text-[11px] text-muted-foreground">Transactions</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
                      <p className="text-xl font-display text-foreground">{formatCurrency(summary.totalExpenses)}</p>
                      <p className="text-[11px] text-muted-foreground">Expenses</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: net >= 0 ? "var(--color-green-500, #22c55e)" : "var(--color-destructive)" }} />
                      <p className={`text-xl font-display ${net >= 0 ? "text-green-500" : "text-destructive"}`}>
                        {formatCurrency(net)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Net Profit</p>
                    </div>
                  </div>

                  {/* Barber Breakdown */}
                  {summary.barberBreakdown.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                        Barber Breakdown
                      </p>
                      <div className="space-y-0">
                        {summary.barberBreakdown.map((barber, i) => (
                          <div
                            key={barber.name}
                            className={`flex items-center justify-between py-2.5 ${
                              i < summary.barberBreakdown.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm text-foreground">{barber.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{barber.cuts} cuts</span>
                              <span className="text-sm font-medium text-green-500">
                                {formatCurrency(barber.revenue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
