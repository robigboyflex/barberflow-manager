import { motion } from "framer-motion";
import { Clock, User, Check, Play, X } from "lucide-react";
import { DuoCard, DuoBadge, DuoButton } from "@/components/ui/duo-components";
import type { AppointmentStatus } from "@/types/barberflow";
import useSound from "@/hooks/useSound";

interface DuoAppointmentCardProps {
  clientName: string;
  serviceName: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  barberName?: string;
  showActions?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

const statusConfig: Record<AppointmentStatus, { variant: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'pink'; label: string; emoji: string }> = {
  scheduled: { variant: 'default', label: 'Scheduled', emoji: '📅' },
  confirmed: { variant: 'info', label: 'Confirmed', emoji: '✅' },
  in_progress: { variant: 'warning', label: 'In Progress', emoji: '✂️' },
  completed: { variant: 'success', label: 'Done', emoji: '🎉' },
  cancelled: { variant: 'pink', label: 'Cancelled', emoji: '❌' },
  no_show: { variant: 'default', label: 'No Show', emoji: '👻' },
};

export default function DuoAppointmentCard({
  clientName,
  serviceName,
  time,
  duration,
  status,
  barberName,
  showActions = false,
  onStart,
  onComplete,
  onCancel,
}: DuoAppointmentCardProps) {
  const { playSound } = useSound();
  const config = statusConfig[status];

  const handleAction = (action: () => void | undefined, sound: 'success' | 'pop' | 'error') => {
    playSound(sound);
    action?.();
  };

  return (
    <DuoCard className="overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Time bubble */}
        <motion.div 
          className="flex-shrink-0 w-16 h-16 rounded-2xl bg-secondary flex flex-col items-center justify-center"
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-lg font-bold">{time.split(' ')[0]}</span>
          <span className="text-xs text-muted-foreground">{time.split(' ')[1]}</span>
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{config.emoji}</span>
            <DuoBadge variant={config.variant}>{config.label}</DuoBadge>
          </div>
          
          <h3 className="font-bold text-lg truncate">{clientName}</h3>
          <p className="text-muted-foreground text-sm">{serviceName}</p>
          
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {duration} min
            </span>
            {barberName && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {barberName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (status === 'scheduled' || status === 'confirmed' || status === 'in_progress') && (
        <motion.div 
          className="flex gap-2 mt-4 pt-4 border-t border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {(status === 'scheduled' || status === 'confirmed') && (
            <>
              <DuoButton
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() => handleAction(onStart!, 'pop')}
                className="flex-1"
              >
                Start
              </DuoButton>
              <DuoButton
                variant="destructive"
                size="sm"
                icon={X}
                onClick={() => handleAction(onCancel!, 'error')}
                className="flex-1"
              >
                Cancel
              </DuoButton>
            </>
          )}
          {status === 'in_progress' && (
            <DuoButton
              variant="primary"
              size="sm"
              icon={Check}
              onClick={() => handleAction(onComplete!, 'success')}
              className="flex-1"
            >
              Complete! 🎉
            </DuoButton>
          )}
        </motion.div>
      )}
    </DuoCard>
  );
}
