export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidate_documents: {
        Row: {
          candidate_id: string
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_name: string | null
          process_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          original_name?: string | null
          process_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          original_name?: string | null
          process_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_organization_id_candidate_id_fkey"
            columns: ["organization_id", "candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "candidate_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_documents_organization_id_process_id_fkey"
            columns: ["organization_id", "process_id"]
            isOneToOne: false
            referencedRelation: "recruitment_processes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      candidates: {
        Row: {
          address_complement: string | null
          address_number: string | null
          birth_date: string | null
          city: string | null
          cnh_category: string | null
          cnh_expires_at: string | null
          cnh_number: string | null
          cpf: string
          cpf_normalized: string
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          rg: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          cnh_category?: string | null
          cnh_expires_at?: string | null
          cnh_number?: string | null
          cpf: string
          cpf_normalized: string
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          cnh_category?: string | null
          cnh_expires_at?: string | null
          cnh_number?: string | null
          cpf?: string
          cpf_normalized?: string
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_history: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["process_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["process_status"] | null
          organization_id: string
          process_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["process_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["process_status"] | null
          organization_id: string
          process_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["process_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["process_status"] | null
          organization_id?: string
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_history_organization_id_process_id_fkey"
            columns: ["organization_id", "process_id"]
            isOneToOne: false
            referencedRelation: "recruitment_processes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_processes: {
        Row: {
          can_apply_again:
            | Database["public"]["Enums"]["reapplication_decision"]
            | null
          candidate_id: string
          created_at: string
          finished_at: string | null
          id: string
          organization_id: string
          responsible_user_id: string | null
          source: Database["public"]["Enums"]["candidate_source"] | null
          started_at: string
          status: Database["public"]["Enums"]["process_status"]
          updated_at: string
          vacancy_id: string | null
          withdrawal_notes: string | null
          withdrawal_reason_code:
            | Database["public"]["Enums"]["withdrawal_reason_code"]
            | null
        }
        Insert: {
          can_apply_again?:
            | Database["public"]["Enums"]["reapplication_decision"]
            | null
          candidate_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          organization_id: string
          responsible_user_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"] | null
          started_at?: string
          status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
          vacancy_id?: string | null
          withdrawal_notes?: string | null
          withdrawal_reason_code?:
            | Database["public"]["Enums"]["withdrawal_reason_code"]
            | null
        }
        Update: {
          can_apply_again?:
            | Database["public"]["Enums"]["reapplication_decision"]
            | null
          candidate_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          organization_id?: string
          responsible_user_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"] | null
          started_at?: string
          status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
          vacancy_id?: string | null
          withdrawal_notes?: string | null
          withdrawal_reason_code?:
            | Database["public"]["Enums"]["withdrawal_reason_code"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_processes_organization_id_candidate_id_fkey"
            columns: ["organization_id", "candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "recruitment_processes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_processes_organization_id_vacancy_id_fkey"
            columns: ["organization_id", "vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      vacancies: {
        Row: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          organization_id: string
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_for_current_user: {
        Args: { requested_name: string }
        Returns: {
          organization_id: string
          organization_name: string
          organization_slug: string
          organization_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "recruiter" | "viewer"
      candidate_source:
        | "linkedin"
        | "indeed"
        | "referral"
        | "whatsapp"
        | "talent_pool"
        | "other"
      document_status:
        | "pending"
        | "uploaded"
        | "in_review"
        | "approved"
        | "rejected"
        | "request_again"
      document_type:
        | "rg"
        | "cpf"
        | "cnh"
        | "proof_of_address"
        | "work_card"
        | "resume"
        | "certificate"
        | "other"
      process_status:
        | "new"
        | "screening"
        | "interview"
        | "evaluation"
        | "approved"
        | "documentation"
        | "admission"
        | "hired"
        | "rejected"
        | "withdrawn"
        | "talent_pool"
      reapplication_decision: "yes" | "no" | "review"
      withdrawal_reason_code:
        | "other_offer"
        | "salary"
        | "schedule"
        | "location"
        | "benefits"
        | "personal"
        | "no_response"
        | "no_reason_informed"
        | "other"
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
      app_role: ["admin", "recruiter", "viewer"],
      candidate_source: [
        "linkedin",
        "indeed",
        "referral",
        "whatsapp",
        "talent_pool",
        "other",
      ],
      document_status: [
        "pending",
        "uploaded",
        "in_review",
        "approved",
        "rejected",
        "request_again",
      ],
      document_type: [
        "rg",
        "cpf",
        "cnh",
        "proof_of_address",
        "work_card",
        "resume",
        "certificate",
        "other",
      ],
      process_status: [
        "new",
        "screening",
        "interview",
        "evaluation",
        "approved",
        "documentation",
        "admission",
        "hired",
        "rejected",
        "withdrawn",
        "talent_pool",
      ],
      reapplication_decision: ["yes", "no", "review"],
      withdrawal_reason_code: [
        "other_offer",
        "salary",
        "schedule",
        "location",
        "benefits",
        "personal",
        "no_response",
        "no_reason_informed",
        "other",
      ],
    },
  },
} as const
