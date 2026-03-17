import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import LiveClock from "@/components/LiveClock";
import OwnerChatSheet from "@/components/messaging/OwnerChatSheet";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: shops } = useShops();
  
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'Owner';
  const ownerName = user?.user_metadata?.full_name || firstName;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Use first shop for messaging (most common case)
  const primaryShop = shops?.[0];

  return (
    <header className="bg-background px-5 py-4 sticky top-0 z-40 safe-area-top">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-3xl tracking-wide text-foreground">
            {firstName}
          </h1>
          <LiveClock className="mt-1" />
        </div>
        <div className="flex items-center gap-2">
          {primaryShop && user && (
            <OwnerChatSheet
              shopId={primaryShop.id}
              shopName={primaryShop.name}
              ownerId={user.id}
              ownerName={ownerName}
            />
          )}
          <motion.button
            onClick={handleSignOut}
            className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
          >
            <LogOut className="w-5 h-5 text-destructive" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
