import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  Scissors, 
  DollarSign, 
  Briefcase,
  Settings,
  Edit2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import AnimatedPage from "@/components/AnimatedPage";
import AddShopModal from "@/components/AddShopModal";
import EditServiceModal from "@/components/EditServiceModal";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { formatCurrency } from "@/lib/currency";

interface Shop {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface Staff {
  id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  phone: string | null;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

const roleIcons = {
  barber: Scissors,
  cashier: DollarSign,
  cleaner: Briefcase,
};

const roleColors = {
  barber: "text-primary bg-primary/10",
  cashier: "text-success bg-success/10",
  cleaner: "text-warning bg-warning/10",
};

export default function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"staff" | "services">("staff");

  useEffect(() => {
    if (shopId) {
      fetchShopData();
    }
  }, [shopId]);

  const fetchShopData = async () => {
    if (!shopId) return;

    try {
      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (shopError) throw shopError;
      setShop(shopData);

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("role", { ascending: true });

      if (staffError) throw staffError;
      setStaff(staffData || []);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

    } catch (error: any) {
      console.error("Error fetching shop:", error);
      toast.error("Failed to load shop details");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = () => {
    setIsAddStaffOpen(true);
  };

  const handleDeleteStaff = (staffMember: Staff) => {
    setDeletingStaff(staffMember);
  };

  const confirmDeleteStaff = async () => {
    if (!deletingStaff) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", deletingStaff.id);

      if (error) throw error;

      toast.success(`${deletingStaff.name} has been removed`);
      setDeletingStaff(null);
      fetchShopData();
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      toast.error(error.message || "Failed to delete staff");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </AnimatedPage>
    );
  }

  if (!shop) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center h-64">
          <Store className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Shop not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl tracking-wide">{shop.name}</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{shop.location}</span>
            </div>
          </div>
          <QRCodeGenerator shopId={shop.id} shopName={shop.name} />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(`/dashboard/shop/${shopId}/settings`)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            className="mobile-card text-center"
            whileTap={{ scale: 0.97 }}
          >
            <p className="text-2xl font-display text-foreground">{staff.filter(s => s.role === "barber").length}</p>
            <p className="text-xs text-muted-foreground">Barbers</p>
          </motion.div>
          <motion.div 
            className="mobile-card text-center"
            whileTap={{ scale: 0.97 }}
          >
            <p className="text-2xl font-display text-foreground">{staff.filter(s => s.role === "cashier").length}</p>
            <p className="text-xs text-muted-foreground">Cashiers</p>
          </motion.div>
          <motion.div 
            className="mobile-card text-center"
            whileTap={{ scale: 0.97 }}
          >
            <p className="text-2xl font-display text-foreground">{services.length}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-secondary/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
              activeTab === "staff"
                ? "bg-card text-foreground shadow-md"
                : "text-muted-foreground"
            }`}
          >
            Staff ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
              activeTab === "services"
                ? "bg-card text-foreground shadow-md"
                : "text-muted-foreground"
            }`}
          >
            Services ({services.length})
          </button>
        </div>

        {/* Staff List */}
        {activeTab === "staff" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Staff Members</h2>
              <Button
                size="sm"
                onClick={handleAddStaff}
                className="rounded-full gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
                variant="ghost"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>

            {staff.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mobile-card text-center py-8"
              >
                <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-1">No staff yet</p>
                <p className="text-sm text-muted-foreground/70">Add barbers, cashiers, and cleaners</p>
              </motion.div>
            ) : (
              staff.map((member, index) => {
                const Icon = roleIcons[member.role];
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteStaff(member)}
                    className="mobile-card flex items-center gap-3 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleColors[member.role]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Services List */}
        {activeTab === "services" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Services</h2>
              <Button
                size="sm"
                onClick={() => setIsAddServiceOpen(true)}
                className="rounded-full gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
                variant="ghost"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>

            {services.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mobile-card text-center py-8"
              >
                <Scissors className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-1">No services yet</p>
                <p className="text-sm text-muted-foreground/70">Add haircut services with prices</p>
              </motion.div>
            ) : (
              services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditingService(service)}
                  className="mobile-card flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-foreground">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl text-primary">{formatCurrency(service.price)}</p>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Staff Confirmation Dialog */}
      <AlertDialog open={!!deletingStaff} onOpenChange={() => setDeletingStaff(null)}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Remove {deletingStaff?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This action cannot be undone. All data associated with this staff member will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={confirmDeleteStaff}
              disabled={isDeleting}
              className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Service Modal */}
      <EditServiceModal
        isOpen={!!editingService || isAddServiceOpen}
        onClose={() => {
          setEditingService(null);
          setIsAddServiceOpen(false);
        }}
        onSuccess={fetchShopData}
        service={editingService}
        shopId={shop.id}
        shopName={shop.name}
      />

      {/* Add Staff Modal - reusing AddShopModal but we need a separate modal */}
      {/* For now, show a toast - we'll add inline staff creation */}
      {isAddStaffOpen && (
        <AddStaffInlineModal
          isOpen={isAddStaffOpen}
          onClose={() => setIsAddStaffOpen(false)}
          onSuccess={fetchShopData}
          shopId={shop.id}
          shopName={shop.name}
        />
      )}
    </AnimatedPage>
  );
}

// Inline Add Staff Modal Component
function AddStaffInlineModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  shopId,
  shopName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  shopId: string;
  shopName: string;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"barber" | "cashier" | "cleaner">("barber");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!pin || pin.length < 4 || pin.length > 6) {
      toast.error("PIN must be 4-6 digits");
      return;
    }
    if (!/^\d+$/.test(pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("staff").insert({
        shop_id: shopId,
        name: name.trim(),
        role,
        phone: phone.trim() || null,
        pin,
      });

      if (error) throw error;

      toast.success(`${name} added successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error adding staff:", error);
      toast.error(error.message || "Failed to add staff");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        className="fixed inset-x-4 bottom-4 bg-card rounded-3xl border border-border shadow-2xl max-h-[70vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Add Staff</h2>
            <p className="text-sm text-muted-foreground">{shopName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <motion.div whileTap={{ rotate: 90 }}>✕</motion.div>
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Staff name"
              className="w-full h-12 rounded-xl bg-secondary border border-border px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "barber" | "cashier" | "cleaner")}
              className="w-full h-12 rounded-xl bg-secondary border border-border px-4"
            >
              <option value="barber">Barber</option>
              <option value="cashier">Cashier</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full h-12 rounded-xl bg-secondary border border-border px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN (4-6 digits)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="w-full h-12 rounded-xl bg-secondary border border-border px-4"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold"
          >
            {isLoading ? "Adding..." : "Add Staff Member"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
