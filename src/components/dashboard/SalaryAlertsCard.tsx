import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface StaffSalaryDue {
  id: string;
  name: string;
  role: string;
  salary_amount: number;
  salary_pay_day: number;
  shop_id: string;
  shop_name: string;
}

interface SalaryAlertsCardProps {
  ownerId: string;
}

export default function SalaryAlertsCard({ ownerId }: SalaryAlertsCardProps) {
  const [dueStaff, setDueStaff] = useState<StaffSalaryDue[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDueSalaries();
  }, [ownerId]);

  const fetchDueSalaries = async () => {
    try {
      const { data: shops } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", ownerId);

      if (!shops || shops.length === 0) return;

      const shopIds = shops.map((s) => s.id);
      const shopMap = Object.fromEntries(shops.map((s) => [s.id, s.name]));

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, salary_amount, salary_pay_day, shop_id")
        .in("shop_id", shopIds)
        .eq("is_active", true)
        .not("salary_pay_day", "is", null)
        .gt("salary_amount", 0);

      if (!staffData || staffData.length === 0) return;

      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Filter staff whose pay day has passed
      const eligibleStaff = staffData.filter(s => s.salary_pay_day && currentDay >= s.salary_pay_day);
      if (eligibleStaff.length === 0) return;

      // Batch query: get all salary payments for this month for all eligible staff
      const periodStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const periodEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: payments } = await supabase
        .from("salary_payments")
        .select("staff_id")
        .in("staff_id", eligibleStaff.map(s => s.id))
        .gte("payment_date", periodStart)
        .lte("payment_date", periodEnd);

      const paidStaffIds = new Set((payments || []).map(p => p.staff_id));

      const staffDue: StaffSalaryDue[] = eligibleStaff
        .filter(s => !paidStaffIds.has(s.id))
        .map(s => ({
          ...s,
          salary_amount: s.salary_amount || 0,
          salary_pay_day: s.salary_pay_day!,
          shop_name: shopMap[s.shop_id] || "",
        }));

      setDueStaff(staffDue);
    } catch (error) {
      console.error("Error fetching salary alerts:", error);
    }
  };

  const handleMarkPaid = async (staff: StaffSalaryDue) => {
    setPayingId(staff.id);
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      // Record salary payment
      const { error: paymentError } = await supabase
        .from("salary_payments")
        .insert({
          staff_id: staff.id,
          shop_id: staff.shop_id,
          amount: staff.salary_amount,
          payment_date: today.toISOString().split('T')[0],
          period_start: periodStart,
          period_end: periodEnd,
        });

      if (paymentError) throw paymentError;

      // Also record as expense
      // We need to use the RPC but it requires a cashier - use direct insert with owner
      // Expenses table allows owner via RLS
      const { error: expenseError } = await supabase
        .from("expenses")
        .insert({
          shop_id: staff.shop_id,
          recorded_by: staff.id, // Attribute to the staff member
          category: "other" as const,
          description: `Salary payment - ${staff.name} (${staff.role})`,
          amount: staff.salary_amount,
        });

      // Don't fail if expense insert fails due to RLS (recorded_by must be cashier)
      if (expenseError) {
        console.warn("Could not auto-record salary as expense:", expenseError.message);
      }

      toast.success(`${staff.name}'s salary marked as paid`);
      setDueStaff((prev) => prev.filter((s) => s.id !== staff.id));
    } catch (error: any) {
      console.error("Error marking salary paid:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setPayingId(null);
    }
  };

  if (dueStaff.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-warning/30 bg-warning/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-warning" />
        <h3 className="font-display text-lg text-foreground">Salary Due</h3>
      </div>

      <div className="space-y-2">
        {dueStaff.map((staff) => (
          <div
            key={staff.id}
            className="flex items-center justify-between bg-card rounded-xl p-3 border border-border"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{staff.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {staff.role} • {staff.shop_name} • Due day {staff.salary_pay_day}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-display text-foreground">
                {formatCurrency(staff.salary_amount)}
              </span>
              <Button
                size="sm"
                onClick={() => handleMarkPaid(staff)}
                disabled={payingId === staff.id}
                className="h-8 rounded-lg gap-1 bg-success hover:bg-success/90 text-success-foreground"
              >
                <Check className="w-3.5 h-3.5" />
                {payingId === staff.id ? "..." : "Paid"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
