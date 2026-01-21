import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceCard from "@/components/ServiceCard";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";

// Mock data for demo
const mockServices = [
  {
    id: "1",
    name: "Haircut",
    description: "Classic men's haircut with styling",
    duration: 30,
    price: 25.0,
    isActive: true,
  },
  {
    id: "2",
    name: "Beard Trim",
    description: "Beard shaping and trimming",
    duration: 20,
    price: 15.0,
    isActive: true,
  },
  {
    id: "3",
    name: "Haircut & Beard",
    description: "Full haircut with beard trim combo",
    duration: 45,
    price: 35.0,
    isActive: true,
  },
  {
    id: "4",
    name: "Hot Towel Shave",
    description: "Traditional hot towel straight razor shave",
    duration: 30,
    price: 30.0,
    isActive: true,
  },
  {
    id: "5",
    name: "Kids Haircut",
    description: "Haircut for children under 12",
    duration: 20,
    price: 18.0,
    isActive: true,
  },
  {
    id: "6",
    name: "Hair Design",
    description: "Custom hair design and patterns",
    duration: 45,
    price: 40.0,
    isActive: false,
  },
];

export default function Services() {
  const [activeTab, setActiveTab] = useState("active");

  const filteredServices = mockServices.filter((service) => {
    if (activeTab === "active") return service.isActive;
    if (activeTab === "inactive") return !service.isActive;
    return true;
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
          <h1 className="font-display text-2xl tracking-wide text-gradient-gold">
            SERVICES
          </h1>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
              <TabsTrigger value="inactive" className="flex-1">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <motion.div 
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                key={activeTab}
              >
                {filteredServices.length === 0 ? (
                  <motion.div 
                    className="text-center py-8 text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p>No services found</p>
                  </motion.div>
                ) : (
                  filteredServices.map((service) => (
                    <motion.div key={service.id} variants={fadeUpItem}>
                      <ServiceCard
                        name={service.name}
                        description={service.description}
                        duration={service.duration}
                        price={service.price}
                        isActive={service.isActive}
                      />
                    </motion.div>
                  ))
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Summary */}
        <motion.div 
          className="glass-card p-4 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total Services: {mockServices.length}
            </span>
            <span className="text-sm text-muted-foreground">
              Active: {mockServices.filter((s) => s.isActive).length}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
