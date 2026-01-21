import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceCard from "@/components/ServiceCard";

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-gradient-gold">
          SERVICES
        </h1>
        <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="inactive" className="flex-1">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No services found</p>
            </div>
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
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="glass-card p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Total Services: {mockServices.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Active: {mockServices.filter((s) => s.isActive).length}
          </span>
        </div>
      </div>
    </div>
  );
}
