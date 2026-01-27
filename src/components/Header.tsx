import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Get user's first name from metadata or email
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'Owner';

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-background px-5 py-4 sticky top-0 z-40 safe-area-top">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-3xl tracking-wide text-foreground">
            {firstName}
          </h1>
        </div>
        <motion.button
          onClick={handleSignOut}
          className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center"
          whileTap={{ scale: 0.9 }}
        >
          <LogOut className="w-5 h-5 text-destructive" />
        </motion.button>
      </div>
    </header>
  );
}
