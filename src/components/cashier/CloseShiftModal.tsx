import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { formatCurrency } from "@/lib/currency";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  shiftId: string;
  shiftStartTime: string;
  sessionToken: string;
  onSuccess: (result: { dayCloded: boolean }) => void;
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  staffId,
  shiftId,
  shiftStartTime,
  sessionToken,
  onSuccess,
}: CloseShiftModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [result, setResult] = useState<{
    transactions: number;
    revenue: number;
    dayClosed: boolean;
  } | null>(null);

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleCloseShift = async () => {
    setIsClosing(true);
    
    try {
      const { data, error } = await supabase.rpc('close_shift', {
        p_staff_id: staffId,
        p_shift_id: shiftId,
        p_session_token: sessionToken,
      });

      if (error) throw error;

      const resultData = data as {
        success: boolean;
        shift_closed: boolean;
        day_closed: boolean;
        transactions: number;
        revenue: number;
      };

      setResult({
        transactions: resultData.transactions,
        revenue: resultData.revenue,
        dayClosed: resultData.day_closed,
      });

      if (resultData.day_closed) {
        toast.success("Shift closed & business day finalized!");
      } else {
        toast.success("Shift closed successfully!");
      }

      // Delay before calling onSuccess to show the result
      setTimeout(() => {
        onSuccess({ dayCloded: resultData.day_closed });
      }, 2000);

    } catch (error) {
      logError('CloseShiftModal.handleCloseShift', error);
      toast.error(getUserFriendlyError(error, 'close shift'));
    } finally {
      setIsClosing(false);
    }
  };

  const handleClose = () => {
    if (!isClosing) {
      setResult(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 safe-area-bottom"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-foreground">
                {result ? "Shift Summary" : "Close Shift"}
              </h2>
              <button
                onClick={handleClose}
                disabled={isClosing}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {result ? (
              // Success view
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="font-display text-lg text-foreground mb-2">
                    Shift Closed Successfully
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your work has been recorded
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-display text-foreground">
                      {result.transactions}
                    </p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <DollarSign className="w-5 h-5 text-success mx-auto mb-2" />
                    <p className="text-2xl font-display text-foreground">
                      {formatCurrency(result.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>

                {result.dayClosed && (
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          Business Day Closed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          All sales for today have been locked
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleClose}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground"
                >
                  Done
                </Button>
              </div>
            ) : (
              // Confirmation view
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        Current Shift Duration
                      </p>
                      <p className="text-2xl font-display text-foreground">
                        {formatDuration(shiftStartTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
                  <p className="text-sm text-foreground">
                    <strong>Important:</strong> Closing your shift will finalize all 
                    transactions you've handled. This action cannot be undone.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  If you're the last cashier for today, the business day will 
                  automatically close and all sales will be locked.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isClosing}
                    className="h-12 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCloseShift}
                    disabled={isClosing}
                    className="h-12 rounded-xl bg-primary text-primary-foreground"
                  >
                    {isClosing ? "Closing..." : "Close Shift"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
