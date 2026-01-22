import { motion } from "framer-motion";
import { Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fadeUpItem, cardTap } from "./AnimatedPage";

interface ServiceCardProps {
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isActive?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}

export default function ServiceCard({
  name,
  description,
  duration,
  price,
  isActive = true,
  onEdit,
}: ServiceCardProps) {
  return (
    <motion.div
      variants={fadeUpItem}
      whileTap={cardTap}
      className={cn("mobile-card", !isActive && "opacity-60")}
      onClick={onEdit}
    >
      <div className="flex items-center gap-4">
        {/* Price badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex flex-col items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <span className="text-xl font-display text-primary-foreground">${price}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">{name}</p>
            {!isActive && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Inactive</Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">{description}</p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold">{duration} min</span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </motion.div>
  );
}
