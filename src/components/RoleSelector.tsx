import { motion } from "framer-motion";
import { Scissors, DollarSign, Sparkles } from "lucide-react";
import { useRole, UserRole } from "@/contexts/RoleContext";
import useSound from "@/hooks/useSound";

export default function RoleSelector() {
  const { role, setRole, userName } = useRole();
  const { playSound } = useSound();

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== role) {
      playSound('swoosh');
      setRole(newRole);
    }
  };

  return (
    <div className="p-4 bg-card border-b-2 border-border">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Sparkles className="w-5 h-5 text-accent" />
            </motion.div>
            <span className="font-bold text-lg">Hey, {userName}! 👋</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            onClick={() => handleRoleChange('cashier')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold transition-all ${
              role === 'cashier'
                ? 'bg-primary text-primary-foreground shadow-[0_4px_0_0_hsl(145_65%_32%)]'
                : 'bg-secondary text-secondary-foreground shadow-[0_4px_0_0_hsl(210_20%_82%)]'
            }`}
            whileTap={{ y: 2, boxShadow: "0 2px 0 0 hsl(145 65% 32%)" }}
          >
            <DollarSign className="w-5 h-5" />
            Cashier
          </motion.button>
          
          <motion.button
            onClick={() => handleRoleChange('barber')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold transition-all ${
              role === 'barber'
                ? 'bg-purple text-purple-foreground shadow-[0_4px_0_0_hsl(270_70%_45%)]'
                : 'bg-secondary text-secondary-foreground shadow-[0_4px_0_0_hsl(210_20%_82%)]'
            }`}
            whileTap={{ y: 2, boxShadow: "0 2px 0 0 hsl(270 70% 45%)" }}
          >
            <Scissors className="w-5 h-5" />
            Barber
          </motion.button>
        </div>
      </div>
    </div>
  );
}
