import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Minus, Loader2, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { getSalaryPeriods, periodToDateRange, SalaryPeriod } from "@/lib/salaryPeriod";

interface CashierCutBreakdown {
  cashierName: string;
  cuts: number;
  revenue: number;
}

interface BarberSalaryData {
  id: string;
  name: string;
  totalRevenue: number;
  totalCuts: number;
  calculatedSalary: number;
  totalAdvances: number;
  netPayable: number;
  cashierBreakdown: CashierCutBreakdown[];
}

interface BarberSalarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  cashierId?: string;
  sessionToken?: string;
  mode: "owner" | "cashier";
}

export default function BarberSalarySheet({
  isOpen,
  onClose,
  shopId,
  cashierId,
  sessionToken,
  mode,
}: BarberSalarySheetProps) {
  const [barbers, setBarbers] = useState<BarberSalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [advanceBarber, setAdvanceBarber] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"current" | "previous">("current");

  const { current, previous } = getSalaryPeriods();
  const activePeriod: SalaryPeriod = selectedView === "current" ? current : previous!;

  useEffect(() => {
    if (isOpen) {
      fetchBarberSalaries();
    }
  }, [isOpen, shopId, selectedView]);

  const fetchBarberSalaries = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = periodToDateRange(activePeriod);

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("shop_id", shopId)
        .eq("role", "barber")
        .eq("is_active", true);

      if (!staffData || staffData.length === 0) {
        setBarbers([]);
        setIsLoading(false);
        return;
      }

      const barberIds = staffData.map((b) => b.id);

      // Fetch all cashiers for name lookup
      const { data: cashierData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("shop_id", shopId)
        .eq("role", "cashier")
        .eq("is_active", true);

      const cashierNameMap: Record<string, string> = {};
      (cashierData || []).forEach((c) => { cashierNameMap[c.id] = c.name; });

      const [cutsResult, advancesResult, paymentsResult] = await Promise.all([
        supabase
          .from("cuts")
          .select("barber_id, price, confirmed_by")
          .eq("shop_id", shopId)
          .eq("status", "confirmed")
          .in("barber_id", barberIds)
          .gte("confirmed_at", `${startDate}T00:00:00`)
          .lte("confirmed_at", `${endDate}T23:59:59`),
        supabase
          .from("salary_advances")
          .select("staff_id, amount")
          .eq("shop_id", shopId)
          .in("staff_id", barberIds)
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${endDate}T23:59:59`),
        supabase
          .from("salary_payments")
          .select("staff_id")
          .eq("shop_id", shopId)
          .in("staff_id", barberIds)
          .gte("period_start", startDate)
          .lte("period_end", endDate),
      ]);

      const revenueMap: Record<string, number> = {};
      const cutCountMap: Record<string, number> = {};
      const advanceMap: Record<string, number> = {};
      const paidSet = new Set<string>();
      // barber_id -> cashier_id -> { cuts, revenue }
      const cashierBreakdownMap: Record<string, Record<string, { cuts: number; revenue: number }>> = {};

      (cutsResult.data || []).forEach((cut) => {
        revenueMap[cut.barber_id] = (revenueMap[cut.barber_id] || 0) + Number(cut.price);
        cutCountMap[cut.barber_id] = (cutCountMap[cut.barber_id] || 0) + 1;

        const cashierId = cut.confirmed_by || "unknown";
        if (!cashierBreakdownMap[cut.barber_id]) cashierBreakdownMap[cut.barber_id] = {};
        if (!cashierBreakdownMap[cut.barber_id][cashierId]) {
          cashierBreakdownMap[cut.barber_id][cashierId] = { cuts: 0, revenue: 0 };
        }
        cashierBreakdownMap[cut.barber_id][cashierId].cuts += 1;
        cashierBreakdownMap[cut.barber_id][cashierId].revenue += Number(cut.price);
      });

      (advancesResult.data || []).forEach((adv) => {
        advanceMap[adv.staff_id] = (advanceMap[adv.staff_id] || 0) + Number(adv.amount);
      });

      (paymentsResult.data || []).forEach((p) => {
        paidSet.add(p.staff_id);
      });

      const result: BarberSalaryData[] = staffData
        .filter((b) => !paidSet.has(b.id))
        .map((b) => {
          const totalRevenue = revenueMap[b.id] || 0;
          const totalCuts = cutCountMap[b.id] || 0;
          const calculatedSalary = totalRevenue / 3;
          const totalAdvances = advanceMap[b.id] || 0;
          const breakdown = cashierBreakdownMap[b.id] || {};
          const cashierBreakdown: CashierCutBreakdown[] = Object.entries(breakdown)
            .map(([cId, data]) => ({
              cashierName: cashierNameMap[cId] || "Unknown",
              cuts: data.cuts,
              revenue: data.revenue,
            }))
            .sort((a, b) => b.cuts - a.cuts);
          return {
            id: b.id,
            name: b.name,
            totalRevenue,
            totalCuts,
            calculatedSalary,
            totalAdvances,
            netPayable: Math.max(0, calculatedSalary - totalAdvances),
            cashierBreakdown,
          };
        });

      result.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setBarbers(result);
    } catch (error) {
      console.error("Error fetching barber salaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (barber: BarberSalaryData) => {
    setPayingId(barber.id);
    try {
      const { startDate, endDate } = periodToDateRange(activePeriod);
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("salary_payments").insert({
        staff_id: barber.id,
        shop_id: shopId,
        amount: barber.netPayable,
        payment_date: today,
        period_start: startDate,
        period_end: endDate,
        notes: `Period: ${activePeriod.label}`,
      });

      if (error) throw error;

      toast.success(`${barber.name}'s salary marked as paid`);
      setBarbers((prev) => prev.filter((b) => b.id !== barber.id));
    } catch (error: any) {
      console.error("Error marking salary paid:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setPayingId(null);
    }
  };

  const handleRecordAdvance = async () => {
    if (!advanceBarber || !advanceAmount || !cashierId) return;
    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsRecording(true);
    try {
      const { error } = await supabase.rpc("record_salary_advance", {
        p_shop_id: shopId,
        p_staff_id: cashierId,
        p_barber_id: advanceBarber,
        p_amount: amount,
        p_notes: advanceNotes || null,
        p_session_token: sessionToken || null,
      });

      if (error) throw error;

      const barberName = barbers.find((b) => b.id === advanceBarber)?.name;
      toast.success(`Advance of ${formatCurrency(amount)} recorded for ${barberName}`);
      setAdvanceBarber(null);
      setAdvanceAmount("");
      setAdvanceNotes("");
      fetchBarberSalaries();
    } catch (error: any) {
      console.error("Error recording advance:", error);
      toast.error(error.message || "Failed to record advance");
    } finally {
      setIsRecording(false);
    }
  };

  const grandTotals = barbers.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.totalRevenue,
      salary: acc.salary + b.calculatedSalary,
      advances: acc.advances + b.totalAdvances,
      net: acc.net + b.netPayable,
    }),
    { revenue: 0, salary: 0, advances: 0, net: 0 }
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-5 pb-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 font-display text-xl">
              <DollarSign className="w-5 h-5 text-primary" />
              Barber Salary
            </SheetTitle>
            <SheetDescription className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Period: {activePeriod.label}
              {activePeriod.isDue && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                  Due
                </span>
              )}
            </SheetDescription>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant={selectedView === "current" ? "default" : "outline"}
                className="rounded-full text-xs h-8"
                onClick={() => setSelectedView("current")}
              >
                Current Period
              </Button>
              {previous && (
                <Button
                  size="sm"
                  variant={selectedView === "previous" ? "default" : "outline"}
                  className="rounded-full text-xs h-8"
                  onClick={() => setSelectedView("previous")}
                >
                  Previous Period
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : barbers.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {selectedView === "current"
                    ? "All salaries paid or no barbers found"
                    : "No unpaid salaries for the previous period"}
                </p>
              </div>
            ) : (
              <>
                {/* Grand Totals */}
                <div className="rounded-2xl bg-gradient-gold p-4 text-primary-foreground">
                  <p className="text-sm opacity-80 mb-1">Period Summary</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs opacity-70">Total Revenue</p>
                      <p className="text-lg font-display">{formatCurrency(grandTotals.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Total Salary (⅓)</p>
                      <p className="text-lg font-display">{formatCurrency(grandTotals.salary)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Total Advances</p>
                      <p className="text-lg font-display">{formatCurrency(grandTotals.advances)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Net Payable</p>
                      <p className="text-lg font-display">{formatCurrency(grandTotals.net)}</p>
                    </div>
                  </div>
                </div>

                {/* Per-Barber Cards */}
                {barbers.map((barber) => (
                  <motion.div
                    key={barber.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-card border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-foreground text-base">{barber.name}</h4>
                      <div className="flex items-center gap-2">
                        {mode === "cashier" && cashierId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs h-7 gap-1 border-warning text-warning hover:bg-warning/10"
                            onClick={() =>
                              setAdvanceBarber(advanceBarber === barber.id ? null : barber.id)
                            }
                          >
                            <Minus className="w-3 h-3" />
                            Advance
                          </Button>
                        )}
                        {activePeriod.isDue && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(barber)}
                            disabled={payingId === barber.id || barber.netPayable <= 0}
                            className="rounded-full text-xs h-7 gap-1 bg-success hover:bg-success/90 text-success-foreground"
                          >
                            <Check className="w-3 h-3" />
                            {payingId === barber.id ? "..." : "Paid"}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Revenue Generated</p>
                        <p className="font-display text-foreground text-lg">
                          {formatCurrency(barber.totalRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Salary (⅓)</p>
                        <p className="font-display text-success text-lg">
                          {formatCurrency(barber.calculatedSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Advances Taken</p>
                        <p className="font-display text-warning text-lg">
                          {formatCurrency(barber.totalAdvances)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Net Payable</p>
                        <p className={`font-display text-lg ${barber.netPayable > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {formatCurrency(barber.netPayable)}
                        </p>
                      </div>
                    </div>

                    {/* Advance Form (inline) */}
                    {advanceBarber === barber.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border pt-3 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">Record Advance</p>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          className="rounded-xl"
                          min="0"
                        />
                        <Input
                          type="text"
                          placeholder="Notes (optional)"
                          value={advanceNotes}
                          onChange={(e) => setAdvanceNotes(e.target.value)}
                          className="rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleRecordAdvance}
                            disabled={isRecording || !advanceAmount}
                            className="rounded-xl flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
                          >
                            {isRecording ? "Recording..." : "Record Advance"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdvanceBarber(null);
                              setAdvanceAmount("");
                              setAdvanceNotes("");
                            }}
                            className="rounded-xl"
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
