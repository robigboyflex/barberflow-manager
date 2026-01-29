import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Phone, User, Check, X, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string | null;
  service_price: number | null;
  preferred_barber: string | null;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface AppointmentsTabProps {
  shopId: string;
  cashierId: string;
  sessionToken: string;
  isClockedIn: boolean;
  onPaymentConfirmed: () => void;
}

export default function AppointmentsTab({
  shopId,
  cashierId,
  sessionToken,
  isClockedIn,
  onPaymentConfirmed,
}: AppointmentsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_shop_appointments", {
        p_staff_id: cashierId,
        p_session_token: sessionToken,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAppointment = (appointment: Appointment) => {
    if (appointment.status !== "pending") return;
    setSelectedAppointment(appointment);
    setPaymentAmount(appointment.service_price?.toString() || "");
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedAppointment || !paymentAmount) return;

    if (!isClockedIn) {
      toast.error("You must be clocked in to confirm payments");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("confirm_appointment_payment", {
        p_appointment_id: selectedAppointment.id,
        p_cashier_id: cashierId,
        p_payment_amount: parseFloat(paymentAmount),
        p_payment_method: paymentMethod,
        p_session_token: sessionToken,
      });

      if (error) throw error;

      toast.success("Payment confirmed!");
      setShowPaymentModal(false);
      setSelectedAppointment(null);
      fetchAppointments();
      onPaymentConfirmed();
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error(error.message || "Failed to confirm payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingAppointments = appointments.filter(a => a.status === "pending");
  const completedAppointments = appointments.filter(a => a.status === "completed");

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Pending Appointments */}
          <div>
            <h3 className="font-medium text-foreground mb-2">
              Pending ({pendingAppointments.length})
            </h3>
            {pendingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending appointments for this date
              </p>
            ) : (
              <div className="space-y-2">
                {pendingAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectAppointment(appointment)}
                    className={cn(
                      "rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary transition-colors",
                      !isClockedIn && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {appointment.customer_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {appointment.preferred_time}
                          </span>
                        </div>
                        {appointment.service_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {appointment.service_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">
                          GH₵{appointment.service_price || 0}
                        </span>
                        {appointment.preferred_barber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {appointment.preferred_barber}
                          </p>
                        )}
                      </div>
                    </div>
                    {appointment.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{appointment.notes}"
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Appointments */}
          {completedAppointments.length > 0 && (
            <div>
              <h3 className="font-medium text-foreground mb-2">
                Completed ({completedAppointments.length})
              </h3>
              <div className="space-y-2">
                {completedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-xl bg-muted/50 border border-border p-4 opacity-60"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-foreground">
                          {appointment.customer_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          at {appointment.preferred_time}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        GH₵{appointment.service_price || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Confirmation Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedAppointment.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedAppointment.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span>{selectedAppointment.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{selectedAppointment.preferred_time}</span>
                </div>
                {selectedAppointment.preferred_barber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Barber</span>
                    <span>{selectedAppointment.preferred_barber}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (GH₵)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="momo">MoMo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleConfirmPayment}
                  disabled={isProcessing || !paymentAmount}
                >
                  <DollarSign className="w-4 h-4" />
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
