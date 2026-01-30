import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Store, MapPin, Trash2, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface Shop {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

export default function ShopSettings() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (shopId) {
      fetchShop();
    }
  }, [shopId]);

  const fetchShop = async () => {
    if (!shopId) return;

    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (error) throw error;
      
      setShop(data);
      setName(data.name);
      setLocation(data.location);
      setIsActive(data.is_active);
    } catch (error) {
      console.error("Error fetching shop:", error);
      toast.error("Failed to load shop settings");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shopId || !name.trim() || !location.trim()) {
      toast.error("Name and location are required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("shops")
        .update({
          name: name.trim(),
          location: location.trim(),
          is_active: isActive,
        })
        .eq("id", shopId);

      if (error) throw error;

      toast.success("Shop settings saved");
      navigate(`/dashboard/shop/${shopId}`);
    } catch (error: any) {
      console.error("Error saving shop:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shopId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", shopId);

      if (error) throw error;

      toast.success("Shop deleted successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error deleting shop:", error);
      toast.error(error.message || "Failed to delete shop. Make sure all staff and services are removed first.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
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
            onClick={() => navigate(`/dashboard/shop/${shopId}`)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl tracking-wide">Shop Settings</h1>
        </div>

        {/* Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Shop Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter shop name"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="active">Shop Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive shops won't appear for staff login
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold gap-2"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mobile-card border-destructive/30"
        >
          <h3 className="font-display text-lg text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this shop will remove all associated staff, services, and transaction data. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full h-12 rounded-xl gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete Shop
          </Button>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Delete {shop.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will permanently delete the shop and all associated data including staff, services, and transaction history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Shop"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedPage>
  );
}
