import { motion } from "framer-motion";
import { Phone, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fadeUpItem, cardTap } from "./AnimatedPage";

interface ClientCardProps {
  name: string;
  phone: string;
  email?: string | null;
  lastVisit?: string;
  totalVisits?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ClientCard({
  name,
  phone,
  lastVisit,
  totalVisits,
  onClick,
}: ClientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      variants={fadeUpItem}
      whileTap={cardTap}
      className="mobile-card"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-gradient-gold text-primary-foreground font-display text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground mb-0.5">{name}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Phone className="w-3.5 h-3.5" />
            <span>{phone}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {totalVisits !== undefined && (
              <span className="font-semibold">{totalVisits} visits</span>
            )}
            {lastVisit && (
              <span>Last: {lastVisit}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </motion.div>
  );
}
