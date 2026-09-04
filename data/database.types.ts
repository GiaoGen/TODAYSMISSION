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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      mission_completions: {
        Row: {
          completed_at: string
          completed_local_date: string
          mission_id: string
          proof_path: string | null
          proof_text: string | null
          proof_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_local_date: string
          mission_id: string
          proof_path?: string | null
          proof_text?: string | null
          proof_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completed_local_date?: string
          mission_id?: string
          proof_path?: string | null
          proof_text?: string | null
          proof_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_voices: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          mission_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          mission_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          mission_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_voices_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          artwork_key: string
          code: string
          created_at: string
          id: string
          is_published: boolean
          note: string
          pack_id: string
          slug: string
          sort_order: number
          tag: string
          theme_key: string
          title: string
          updated_at: string
        }
        Insert: {
          artwork_key: string
          code: string
          created_at?: string
          id?: string
          is_published?: boolean
          note: string
          pack_id: string
          slug: string
          sort_order: number
          tag: string
          theme_key: string
          title: string
          updated_at?: string
        }
        Update: {
          artwork_key?: string
          code?: string
          created_at?: string
          id?: string
          is_published?: boolean
          note?: string
          pack_id?: string
          slug?: string
          sort_order?: number
          tag?: string
          theme_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_memberships: {
        Row: {
          active_mission_id: string | null
          joined_at: string
          pack_id: string
          user_id: string
        }
        Insert: {
          active_mission_id?: string | null
          joined_at?: string
          pack_id: string
          user_id: string
        }
        Update: {
          active_mission_id?: string | null
          joined_at?: string
          pack_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_memberships_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          created_at: string
          description: string
          design_key: string
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          theme_key: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          design_key: string
          id?: string
          is_published?: boolean
          slug: string
          sort_order: number
          theme_key: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          design_key?: string
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          theme_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      take_mission: {
        Args: {
          p_mission_id: string
          p_pack_id: string
        }
        Returns: {
          active_mission_id: string
          status: string
        }[]
      }
      complete_mission_with_audio: {
        Args: {
          p_completed_local_date: string
          p_mission_id: string
          p_proof_path: string
        }
        Returns: {
          completed_at: string
          completed_local_date: string
          status: string
        }[]
      }
      complete_mission_with_text: {
        Args: {
          p_completed_local_date: string
          p_mission_id: string
          p_proof_text: string
        }
        Returns: {
          completed_at: string
          completed_local_date: string
          status: string
        }[]
      }
      get_my_mission_voice_statuses: {
        Args: { p_mission_ids: string[] }
        Returns: {
          mission_id: string
        }[]
      }
      submit_mission_voice: {
        Args: { p_mission_id: string; p_storage_path: string }
        Returns: {
          status: string
          voice_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
