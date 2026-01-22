import { motion } from "framer-motion";
import { Plus, UserPlus } from "lucide-react";
import StatCard from "@/components/StatCard";
import AppointmentCard from "@/components/AppointmentCard";
import AnimatedPage, { staggerContainer } from "@/components/AnimatedPage";

// Mock data for demo
const mockStats = {
  todayAppointments: 8,
  weeklyRevenue: 1250,
  totalClients: 156,
  completedToday: 5,
};

const mockAppointments = [
  {
    id: "1",
    clientName: "John Smith",
    serviceName: "Haircut & Beard",
    time: "10:30 AM",
    duration: 45,
    status: "in_progress" as const,
    barberName: "Mike",
  },
  {
    id: "2",
    clientName: "Alex Johnson",
    serviceName: "Haircut",
    time: "11:15 AM",
    duration: 30,
    status: "confirmed" as const,
    barberName: "Mike",
  },
  {
    id: "3",
    clientName: "David Brown",
    serviceName: "Hot Towel Shave",
    time: "12:00 PM",
    duration: 30,
    status: "scheduled" as const,
    barberName: "James",
  },
  {
    id: "4",
    clientName: "Chris Wilson",
    serviceName: "Hair Design",
    time: "1:00 PM",
    duration: 45,
    status: "scheduled" as const,
    barberName: "Mike",
  },
];

export default function Dashboard() {
  return (
    <AnimatedPage>
      <div className="space-y-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-1"
        >
          <h2 className="text-2xl font-display tracking-wide">Good Morning! 👋</h2>
          <p className="text-sm text-muted-foreground">Here's your day at a glance</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <StatCard
            title="Today"
            value={mockStats.todayAppointments}
            subtitle="appointments"
            icon="calendar"
          />
          <StatCard
            title="Revenue"
            value={`$${mockStats.weeklyRevenue}`}
            subtitle="this week"
            icon="revenue"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Clients"
            value={mockStats.totalClients}
            subtitle="total"
            icon="clients"
          />
          <StatCard
            title="Completed"
            value={mockStats.completedToday}
            subtitle="today"
            icon="completed"
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            className="flex-1 h-14 rounded-2xl bg-gradient-gold text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-5 h-5" />
            Walk-in
          </motion.button>
          <motion.button
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            <UserPlus className="w-5 h-5" />
            New Client
          </motion.button>
        </motion.div>

        {/* Today's Appointments */}
        <div className="space-y-3">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="font-display text-xl tracking-wide">
              Today's Schedule
            </h2>
            <span className="text-sm text-muted-foreground font-medium">
              {mockAppointments.length} appointments
            </span>
          </motion.div>

          <motion.div 
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {mockAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                clientName={appointment.clientName}
                serviceName={appointment.serviceName}
                time={appointment.time}
                duration={appointment.duration}
                status={appointment.status}
                barberName={appointment.barberName}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
}
