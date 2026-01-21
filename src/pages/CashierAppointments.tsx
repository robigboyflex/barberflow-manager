import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import { DuoButton, DuoIconButton } from "@/components/ui/duo-components";
import DuoAppointmentCard from "@/components/DuoAppointmentCard";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";
import type { AppointmentStatus } from "@/types/barberflow";

const mockAppointments = [
  { id: "1", clientName: "John Smith", serviceName: "Haircut & Beard", time: "10:30 AM", duration: 45, status: "completed" as AppointmentStatus, barberName: "Mike" },
  { id: "2", clientName: "Alex Johnson", serviceName: "Haircut", time: "11:15 AM", duration: 30, status: "in_progress" as AppointmentStatus, barberName: "Mike" },
  { id: "3", clientName: "David Brown", serviceName: "Hot Towel Shave", time: "12:00 PM", duration: 30, status: "confirmed" as AppointmentStatus, barberName: "James" },
  { id: "4", clientName: "Chris Wilson", serviceName: "Hair Design", time: "1:00 PM", duration: 45, status: "scheduled" as AppointmentStatus, barberName: "Mike" },
  { id: "5", clientName: "Tom Davis", serviceName: "Beard Trim", time: "2:00 PM", duration: 20, status: "scheduled" as AppointmentStatus, barberName: "James" },
];

const filterTabs = [
  { id: 'all', label: 'All', emoji: '📋' },
  { id: 'upcoming', label: 'Upcoming', emoji: '⏰' },
  { id: 'done', label: 'Done', emoji: '✅' },
];

export default function CashierAppointments() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAppointments = mockAppointments.filter((apt) => {
    const matchesSearch = apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'upcoming') return matchesSearch && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status);
    if (activeFilter === 'done') return matchesSearch && apt.status === 'completed';
    return matchesSearch;
  });

  return (
    <AnimatedPage>
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl font-extrabold">📅 Appointments</h1>
          <DuoIconButton icon={Plus} variant="primary" size="sm" />
        </motion.div>

        {/* Search */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="duo-input w-full pl-12"
          />
        </motion.div>

        {/* Filter Tabs */}
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {filterTabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${
                activeFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_0_0_hsl(145_65%_32%)]'
                  : 'bg-secondary text-secondary-foreground shadow-[0_4px_0_0_hsl(210_20%_82%)]'
              }`}
              whileTap={{ y: 2 }}
            >
              <span className="mr-1">{tab.emoji}</span>
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Appointments List */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeFilter}
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredAppointments.length === 0 ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className="text-4xl">🔍</span>
                <p className="text-muted-foreground mt-2">No appointments found</p>
              </motion.div>
            ) : (
              filteredAppointments.map((apt) => (
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
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
