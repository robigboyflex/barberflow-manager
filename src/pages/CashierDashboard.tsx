import { motion } from "framer-motion";
import { Plus, Calendar, TrendingUp, Users, Sparkles } from "lucide-react";
import { DuoCard, DuoButton, DuoIconButton } from "@/components/ui/duo-components";
import DuoAppointmentCard from "@/components/DuoAppointmentCard";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";
import useSound from "@/hooks/useSound";

const mockStats = [
  { label: "Today", value: "12", icon: Calendar, color: "bg-primary text-primary-foreground" },
  { label: "Queue", value: "4", icon: Users, color: "bg-accent text-accent-foreground" },
  { label: "Revenue", value: "$485", icon: TrendingUp, color: "bg-info text-info-foreground" },
];

const mockQueue = [
  { id: "1", clientName: "John Smith", serviceName: "Haircut & Beard", time: "Now", duration: 45, status: "in_progress" as const, barberName: "Mike" },
  { id: "2", clientName: "Alex Johnson", serviceName: "Haircut", time: "11:15 AM", duration: 30, status: "confirmed" as const, barberName: "James" },
  { id: "3", clientName: "David Brown", serviceName: "Beard Trim", time: "11:45 AM", duration: 20, status: "scheduled" as const, barberName: "Mike" },
];

export default function CashierDashboard() {
  const { playSound } = useSound();

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block"
          >
            <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
          </motion.div>
          <h1 className="text-2xl font-extrabold">Cashier Portal</h1>
          <p className="text-muted-foreground">Manage appointments & payments</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {mockStats.map((stat, i) => (
            <motion.div key={stat.label} variants={fadeUpItem}>
              <DuoCard className="text-center p-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-extrabold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </DuoCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DuoButton variant="primary" icon={Plus} className="w-full">
            New Booking
          </DuoButton>
          <DuoButton variant="accent" icon={Users} className="w-full">
            Walk-in
          </DuoButton>
        </motion.div>

        {/* Current Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <span>🎯</span> Current Queue
            </h2>
            <DuoIconButton icon={Plus} variant="secondary" size="sm" />
          </div>

          <motion.div 
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {mockQueue.map((apt) => (
              <motion.div key={apt.id} variants={fadeUpItem}>
                <DuoAppointmentCard
                  clientName={apt.clientName}
                  serviceName={apt.serviceName}
                  time={apt.time}
                  duration={apt.duration}
                  status={apt.status}
                  barberName={apt.barberName}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
}
