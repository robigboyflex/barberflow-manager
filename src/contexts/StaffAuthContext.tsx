import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Staff {
  id: string;
  name: string;
  role: "barber" | "cashier" | "cleaner";
  shop_id: string;
  phone: string | null;
  is_active: boolean;
  shop?: {
    id: string;
    name: string;
    location: string;
  };
}

interface StaffAuthContextType {
  staff: Staff | null;
  isAuthenticated: boolean;
  login: (shopId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(() => {
    const saved = sessionStorage.getItem("staff_session");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (shopId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          id,
          name,
          role,
          shop_id,
          phone,
          is_active,
          shops:shop_id (
            id,
            name,
            location
          )
        `)
        .eq("shop_id", shopId)
        .eq("pin", pin)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Staff login error:", error);
        return { success: false, error: "Unable to verify PIN. Please try again." };
      }

      if (!data) {
        return { success: false, error: "Invalid PIN or staff not found" };
      }

      const staffData: Staff = {
        id: data.id,
        name: data.name,
        role: data.role,
        shop_id: data.shop_id,
        phone: data.phone,
        is_active: data.is_active,
        shop: data.shops as Staff["shop"],
      };

      setStaff(staffData);
      sessionStorage.setItem("staff_session", JSON.stringify(staffData));

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  }, []);

  const logout = useCallback(() => {
    setStaff(null);
    sessionStorage.removeItem("staff_session");
  }, []);

  return (
    <StaffAuthContext.Provider value={{ staff, isAuthenticated: !!staff, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error("useStaffAuth must be used within a StaffAuthProvider");
  }
  return context;
}
