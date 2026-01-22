import { motion } from "framer-motion";
import { Calendar, DollarSign, Users, CheckCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeUpItem, cardTap } from "./AnimatedPage";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: "calendar" | "revenue" | "clients" | "completed";
  trend?: { value: number; isPositive: boolean };
}

const iconConfig: Record<string, { Icon: LucideIcon; gradient: string }> = {
  calendar: { Icon: Calendar, gradient: "from-primary to-warning" },
  revenue: { Icon: DollarSign, gradient: "from-success to-emerald-400" },
  clients: { Icon: Users, gradient: "from-accent to-orange-400" },
  completed: { Icon: CheckCircle, gradient: "from-primary to-amber-500" },
};

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  const { Icon, gradient } = iconConfig[icon];

  return (
    <motion.div
      variants={fadeUpItem}
      whileTap={cardTap}
      className="mobile-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{title}</p>
          <motion.p 
            className="text-3xl font-display tracking-wide"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground font-medium">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-[11px] font-bold",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <motion.div 
          className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}
          whileTap={{ rotate: 10, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Icon className="w-6 h-6 text-primary-foreground" />
        </motion.div>
      </div>
    </motion.div>
  );
}
