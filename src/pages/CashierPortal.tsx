import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  LogOut, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  Plus,
  Receipt,
  TrendingUp,
  Minus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import AnimatedPage from "@/components/AnimatedPage";

interface Cut {
  id: string;
  barber_id: string;
  service_id: string;
  client_name: string | null;
  price: number;
  status: "pending" | "confirmed" | "disputed" | "cancelled";
  created_at: string;
  barber?: { name: string };
  service?: { name: string };
}

interface DailySummary {
  totalIncome: number;
  totalExpenses: number;
  cutsConfirmed: number;
  cutsPending: number;
}

type ExpenseCategory = "supplies" | "utilities" | "rent" | "equipment" | "maintenance" | "other";

export default function CashierPortal() {
  const navigate = useNavigate();
  const { staff, logout, isAuthenticated } = useStaffAuth();
  const [pendingCuts, setPendingCuts] = useState<Cut[]>([]);
  const [summary, setSummary] = useState<DailySummary>({
    totalIncome: 0,
    totalExpenses: 0,
    cutsConfirmed: 0,
    cutsPending: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingCutId, setProcessingCutId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("supplies");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

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

    // Set up realtime subscription for new cuts
    const channel = supabase
      .channel("cuts-realtime")
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

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch pending cuts
      const { data: cutsData, error: cutsError } = await supabase
        .from("cuts")
        .select(`
          id,
          barber_id,
          service_id,
          client_name,
          price,
          status,
          created_at,
          staff!cuts_barber_id_fkey (name),
          services:service_id (name)
        `)
        .eq("shop_id", staff.shop_id)
        .eq("status", "pending")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: true });

      if (cutsError) throw cutsError;
      setPendingCuts(
        cutsData?.map((c) => ({
          ...c,
          barber: c.staff as unknown as { name: string },
          service: c.services as unknown as { name: string },
        })) || []
      );

      // Fetch today's confirmed cuts total
      const { data: confirmedData, error: confirmedError } = await supabase
        .from("cuts")
        .select("price, status")
        .eq("shop_id", staff.shop_id)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (confirmedError) throw confirmedError;

      const confirmedCuts = confirmedData?.filter((c) => c.status === "confirmed") || [];
      const pendingCount = confirmedData?.filter((c) => c.status === "pending").length || 0;
      const totalIncome = confirmedCuts.reduce((sum, c) => sum + Number(c.price), 0);

      // Fetch today's expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .eq("shop_id", staff.shop_id)
        .eq("expense_date", today.toISOString().split("T")[0]);

      if (expensesError) throw expensesError;

      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setSummary({
        totalIncome,
        totalExpenses,
        cutsConfirmed: confirmedCuts.length,
        cutsPending: pendingCount,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCut = async (cutId: string) => {
    if (!staff) return;
    setProcessingCutId(cutId);

    try {
      const { error } = await supabase
        .from("cuts")
        .update({
          status: "confirmed",
          confirmed_by: staff.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", cutId);

      if (error) throw error;

      toast.success("Cut confirmed!");
      fetchData();
    } catch (error: any) {
      console.error("Error confirming cut:", error);
      toast.error(error.message || "Failed to confirm cut");
    } finally {
      setProcessingCutId(null);
    }
  };

  const handleDisputeCut = async (cutId: string) => {
    if (!staff) return;
    setProcessingCutId(cutId);

    try {
      const { error } = await supabase
        .from("cuts")
        .update({ status: "disputed" })
        .eq("id", cutId);

      if (error) throw error;

      toast.warning("Cut marked as disputed");
      fetchData();
    } catch (error: any) {
      console.error("Error disputing cut:", error);
      toast.error(error.message || "Failed to dispute cut");
    } finally {
      setProcessingCutId(null);
    }
  };

  const handleAddExpense = async () => {
    if (!staff) return;
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!expenseDescription.trim()) {
      toast.error("Enter a description");
      return;
    }

    setIsAddingExpense(true);

    try {
      const { error } = await supabase.from("expenses").insert({
        shop_id: staff.shop_id,
        recorded_by: staff.id,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: parseFloat(expenseAmount),
      });

      if (error) throw error;

      toast.success("Expense recorded!");
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseCategory("supplies");
      setShowExpenseForm(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error(error.message || "Failed to add expense");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!staff) return null;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background pb-8">
        {/* Header */}
        <header className="bg-background px-5 py-4 sticky top-0 z-40 safe-area-top border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cashier</p>
              <h1 className="font-display text-2xl tracking-wide text-foreground">
                {staff.name}
              </h1>
              <p className="text-xs text-success">{staff.shop?.name}</p>
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
          {/* Daily Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-gold p-5 shadow-xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-primary-foreground/80 text-sm">Today's Income</p>
                <h2 className="text-3xl font-display text-primary-foreground">
                  ${summary.totalIncome.toFixed(2)}
                </h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex gap-4 text-primary-foreground/80 text-sm">
              <span>{summary.cutsConfirmed} confirmed</span>
              <span>{summary.cutsPending} pending</span>
              <span>-${summary.totalExpenses.toFixed(2)} expenses</span>
            </div>
          </motion.div>

          {/* Pending Cuts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">Pending Cuts</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm text-warning font-medium">{pendingCuts.length}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : pendingCuts.length === 0 ? (
              <div className="mobile-card text-center py-6">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">No pending cuts</p>
                <p className="text-xs text-muted-foreground/70">Cuts will appear here when barbers log them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCuts.map((cut, index) => (
                  <motion.div
                    key={cut.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="mobile-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground">{cut.service?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          by {cut.barber?.name} • {new Date(cut.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="font-display text-xl text-primary">${cut.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmCut(cut.id)}
                        disabled={processingCutId === cut.id}
                        className="flex-1 h-10 rounded-xl bg-success text-success-foreground hover:bg-success/90 gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Confirm
                      </Button>
                      <Button
                        onClick={() => handleDisputeCut(cut.id)}
                        disabled={processingCutId === cut.id}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Dispute
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Expenses Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">Record Expense</h2>
              <Button
                size="sm"
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="rounded-full gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20"
                variant="ghost"
              >
                {showExpenseForm ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {showExpenseForm ? "Cancel" : "Add"}
              </Button>
            </div>

            <AnimatePresence>
              {showExpenseForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mobile-card space-y-3"
                >
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="h-12 rounded-xl pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expenseCategory} onValueChange={(v: ExpenseCategory) => setExpenseCategory(v)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplies">Supplies</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g., Hair products, electricity bill"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <Button
                    onClick={handleAddExpense}
                    disabled={isAddingExpense}
                    className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isAddingExpense ? "Recording..." : "Record Expense"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
}
