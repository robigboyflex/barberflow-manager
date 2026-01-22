import { motion } from "framer-motion";
import { Clock, User, ChevronRight } from "lucide-react";
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
      className="mobile-card"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Time badge */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0",
          status === "in_progress" ? "bg-warning/20" : "bg-secondary"
        )}>
          <span className="text-lg font-display tracking-wide">{time.split(' ')[0]}</span>
          <span className="text-[10px] text-muted-foreground font-semibold">{time.split(' ')[1]}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground truncate">{clientName}</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
            >
              <Badge className={cn(statusStyle.bg, statusStyle.text, "text-[10px] px-2 py-0.5 font-semibold")}>
                {statusStyle.label}
              </Badge>
            </motion.div>
          </div>
          <p className="text-sm text-muted-foreground mb-1.5">{serviceName}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {duration} min
            </span>
            {barberName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {barberName}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </motion.div>
  );
}
