import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { getSalaryPeriods, periodToDateRange } from "@/lib/salaryPeriod";

interface BarberDue {
  id: string;
  name: string;
  totalRevenue: number;
  calculatedSalary: number;
  totalAdvances: number;
  netPayable: number;
}

interface SalaryAlertsCardProps {
  ownerId?: string;
  shopId?: string;
  /** If provided, renders in cashier mode (no mark-paid) */
  cashierMode?: boolean;
}

export default function SalaryAlertsCard({ ownerId, shopId, cashierMode }: SalaryAlertsCardProps) {
  const [dueBarbers, setDueBarbers] = useState<BarberDue[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [resolvedShopId, setResolvedShopId] = useState<string | null>(shopId || null);

  const { current } = getSalaryPeriods();

  useEffect(() => {
    if (!current.isDue) return;
    fetchDueSalaries();
  }, [ownerId, shopId]);

  const fetchDueSalaries = async () => {
    try {
      let shopIds: string[];
      if (shopId) {
        shopIds = [shopId];
      } else if (ownerId) {
        const { data: shops } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", ownerId);
        if (!shops?.length) return;
        shopIds = shops.map((s) => s.id);
      } else {
        return;
      }

      const { startDate, endDate } = periodToDateRange(current);
      setPeriodLabel(current.label);

      // Get barbers
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, shop_id")
        .in("shop_id", shopIds)
        .eq("role", "barber")
        .eq("is_active", true);

      if (!staffData?.length) return;

      const barberIds = staffData.map((b) => b.id);

      const [cutsRes, advRes, payRes] = await Promise.all([
        supabase
          .from("cuts")
          .select("barber_id, price")
          .in("shop_id", shopIds)
          .eq("status", "confirmed")
          .in("barber_id", barberIds)
          .gte("confirmed_at", `${startDate}T00:00:00`)
          .lte("confirmed_at", `${endDate}T23:59:59`),
        supabase
          .from("salary_advances")
          .select("staff_id, amount")
          .in("shop_id", shopIds)
          .in("staff_id", barberIds)
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${endDate}T23:59:59`),
        supabase
          .from("salary_payments")
          .select("staff_id")
          .in("shop_id", shopIds)
          .in("staff_id", barberIds)
          .gte("period_start", startDate)
          .lte("period_end", endDate),
      ]);

      const revenueMap: Record<string, number> = {};
      const advanceMap: Record<string, number> = {};
      const paidSet = new Set<string>();

      (cutsRes.data || []).forEach((c) => {
        revenueMap[c.barber_id] = (revenueMap[c.barber_id] || 0) + Number(c.price);
      });
      (advRes.data || []).forEach((a) => {
        advanceMap[a.staff_id] = (advanceMap[a.staff_id] || 0) + Number(a.amount);
      });
      (payRes.data || []).forEach((p) => paidSet.add(p.staff_id));

      const due: BarberDue[] = staffData
        .filter((b) => !paidSet.has(b.id))
        .map((b) => {
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
        })
        .filter((b) => b.totalRevenue > 0);

      // Store first shop for payment recording
      if (staffData.length > 0 && !resolvedShopId) {
        setResolvedShopId(staffData[0].shop_id);
      }

      setDueBarbers(due);
    } catch (error) {
      console.error("Error fetching salary alerts:", error);
    }
  };

  const handleMarkPaid = async (barber: BarberDue) => {
    if (cashierMode) return;
    setPayingId(barber.id);
    try {
      const { startDate, endDate } = periodToDateRange(current);
      const today = new Date().toISOString().split("T")[0];

      const targetShopId = shopId || resolvedShopId;
      if (!targetShopId) throw new Error("Shop not found");

      const { error } = await supabase.from("salary_payments").insert({
        staff_id: barber.id,
        shop_id: targetShopId,
        amount: barber.netPayable,
        payment_date: today,
        period_start: startDate,
        period_end: endDate,
        notes: `Period: ${current.label}`,
      });

      if (error) throw error;

      toast.success(`${barber.name}'s salary marked as paid`);
      setDueBarbers((prev) => prev.filter((b) => b.id !== barber.id));
    } catch (error: any) {
      console.error("Error marking salary paid:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setPayingId(null);
    }
  };

  if (!current.isDue || dueBarbers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-warning/30 bg-warning/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-warning" />
        <h3 className="font-display text-lg text-foreground">Barber Salary Due</h3>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        Period: {periodLabel}
      </p>

      <div className="space-y-2">
        {dueBarbers.map((barber) => (
          <div
            key={barber.id}
            className="bg-card rounded-xl p-3 border border-border space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{barber.name}</p>
              {!cashierMode && (
                <Button
                  size="sm"
                  onClick={() => handleMarkPaid(barber)}
                  disabled={payingId === barber.id || barber.netPayable <= 0}
                  className="h-7 rounded-lg gap-1 bg-success hover:bg-success/90 text-success-foreground text-xs"
                >
                  <Check className="w-3 h-3" />
                  {payingId === barber.id ? "..." : "Paid"}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="text-foreground font-medium">{formatCurrency(barber.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salary (⅓)</span>
                <span className="text-success font-medium">{formatCurrency(barber.calculatedSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advances</span>
                <span className="text-warning font-medium">{formatCurrency(barber.totalAdvances)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Due</span>
                <span className="text-foreground font-display">{formatCurrency(barber.netPayable)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
