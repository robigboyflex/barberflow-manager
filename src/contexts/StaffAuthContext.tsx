import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
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
  sessionToken?: string;
}

interface StaffAuthContextType {
  staff: Staff | null;
  isAuthenticated: boolean;
  login: (shopId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getSessionToken: () => string | null;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(() => {
    const saved = sessionStorage.getItem("staff_session");
    return saved ? JSON.parse(saved) : null;
  });

  // If a staff session token becomes invalid (expired/revoked), auto-clear local state
  // so the user is forced back to Staff Login instead of getting repeated RPC errors.
  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (!staff?.id || !staff?.sessionToken) return;

      const { data, error } = await supabase.rpc('validate_staff_session', {
        p_staff_id: staff.id,
        p_session_token: staff.sessionToken,
      });

      if (cancelled) return;

      if (error || data !== true) {
        setStaff(null);
        sessionStorage.removeItem("staff_session");
      }
    };

    validate();

    return () => {
      cancelled = true;
    };
  }, [staff?.id, staff?.sessionToken]);

  const login = useCallback(async (shopId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use server-side PIN verification with hashed comparison
      const { data, error } = await supabase.rpc('verify_staff_pin', {
        shop_uuid: shopId,
        pin_input: pin
      });

      if (error) {
        console.error("Staff login error:", error);
        return { success: false, error: "Unable to verify PIN. Please try again." };
      }

      if (!data || data.length === 0) {
        return { success: false, error: "Invalid PIN or staff not found" };
      }

      const staffRecord = data[0];
      
      const staffData: Staff = {
        id: staffRecord.staff_id,
        name: staffRecord.staff_name,
        role: staffRecord.staff_role as Staff["role"],
        shop_id: staffRecord.staff_shop_id,
        phone: staffRecord.staff_phone,
        is_active: staffRecord.staff_is_active,
        shop: {
          id: staffRecord.staff_shop_id,
          name: staffRecord.shop_name,
          location: staffRecord.shop_location,
        },
        sessionToken: staffRecord.session_token,
      };

      setStaff(staffData);
      sessionStorage.setItem("staff_session", JSON.stringify(staffData));

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  }, []);

  const logout = useCallback(async () => {
    // Revoke session server-side
    if (staff?.sessionToken) {
      try {
        await supabase.rpc('staff_logout', {
          p_staff_id: staff.id,
          p_session_token: staff.sessionToken
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    setStaff(null);
    sessionStorage.removeItem("staff_session");
  }, [staff]);

  const getSessionToken = useCallback(() => {
    return staff?.sessionToken || null;
  }, [staff]);

  return (
    <StaffAuthContext.Provider value={{ staff, isAuthenticated: !!staff, login, logout, getSessionToken }}>
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
