import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppointmentCard from "@/components/AppointmentCard";
import AnimatedPage, { staggerContainer } from "@/components/AnimatedPage";
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

const tabs = ["All", "Upcoming", "Completed"];

export default function Appointments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const filteredAppointments = mockAppointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "All") return matchesSearch;
    if (activeTab === "Upcoming") return matchesSearch && ["scheduled", "confirmed"].includes(apt.status);
    if (activeTab === "Completed") return matchesSearch && apt.status === "completed";
    return matchesSearch;
  });

  return (
    <AnimatedPage>
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl tracking-wide">Bookings</h1>
          <motion.button
            className="w-11 h-11 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-primary/20"
            whileTap={{ scale: 0.9 }}
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        </motion.div>

        {/* Date Selector */}
        <motion.div
          className="flex items-center justify-between mobile-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <div className="text-center">
            <p className="font-semibold">Today</p>
            <p className="text-sm text-muted-foreground">January 22, 2026</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </motion.div>

        {/* Search */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-secondary border-0 text-base"
          />
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              {tab}
            </motion.button>
          ))}
        </motion.div>

        {/* Appointments List */}
        <motion.div 
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          key={activeTab}
        >
          {filteredAppointments.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-lg font-medium">No bookings found</p>
              <p className="text-sm">Try adjusting your search</p>
            </motion.div>
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
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
