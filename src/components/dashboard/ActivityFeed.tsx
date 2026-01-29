import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Clock, 
  DollarSign, 
  Scissors, 
  LogIn, 
  LogOut, 
  CheckCircle,
  Lock,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

interface Activity {
  id: string;
  shop_id: string;
  shop_name: string;
  staff_id: string | null;
  staff_name: string;
  staff_role: string;
  activity_type: string;
  description: string;
  metadata: unknown;
  created_at: string;
}

interface ActivityFeedProps {
  ownerId: string;
  shopId?: string;
  limit?: number;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "clock_in":
      return <LogIn className="w-4 h-4 text-success" />;
    case "clock_out":
    case "shift_closed":
      return <LogOut className="w-4 h-4 text-warning" />;
    case "cut_logged":
      return <Scissors className="w-4 h-4 text-primary" />;
    case "payment_recorded":
    case "payment_confirmed":
      return <DollarSign className="w-4 h-4 text-success" />;
    case "day_closed":
      return <Lock className="w-4 h-4 text-destructive" />;
    default:
      return <Sparkles className="w-4 h-4 text-muted-foreground" />;
  }
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "barber":
      return "bg-primary/10 text-primary";
    case "cashier":
      return "bg-blue-500/10 text-blue-500";
    case "cleaner":
      return "bg-purple-500/10 text-purple-500";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString([], { 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function ActivityFeed({ ownerId, shopId, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivities = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase.rpc('get_shop_activities', {
        p_owner_id: ownerId,
        p_shop_id: shopId || null,
        p_limit: limit,
      });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Set up realtime subscription for new activities
    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, shopId, limit]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">Live Activity</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchActivities(true)}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="mobile-card text-center py-8">
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">No activity yet</p>
          <p className="text-xs text-muted-foreground/70">
            Activities will appear here as staff work
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="mobile-card"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm truncate">
                      {activity.staff_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadgeColor(activity.staff_role)}`}>
                      {activity.staff_role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground/70">
                      {formatTime(activity.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground/50">•</span>
                    <span className="text-xs text-muted-foreground/70 truncate">
                      {activity.shop_name}
                    </span>
                  </div>
                  {typeof activity.metadata === 'object' && activity.metadata !== null && 'price' in activity.metadata && (
                    <div className="mt-1">
                      <span className="text-xs font-medium text-success">
                        {formatCurrency(Number((activity.metadata as Record<string, unknown>).price))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
