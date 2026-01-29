import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import iconicBarberLogo from "@/assets/iconic-barber-logo.jpg";
import barbershopBackground from "@/assets/barbershop-background.jpg";

const features = [
  "Manage multiple shop locations",
  "Track cuts, payments & revenue",
  "Role-based staff access",
  "Works offline, syncs online",
];

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 safe-area-top safe-area-bottom relative"
      style={{
        backgroundImage: `url(${barbershopBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-background/85" />
      {/* App Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative z-10 w-32 h-32 rounded-full overflow-hidden shadow-xl shadow-primary/30 mb-8"
      >
        <img src={iconicBarberLogo} alt="Iconic Barber Logo" className="w-full h-full object-cover" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-4xl md:text-5xl font-display tracking-wide text-foreground mb-2"
      >
        Iconic Barber
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 text-muted-foreground text-lg mb-10"
      >
        Multi-shop management made simple
      </motion.p>

      {/* Features List */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 space-y-4 w-full max-w-sm mb-12"
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
        className="relative z-10 w-full max-w-sm space-y-4"
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
          onClick={() => navigate("/staff-login")}
          className="w-full py-4 text-muted-foreground text-base underline underline-offset-4"
        >
          Staff? Login with PIN
        </motion.button>
      </motion.div>

    </div>
  );
}
