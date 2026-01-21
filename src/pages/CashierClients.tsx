import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { DuoCard, DuoIconButton, DuoBadge } from "@/components/ui/duo-components";
import AnimatedPage, { staggerContainer, fadeUpItem } from "@/components/AnimatedPage";
import useSound from "@/hooks/useSound";

const mockClients = [
  { id: "1", name: "John Smith", phone: "(555) 123-4567", email: "john@email.com", visits: 12, lastVisit: "Today", favorite: true },
  { id: "2", name: "Alex Johnson", phone: "(555) 234-5678", email: "alex@email.com", visits: 8, lastVisit: "Jan 18" },
  { id: "3", name: "David Brown", phone: "(555) 345-6789", email: null, visits: 24, lastVisit: "Jan 10", favorite: true },
  { id: "4", name: "Chris Wilson", phone: "(555) 456-7890", email: "chris@email.com", visits: 6, lastVisit: "Jan 5" },
  { id: "5", name: "Tom Davis", phone: "(555) 567-8901", email: "tom@email.com", visits: 15, lastVisit: "Dec 28" },
];

export default function CashierClients() {
  const [searchQuery, setSearchQuery] = useState('');
  const { playSound } = useSound();

  const filteredClients = mockClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const avatarColors = [
    'bg-primary', 'bg-accent', 'bg-info', 'bg-purple', 'bg-pink'
  ];

  return (
    <AnimatedPage>
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl font-extrabold">👥 Clients</h1>
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
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="duo-input w-full pl-12"
          />
        </motion.div>

        {/* Count */}
        <motion.p 
          className="text-sm text-muted-foreground font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredClients.length} clients
        </motion.p>

        {/* Clients List */}
        <motion.div 
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredClients.map((client, i) => (
            <motion.div key={client.id} variants={fadeUpItem}>
              <DuoCard className="flex items-center gap-4">
                {/* Avatar */}
                <motion.div 
                  className={`w-14 h-14 rounded-2xl ${avatarColors[i % avatarColors.length]} text-white flex items-center justify-center font-bold text-lg shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  {getInitials(client.name)}
                </motion.div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate">{client.name}</h3>
                    {client.favorite && <span>⭐</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{client.phone}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <DuoBadge variant="success">{client.visits} visits</DuoBadge>
                  <p className="text-xs text-muted-foreground mt-1">{client.lastVisit}</p>
                </div>
              </DuoCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
