import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Store, User, Phone, Lock } from "lucide-react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StaffMember {
  id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  phone: string;
  pin: string;
}

interface AddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddShopModal({ isOpen, onClose, onSuccess }: AddShopModalProps) {
  const { user } = useAuth();
  const [shopName, setShopName] = useState("");
  const [location, setLocation] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addStaffMember = () => {
    const newStaff: StaffMember = {
      id: crypto.randomUUID(),
      name: "",
      role: "barber",
      phone: "",
      pin: "",
    };
    setStaff([...staff, newStaff]);
  };

  const updateStaffMember = (id: string, field: keyof StaffMember, value: string) => {
    setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeStaffMember = (id: string) => {
    setStaff(staff.filter(s => s.id !== id));
  };

  const validateForm = (): boolean => {
    if (!shopName.trim()) {
      toast.error("Shop name is required");
      return false;
    }
    if (shopName.trim().length > 100) {
      toast.error("Shop name must be less than 100 characters");
      return false;
    }
    if (!location.trim()) {
      toast.error("Location is required");
      return false;
    }
    if (location.trim().length > 200) {
      toast.error("Location must be less than 200 characters");
      return false;
    }

    for (const member of staff) {
      if (!member.name.trim()) {
        toast.error("All staff members must have a name");
        return false;
      }
      if (member.name.trim().length > 100) {
        toast.error("Staff name must be less than 100 characters");
        return false;
      }
      if (!member.pin || member.pin.length < 4 || member.pin.length > 6) {
        toast.error("Staff PIN must be 4-6 digits");
        return false;
      }
      if (!/^\d+$/.test(member.pin)) {
        toast.error("Staff PIN must contain only numbers");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Create the shop
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .insert({
          name: shopName.trim(),
          location: location.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // Create staff members if any
      if (staff.length > 0) {
        const staffToInsert = staff.map(s => ({
          shop_id: shopData.id,
          name: s.name.trim(),
          role: s.role,
          phone: s.phone.trim() || null,
          pin: s.pin,
        }));

        const { error: staffError } = await supabase
          .from("staff")
          .insert(staffToInsert);

        if (staffError) throw staffError;
      }

      toast.success(`${shopName} created successfully!`);
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating shop:", error);
      toast.error(error.message || "Failed to create shop");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setShopName("");
    setLocation("");
    setStaff([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
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
            className="fixed inset-x-4 bottom-4 top-20 bg-card rounded-3xl z-50 flex flex-col overflow-hidden border border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="font-display text-xl">Add New Shop</h2>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Shop Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Shop Details
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                      id="shopName"
                      placeholder="e.g. 360 Cutz"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      maxLength={100}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. Cape Coast"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={200}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Staff Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Staff Members
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStaffMember}
                    className="rounded-full gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Staff
                  </Button>
                </div>

                {staff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No staff added yet</p>
                    <p className="text-xs">Click "Add Staff" to add team members</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staff.map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Staff #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStaffMember(member.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs">Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Staff name"
                                value={member.name}
                                onChange={(e) => updateStaffMember(member.id, "name", e.target.value)}
                                maxLength={100}
                                className="h-10 rounded-xl pl-10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Role</Label>
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateStaffMember(member.id, "role", value)}
                            >
                              <SelectTrigger className="h-10 rounded-xl">
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
                            <Label className="text-xs">PIN (4-6 digits)</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••"
                                value={member.pin}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  updateStaffMember(member.id, "pin", value);
                                }}
                                maxLength={6}
                                className="h-10 rounded-xl pl-10"
                              />
                            </div>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs">Phone (optional)</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Phone number"
                                value={member.phone}
                                onChange={(e) => updateStaffMember(member.id, "phone", e.target.value)}
                                maxLength={20}
                                className="h-10 rounded-xl pl-10"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold"
              >
                {isLoading ? "Creating..." : "Create Shop"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
