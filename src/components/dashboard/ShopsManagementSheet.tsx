import { useState } from "react";
import { motion } from "framer-motion";
import { Store, MapPin, Users, ChevronRight, Plus, UserCheck, UserX, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopWithStats, useDeleteShop } from "@/hooks/useShops";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface ShopsManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shops: ShopWithStats[] | undefined;
  isLoading: boolean;
  onAddShop: () => void;
}

export default function ShopsManagementSheet({
  isOpen,
  onClose,
  shops,
  isLoading,
  onAddShop,
}: ShopsManagementSheetProps) {
  const navigate = useNavigate();
  const deleteShop = useDeleteShop();
  const [shopToDelete, setShopToDelete] = useState<ShopWithStats | null>(null);

  const handleShopClick = (shopId: string) => {
    onClose();
    navigate(`/dashboard/shop/${shopId}`);
  };

  const handleAddShop = () => {
    onClose();
    onAddShop();
  };

  const handleDeleteClick = (e: React.MouseEvent, shop: ShopWithStats) => {
    e.stopPropagation();
    setShopToDelete(shop);
  };

  const confirmDelete = async () => {
    if (!shopToDelete) return;
    try {
      await deleteShop.mutateAsync(shopToDelete.id);
      toast.success(`"${shopToDelete.name}" has been deleted`);
      setShopToDelete(null);
    } catch (error) {
      console.error("Failed to delete shop:", error);
      toast.error("Failed to delete shop. Please try again.");
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-2xl flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              Manage Shops
            </SheetTitle>
            <SheetDescription>
              View and manage all your barbershop locations
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <Button
              onClick={handleAddShop}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Add New Shop
            </Button>

            <div className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </>
              ) : shops && shops.length > 0 ? (
                shops.map((shop, index) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleShopClick(shop.id)}
                    className="p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {shop.name}
                          </h3>
                          {shop.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {shop.location}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDeleteClick(e, shop)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </motion.button>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">
                          {shop.staffCount} staff
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(shop.todayRevenue)}
                        </span>
                        <span className="text-xs text-muted-foreground">today</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg ${
                      shop.cashierOnDuty 
                        ? "bg-success/10" 
                        : "bg-destructive/10"
                    }`}>
                      {shop.cashierOnDuty ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-success" />
                          <span className="text-xs font-medium text-success">
                            {shop.cashierOnDuty} on duty
                          </span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-xs font-medium text-destructive">
                            No cashier on duty
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium mb-1">
                    No shops yet
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Add your first shop to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!shopToDelete} onOpenChange={(open) => !open && setShopToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{shopToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shop and all associated data including staff, services, and transaction records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteShop.isPending ? "Deleting..." : "Delete Shop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
