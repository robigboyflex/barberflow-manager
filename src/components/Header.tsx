import { Scissors, Bell } from "lucide-react";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <header className="bg-card/95 backdrop-blur-xl px-5 py-4 sticky top-0 z-40 safe-area-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-12 h-12 bg-gradient-gold rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"
            whileTap={{ scale: 0.95 }}
          >
            <Scissors className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="font-display text-2xl tracking-wider text-gradient-gold">
              BARBERFLOW
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">Premium Management</p>
          </div>
        </div>
        <motion.button
          className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center relative"
          whileTap={{ scale: 0.9 }}
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full" />
        </motion.button>
      </div>
    </header>
  );
}
