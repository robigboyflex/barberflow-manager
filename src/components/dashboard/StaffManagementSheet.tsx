import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Store, ChevronRight, Scissors, CreditCard, Sparkles, DollarSign, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShopWithStats } from "@/hooks/useShops";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import EditStaffModal from "@/components/EditStaffModal";

interface StaffMember {
  id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  shop_id: string;
  is_active: boolean;
  phone: string | null;
  pin: string;
  salary_type: string | null;
  salary_amount: number | null;
}

interface StaffManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shops: ShopWithStats[] | undefined;
  isLoading: boolean;
}

const roleIcons = {
  barber: Scissors,
  cashier: CreditCard,
  cleaner: Sparkles,
};

const roleColors = {
  barber: "text-primary",
  cashier: "text-warning",
  cleaner: "text-success",
};

const salaryTypeLabels: Record<string, string> = {
  fixed: "Fixed Monthly",
  percentage: "% per Cut",
  per_cut: "Per Cut",
};

export default function StaffManagementSheet({
  isOpen,
  onClose,
  shops,
  isLoading: shopsLoading,
}: StaffManagementSheetProps) {
  const navigate = useNavigate();
  const [staffByShop, setStaffByShop] = useState<Record<string, StaffMember[]>>({});
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingShopName, setEditingShopName] = useState("");

  useEffect(() => {
    if (isOpen && shops && shops.length > 0) {
      fetchAllStaff();
    }
  }, [isOpen, shops]);

  const fetchAllStaff = async () => {
    if (!shops) return;
    
    setIsLoadingStaff(true);
    try {
      const shopIds = shops.map((s) => s.id);
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, role, shop_id, is_active, phone, pin, salary_type, salary_amount")
        .in("shop_id", shopIds)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      const grouped: Record<string, StaffMember[]> = {};
      data?.forEach((staff) => {
        if (!grouped[staff.shop_id]) {
          grouped[staff.shop_id] = [];
        }
        grouped[staff.shop_id].push(staff as StaffMember);
      });
      setStaffByShop(grouped);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleShopClick = (shopId: string) => {
    onClose();
    navigate(`/dashboard/shop/${shopId}`);
  };

  const handleStaffClick = (staff: StaffMember, shopName: string) => {
    setEditingStaff(staff);
    setEditingShopName(shopName);
  };

  const formatSalary = (staff: StaffMember): string => {
    if (!staff.salary_amount) return "Not set";
    const type = staff.salary_type || "fixed";
    if (type === "percentage") return `${staff.salary_amount}%`;
    if (type === "per_cut") return `${formatCurrency(staff.salary_amount)}/cut`;
    return `${formatCurrency(staff.salary_amount)}/mo`;
  };

  const isLoading = shopsLoading || isLoadingStaff;
  const totalStaff = Object.values(staffByShop).flat().length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-2xl flex items-center gap-2">
              <Users className="w-6 h-6 text-success" />
              Manage Staff
            </SheetTitle>
            <SheetDescription>
              {totalStaff} active staff members across {shops?.length || 0} shops
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {isLoading ? (
              <>
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </>
            ) : shops && shops.length > 0 ? (
              shops.map((shop, index) => {
                const shopStaff = staffByShop[shop.id] || [];
                
                return (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border bg-card overflow-hidden"
                  >
                    {/* Shop Header */}
                    <div
                      onClick={() => handleShopClick(shop.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {shop.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {shopStaff.length} staff members
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Staff List */}
                    {shopStaff.length > 0 && (
                      <div className="border-t border-border/50 px-4 py-2 space-y-1">
                        {shopStaff.map((staff) => {
                          const Icon = roleIcons[staff.role];
                          const colorClass = roleColors[staff.role];
                          
                          return (
                            <div
                              key={staff.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStaffClick(staff, shop.name);
                              }}
                              className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-accent/30 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${colorClass}`} />
                                <span className="text-sm text-foreground">
                                  {staff.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  {formatSalary(staff)}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {staff.role}
                                </span>
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {shopStaff.length === 0 && (
                      <div className="border-t border-border/50 px-4 py-3">
                        <p className="text-sm text-muted-foreground text-center">
                          No active staff
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-1">
                  No staff yet
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Add shops first, then add staff to them
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        onSuccess={fetchAllStaff}
        staff={editingStaff}
        shopName={editingShopName}
      />
    </>
  );
}
