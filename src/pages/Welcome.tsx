import { motion } from "framer-motion";
import { Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  "Manage multiple shop locations",
  "Track cuts, payments & revenue",
  "Role-based staff access",
  "Works offline, syncs online",
];

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 safe-area-top safe-area-bottom">
      {/* App Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-32 h-32 rounded-3xl bg-gradient-gold flex items-center justify-center shadow-xl shadow-primary/30 mb-8"
      >
        <Scissors className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-display tracking-wide text-foreground mb-2"
      >
        BarberFlow
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-lg mb-10"
      >
        Multi-shop management made simple
      </motion.p>

      {/* Features List */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 w-full max-w-sm mb-12"
      >
        {features.map((feature, index) => (
          <motion.li
            key={feature}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-3 text-foreground"
          >
            <span className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            <span className="text-base">{feature}</span>
          </motion.li>
        ))}
      </motion.ul>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-sm space-y-4"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/auth")}
          className="w-full h-16 rounded-2xl bg-gradient-gold text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 touch-feedback"
        >
          Get Started
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/auth?mode=signin")}
          className="w-full h-16 rounded-2xl border-2 border-border bg-transparent text-foreground font-bold text-lg touch-feedback"
        >
          Sign In
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 text-muted-foreground text-base"
        >
          Staff? Login with PIN
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 text-muted-foreground text-sm"
      >
        Optimized for fast performance on all devices
      </motion.p>
    </div>
  );
}
