import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "@/components/AnimatedPage";
import ShopCard, { AddShopButton } from "@/components/ShopCard";
import AddShopModal from "@/components/AddShopModal";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ShopsManagementSheet from "@/components/dashboard/ShopsManagementSheet";
import StaffManagementSheet from "@/components/dashboard/StaffManagementSheet";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [isShopsSheetOpen, setIsShopsSheetOpen] = useState(false);
  const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false);
  
  const { data: shops, isLoading, refetch } = useShops();

  // Calculate stats from real data
  const stats = {
    todayRevenue: shops?.reduce((sum, shop) => sum + shop.todayRevenue, 0) || 0,
    totalShops: shops?.length || 0,
    totalStaff: shops?.reduce((sum, shop) => sum + shop.staffCount, 0) || 0,
  };

  // Get user's first name from metadata or email
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'Owner';

  const handleRevenueClick = () => {
    navigate("/dashboard/analytics");
  };

  const handleShopsStatClick = () => {
    setIsShopsSheetOpen(true);
  };

  const handleStaffStatClick = () => {
    setIsStaffSheetOpen(true);
  };

  const handleAddShop = () => {
    setIsAddShopOpen(true);
  };

  const handleShopClick = (shopId: string) => {
    navigate(`/dashboard/shop/${shopId}`);
  };

  return (
    <AnimatedPage>
      <div className="space-y-5 pb-8">
        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          transition={{ delay: 0.1 }}
          onClick={handleRevenueClick}
          className="rounded-3xl bg-gradient-gold p-5 shadow-xl cursor-pointer active:opacity-90"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">
                Today's Revenue
              </p>
              <h2 className="text-4xl font-display text-primary-foreground tracking-wide">
                {formatCurrency(stats.todayRevenue)}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="mobile-card cursor-pointer active:opacity-90"
            whileTap={{ scale: 0.97 }}
            onClick={handleShopsStatClick}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-0.5">Shops</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <h3 className="text-3xl font-display text-foreground">{stats.totalShops}</h3>
            )}
          </motion.div>

          <motion.div 
            className="mobile-card cursor-pointer active:opacity-90"
            whileTap={{ scale: 0.97 }}
            onClick={handleStaffStatClick}
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-0.5">Total Staff</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <h3 className="text-3xl font-display text-foreground">{stats.totalStaff}</h3>
            )}
          </motion.div>
        </motion.div>

        {/* Your Shops Section */}
        <div className="space-y-4">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-display text-xl tracking-wide text-foreground">
              Your Shops
            </h2>
            <AddShopButton onClick={handleAddShop} />
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isLoading ? (
              // Loading skeletons
              <>
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </>
            ) : shops && shops.length > 0 ? (
              shops.map((shop, index) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <ShopCard
                    name={shop.name}
                    location={shop.location}
                    staffCount={shop.staffCount}
                    todayRevenue={shop.todayRevenue}
                    isLive={shop.is_active}
                    onClick={() => handleShopClick(shop.id)}
                  />
                </motion.div>
              ))
            ) : (
              // Empty state
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mobile-card text-center py-8"
              >
                <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-1">No shops yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Tap "Add Shop" to create your first shop
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Live Activity Feed */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ActivityFeed ownerId={user.id} limit={15} />
          </motion.div>
        )}
      </div>

      {/* Add Shop Modal */}
      <AddShopModal
        isOpen={isAddShopOpen}
        onClose={() => setIsAddShopOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Shops Management Sheet */}
      <ShopsManagementSheet
        isOpen={isShopsSheetOpen}
        onClose={() => setIsShopsSheetOpen(false)}
        shops={shops}
        isLoading={isLoading}
        onAddShop={handleAddShop}
      />

      {/* Staff Management Sheet */}
      <StaffManagementSheet
        isOpen={isStaffSheetOpen}
        onClose={() => setIsStaffSheetOpen(false)}
        shops={shops}
        isLoading={isLoading}
      />
    </AnimatedPage>
  );
}
