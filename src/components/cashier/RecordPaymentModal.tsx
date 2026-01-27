import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Banknote, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Barber {
  id: string;
  name: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  cashierId: string;
  onSuccess: () => void;
}

type PaymentMethod = "cash" | "card" | "momo";

export default function RecordPaymentModal({
  isOpen,
  onClose,
  shopId,
  cashierId,
  onSuccess,
}: RecordPaymentModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [price, setPrice] = useState("25");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, shopId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch barbers
      const { data: barbersData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("shop_id", shopId)
        .eq("role", "barber")
        .eq("is_active", true);

      setBarbers(barbersData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("shop_id", shopId)
        .eq("is_active", true);

      setServices(servicesData || []);

      // Set default service price if available
      if (servicesData && servicesData.length > 0) {
        setSelectedService(servicesData[0].id);
        setPrice(servicesData[0].price.toString());
      }

      // Set default barber if available
      if (barbersData && barbersData.length > 0) {
        setSelectedBarber(barbersData[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setPrice(service.price.toString());
    }
  };

  const handleSubmit = async () => {
    if (!selectedBarber) {
      toast.error("Please select a barber");
      return;
    }
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("cuts").insert({
        shop_id: shopId,
        barber_id: selectedBarber,
        service_id: selectedService,
        client_name: customerName.trim() || null,
        price: parseFloat(price),
        status: "confirmed",
        confirmed_by: cashierId,
        confirmed_at: new Date().toISOString(),
        payment_method: paymentMethod,
      });

      if (error) throw error;

      toast.success("Payment recorded successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setSelectedBarber(barbers[0]?.id || null);
    setSelectedService(services[0]?.id || null);
    setPrice(services[0]?.price.toString() || "25");
    setPaymentMethod("cash");
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
          className="w-full max-w-lg bg-card rounded-t-3xl p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-foreground">Record Payment</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Customer Name</Label>
            <Input
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-12 rounded-xl bg-muted border-0"
            />
          </div>

          {/* Select Barber */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Select Barber</Label>
            <div className="flex flex-wrap gap-2">
              {barbers.map((barber) => (
                <motion.button
                  key={barber.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBarber(barber.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedBarber === barber.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {barber.name}
                </motion.button>
              ))}
              {barbers.length === 0 && (
                <p className="text-sm text-muted-foreground">No barbers available</p>
              )}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Service</Label>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              {services.map((service) => (
                <motion.button
                  key={service.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleServiceSelect(service.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedService === service.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {service.name}
                </motion.button>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground">No services available</p>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Price (GH₵)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-14 rounded-xl bg-muted border-0 text-center text-2xl font-display"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Payment Method</Label>
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                  paymentMethod === "cash"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Banknote className="w-6 h-6" />
                <span className="text-sm font-medium">Cash</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                  paymentMethod === "card"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CreditCard className="w-6 h-6" />
                <span className="text-sm font-medium">Card</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("momo")}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                  paymentMethod === "momo"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Smartphone className="w-6 h-6" />
                <span className="text-sm font-medium">MoMo</span>
              </motion.button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedBarber || !selectedService}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-medium"
          >
            {isSubmitting ? "Recording..." : "Record Service"}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
