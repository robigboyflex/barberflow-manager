import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Phone, Lock, Trash2, AlertTriangle } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StaffMember {
  id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  phone: string | null;
  is_active: boolean;
}

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: StaffMember | null;
  shopName: string;
}

export default function EditStaffModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  staff,
  shopName 
}: EditStaffModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"barber" | "cashier" | "cleaner">("barber");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setPhone(staff.phone || "");
      setPin("");
    }
  }, [staff]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (name.trim().length > 100) {
      toast.error("Name must be less than 100 characters");
      return false;
    }
    if (pin && (pin.length < 4 || pin.length > 6)) {
      toast.error("PIN must be 4-6 digits");
      return false;
    }
    if (pin && !/^\d+$/.test(pin)) {
      toast.error("PIN must contain only numbers");
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!staff || !validateForm()) return;

    setIsLoading(true);

    try {
      const updateData: Record<string, string | null> = {
        name: name.trim(),
        role,
        phone: phone.trim() || null,
      };

      if (pin) {
        updateData.pin = pin;
      }

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", staff.id);

      if (error) throw error;

      toast.success(`${name} updated successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating staff:", error);
      toast.error(error.message || "Failed to update staff");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!staff) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staff.id);

      if (error) throw error;

      toast.success(`${staff.name} has been removed`);
      setShowDeleteConfirm(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      toast.error(error.message || "Failed to delete staff");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setRole("barber");
    setPhone("");
    setPin("");
    onClose();
  };

  if (!staff) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 bottom-4 top-auto bg-card rounded-3xl z-50 flex flex-col overflow-hidden border border-border shadow-2xl max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h2 className="font-display text-xl">Edit Staff</h2>
                  <p className="text-sm text-muted-foreground">{shopName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Staff name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(value: "barber" | "cashier" | "cleaner") => setRole(value)}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barber">Barber</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New PIN (leave empty to keep current)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••"
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setPin(value);
                      }}
                      maxLength={6}
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">4-6 digits</p>
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Staff Member
                </Button>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-card">
                <Button
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Remove {staff?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This action cannot be undone. All data associated with this staff member will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
