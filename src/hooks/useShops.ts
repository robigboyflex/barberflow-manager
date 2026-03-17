import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export interface Shop {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface Staff {
  id: string;
  shop_id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ShopWithStats extends Shop {
  staffCount: number;
  todayRevenue: number;
  todayExpenses: number;
  cashierOnDuty: string | null; // name of active cashier, or null if none
}

export function useShops() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || loading) return;

    // Debounce invalidation to prevent rapid re-renders from multiple realtime events
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const invalidateShops = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["shops", user.id] });
      }, 500);
    };

    const realtimeChannel = supabase
      .channel(`owner-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuts' }, invalidateShops)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, invalidateShops)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, invalidateShops)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(realtimeChannel);
    };
  }, [user, loading, queryClient]);

  return useQuery({
    queryKey: ["shops", user?.id],
    queryFn: async (): Promise<ShopWithStats[]> => {
      if (!user) return [];

      const { data: shops, error: shopsError } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (shopsError) throw shopsError;
      if (!shops?.length) return [];

      const shopIds = shops.map((shop) => shop.id);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      // Use local date components to avoid UTC date shift
      const todayDate = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`;

      const [staffResult, cutsResult, expensesResult, shiftsResult] = await Promise.all([
        supabase
          .from("staff")
          .select("id, shop_id, name, role")
          .in("shop_id", shopIds)
          .eq("is_active", true),
        supabase
          .from("cuts")
          .select("shop_id, price")
          .in("shop_id", shopIds)
          .gte("confirmed_at", todayStart.toISOString())
          .lte("confirmed_at", todayEnd.toISOString())
          .eq("status", "confirmed"),
        supabase
          .from("expenses")
          .select("shop_id, amount")
          .in("shop_id", shopIds)
          .eq("expense_date", todayDate),
        supabase
          .from("shifts")
          .select("shop_id, staff_id")
          .in("shop_id", shopIds)
          .eq("is_closed", false)
          .is("clock_out", null),
      ]);

      if (staffResult.error) throw staffResult.error;
      if (cutsResult.error) throw cutsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (shiftsResult.error) throw shiftsResult.error;

      const staffData = staffResult.data ?? [];
      const cutsData = cutsResult.data ?? [];
      const expensesData = expensesResult.data ?? [];
      const activeShifts = shiftsResult.data ?? [];

      const staffCountMap: Record<string, number> = {};
      const cashierById = new Map<string, { shop_id: string; name: string }>();

      staffData.forEach((staffMember) => {
        staffCountMap[staffMember.shop_id] = (staffCountMap[staffMember.shop_id] || 0) + 1;

        if (staffMember.role === "cashier") {
          cashierById.set(staffMember.id, {
            shop_id: staffMember.shop_id,
            name: staffMember.name,
          });
        }
      });

      const revenueMap: Record<string, number> = {};
      cutsData.forEach((cut) => {
        revenueMap[cut.shop_id] = (revenueMap[cut.shop_id] || 0) + Number(cut.price);
      });

      const expensesMap: Record<string, number> = {};
      expensesData.forEach((expense) => {
        expensesMap[expense.shop_id] = (expensesMap[expense.shop_id] || 0) + Number(expense.amount);
      });

      const cashierMap: Record<string, string> = {};
      activeShifts.forEach((shift) => {
        const cashier = cashierById.get(shift.staff_id);
        if (cashier) {
          cashierMap[cashier.shop_id] = cashier.name;
        }
      });

      return shops.map((shop) => ({
        ...shop,
        staffCount: staffCountMap[shop.id] || 0,
        todayRevenue: revenueMap[shop.id] || 0,
        todayExpenses: expensesMap[shop.id] || 0,
        cashierOnDuty: cashierMap[shop.id] || null,
      }));
    },
    enabled: !loading && !!user,
  });
}

export function useShopStaff(shopId: string | null) {
  return useQuery({
    queryKey: ["staff", shopId],
    queryFn: async (): Promise<Staff[]> => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });
}

export function useDeleteShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", shopId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}
