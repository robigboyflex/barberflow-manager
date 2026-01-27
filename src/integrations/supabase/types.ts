export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          shop_id: string
          staff_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          shop_id: string
          staff_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          shop_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      cuts: {
        Row: {
          barber_id: string
          client_name: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          price: number
          service_id: string
          shop_id: string
          status: Database["public"]["Enums"]["cut_status"]
          updated_at: string
        }
        Insert: {
          barber_id: string
          client_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          price: number
          service_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["cut_status"]
          updated_at?: string
        }
        Update: {
          barber_id?: string
          client_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          price?: number
          service_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["cut_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuts_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          created_at: string
          id: string
          net_profit: number
          shop_id: string
          summary_date: string
          total_cuts: number
          total_expenses: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          net_profit?: number
          shop_id: string
          summary_date: string
          total_cuts?: number
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          net_profit?: number
          shop_id?: string
          summary_date?: string
          total_cuts?: number
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          recorded_by: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          recorded_by: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          recorded_by?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_pin_attempts: {
        Row: {
          attempt_time: string
          id: string
          shop_id: string
        }
        Insert: {
          attempt_time?: string
          id?: string
          shop_id: string
        }
        Update: {
          attempt_time?: string
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "failed_pin_attempts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          price: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          shop_id: string
          staff_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          shop_id: string
          staff_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          shop_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin: string
          pin_hash: string | null
          role: Database["public"]["Enums"]["staff_role"]
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pin: string
          pin_hash?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pin?: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked: boolean
          staff_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          staff_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          staff_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cashier_record_payment: {
        Args: {
          p_barber_id: string
          p_cashier_id: string
          p_client_name?: string
          p_payment_method?: string
          p_price: number
          p_service_id: string
          p_session_token?: string
          p_shop_id: string
        }
        Returns: string
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_pin_attempts: { Args: never; Returns: undefined }
      confirm_cut:
        | { Args: { p_cashier_id: string; p_cut_id: string }; Returns: boolean }
        | {
            Args: {
              p_cashier_id: string
              p_cut_id: string
              p_session_token?: string
            }
            Returns: boolean
          }
      dispute_cut:
        | { Args: { p_cashier_id: string; p_cut_id: string }; Returns: boolean }
        | {
            Args: {
              p_cashier_id: string
              p_cut_id: string
              p_session_token?: string
            }
            Returns: boolean
          }
      get_barber_cuts: {
        Args: {
          p_barber_id: string
          p_end_date?: string
          p_session_token: string
          p_start_date?: string
        }
        Returns: {
          client_name: string
          created_at: string
          id: string
          price: number
          service_id: string
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["cut_status"]
        }[]
      }
      get_shop_barbers: {
        Args: { p_session_token: string; p_shop_id: string; p_staff_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_shop_cuts_for_cashier: {
        Args: {
          p_cashier_id: string
          p_end_date?: string
          p_session_token: string
          p_start_date?: string
        }
        Returns: {
          barber_id: string
          barber_name: string
          client_name: string
          confirmed_at: string
          created_at: string
          id: string
          payment_method: string
          price: number
          service_name: string
          status: Database["public"]["Enums"]["cut_status"]
        }[]
      }
      get_shop_services: {
        Args: { p_session_token: string; p_shop_id: string; p_staff_id: string }
        Returns: {
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
        }[]
      }
      get_staff_active_shift: {
        Args: { p_session_token: string; p_staff_id: string }
        Returns: {
          clock_in: string
          shift_id: string
        }[]
      }
      get_staff_today_shifts: {
        Args: { p_session_token: string; p_staff_id: string }
        Returns: {
          clock_in: string
          clock_out: string
          shift_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_cut:
        | {
            Args: {
              p_barber_id: string
              p_client_name?: string
              p_price: number
              p_service_id: string
              p_shop_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_barber_id: string
              p_client_name?: string
              p_price: number
              p_service_id: string
              p_session_token?: string
              p_shop_id: string
            }
            Returns: string
          }
      record_expense:
        | {
            Args: {
              p_amount: number
              p_category: Database["public"]["Enums"]["expense_category"]
              p_description: string
              p_shop_id: string
              p_staff_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category: Database["public"]["Enums"]["expense_category"]
              p_description: string
              p_session_token?: string
              p_shop_id: string
              p_staff_id: string
            }
            Returns: string
          }
      staff_clock_in: {
        Args: { p_session_token: string; p_shop_id: string; p_staff_id: string }
        Returns: string
      }
      staff_clock_out: {
        Args: {
          p_session_token: string
          p_shift_id: string
          p_staff_id: string
        }
        Returns: boolean
      }
      staff_logout: {
        Args: { p_session_token: string; p_staff_id: string }
        Returns: boolean
      }
      validate_staff_session: {
        Args: { p_session_token: string; p_staff_id: string }
        Returns: boolean
      }
      verify_staff_pin: {
        Args: { pin_input: string; shop_uuid: string }
        Returns: {
          session_token: string
          shop_location: string
          shop_name: string
          staff_id: string
          staff_is_active: boolean
          staff_name: string
          staff_phone: string
          staff_role: Database["public"]["Enums"]["staff_role"]
          staff_shop_id: string
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin"
      cut_status: "pending" | "confirmed" | "disputed" | "cancelled"
      expense_category:
        | "supplies"
        | "utilities"
        | "rent"
        | "equipment"
        | "maintenance"
        | "other"
      payment_status: "pending" | "paid" | "partial"
      staff_role: "barber" | "cashier" | "cleaner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin"],
      cut_status: ["pending", "confirmed", "disputed", "cancelled"],
      expense_category: [
        "supplies",
        "utilities",
        "rent",
        "equipment",
        "maintenance",
        "other",
      ],
      payment_status: ["pending", "paid", "partial"],
      staff_role: ["barber", "cashier", "cleaner"],
    },
  },
} as const
