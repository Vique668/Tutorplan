export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Supabase schema types synchronized with the SQL migrations in
 * supabase/migrations. Regenerate this file with `supabase gen types` after
 * the migrations are applied to a linked project.
 */
export type Database = {
  public: {
    Tables: {
      account_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          parent_id: string | null;
          role: string;
          student_id: string | null;
          token_hash: string;
          tutor_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          parent_id?: string | null;
          role: string;
          student_id?: string | null;
          token_hash: string;
          tutor_id?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          parent_id?: string | null;
          role?: string;
          student_id?: string | null;
          token_hash?: string;
          tutor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_invitations_parent_tenant_fk";
            columns: ["parent_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "account_invitations_student_tenant_fk";
            columns: ["student_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "account_invitations_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_transactions: {
        Row: {
          amount: number;
          category: string | null;
          created_at: string;
          description: string | null;
          group_id: string | null;
          id: string;
          lesson_id: string | null;
          payment_method: string | null;
          status: string;
          student_id: string | null;
          transaction_date: string;
          tutor_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          group_id?: string | null;
          id?: string;
          lesson_id?: string | null;
          payment_method?: string | null;
          status?: string;
          student_id?: string | null;
          transaction_date?: string;
          tutor_id?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          group_id?: string | null;
          id?: string;
          lesson_id?: string | null;
          payment_method?: string | null;
          status?: string;
          student_id?: string | null;
          transaction_date?: string;
          tutor_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_group_tenant_fk";
            columns: ["group_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "finance_lesson_tenant_fk";
            columns: ["lesson_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "finance_student_tenant_fk";
            columns: ["student_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "finance_transactions_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      group_students: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_students_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          id: string;
          lesson_duration: number;
          lesson_price: number;
          name: string;
          notes: string | null;
          status: string;
          subject: string | null;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_duration?: number;
          lesson_price?: number;
          name: string;
          notes?: string | null;
          status?: string;
          subject?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_duration?: number;
          lesson_price?: number;
          name?: string;
          notes?: string | null;
          status?: string;
          subject?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_series: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          duration: number;
          end_date: string | null;
          end_time: string | null;
          group_id: string | null;
          id: string;
          is_active: boolean;
          price: number;
          start_date: string;
          start_time: string;
          student_id: string | null;
          tutor_id: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          duration: number;
          end_date?: string | null;
          end_time?: string | null;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          price?: number;
          start_date: string;
          start_time: string;
          student_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          duration?: number;
          end_date?: string | null;
          end_time?: string | null;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          price?: number;
          start_date?: string;
          start_time?: string;
          student_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_series_group_tenant_fk";
            columns: ["group_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "lesson_series_student_tenant_fk";
            columns: ["student_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "lesson_series_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string;
          end_at: string;
          group_id: string | null;
          id: string;
          lesson_series_id: string | null;
          notes: string | null;
          price: number;
          series_occurrence_date: string | null;
          start_at: string;
          status: string;
          student_id: string | null;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_at: string;
          group_id?: string | null;
          id?: string;
          lesson_series_id?: string | null;
          notes?: string | null;
          price?: number;
          series_occurrence_date?: string | null;
          start_at: string;
          status?: string;
          student_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_at?: string;
          group_id?: string | null;
          id?: string;
          lesson_series_id?: string | null;
          notes?: string | null;
          price?: number;
          series_occurrence_date?: string | null;
          start_at?: string;
          status?: string;
          student_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_group_tenant_fk";
            columns: ["group_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "lessons_series_tenant_fk";
            columns: ["lesson_series_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "lesson_series";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "lessons_student_tenant_fk";
            columns: ["student_id", "tutor_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "tutor_id"];
          },
          {
            foreignKeyName: "lessons_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      other_events: {
        Row: {
          created_at: string;
          end_time: string;
          event_date: string;
          id: string;
          notes: string | null;
          start_time: string;
          title: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          event_date: string;
          id?: string;
          notes?: string | null;
          start_time: string;
          title: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          event_date?: string;
          id?: string;
          notes?: string | null;
          start_time?: string;
          title?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "other_events_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_students: {
        Row: {
          created_at: string;
          id: string;
          parent_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parent_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          parent_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      parents: {
        Row: {
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string | null;
          phone: string | null;
          profile_id: string | null;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parents_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parents_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          description: string | null;
          first_name: string;
          id: string;
          last_name: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          first_name?: string;
          id: string;
          last_name?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          address: string | null;
          created_at: string;
          date_of_birth: string | null;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string;
          lesson_duration: number;
          lesson_price: number;
          notes: string | null;
          phone: string | null;
          profile_id: string | null;
          status: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          lesson_duration?: number;
          lesson_price?: number;
          notes?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          status?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          lesson_duration?: number;
          lesson_price?: number;
          notes?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          status?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_at: string | null;
          id: string;
          priority: string;
          title: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: string;
          title: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: string;
          title?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_settings: {
        Row: {
          appearance_mode: string;
          created_at: string;
          currency: string;
          default_lesson_duration: number;
          default_lesson_price: number | null;
          lesson_reminders_enabled: boolean;
          monthly_income_goal: number | null;
          payment_instructions: string | null;
          preferred_payment_method: string | null;
          reminder_minutes_before: number;
          timezone: string;
          tutor_id: string;
          updated_at: string;
          working_day_end: string;
          working_day_start: string;
          working_weekdays: number[];
        };
        Insert: {
          appearance_mode?: string;
          created_at?: string;
          currency?: string;
          default_lesson_duration?: number;
          default_lesson_price?: number | null;
          lesson_reminders_enabled?: boolean;
          monthly_income_goal?: number | null;
          payment_instructions?: string | null;
          preferred_payment_method?: string | null;
          reminder_minutes_before?: number;
          timezone?: string;
          tutor_id: string;
          updated_at?: string;
          working_day_end?: string;
          working_day_start?: string;
          working_weekdays?: number[];
        };
        Update: {
          appearance_mode?: string;
          created_at?: string;
          currency?: string;
          default_lesson_duration?: number;
          default_lesson_price?: number | null;
          lesson_reminders_enabled?: boolean;
          monthly_income_goal?: number | null;
          payment_instructions?: string | null;
          preferred_payment_method?: string | null;
          reminder_minutes_before?: number;
          timezone?: string;
          tutor_id?: string;
          updated_at?: string;
          working_day_end?: string;
          working_day_start?: string;
          working_weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "tutor_settings_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: true;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutors: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_tutor_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      delete_student: {
        Args: { p_student_id: string };
        Returns: string;
      };
      delete_lesson_series: {
        Args: { p_series_id: string };
        Returns: number;
      };
      generate_active_lesson_series_range: {
        Args: { p_from_date: string; p_to_date: string };
        Returns: undefined;
      };
      generate_lesson_series_range: {
        Args: { p_from_date: string; p_series_id: string; p_to_date: string };
        Returns: undefined;
      };
      mark_lesson_no_show: {
        Args: { p_charge: boolean; p_lesson_id: string };
        Returns: Database["public"]["Tables"]["lessons"]["Row"];
      };
      save_group_with_members: {
        Args: {
          p_group_id: string | null;
          p_lesson_duration: number;
          p_lesson_price: number;
          p_name: string;
          p_notes: string | null;
          p_student_ids: string[];
          p_subject: string | null;
        };
        Returns: string;
      };
      save_student_with_parent: {
        Args: {
          p_address: string | null;
          p_date_of_birth: string | null;
          p_email: string | null;
          p_first_name: string;
          p_last_name: string;
          p_lesson_duration: number;
          p_lesson_price: number;
          p_notes: string | null;
          p_parent_email: string | null;
          p_parent_first_name: string | null;
          p_parent_last_name: string | null;
          p_parent_phone: string | null;
          p_phone: string | null;
          p_student_id: string | null;
        };
        Returns: string;
      };
      soft_delete_student: {
        Args: { p_student_id: string };
        Returns: string;
      };
      sync_lesson_series_future: {
        Args: { p_from_date: string; p_series_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName] extends { Insert: infer I } ? I : never;

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName] extends { Update: infer U } ? U : never;
