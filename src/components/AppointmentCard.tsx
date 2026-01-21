import { motion } from "framer-motion";
import { Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/barberflow";
import { fadeUpItem, cardTap } from "./AnimatedPage";

interface AppointmentCardProps {
  clientName: string;
  serviceName: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  barberName?: string;
  onClick?: () => void;
}

const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Scheduled" },
  confirmed: { bg: "bg-primary/20", text: "text-primary", label: "Confirmed" },
  in_progress: { bg: "bg-warning/20", text: "text-warning", label: "In Progress" },
  completed: { bg: "bg-success/20", text: "text-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/20", text: "text-destructive", label: "Cancelled" },
  no_show: { bg: "bg-muted", text: "text-muted-foreground", label: "No Show" },
};

export default function AppointmentCard({
  clientName,
  serviceName,
  time,
  duration,
  status,
  barberName,
  onClick,
}: AppointmentCardProps) {
  const statusStyle = statusStyles[status];

  return (
    <motion.div
      variants={fadeUpItem}
      whileTap={cardTap}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "glass-card overflow-hidden cursor-pointer transition-colors hover:border-primary/50",
          status === "in_progress" && "border-warning/50"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-display tracking-wide">{time}</span>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <Badge className={cn(statusStyle.bg, statusStyle.text, "text-xs")}>
                    {statusStyle.label}
                  </Badge>
                </motion.div>
              </div>
              <p className="font-medium text-foreground">{clientName}</p>
              <p className="text-sm text-muted-foreground">{serviceName}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration} min
                </span>
                {barberName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {barberName}
                  </span>
                )}
              </div>
            </div>
            <motion.div 
              className={cn(
                "w-1 h-full min-h-[60px] rounded-full",
                status === "in_progress" ? "bg-warning" : 
                status === "confirmed" ? "bg-primary" :
                status === "completed" ? "bg-success" :
                "bg-muted"
              )}
              layoutId={`status-bar-${time}`}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
