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
      families: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          invite_code: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          family_id: string
          id: string
          invitee_email: string | null
          invitee_phone: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["family_member_role"]
          status: Database["public"]["Enums"]["invitation_status"] | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at: string
          family_id: string
          id?: string
          invitee_email?: string | null
          invitee_phone?: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["family_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          family_id?: string
          id?: string
          invitee_email?: string | null
          invitee_phone?: string | null
          inviter_id?: string
          role?: Database["public"]["Enums"]["family_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          family_id: string
          full_name: string | null
          id: string
          inviter_id: string
          is_active: boolean | null
          joined_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["family_member_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id: string
          full_name?: string | null
          id?: string
          inviter_id: string
          is_active?: boolean | null
          joined_at?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["family_member_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          family_id?: string
          full_name?: string | null
          id?: string
          inviter_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["family_member_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          share_email: boolean | null
          share_phone: boolean | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          share_email?: boolean | null
          share_phone?: boolean | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          share_email?: boolean | null
          share_phone?: boolean | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          subscription_tier: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          subscription_tier: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          subscription_tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          shared_with: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          shared_with?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          shared_with?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      family_invitations_safe: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          family_id: string | null
          id: string | null
          invitee_email: string | null
          invitee_phone: string | null
          inviter_id: string | null
          role: Database["public"]["Enums"]["family_member_role"] | null
          status: Database["public"]["Enums"]["invitation_status"] | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          family_id?: string | null
          id?: string | null
          invitee_email?: string | null
          invitee_phone?: string | null
          inviter_id?: string | null
          role?: Database["public"]["Enums"]["family_member_role"] | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          family_id?: string | null
          id?: string | null
          invitee_email?: string | null
          invitee_phone?: string | null
          inviter_id?: string | null
          role?: Database["public"]["Enums"]["family_member_role"] | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members_safe: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          family_id: string | null
          id: string | null
          inviter_id: string | null
          is_active: boolean | null
          joined_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["family_member_role"] | null
          share_email: boolean | null
          share_phone: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      accept_family_invitation: {
        Args: { _accepting_user_id: string; _invitation_token: string }
        Returns: Json
      }
      generate_family_invite_code: { Args: never; Returns: string }
      join_family_with_code: {
        Args: { _invite_code: string; _user_id: string }
        Returns: Json
      }
      user_belongs_to_family: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      family_member_role:
        | "parent"
        | "child"
        | "grandparent"
        | "caretaker"
        | "other"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
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
      family_member_role: [
        "parent",
        "child",
        "grandparent",
        "caretaker",
        "other",
      ],
      invitation_status: ["pending", "accepted", "declined", "expired"],
    },
  },
} as const
