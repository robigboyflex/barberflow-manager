import { motion } from "framer-motion";
import { Scissors, Clock, Trophy, Flame, CheckCircle } from "lucide-react";
import { DuoCard, DuoButton, DuoBadge } from "@/components/ui/duo-components";
import DuoAppointmentCard from "@/components/DuoAppointmentCard";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";
import useSound from "@/hooks/useSound";

const mockBarberStats = {
  todayCompleted: 5,
  streak: 3,
  avgTime: 28,
  rating: 4.9,
};

const mockMyQueue = [
  { id: "1", clientName: "John Smith", serviceName: "Haircut & Beard", time: "Now", duration: 45, status: "in_progress" as const },
  { id: "2", clientName: "David Brown", serviceName: "Beard Trim", time: "Next", duration: 20, status: "confirmed" as const },
  { id: "3", clientName: "Ryan Miller", serviceName: "Haircut", time: "12:30 PM", duration: 30, status: "scheduled" as const },
];

export default function BarberDashboard() {
  const { playSound } = useSound();

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header with avatar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <motion.div 
            className="w-16 h-16 rounded-2xl bg-purple text-purple-foreground flex items-center justify-center shadow-[0_4px_0_0_hsl(270_70%_45%)]"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Scissors className="w-8 h-8" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-extrabold">My Station</h1>
            <div className="flex items-center gap-2">
              <DuoBadge variant="purple">Barber</DuoBadge>
              <span className="text-muted-foreground text-sm">Chair #2</span>
            </div>
          </div>
        </motion.div>

        {/* Streak & Stats */}
        <motion.div 
          className="grid grid-cols-4 gap-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeUpItem}>
            <DuoCard className="text-center p-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Flame className="w-6 h-6 text-accent mx-auto" />
              </motion.div>
              <p className="text-xl font-extrabold">{mockBarberStats.streak}</p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </DuoCard>
          </motion.div>
          
          <motion.div variants={fadeUpItem}>
            <DuoCard className="text-center p-3">
              <CheckCircle className="w-6 h-6 text-success mx-auto" />
              <p className="text-xl font-extrabold">{mockBarberStats.todayCompleted}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </DuoCard>
          </motion.div>
          
          <motion.div variants={fadeUpItem}>
            <DuoCard className="text-center p-3">
              <Clock className="w-6 h-6 text-info mx-auto" />
              <p className="text-xl font-extrabold">{mockBarberStats.avgTime}m</p>
              <p className="text-[10px] text-muted-foreground">Avg</p>
            </DuoCard>
          </motion.div>
          
          <motion.div variants={fadeUpItem}>
            <DuoCard className="text-center p-3">
              <Trophy className="w-6 h-6 text-accent mx-auto" />
              <p className="text-xl font-extrabold">{mockBarberStats.rating}</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </DuoCard>
          </motion.div>
        </motion.div>

        {/* Current Client */}
        {mockMyQueue[0] && mockMyQueue[0].status === 'in_progress' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <span>✂️</span> Current Client
            </h2>
            <DuoAppointmentCard
              clientName={mockMyQueue[0].clientName}
              serviceName={mockMyQueue[0].serviceName}
              time={mockMyQueue[0].time}
              duration={mockMyQueue[0].duration}
              status={mockMyQueue[0].status}
              showActions
            />
          </motion.div>
        )}

        {/* Up Next */}
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <span>📋</span> Up Next
          </h2>
          <motion.div 
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {mockMyQueue.slice(1).map((apt) => (
              <motion.div key={apt.id} variants={fadeUpItem}>
                <DuoAppointmentCard
                  clientName={apt.clientName}
                  serviceName={apt.serviceName}
                  time={apt.time}
                  duration={apt.duration}
                  status={apt.status}
                  showActions
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Break Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <DuoButton variant="secondary" className="w-full">
            ☕ Take a Break
          </DuoButton>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
