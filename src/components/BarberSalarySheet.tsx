import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Minus, Plus, X, Loader2 } from "lucide-react";
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

interface BarberSalaryData {
  id: string;
  name: string;
  totalRevenue: number;
  calculatedSalary: number;
  totalAdvances: number;
  netPayable: number;
}

interface BarberSalarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  /** If provided, enables cashier advance recording */
  cashierId?: string;
  sessionToken?: string;
  /** "owner" uses supabase auth, "cashier" uses RPC */
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
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "week">("month");

  useEffect(() => {
    if (isOpen) {
      fetchBarberSalaries();
    }
  }, [isOpen, shopId, selectedPeriod]);

  const fetchBarberSalaries = async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate: string;
      if (selectedPeriod === "month") {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      } else {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split("T")[0];
      }
      const endDate = now.toISOString().split("T")[0];

      // Get barbers for this shop
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

      // Get confirmed cuts for these barbers in the period
      const { data: cutsData } = await supabase
        .from("cuts")
        .select("barber_id, price")
        .eq("shop_id", shopId)
        .eq("status", "confirmed")
        .in("barber_id", barberIds)
        .gte("confirmed_at", `${startDate}T00:00:00`)
        .lte("confirmed_at", `${endDate}T23:59:59`);

      // Get advances for these barbers in the period
      const { data: advancesData } = await supabase
        .from("salary_advances")
        .select("staff_id, amount")
        .eq("shop_id", shopId)
        .in("staff_id", barberIds)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);

      // Aggregate
      const revenueMap: Record<string, number> = {};
      const advanceMap: Record<string, number> = {};

      (cutsData || []).forEach((cut) => {
        revenueMap[cut.barber_id] = (revenueMap[cut.barber_id] || 0) + Number(cut.price);
      });

      (advancesData || []).forEach((adv) => {
        advanceMap[adv.staff_id] = (advanceMap[adv.staff_id] || 0) + Number(adv.amount);
      });

      const result: BarberSalaryData[] = staffData.map((b) => {
        const totalRevenue = revenueMap[b.id] || 0;
        const calculatedSalary = totalRevenue / 3;
        const totalAdvances = advanceMap[b.id] || 0;
        return {
          id: b.id,
          name: b.name,
          totalRevenue,
          calculatedSalary,
          totalAdvances,
          netPayable: Math.max(0, calculatedSalary - totalAdvances),
        };
      });

      // Sort by revenue descending
      result.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setBarbers(result);
    } catch (error) {
      console.error("Error fetching barber salaries:", error);
    } finally {
      setIsLoading(false);
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
            <SheetDescription>
              Revenue-based salary (⅓ of generated revenue)
            </SheetDescription>
            {/* Period Toggle */}
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant={selectedPeriod === "month" ? "default" : "outline"}
                className="rounded-full text-xs h-8"
                onClick={() => setSelectedPeriod("month")}
              >
                This Month
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "week" ? "default" : "outline"}
                className="rounded-full text-xs h-8"
                onClick={() => setSelectedPeriod("week")}
              >
                Last 7 Days
              </Button>
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
                <p className="text-muted-foreground">No barbers found</p>
              </div>
            ) : (
              <>
                {/* Grand Totals */}
                <div className="rounded-2xl bg-gradient-gold p-4 text-primary-foreground">
                  <p className="text-sm opacity-80 mb-1">Total Summary</p>
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
