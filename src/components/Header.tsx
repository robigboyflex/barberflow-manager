import { LogOut, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import LiveClock from "@/components/LiveClock";
import OwnerChatSheet from "@/components/messaging/OwnerChatSheet";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: shops } = useShops();
  const [selectedShop, setSelectedShop] = useState<{ id: string; name: string } | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'Owner';
  const ownerName = user?.user_metadata?.full_name || firstName;

  // Fetch unread message count across all shops
  useEffect(() => {
    if (!shops?.length) return;
    const shopIds = shops.map(s => s.id);
    
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("shop_id", shopIds)
        .eq("sender_type", "cashier")
        .eq("is_read", false);
      setTotalUnread(count || 0);
    };
    
    fetchUnread();
    const channel = supabase
      .channel("owner-header-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shops]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
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
            {/* Messaging Button */}
            {shops && shops.length === 1 && user ? (
              <OwnerChatSheet
                shopId={shops[0].id}
                shopName={shops[0].name}
                ownerId={user.id}
                ownerName={ownerName}
              />
            ) : shops && shops.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="w-5 h-5" />
                    {totalUnread > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                        {totalUnread}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {shops.map((shop) => (
                    <DropdownMenuItem
                      key={shop.id}
                      onClick={() => setSelectedShop({ id: shop.id, name: shop.name })}
                    >
                      {shop.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

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

      {/* For multi-shop: render the chat sheet that auto-opens */}
      {selectedShop && user && (
        <MultiShopChat
          shopId={selectedShop.id}
          shopName={selectedShop.name}
          ownerId={user.id}
          ownerName={ownerName}
          onClose={() => setSelectedShop(null)}
        />
      )}
    </>
  );
}

function MultiShopChat({ shopId, shopName, ownerId, ownerName, onClose }: {
  shopId: string; shopName: string; ownerId: string; ownerName: string; onClose: () => void;
}) {
  // Auto-open the sheet by rendering OwnerChatSheet with a trigger that auto-clicks
  // Instead, we'll use a simpler inline chat sheet
  const [isOpen, setIsOpen] = useState(true);
  
  useEffect(() => {
    if (!isOpen) onClose();
  }, [isOpen]);

  return (
    <OwnerChatSheet
      shopId={shopId}
      shopName={shopName}
      ownerId={ownerId}
      ownerName={ownerName}
    />
  );
}
