import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Scissors, TrendingUp, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";

interface BarberStat {
  id: string;
  name: string;
  cutsCount: number;
  revenue: number;
  shopName: string;
}

interface BarberLeaderboardProps {
  ownerId: string;
}

const MEDAL_COLORS = [
  "from-yellow-400 to-amber-500", // Gold
  "from-gray-300 to-gray-400",    // Silver
  "from-orange-400 to-orange-600", // Bronze
];

const MEDAL_ICONS = [Crown, Medal, Medal];

export default function BarberLeaderboard({ ownerId }: BarberLeaderboardProps) {
  const [barbers, setBarbers] = useState<BarberStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBarberStats();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cuts" }, () => {
        fetchBarberStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ownerId]);

  const fetchBarberStats = async () => {
    try {
      const { data: shops } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", ownerId);

      if (!shops || shops.length === 0) { setIsLoading(false); return; }

      const shopIds = shops.map(s => s.id);
      const shopMap = Object.fromEntries(shops.map(s => [s.id, s.name]));

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: cuts } = await supabase
        .from("cuts")
        .select("barber_id, price, shop_id, staff!cuts_barber_id_fkey(id, name)")
        .in("shop_id", shopIds)
        .eq("status", "confirmed")
        .gte("created_at", todayStart.toISOString());

      const map = new Map<string, BarberStat>();
      cuts?.forEach(cut => {
        const barber = cut.staff as unknown as { id: string; name: string };
        if (!barber) return;
        const existing = map.get(barber.id);
        if (existing) {
          existing.cutsCount++;
          existing.revenue += Number(cut.price);
        } else {
          map.set(barber.id, {
            id: barber.id,
            name: barber.name,
            cutsCount: 1,
            revenue: Number(cut.price),
            shopName: shopMap[cut.shop_id] || "",
          });
        }
      });

      setBarbers(Array.from(map.values()).sort((a, b) => b.cutsCount - a.cutsCount));
    } catch (err) {
      console.error("Error fetching barber stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const maxCuts = barbers[0]?.cutsCount || 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl tracking-wide text-foreground">Today's Barber Leaderboard</h2>
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl tracking-wide text-foreground">Today's Barber Leaderboard</h2>
        </div>
        <div className="mobile-card text-center py-6">
          <Scissors className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No cuts recorded today yet</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary" />
        <h2 className="font-display text-xl tracking-wide text-foreground">Today's Barber Leaderboard</h2>
      </div>

      {/* Top barber highlight */}
      {barbers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 p-4"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-primary/5 rounded-full translate-y-6 -translate-x-6" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <Crown className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg text-foreground">{barbers[0].name}</p>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                  #1
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{barbers[0].shopName}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl text-primary">{barbers[0].cutsCount}</p>
              <p className="text-xs text-muted-foreground">cuts</p>
            </div>
          </div>

          <div className="relative mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span>{formatCurrency(barbers[0].revenue)}</span>
            </div>
            <div className="h-1.5 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Remaining barbers */}
      <div className="space-y-2">
        {barbers.slice(1, 6).map((barber, index) => {
          const rank = index + 2;
          const progress = (barber.cutsCount / maxCuts) * 100;
          const MedalIcon = rank <= 3 ? MEDAL_ICONS[rank - 1] : null;
          const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : "";

          return (
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="mobile-card flex items-center gap-3 py-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-sm ${
                rank <= 3
                  ? `bg-gradient-to-br ${medalColor} text-primary-foreground shadow-md`
                  : "bg-muted text-muted-foreground"
              }`}>
                {MedalIcon ? <MedalIcon className="w-4 h-4" /> : rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-foreground text-sm truncate">{barber.name}</p>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{barber.cutsCount} cuts</span>
                    <span className="font-display text-sm text-primary">{formatCurrency(barber.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
                    className={`h-full rounded-full ${
                      rank === 2 ? "bg-gray-400" : rank === 3 ? "bg-orange-400" : "bg-muted-foreground/40"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
