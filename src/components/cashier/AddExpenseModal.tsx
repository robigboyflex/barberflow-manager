import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserFriendlyError, isSessionExpiredError, logError } from "@/lib/errorHandler";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { useNavigate } from "react-router-dom";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  cashierId: string;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: "supplies", label: "Supplies" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]["value"];

export default function AddExpenseModal({
  isOpen,
  onClose,
  shopId,
  cashierId,
  onSuccess,
}: AddExpenseModalProps) {
  const navigate = useNavigate();
  const { getSessionToken, logout } = useStaffAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    const sessionToken = getSessionToken();

    if (!sessionToken) {
      toast.error("Session expired. Please log in again.");
      setIsSubmitting(false);
      onClose();
      return;
    }

    try {
      const { error } = await supabase.rpc('record_expense', {
        p_shop_id: shopId,
        p_staff_id: cashierId,
        p_description: description.trim(),
        p_amount: parseFloat(amount),
        p_category: category,
        p_session_token: sessionToken,
      });

      if (error) throw error;

      toast.success("Expense recorded successfully!");
      setDescription("");
      setAmount("");
      setCategory("supplies");
      onSuccess();
      onClose();
    } catch (error) {
      logError('AddExpenseModal.handleSubmit', error);
      if (isSessionExpiredError(error)) {
        toast.error(getUserFriendlyError(error, 'record expense'));
        logout();
        onClose();
        navigate('/staff-login');
        return;
      }
      toast.error(getUserFriendlyError(error, 'record expense'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-card rounded-t-3xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto flex-1 p-6 space-y-5 safe-area-bottom">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <h2 className="text-xl font-display text-foreground">Add Expense</h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Input
                placeholder="What was the expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Amount (GH₵)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 rounded-xl bg-muted border-0 text-center text-2xl font-display"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category</Label>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCategory(cat.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      category === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim() || !amount}
              className="w-full h-14 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-lg font-medium"
            >
              {isSubmitting ? "Recording..." : "Record Expense"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
