import { motion } from "framer-motion";
import { Store, MapPin, Users, ChevronRight, Plus, Power, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopWithStats } from "@/hooks/useShops";
import { formatCurrency } from "@/lib/currency";

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

  const handleShopClick = (shopId: string) => {
    onClose();
    navigate(`/dashboard/shop/${shopId}`);
  };

  const handleAddShop = () => {
    onClose();
    onAddShop();
  };

  return (
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
          {/* Add Shop Button */}
          <Button
            onClick={handleAddShop}
            className="w-full gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            Add New Shop
          </Button>

          {/* Shops List */}
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
  );
}
