import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Calendar, Users, Scissors } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import useSound from "@/hooks/useSound";

const cashierNav = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/appointments", icon: Calendar, label: "Book" },
  { path: "/clients", icon: Users, label: "Clients" },
  { path: "/services", icon: Scissors, label: "Services" },
];

const barberNav = [
  { path: "/", icon: LayoutDashboard, label: "Station" },
  { path: "/queue", icon: Calendar, label: "Queue" },
];

export default function BottomNav() {
  const location = useLocation();
  const { role } = useRole();
  const { playSound } = useSound();
  
  const navItems = role === 'barber' ? barberNav : cashierNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50 safe-area-pb">
      <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => playSound('tap')}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-colors"
            >
              <motion.div
                className={`p-2 rounded-2xl transition-colors ${
                  isActive 
                    ? role === 'barber' ? 'bg-purple text-purple-foreground' : 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon className="w-5 h-5" />
              </motion.div>
              <span className={`text-xs font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
