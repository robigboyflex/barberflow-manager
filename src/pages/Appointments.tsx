import { useState } from "react";
import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentCard from "@/components/AppointmentCard";
import type { AppointmentStatus } from "@/types/barberflow";

// Mock data for demo
const mockAppointments = [
  {
    id: "1",
    clientName: "John Smith",
    serviceName: "Haircut & Beard",
    time: "10:30 AM",
    duration: 45,
    status: "completed" as AppointmentStatus,
    barberName: "Mike",
  },
  {
    id: "2",
    clientName: "Alex Johnson",
    serviceName: "Haircut",
    time: "11:15 AM",
    duration: 30,
    status: "in_progress" as AppointmentStatus,
    barberName: "Mike",
  },
  {
    id: "3",
    clientName: "David Brown",
    serviceName: "Hot Towel Shave",
    time: "12:00 PM",
    duration: 30,
    status: "confirmed" as AppointmentStatus,
    barberName: "James",
  },
  {
    id: "4",
    clientName: "Chris Wilson",
    serviceName: "Hair Design",
    time: "1:00 PM",
    duration: 45,
    status: "scheduled" as AppointmentStatus,
    barberName: "Mike",
  },
  {
    id: "5",
    clientName: "Tom Davis",
    serviceName: "Beard Trim",
    time: "2:00 PM",
    duration: 20,
    status: "scheduled" as AppointmentStatus,
    barberName: "James",
  },
  {
    id: "6",
    clientName: "Ryan Miller",
    serviceName: "Kids Haircut",
    time: "3:00 PM",
    duration: 20,
    status: "cancelled" as AppointmentStatus,
    barberName: "Mike",
  },
];

export default function Appointments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredAppointments = mockAppointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "upcoming") return matchesSearch && ["scheduled", "confirmed"].includes(apt.status);
    if (activeTab === "completed") return matchesSearch && apt.status === "completed";
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-gradient-gold">
          APPOINTMENTS
        </h1>
        <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {/* Date Selector */}
      <Button
        variant="outline"
        className="w-full justify-start text-left font-normal border-border"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Today, January 21, 2026
      </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search appointments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No appointments found</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                clientName={appointment.clientName}
                serviceName={appointment.serviceName}
                time={appointment.time}
                duration={appointment.duration}
                status={appointment.status}
                barberName={appointment.barberName}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
