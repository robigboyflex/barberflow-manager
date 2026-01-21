import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientCard from "@/components/ClientCard";

// Mock data for demo
const mockClients = [
  {
    id: "1",
    name: "John Smith",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    lastVisit: "Jan 15",
    totalVisits: 12,
  },
  {
    id: "2",
    name: "Alex Johnson",
    phone: "(555) 234-5678",
    email: "alex.j@email.com",
    lastVisit: "Jan 18",
    totalVisits: 8,
  },
  {
    id: "3",
    name: "David Brown",
    phone: "(555) 345-6789",
    email: null,
    lastVisit: "Jan 10",
    totalVisits: 24,
  },
  {
    id: "4",
    name: "Chris Wilson",
    phone: "(555) 456-7890",
    email: "chris.w@email.com",
    lastVisit: "Jan 5",
    totalVisits: 6,
  },
  {
    id: "5",
    name: "Tom Davis",
    phone: "(555) 567-8901",
    email: "tom.d@email.com",
    lastVisit: "Dec 28",
    totalVisits: 15,
  },
  {
    id: "6",
    name: "Ryan Miller",
    phone: "(555) 678-9012",
    email: null,
    lastVisit: "Jan 2",
    totalVisits: 3,
  },
];

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = mockClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-gradient-gold">
          CLIENTS
        </h1>
        <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Client Count */}
      <p className="text-sm text-muted-foreground">
        {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
      </p>

      {/* Client List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No clients found</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              name={client.name}
              phone={client.phone}
              email={client.email}
              lastVisit={client.lastVisit}
              totalVisits={client.totalVisits}
            />
          ))
        )}
      </div>
    </div>
  );
}
