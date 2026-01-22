import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import AnimatedPage, { staggerContainer } from "@/components/AnimatedPage";

// Mock data for demo
const mockServices = [
  {
    id: "1",
    name: "Haircut",
    description: "Classic men's haircut with styling",
    duration: 30,
    price: 25,
    isActive: true,
  },
  {
    id: "2",
    name: "Beard Trim",
    description: "Beard shaping and trimming",
    duration: 20,
    price: 15,
    isActive: true,
  },
  {
    id: "3",
    name: "Haircut & Beard",
    description: "Full haircut with beard trim combo",
    duration: 45,
    price: 35,
    isActive: true,
  },
  {
    id: "4",
    name: "Hot Towel Shave",
    description: "Traditional hot towel straight razor shave",
    duration: 30,
    price: 30,
    isActive: true,
  },
  {
    id: "5",
    name: "Kids Haircut",
    description: "Haircut for children under 12",
    duration: 20,
    price: 18,
    isActive: true,
  },
  {
    id: "6",
    name: "Hair Design",
    description: "Custom hair design and patterns",
    duration: 45,
    price: 40,
    isActive: false,
  },
];

const tabs = ["All", "Active", "Inactive"];

export default function Services() {
  const [activeTab, setActiveTab] = useState("Active");

  const filteredServices = mockServices.filter((service) => {
    if (activeTab === "Active") return service.isActive;
    if (activeTab === "Inactive") return !service.isActive;
    return true;
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
          <div>
            <h1 className="font-display text-2xl tracking-wide">Services</h1>
            <p className="text-sm text-muted-foreground">
              {mockServices.filter(s => s.isActive).length} active
            </p>
          </div>
          <motion.button
            className="w-11 h-11 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-primary/20"
            whileTap={{ scale: 0.9 }}
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

        {/* Services List */}
        <motion.div 
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          key={activeTab}
        >
          {filteredServices.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-lg font-medium">No services found</p>
              <p className="text-sm">Add a service to get started</p>
            </motion.div>
          ) : (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                description={service.description}
                duration={service.duration}
                price={service.price}
                isActive={service.isActive}
              />
            ))
          )}
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
