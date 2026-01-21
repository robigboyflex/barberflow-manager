import { Calendar, DollarSign, Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="glass-card overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-display tracking-wide">{value}</p>
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
          <div className={cn("p-2 rounded-lg bg-secondary", colorMap[icon])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
