import { motion } from "framer-motion";
import { Calendar, DollarSign, Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeUpItem, cardHover, cardTap } from "./AnimatedPage";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: "calendar" | "revenue" | "clients" | "completed";
  trend?: { value: number; isPositive: boolean };
}

const iconMap = {
  calendar: Calendar,
  revenue: DollarSign,
  clients: Users,
  completed: CheckCircle,
};

const colorMap = {
  calendar: "text-primary",
  revenue: "text-success",
  clients: "text-accent",
  completed: "text-primary",
};

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  const Icon = iconMap[icon];

  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={cardHover}
      whileTap={cardTap}
    >
      <Card className="glass-card overflow-hidden h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
              <motion.p 
                className="text-2xl font-display tracking-wide"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                {value}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}% vs last week
                </p>
              )}
            </div>
            <motion.div 
              className={cn("p-2 rounded-lg bg-secondary", colorMap[icon])}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
