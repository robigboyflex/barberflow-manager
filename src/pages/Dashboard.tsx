import { motion } from "framer-motion";
import { Store, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "@/components/AnimatedPage";
import ShopCard, { AddShopButton } from "@/components/ShopCard";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
// Mock data for demo
const mockShops = [
  {
    id: "1",
    name: "360 Cutz",
    location: "Cape Coast",
    staffCount: 3,
    todayRevenue: 0,
    isLive: true,
  },
  {
    id: "2",
    name: "London Barbs",
    location: "Adum",
    staffCount: 3,
    todayRevenue: 0,
    isLive: true,
  },
];

const mockStats = {
  todayRevenue: 0,
  totalShops: 2,
  totalStaff: 6,
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Get user's first name from metadata or email
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'Owner';

  const handleRevenueClick = () => {
    toast.info("Revenue details coming soon!");
  };

  const handleShopsStatClick = () => {
    toast.info("Shops management coming soon!");
  };

  const handleStaffStatClick = () => {
    toast.info("Staff management coming soon!");
  };

  const handleAddShop = () => {
    toast.info("Add shop feature coming soon!");
  };

  const handleShopClick = (shopId: string, shopName: string) => {
    toast.success(`Opening ${shopName}...`);
    // Future: navigate(`/shop/${shopId}`)
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
                ${mockStats.todayRevenue.toFixed(2)}
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
            <h3 className="text-3xl font-display text-foreground">{mockStats.totalShops}</h3>
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
            <h3 className="text-3xl font-display text-foreground">{mockStats.totalStaff}</h3>
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
            {mockShops.map((shop, index) => (
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
                  isLive={shop.isLive}
                  onClick={() => handleShopClick(shop.id, shop.name)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
}
