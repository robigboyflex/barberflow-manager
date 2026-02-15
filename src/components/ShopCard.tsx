import { motion } from "framer-motion";
import { Store, Users, MapPin, DollarSign, TrendingUp, ChevronRight, Plus, Activity, UserCheck, UserX } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface ShopCardProps {
  name: string;
  location: string;
  staffCount: number;
  todayRevenue: number;
  isLive?: boolean;
  cashierOnDuty?: string | null;
  onClick?: () => void;
}

export default function ShopCard({ 
  name, 
  location, 
  staffCount, 
  todayRevenue, 
  isLive = true,
  cashierOnDuty,
  onClick 
}: ShopCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="mobile-card cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-xl tracking-wide text-foreground">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{location}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Cashier Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${
        cashierOnDuty 
          ? "bg-success/10 border border-success/20" 
          : "bg-destructive/10 border border-destructive/20"
      }`}>
        {cashierOnDuty ? (
          <>
            <UserCheck className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success">
              Cashier Active — {cashierOnDuty}
            </span>
          </>
        ) : (
          <>
            <UserX className="w-4 h-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              No Cashier on Duty
            </span>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 my-3" />

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-success" />
          <span className="text-sm text-muted-foreground">{staffCount} staff</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-warning" />
          <span className="text-sm text-muted-foreground">{formatCurrency(todayRevenue)} today</span>
        </div>

        {isLive && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Live</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface AddShopButtonProps {
  onClick?: () => void;
}

export function AddShopButton({ onClick }: AddShopButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium text-sm"
    >
      <Plus className="w-4 h-4" />
      Add Shop
    </motion.button>
  );
}
