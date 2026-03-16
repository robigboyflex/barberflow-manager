import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Scissors, 
  Users, 
  Store,
  Calendar as CalendarIcon,
  ChevronDown,
  Award,
  Clock,
  FileText,
  Download,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AnimatedPage from "@/components/AnimatedPage";
import ReportDownloadModal from "@/components/ReportDownloadModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Shop {
  id: string;
  name: string;
}

interface BarberStats {
  id: string;
  name: string;
  cutsCount: number;
  revenue: number;
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalCuts: number;
  avgRevenuePerCut: number;
}

type TimePeriod = "today" | "week" | "month" | "year" | "custom";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const COLORS = ["hsl(43, 96%, 56%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

export default function OwnerAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCuts: 0,
    avgRevenuePerCut: 0,
  });
  const [barberStats, setBarberStats] = useState<BarberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchShops();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (shops.length > 0 || selectedShop === "all") {
      // Only fetch if not custom, or if custom has valid date range
      if (timePeriod !== "custom" || (dateRange.from && dateRange.to)) {
        fetchAnalytics();
      }
    }
  }, [selectedShop, timePeriod, shops.length, dateRange.from, dateRange.to, user?.id]);

  // Real-time subscriptions for cuts and expenses + polling fallback
  useEffect(() => {
    if (!user?.id) return;

    const shouldFetch = () => timePeriod !== "custom" || (dateRange.from && dateRange.to);

    const cutsChannel = supabase
      .channel("analytics-cuts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cuts" }, () => {
        if (shouldFetch()) fetchAnalytics();
      })
      .subscribe();

    const expensesChannel = supabase
      .channel("analytics-expenses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        if (shouldFetch()) fetchAnalytics();
      })
      .subscribe();

    // Polling fallback every 15 seconds in case realtime events are missed
    const pollInterval = setInterval(() => {
      if (shouldFetch()) fetchAnalytics();
    }, 15000);

    return () => {
      supabase.removeChannel(cutsChannel);
      supabase.removeChannel(expensesChannel);
      clearInterval(pollInterval);
    };
  }, [user?.id, selectedShop, timePeriod, shops.length, dateRange.from, dateRange.to]);

  const fetchShops = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const getDateRangeForPeriod = (period: TimePeriod) => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (dateRange.from && dateRange.to) {
          const customStart = new Date(dateRange.from);
          customStart.setHours(0, 0, 0, 0);
          const customEnd = new Date(dateRange.to);
          customEnd.setHours(23, 59, 59, 999);
          return { start: customStart.toISOString(), end: customEnd.toISOString() };
        }
        return { start: start.toISOString(), end: now.toISOString() };
    }
    
    return { start: start.toISOString(), end: now.toISOString() };
  };

  const fetchAnalytics = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { start, end } = getDateRangeForPeriod(timePeriod);
      const shopIds = selectedShop === "all" ? shops.map((s) => s.id) : [selectedShop];

      if (shopIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch cuts
      const { data: cutsData, error: cutsError } = await supabase
        .from("cuts")
        .select(`
          id,
          price,
          status,
          barber_id,
          staff!cuts_barber_id_fkey (id, name)
        `)
        .in("shop_id", shopIds)
        .in("status", ["confirmed", "pending"])
        .gte("created_at", start)
        .lte("created_at", end);

      if (cutsError) throw cutsError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .in("shop_id", shopIds)
        .gte("created_at", start)
        .lte("created_at", end);

      if (expensesError) throw expensesError;

      // Calculate summary
      const confirmedCuts = cutsData?.filter((c) => c.status === "confirmed") || [];
      const totalRevenue = confirmedCuts.reduce((sum, c) => sum + Number(c.price), 0);
      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalCuts = confirmedCuts.length;

      setSummary({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalCuts,
        avgRevenuePerCut: totalCuts > 0 ? totalRevenue / totalCuts : 0,
      });

      // Calculate barber stats
      const barberMap = new Map<string, BarberStats>();
      cutsData?.forEach((cut) => {
        const barber = cut.staff as unknown as { id: string; name: string };
        if (barber && cut.status === "confirmed") {
          const existing = barberMap.get(barber.id);
          if (existing) {
            existing.cutsCount++;
            existing.revenue += Number(cut.price);
          } else {
            barberMap.set(barber.id, {
              id: barber.id,
              name: barber.name,
              cutsCount: 1,
              revenue: Number(cut.price),
            });
          }
        }
      });

      const barberStatsArray = Array.from(barberMap.values()).sort(
        (a, b) => b.cutsCount - a.cutsCount
      );
      setBarberStats(barberStatsArray);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = barberStats.slice(0, 5).map((b) => ({
    name: b.name.split(" ")[0],
    cuts: b.cutsCount,
    revenue: b.revenue,
  }));

  const pieData = [
    { name: "Revenue", value: summary.totalRevenue },
    { name: "Expenses", value: summary.totalExpenses },
  ];

  return (
    <AnimatedPage>
      <div className="space-y-5 pb-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl tracking-wide">Analytics</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="flex-1 h-12 rounded-xl">
              <Store className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timePeriod} onValueChange={(v: TimePeriod) => setTimePeriod(v)}>
            <SelectTrigger className="w-32 h-12 rounded-xl">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Picker */}
        {timePeriod === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-3"
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 h-12 rounded-xl justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                  disabled={(date) => date > new Date() || (dateRange.to ? date > dateRange.to : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 h-12 rounded-xl justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                  disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </motion.div>
        )}

        {/* Revenue Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-gold p-5 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-primary-foreground/80 text-sm">Net Profit</p>
              {isLoading ? (
                <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
              ) : (
                <h2 className="text-4xl font-display text-primary-foreground">
                  {formatCurrency(summary.netProfit)}
                </h2>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              {summary.netProfit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              ) : (
                <TrendingDown className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-primary-foreground/80 text-sm">
            <div>
              <p className="opacity-80">Revenue</p>
              <p className="font-semibold text-primary-foreground">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="opacity-80">Expenses</p>
              <p className="font-semibold text-primary-foreground">-{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <div>
              <p className="opacity-80">Cuts</p>
              <p className="font-semibold text-primary-foreground">{summary.totalCuts}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mobile-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Cuts</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-display text-foreground">{summary.totalCuts}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mobile-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Avg/Cut</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-display text-foreground">
                {formatCurrency(summary.avgRevenuePerCut)}
              </p>
            )}
          </motion.div>
        </div>

        {/* Barber Performance Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg">Top Barbers</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="cuts" fill="hsl(43, 96%, 56%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Barber Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl tracking-wide">Barber Leaderboard</h2>
          </div>

          {/* Totals summary bar */}
          {!isLoading && barberStats.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-card to-success/10 border border-border p-4 flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-display text-foreground">
                  {barberStats.reduce((s, b) => s + b.cutsCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Cuts</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-display text-primary">
                  {formatCurrency(barberStats.reduce((s, b) => s + b.revenue, 0))}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-display text-foreground">{barberStats.length}</p>
                <p className="text-xs text-muted-foreground">Barbers</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : barberStats.length === 0 ? (
            <div className="mobile-card text-center py-6">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">No barber data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Top barber highlight */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 p-4"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-6 translate-x-6" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Award className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg text-foreground">{barberStats[0].name}</p>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">#1</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{barberStats[0].cutsCount} cuts</p>
                  </div>
                  <p className="font-display text-2xl text-primary">{formatCurrency(barberStats[0].revenue)}</p>
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
                  />
                </div>
              </motion.div>

              {/* Rest */}
              {barberStats.slice(1).map((barber, index) => {
                const rank = index + 2;
                const progress = (barber.cutsCount / (barberStats[0]?.cutsCount || 1)) * 100;
                return (
                  <motion.div
                    key={barber.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="mobile-card flex items-center gap-3 py-3"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-sm ${
                      rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-primary-foreground shadow-md"
                        : rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {rank}
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
                          transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
                          className="h-full rounded-full bg-muted-foreground/30"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Download Report Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <Button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full h-12 rounded-xl gap-2 bg-gradient-gold text-primary-foreground"
          >
            <Download className="w-4 h-4" />
            Download Report
          </Button>
          <Button
            onClick={() => toast.info("Audit logs coming soon!")}
            variant="outline"
            className="w-full h-12 rounded-xl gap-2"
          >
            <FileText className="w-4 h-4" />
            View Audit Logs
          </Button>
        </motion.div>
      </div>

      {/* Report Download Modal */}
      {user && (
        <ReportDownloadModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          shops={shops}
          userId={user.id}
        />
      )}
    </AnimatedPage>
  );
}
