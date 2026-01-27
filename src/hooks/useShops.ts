import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
}

export function useShops() {
  const { user } = useAuth();

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

      // Fetch staff counts for each shop
      const shopIds = shops.map(s => s.id);
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("shop_id")
        .in("shop_id", shopIds)
        .eq("is_active", true);

      if (staffError) throw staffError;

      // Count staff per shop
      const staffCountMap: Record<string, number> = {};
      staffData?.forEach(s => {
        staffCountMap[s.shop_id] = (staffCountMap[s.shop_id] || 0) + 1;
      });

      // Combine data
      return shops.map(shop => ({
        ...shop,
        staffCount: staffCountMap[shop.id] || 0,
        todayRevenue: 0, // Will implement with transactions table later
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
