import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import AppointmentCard from "@/components/AppointmentCard";

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
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Today's Appointments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide text-gradient-gold">
            TODAY'S SCHEDULE
          </h2>
          <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <div className="space-y-3">
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="font-display text-xl tracking-wide text-gradient-gold">
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1 border-border hover:border-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Walk-in</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1 border-border hover:border-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">New Client</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
