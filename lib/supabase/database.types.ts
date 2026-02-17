export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      founder_profiles: {
        Row: {
          budget: string | null;
          created_at: string;
          domain_expertise: string[];
          id: string;
          key_skills: string[];
          time_commitment: string | null;
          updated_at: string;
          user_id: string;
          years_experience: string | null;
        };
        Insert: {
          budget?: string | null;
          created_at?: string;
          domain_expertise?: string[];
          id?: string;
          key_skills?: string[];
          time_commitment?: string | null;
          updated_at?: string;
          user_id: string;
          years_experience?: string | null;
        };
        Update: {
          budget?: string | null;
          created_at?: string;
          domain_expertise?: string[];
          id?: string;
          key_skills?: string[];
          time_commitment?: string | null;
          updated_at?: string;
          user_id?: string;
          years_experience?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "founder_profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      signals: {
        Row: {
          competitors: Json;
          created_at: string;
          data: Json;
          demand_score: number | null;
          id: string;
          pain_quotes: Json;
          source: "reddit" | "hn" | "ph" | "twitter" | "trends" | "appstore" | "g2";
          validation_id: string;
        };
        Insert: {
          competitors?: Json;
          created_at?: string;
          data?: Json;
          demand_score?: number | null;
          id?: string;
          pain_quotes?: Json;
          source: "reddit" | "hn" | "ph" | "twitter" | "trends" | "appstore" | "g2";
          validation_id: string;
        };
        Update: {
          competitors?: Json;
          created_at?: string;
          data?: Json;
          demand_score?: number | null;
          id?: string;
          pain_quotes?: Json;
          source?: "reddit" | "hn" | "ph" | "twitter" | "trends" | "appstore" | "g2";
          validation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signals_validation_id_fkey";
            columns: ["validation_id"];
            referencedRelation: "validations";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          stripe_customer_id: string | null;
          tier: "free" | "pro" | "agency";
          validations_used_this_month: number;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          name?: string | null;
          stripe_customer_id?: string | null;
          tier?: "free" | "pro" | "agency";
          validations_used_this_month?: number;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          stripe_customer_id?: string | null;
          tier?: "free" | "pro" | "agency";
          validations_used_this_month?: number;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      validations: {
        Row: {
          created_at: string;
          founder_fit_score: number | null;
          id: string;
          idea_text: string;
          industry: string | null;
          report_url: string | null;
          signal_score: number | null;
          stage: "pre-idea" | "mvp" | "launched";
          status: "processing" | "completed" | "failed";
          updated_at: string;
          user_id: string;
          verdict: "BUILD" | "PIVOT" | "PASS" | null;
        };
        Insert: {
          created_at?: string;
          founder_fit_score?: number | null;
          id?: string;
          idea_text: string;
          industry?: string | null;
          report_url?: string | null;
          signal_score?: number | null;
          stage?: "pre-idea" | "mvp" | "launched";
          status?: "processing" | "completed" | "failed";
          updated_at?: string;
          user_id: string;
          verdict?: "BUILD" | "PIVOT" | "PASS" | null;
        };
        Update: {
          created_at?: string;
          founder_fit_score?: number | null;
          id?: string;
          idea_text?: string;
          industry?: string | null;
          report_url?: string | null;
          signal_score?: number | null;
          stage?: "pre-idea" | "mvp" | "launched";
          status?: "processing" | "completed" | "failed";
          updated_at?: string;
          user_id?: string;
          verdict?: "BUILD" | "PIVOT" | "PASS" | null;
        };
        Relationships: [
          {
            foreignKeyName: "validations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type PublicSchema = Database["public"];
export type TableName = keyof PublicSchema["Tables"];
export type TableRow<T extends TableName> = PublicSchema["Tables"][T]["Row"];
export type TableInsert<T extends TableName> = PublicSchema["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> = PublicSchema["Tables"][T]["Update"];
