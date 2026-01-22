import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Calendar, Users, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/appointments", icon: Calendar, label: "Bookings" },
  { path: "/clients", icon: Users, label: "Clients" },
  { path: "/services", icon: Scissors, label: "Services" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl z-50 safe-area-bottom">
      <div className="flex justify-around items-center py-2 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center min-w-[72px] py-1"
            >
              <motion.div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-0.5 transition-colors",
                  isActive 
                    ? "bg-primary/15" 
                    : "bg-transparent"
                )}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive 
                      ? "text-primary drop-shadow-[0_0_10px_hsl(43_96%_56%/0.6)]" 
                      : "text-muted-foreground"
                  )}
                />
              </motion.div>
              <span className={cn(
                "text-[11px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  className="absolute -top-1 w-6 h-1 bg-gradient-gold rounded-full"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
