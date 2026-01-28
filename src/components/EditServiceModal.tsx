import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CURRENCY_SYMBOL } from "@/lib/currency";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: Service | null;
  shopId: string;
  shopName: string;
}

export default function EditServiceModal({
  isOpen,
  onClose,
  onSuccess,
  service,
  shopId,
  shopName,
}: EditServiceModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setPrice(service.price.toString());
      setDuration(service.duration_minutes.toString());
      setIsActive(service.is_active);
    } else {
      setName("");
      setPrice("");
      setDuration("30");
      setIsActive(true);
    }
  }, [service]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!price || parseFloat(price) < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    setIsLoading(true);

    try {
      if (service) {
        // Update existing service
        const { error } = await supabase
          .from("services")
          .update({
            name: name.trim(),
            price: parseFloat(price),
            duration_minutes: parseInt(duration),
            is_active: isActive,
          })
          .eq("id", service.id);

        if (error) throw error;
        toast.success("Service updated successfully!");
      } else {
        // Create new service
        const { error } = await supabase.from("services").insert({
          shop_id: shopId,
          name: name.trim(),
          price: parseFloat(price),
          duration_minutes: parseInt(duration),
          is_active: isActive,
        });

        if (error) throw error;
        toast.success("Service added successfully!");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast.error(error.message || "Failed to save service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) throw error;

      toast.success("Service deleted successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error(error.message || "Failed to delete service");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-x-4 bottom-4 bg-card rounded-3xl border border-border shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">
                {service ? "Edit Service" : "Add Service"}
              </h2>
              <p className="text-sm text-muted-foreground">{shopName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Haircut"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Price ({CURRENCY_SYMBOL})</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25.00"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold"
            >
              {isLoading ? "Saving..." : service ? "Save Changes" : "Add Service"}
            </Button>

            {service && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="outline"
                className="w-full h-12 rounded-xl border-destructive text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? "Deleting..." : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Service
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
