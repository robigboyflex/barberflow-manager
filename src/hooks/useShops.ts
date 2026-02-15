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
  cashierOnDuty: string | null; // name of active cashier, or null if none
}

export function useShops() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription for cuts
  useEffect(() => {
    if (!user) return;

    const cutsChannel = supabase
      .channel('cuts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cuts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops", user.id] });
        }
      )
      .subscribe();

    const shiftsChannel = supabase
      .channel('shifts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cutsChannel);
      supabase.removeChannel(shiftsChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["shops", user?.id],
    queryFn: async (): Promise<ShopWithStats[]> => {
      if (!user) return [];

      // Fetch shops
      const { data: shops, error: shopsError } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (shopsError) throw shopsError;
      if (!shops || shops.length === 0) return [];

      // Fetch staff counts and cashier names for each shop
      const shopIds = shops.map(s => s.id);
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("shop_id, name, role")
        .in("shop_id", shopIds)
        .eq("is_active", true);

      if (staffError) throw staffError;

      // Get today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's confirmed cuts for each shop
      const { data: cutsData, error: cutsError } = await supabase
        .from("cuts")
        .select("shop_id, price, status")
        .in("shop_id", shopIds)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .eq("status", "confirmed");

      if (cutsError) throw cutsError;

      // Fetch active shifts (open, not closed) to determine cashier on duty
      const { data: activeShifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("shop_id, staff_id")
        .in("shop_id", shopIds)
        .eq("is_closed", false)
        .is("clock_out", null);

      if (shiftsError) throw shiftsError;

      // Map active shift staff_ids to cashier names
      const cashierMap: Record<string, string> = {};
      if (activeShifts && activeShifts.length > 0) {
        const activeStaffIds = activeShifts.map(s => s.staff_id);
        // Find which of these are cashiers
        const cashierStaff = staffData?.filter(
          s => s.role === "cashier" && activeStaffIds.includes(s.shop_id ? "" : "")
        );
        // Build a staff_id -> name lookup from staffData by fetching the actual staff
        const { data: shiftStaffData } = await supabase
          .from("staff")
          .select("id, name, role, shop_id")
          .in("id", activeStaffIds)
          .eq("role", "cashier");

        shiftStaffData?.forEach(s => {
          cashierMap[s.shop_id] = s.name;
        });
      }

      // Count staff per shop
      const staffCountMap: Record<string, number> = {};
      staffData?.forEach(s => {
        staffCountMap[s.shop_id] = (staffCountMap[s.shop_id] || 0) + 1;
      });

      // Calculate revenue per shop
      const revenueMap: Record<string, number> = {};
      cutsData?.forEach(c => {
        revenueMap[c.shop_id] = (revenueMap[c.shop_id] || 0) + Number(c.price);
      });

      // Combine data
      return shops.map(shop => ({
        ...shop,
        staffCount: staffCountMap[shop.id] || 0,
        todayRevenue: revenueMap[shop.id] || 0,
        cashierOnDuty: cashierMap[shop.id] || null,
      }));
    },
    enabled: !!user,
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
