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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alcateia_news: {
        Row: {
          actor_id: string | null
          color: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          icon: string | null
          id: string
          image_url: string | null
          metadata: Json
          title: string
        }
        Insert: {
          actor_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          icon?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          title: string
        }
        Update: {
          actor_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          title?: string
        }
        Relationships: []
      }
      alcateia_news_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          news_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          news_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          news_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alcateia_news_comments_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "alcateia_news"
            referencedColumns: ["id"]
          },
        ]
      }
      alcateia_news_likes: {
        Row: {
          created_at: string
          id: string
          news_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          news_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          news_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alcateia_news_likes_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "alcateia_news"
            referencedColumns: ["id"]
          },
        ]
      }
      bolao_bets: {
        Row: {
          amount: number
          created_at: string
          guess_a: number
          guess_b: number
          id: string
          match_id: string
          paid: boolean
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          guess_a: number
          guess_b: number
          id?: string
          match_id: string
          paid?: boolean
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          guess_a?: number
          guess_b?: number
          id?: string
          match_id?: string
          paid?: boolean
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bolao_bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "bolao_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      bolao_matches: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          kickoff_at: string
          phase: string
          score_a: number | null
          score_b: number | null
          status: string
          team_a: string
          team_a_flag: string | null
          team_b: string
          team_b_flag: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          kickoff_at: string
          phase?: string
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a: string
          team_a_flag?: string | null
          team_b: string
          team_b_flag?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          kickoff_at?: string
          phase?: string
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a?: string
          team_a_flag?: string | null
          team_b?: string
          team_b_flag?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      briefings: {
        Row: {
          allow_edit: boolean
          client_id: string | null
          contact_name: string | null
          created_at: string
          dados: Json
          email: string | null
          id: string
          internal_notes: string | null
          office_name: string | null
          status: string
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          allow_edit?: boolean
          client_id?: string | null
          contact_name?: string | null
          created_at?: string
          dados?: Json
          email?: string | null
          id?: string
          internal_notes?: string | null
          office_name?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          allow_edit?: boolean
          client_id?: string | null
          contact_name?: string | null
          created_at?: string
          dados?: Json
          email?: string | null
          id?: string
          internal_notes?: string | null
          office_name?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_agents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          display_order: number
          external_url: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          external_url: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          external_url?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_glossary_terms: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          definition: string
          examples: string | null
          id: string
          term: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          definition: string
          examples?: string | null
          id?: string
          term: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          definition?: string
          examples?: string | null
          id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_glossary_terms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_learning_items: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number | null
          id: string
          title: string
          track_id: string
          updated_at: string
          url: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          title: string
          track_id: string
          updated_at?: string
          url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          title?: string
          track_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_learning_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "client_learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_learning_tracks: {
        Row: {
          category: string | null
          client_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_learning_tracks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_registrations: {
        Row: {
          address: string | null
          address_number: string | null
          city: string | null
          cnpj: string
          contact_cpf: string | null
          contact_name: string
          contact_role: string | null
          correction_fields: Json | null
          correction_note: string | null
          created_at: string
          created_user_id: string | null
          email: string
          employees_count: number | null
          financial_responsible: string | null
          founded_at: string | null
          id: string
          instagram: string | null
          internal_notes: string | null
          invite_id: string | null
          legal_name: string
          monthly_revenue: number | null
          neighborhood: string | null
          phone: string | null
          rejection_reason: string | null
          segment: string | null
          state: string | null
          status: string
          submitted_at: string
          submitted_ip: string | null
          trade_name: string
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          city?: string | null
          cnpj: string
          contact_cpf?: string | null
          contact_name: string
          contact_role?: string | null
          correction_fields?: Json | null
          correction_note?: string | null
          created_at?: string
          created_user_id?: string | null
          email: string
          employees_count?: number | null
          financial_responsible?: string | null
          founded_at?: string | null
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          invite_id?: string | null
          legal_name: string
          monthly_revenue?: number | null
          neighborhood?: string | null
          phone?: string | null
          rejection_reason?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          submitted_at?: string
          submitted_ip?: string | null
          trade_name: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          city?: string | null
          cnpj?: string
          contact_cpf?: string | null
          contact_name?: string
          contact_role?: string | null
          correction_fields?: Json | null
          correction_note?: string | null
          created_at?: string
          created_user_id?: string | null
          email?: string
          employees_count?: number | null
          financial_responsible?: string | null
          founded_at?: string | null
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          invite_id?: string | null
          legal_name?: string
          monthly_revenue?: number | null
          neighborhood?: string | null
          phone?: string | null
          rejection_reason?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          submitted_at?: string
          submitted_ip?: string | null
          trade_name?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_registrations_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "onboarding_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_strategic_goals: {
        Row: {
          category: string
          client_id: string
          created_at: string
          current_value: number
          description: string | null
          display_order: number
          id: string
          metric: string | null
          period_end: string | null
          period_start: string | null
          status: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          current_value?: number
          description?: string | null
          display_order?: number
          id?: string
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          current_value?: number
          description?: string | null
          display_order?: number
          id?: string
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_strategic_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birthday: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          is_ongoing: boolean
          manager_id: string | null
          manager_name: string | null
          name: string
          observations: string | null
          phone: string | null
          responsible_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_ongoing?: boolean
          manager_id?: string | null
          manager_name?: string | null
          name: string
          observations?: string | null
          phone?: string | null
          responsible_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_ongoing?: boolean
          manager_id?: string | null
          manager_name?: string | null
          name?: string
          observations?: string | null
          phone?: string | null
          responsible_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_invites: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          note: string | null
          role: string
          token: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          max_uses?: number
          note?: string | null
          role?: string
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number
          note?: string | null
          role?: string
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          access_level: Database["public"]["Enums"]["collaborator_access_level"]
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          birth_date: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          contract_type:
            | Database["public"]["Enums"]["collaborator_contract_type"]
            | null
          cpf: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          financial_notes: string | null
          full_name: string
          hourly_value: number | null
          id: string
          job_title: string | null
          linked_client_ids: string[]
          linked_project_ids: string[]
          manager_id: string | null
          monthly_value: number | null
          payment_day: number | null
          payment_type: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          profile_id: string | null
          rg: string | null
          role_function: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["collaborator_status"]
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["collaborator_access_level"]
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          contract_type?:
            | Database["public"]["Enums"]["collaborator_contract_type"]
            | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          financial_notes?: string | null
          full_name: string
          hourly_value?: number | null
          id?: string
          job_title?: string | null
          linked_client_ids?: string[]
          linked_project_ids?: string[]
          manager_id?: string | null
          monthly_value?: number | null
          payment_day?: number | null
          payment_type?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string | null
          rg?: string | null
          role_function?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["collaborator_status"]
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["collaborator_access_level"]
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          contract_type?:
            | Database["public"]["Enums"]["collaborator_contract_type"]
            | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          financial_notes?: string | null
          full_name?: string
          hourly_value?: number | null
          id?: string
          job_title?: string | null
          linked_client_ids?: string[]
          linked_project_ids?: string[]
          manager_id?: string | null
          monthly_value?: number | null
          payment_day?: number | null
          payment_type?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string | null
          rg?: string | null
          role_function?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["collaborator_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_leads: {
        Row: {
          architecture_office_name: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          funnel_stage: Database["public"]["Enums"]["commercial_funnel_stage"]
          id: string
          instagram: string | null
          lead_level: Database["public"]["Enums"]["commercial_lead_level"]
          lead_name: string
          lost_at: string | null
          next_follow_up_date: string | null
          notes: string | null
          phone: string | null
          responsible_id: string | null
          source: string | null
          state: string | null
          updated_at: string
          website: string | null
          won_at: string | null
        }
        Insert: {
          architecture_office_name?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["commercial_funnel_stage"]
          id?: string
          instagram?: string | null
          lead_level?: Database["public"]["Enums"]["commercial_lead_level"]
          lead_name: string
          lost_at?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          responsible_id?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          won_at?: string | null
        }
        Update: {
          architecture_office_name?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["commercial_funnel_stage"]
          id?: string
          instagram?: string | null
          lead_level?: Database["public"]["Enums"]["commercial_lead_level"]
          lead_name?: string
          lost_at?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          responsible_id?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          won_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string | null
          commercial_data: Json
          contractor_snapshot: Json | null
          created_at: string
          download_enabled: boolean | null
          end_date: string | null
          external_link: string | null
          file_path: string | null
          id: string
          internal_notes: string | null
          monthly_value: number | null
          name: string
          payment_day: number | null
          payment_method: string | null
          product: string | null
          project_id: string | null
          registration_id: string | null
          segment: string | null
          seller_id: string | null
          sent_at: string | null
          signature_status: string
          signature_token: string | null
          signed_at: string | null
          signed_by_cpf: string | null
          signed_by_name: string | null
          signed_html: string | null
          signed_ip: string | null
          start_date: string | null
          status: string | null
          term_months: number | null
          total_value: number | null
          updated_at: string
          version: number
          visible_to_client: boolean | null
        }
        Insert: {
          client_id?: string | null
          commercial_data?: Json
          contractor_snapshot?: Json | null
          created_at?: string
          download_enabled?: boolean | null
          end_date?: string | null
          external_link?: string | null
          file_path?: string | null
          id?: string
          internal_notes?: string | null
          monthly_value?: number | null
          name: string
          payment_day?: number | null
          payment_method?: string | null
          product?: string | null
          project_id?: string | null
          registration_id?: string | null
          segment?: string | null
          seller_id?: string | null
          sent_at?: string | null
          signature_status?: string
          signature_token?: string | null
          signed_at?: string | null
          signed_by_cpf?: string | null
          signed_by_name?: string | null
          signed_html?: string | null
          signed_ip?: string | null
          start_date?: string | null
          status?: string | null
          term_months?: number | null
          total_value?: number | null
          updated_at?: string
          version?: number
          visible_to_client?: boolean | null
        }
        Update: {
          client_id?: string | null
          commercial_data?: Json
          contractor_snapshot?: Json | null
          created_at?: string
          download_enabled?: boolean | null
          end_date?: string | null
          external_link?: string | null
          file_path?: string | null
          id?: string
          internal_notes?: string | null
          monthly_value?: number | null
          name?: string
          payment_day?: number | null
          payment_method?: string | null
          product?: string | null
          project_id?: string | null
          registration_id?: string | null
          segment?: string | null
          seller_id?: string | null
          sent_at?: string | null
          signature_status?: string
          signature_token?: string | null
          signed_at?: string | null
          signed_by_cpf?: string | null
          signed_by_name?: string | null
          signed_html?: string | null
          signed_ip?: string | null
          start_date?: string | null
          status?: string | null
          term_months?: number | null
          total_value?: number | null
          updated_at?: string
          version?: number
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "client_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          actual_date: string | null
          client_id: string
          created_at: string
          download_enabled: boolean | null
          file_path: string | null
          forecast_date: string | null
          id: string
          link: string | null
          name: string
          project_id: string
          status: string | null
          type: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          actual_date?: string | null
          client_id: string
          created_at?: string
          download_enabled?: boolean | null
          file_path?: string | null
          forecast_date?: string | null
          id?: string
          link?: string | null
          name: string
          project_id: string
          status?: string | null
          type?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          actual_date?: string | null
          client_id?: string
          created_at?: string
          download_enabled?: boolean | null
          file_path?: string | null
          forecast_date?: string | null
          id?: string
          link?: string | null
          name?: string
          project_id?: string
          status?: string | null
          type?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          download_enabled: boolean | null
          external_link: string | null
          file_path: string | null
          file_size: string | null
          file_type: string | null
          id: string
          is_contract: boolean | null
          name: string
          owner_id: string | null
          project_id: string | null
          version: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          download_enabled?: boolean | null
          external_link?: string | null
          file_path?: string | null
          file_size?: string | null
          file_type?: string | null
          id?: string
          is_contract?: boolean | null
          name: string
          owner_id?: string | null
          project_id?: string | null
          version?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          download_enabled?: boolean | null
          external_link?: string | null
          file_path?: string | null
          file_size?: string | null
          file_type?: string | null
          id?: string
          is_contract?: boolean | null
          name?: string
          owner_id?: string | null
          project_id?: string | null
          version?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_type: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_client_view"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_habit_awards: {
        Row: {
          awarded_at: string
          habit_id: string
          points: number
          user_id: string
        }
        Insert: {
          awarded_at?: string
          habit_id: string
          points: number
          user_id: string
        }
        Update: {
          awarded_at?: string
          habit_id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_habit_awards_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "gamification_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_habit_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          habit_id: string
          id: string
          note: string | null
          proof_url: string
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          habit_id: string
          id?: string
          note?: string | null
          proof_url?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          proof_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_habit_checkins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "gamification_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_habit_followers: {
        Row: {
          habit_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          habit_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          habit_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_habit_followers_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "gamification_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_habits: {
        Row: {
          category: string
          created_at: string
          description: string | null
          end_date: string
          frequency: string
          id: string
          points_awarded: boolean
          points_weight: number
          start_date: string
          status: string
          target_checkins: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          end_date: string
          frequency?: string
          id?: string
          points_awarded?: boolean
          points_weight?: number
          start_date?: string
          status?: string
          target_checkins?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          end_date?: string
          frequency?: string
          id?: string
          points_awarded?: boolean
          points_weight?: number
          start_date?: string
          status?: string
          target_checkins?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_leader_stars: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          bonus_stars: number
          category: Database["public"]["Enums"]["gam_leader_category"]
          created_at: string
          id: string
          internal_note: string | null
          public_message: string | null
          rarity: Database["public"]["Enums"]["gam_rarity"]
          reason: string
          related_pin_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          bonus_stars?: number
          category: Database["public"]["Enums"]["gam_leader_category"]
          created_at?: string
          id?: string
          internal_note?: string | null
          public_message?: string | null
          rarity?: Database["public"]["Enums"]["gam_rarity"]
          reason: string
          related_pin_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          bonus_stars?: number
          category?: Database["public"]["Enums"]["gam_leader_category"]
          created_at?: string
          id?: string
          internal_note?: string | null
          public_message?: string | null
          rarity?: Database["public"]["Enums"]["gam_rarity"]
          reason?: string
          related_pin_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_leader_stars_related_pin_id_fkey"
            columns: ["related_pin_id"]
            isOneToOne: false
            referencedRelation: "gamification_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_mission_subtasks: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          mission_id: string
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          mission_id: string
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          mission_id?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_mission_subtasks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "gamification_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_missions: {
        Row: {
          category: string | null
          created_at: string
          criteria: string | null
          deadline: string | null
          description: string | null
          id: string
          name: string
          stars_reward: number
          status: Database["public"]["Enums"]["gam_mission_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          criteria?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          stars_reward?: number
          status?: Database["public"]["Enums"]["gam_mission_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          criteria?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          stars_reward?: number
          status?: Database["public"]["Enums"]["gam_mission_status"]
          updated_at?: string
        }
        Relationships: []
      }
      gamification_pins: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          rarity: Database["public"]["Enums"]["gam_rarity"]
          stars_required: number | null
          unlock_criteria: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          rarity?: Database["public"]["Enums"]["gam_rarity"]
          stars_required?: number | null
          unlock_criteria?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          rarity?: Database["public"]["Enums"]["gam_rarity"]
          stars_required?: number | null
          unlock_criteria?: string | null
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          awarded_by: string | null
          created_at: string
          id: string
          points_amount: number
          reason: string
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          points_amount: number
          reason: string
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          points_amount?: number
          reason?: string
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gamification_profiles: {
        Row: {
          created_at: string
          current_level: string
          id: string
          leader_stars_count: number
          ranking_position: number | null
          total_stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: string
          id?: string
          leader_stars_count?: number
          ranking_position?: number | null
          total_stars?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: string
          id?: string
          leader_stars_count?: number
          ranking_position?: number | null
          total_stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_reward_redemptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          requested_at: string
          reward_id: string
          stars_cost: number
          status: Database["public"]["Enums"]["gam_redemption_status"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          reward_id: string
          stars_cost: number
          status?: Database["public"]["Enums"]["gam_redemption_status"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          reward_id?: string
          stars_cost?: number
          status?: Database["public"]["Enums"]["gam_redemption_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "gamification_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_rewards: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          name: string
          rarity: string
          reference_value_cents: number | null
          reward_type: string | null
          stars_cost: number
          stock: number | null
          unlock_threshold_stars: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name: string
          rarity?: string
          reference_value_cents?: number | null
          reward_type?: string | null
          stars_cost: number
          stock?: number | null
          unlock_threshold_stars?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name?: string
          rarity?: string
          reference_value_cents?: number | null
          reward_type?: string | null
          stars_cost?: number
          stock?: number | null
          unlock_threshold_stars?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      gamification_user_missions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          mission_id: string
          stars_awarded: number
          status: Database["public"]["Enums"]["gam_user_mission_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id: string
          stars_awarded?: number
          status?: Database["public"]["Enums"]["gam_user_mission_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          stars_awarded?: number
          status?: Database["public"]["Enums"]["gam_user_mission_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "gamification_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_user_pins: {
        Row: {
          id: string
          pin_id: string
          source_id: string | null
          source_type: string | null
          unlocked_at: string
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          pin_id: string
          source_id?: string | null
          source_type?: string | null
          unlocked_at?: string
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          pin_id?: string
          source_id?: string | null
          source_type?: string | null
          unlocked_at?: string
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_user_pins_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "gamification_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          category: string
          created_at: string
          definition: string
          display_order: number
          example: string | null
          id: string
          term: string
        }
        Insert: {
          category: string
          created_at?: string
          definition: string
          display_order?: number
          example?: string | null
          id?: string
          term: string
        }
        Update: {
          category?: string
          created_at?: string
          definition?: string
          display_order?: number
          example?: string | null
          id?: string
          term?: string
        }
        Relationships: []
      }
      info_folders: {
        Row: {
          allowed_roles: string[]
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "info_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      info_items: {
        Row: {
          allowed_roles: string[]
          client_id: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          item_type: string
          link_url: string | null
          owner_id: string | null
          project_id: string | null
          status: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          client_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          item_type?: string
          link_url?: string | null
          owner_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          client_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          item_type?: string
          link_url?: string | null
          owner_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "info_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          events: string[]
          id: string
          name: string
          secret: string | null
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          name: string
          secret?: string | null
          type?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          name?: string
          secret?: string | null
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      intelligent_central: {
        Row: {
          audience: string
          audience_user_ids: string[]
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_favorite: boolean
          link_url: string
          name: string
          released_to_client: boolean
          status: string
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          audience?: string
          audience_user_ids?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean
          link_url: string
          name: string
          released_to_client?: boolean
          status?: string
          type: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          audience?: string
          audience_user_ids?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean
          link_url?: string
          name?: string
          released_to_client?: boolean
          status?: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      knowledge_trail_items: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_lessons: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          reading_minutes: number
          slides: Json | null
          subtitle: string | null
          title: string
          track_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          reading_minutes?: number
          slides?: Json | null
          subtitle?: string | null
          title: string
          track_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          reading_minutes?: number
          slides?: Json | null
          subtitle?: string | null
          title?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_lessons_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "learning_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_tracks: {
        Row: {
          accent: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_published: boolean
          subtitle: string | null
          title: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_published?: boolean
          subtitle?: string | null
          title: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_published?: boolean
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      meeting_minute_revisions: {
        Row: {
          changes: Json
          edited_at: string
          edited_by: string | null
          edited_by_name: string | null
          id: string
          minute_id: string
        }
        Insert: {
          changes?: Json
          edited_at?: string
          edited_by?: string | null
          edited_by_name?: string | null
          id?: string
          minute_id: string
        }
        Update: {
          changes?: Json
          edited_at?: string
          edited_by?: string | null
          edited_by_name?: string | null
          id?: string
          minute_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minute_revisions_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          agenda: string | null
          attendees: string[] | null
          client_id: string
          client_pending: string | null
          created_at: string
          decisions: string | null
          download_enabled: boolean | null
          external_link: string | null
          file_path: string | null
          id: string
          internal_responsible_id: string | null
          meeting_date: string
          next_steps: string | null
          project_id: string
          recording_link: string | null
          status: string
          team_pending: string | null
          title: string
          visible_to_client: boolean | null
        }
        Insert: {
          agenda?: string | null
          attendees?: string[] | null
          client_id: string
          client_pending?: string | null
          created_at?: string
          decisions?: string | null
          download_enabled?: boolean | null
          external_link?: string | null
          file_path?: string | null
          id?: string
          internal_responsible_id?: string | null
          meeting_date: string
          next_steps?: string | null
          project_id: string
          recording_link?: string | null
          status?: string
          team_pending?: string | null
          title: string
          visible_to_client?: boolean | null
        }
        Update: {
          agenda?: string | null
          attendees?: string[] | null
          client_id?: string
          client_pending?: string | null
          created_at?: string
          decisions?: string | null
          download_enabled?: boolean | null
          external_link?: string | null
          file_path?: string | null
          id?: string
          internal_responsible_id?: string | null
          meeting_date?: string
          next_steps?: string | null
          project_id?: string
          recording_link?: string | null
          status?: string
          team_pending?: string | null
          title?: string
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_internal_responsible_id_fkey"
            columns: ["internal_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_invites: {
        Row: {
          company_hint: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          invalidated_at: string | null
          registration_id: string | null
          status: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          company_hint?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          registration_id?: string | null
          status?: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          company_hint?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          registration_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      op_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      op_form_answers: {
        Row: {
          created_at: string
          form_id: string
          id: string
          project_id: string | null
          values: Json
        }
        Insert: {
          created_at?: string
          form_id: string
          id: string
          project_id?: string | null
          values?: Json
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          project_id?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "op_form_answers_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "op_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      op_forms: {
        Row: {
          created_at: string
          fields: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      op_projects: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "op_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      op_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          position?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "op_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      op_senhas: {
        Row: {
          client_name: string
          created_at: string
          id: string
          notes: string | null
          password: string
          service: string
          updated_at: string
          username: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id: string
          notes?: string | null
          password: string
          service: string
          updated_at?: string
          username: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          password?: string
          service?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      op_tasks: {
        Row: {
          assignee_id: string | null
          checklist: Json
          comments: Json
          created_at: string
          due_date: string | null
          id: string
          name: string
          position: number
          priority: string
          recurrence: string | null
          section_id: string
          start_date: string | null
          status: string
          tags: Json
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          checklist?: Json
          comments?: Json
          created_at?: string
          due_date?: string | null
          id: string
          name: string
          position?: number
          priority?: string
          recurrence?: string | null
          section_id: string
          start_date?: string | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          checklist?: Json
          comments?: Json
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          position?: number
          priority?: string
          recurrence?: string | null
          section_id?: string
          start_date?: string | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "op_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      op_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pack_moods: {
        Row: {
          created_at: string
          id: string
          mood: string
          mood_date: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          mood_date?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          mood_date?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_entries: {
        Row: {
          category: string | null
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          password: string
          title: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          password: string
          title: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          password?: string
          title?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_entries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_checklist_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_checklist_items: {
        Row: {
          category_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          position: number
          priority: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          position?: number
          priority?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          position?: number
          priority?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_checklist_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "personal_checklist_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      process_pops: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          process_id: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          process_id: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          process_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_pops_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          approver: string | null
          created_at: string
          description: string | null
          id: string
          on_approval: string | null
          position: number
          process_id: string
          responsible: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approver?: string | null
          created_at?: string
          description?: string | null
          id?: string
          on_approval?: string | null
          position?: number
          process_id: string
          responsible?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approver?: string | null
          created_at?: string
          description?: string | null
          id?: string
          on_approval?: string | null
          position?: number
          process_id?: string
          responsible?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_key: string | null
          avatar_url: string | null
          client_id: string | null
          consultant_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          notification_prefs: Json
          phone: string | null
          role: string
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_key?: string | null
          avatar_url?: string | null
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          must_change_password?: boolean
          notification_prefs?: Json
          phone?: string | null
          role: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_key?: string | null
          avatar_url?: string | null
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          notification_prefs?: Json
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          approver: string | null
          color: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          responsible: string | null
          sort_order: number
          status: string | null
        }
        Insert: {
          approver?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          responsible?: string | null
          sort_order: number
          status?: string | null
        }
        Update: {
          approver?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          responsible?: string | null
          sort_order?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          consultant_id: string | null
          created_at: string
          current_stage_index: number | null
          deadline: string | null
          description: string | null
          id: string
          is_internal: boolean
          manager_name: string | null
          name: string
          priority: string | null
          progress: number | null
          start_date: string | null
          status: string | null
          tags: string[]
          team_size: number | null
          updated_at: string
          visible_to_client: boolean | null
        }
        Insert: {
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string
          current_stage_index?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_internal?: boolean
          manager_name?: string | null
          name: string
          priority?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          team_size?: number | null
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Update: {
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string
          current_stage_index?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_internal?: boolean
          manager_name?: string | null
          name?: string
          priority?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          team_size?: number | null
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_form_shares: {
        Row: {
          created_at: string
          created_by: string | null
          form: Json
          id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form: Json
          id?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form?: Json
          id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_form_submissions: {
        Row: {
          answers: Json
          created_at: string
          form_id: string | null
          form_name: string | null
          form_snapshot: Json
          id: string
          submitted_at: string
          token: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          form_id?: string | null
          form_name?: string | null
          form_snapshot: Json
          id?: string
          submitted_at?: string
          token: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string | null
          form_name?: string | null
          form_snapshot?: Json
          id?: string
          submitted_at?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_form_submissions_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "public_form_shares"
            referencedColumns: ["token"]
          },
        ]
      }
      registration_history: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          registration_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          registration_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_history_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "client_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_monthly_goals: {
        Row: {
          achievement_percentage: number | null
          created_at: string
          gap_amount: number | null
          id: string
          individual_goal_amount: number
          individual_result_amount: number
          month: number
          notes: string | null
          seller_id: string | null
          seller_name: string
          status: Database["public"]["Enums"]["goal_status"]
          strategic_goal_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          achievement_percentage?: number | null
          created_at?: string
          gap_amount?: number | null
          id?: string
          individual_goal_amount?: number
          individual_result_amount?: number
          month: number
          notes?: string | null
          seller_id?: string | null
          seller_name: string
          status?: Database["public"]["Enums"]["goal_status"]
          strategic_goal_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          achievement_percentage?: number | null
          created_at?: string
          gap_amount?: number | null
          id?: string
          individual_goal_amount?: number
          individual_result_amount?: number
          month?: number
          notes?: string | null
          seller_id?: string | null
          seller_name?: string
          status?: Database["public"]["Enums"]["goal_status"]
          strategic_goal_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_monthly_goals_strategic_goal_id_fkey"
            columns: ["strategic_goal_id"]
            isOneToOne: false
            referencedRelation: "strategic_sales_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      somus_agents: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          openai_assistant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          openai_assistant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          openai_assistant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      somus_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          last_message_at: string
          openai_thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          openai_thread_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          openai_thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "somus_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "somus_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      somus_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          openai_message_id: string | null
          openai_run_id: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          openai_message_id?: string | null
          openai_run_id?: string | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          openai_message_id?: string | null
          openai_run_id?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "somus_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "somus_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          stages: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      strategic_sales_goals: {
        Row: {
          achievement_percentage: number | null
          created_at: string
          gap_amount: number | null
          general_goal_amount: number
          general_result_amount: number
          id: string
          month: number
          notes: string | null
          responsible_id: string | null
          status: Database["public"]["Enums"]["goal_status"]
          updated_at: string
          year: number
        }
        Insert: {
          achievement_percentage?: number | null
          created_at?: string
          gap_amount?: number | null
          general_goal_amount?: number
          general_result_amount?: number
          id?: string
          month: number
          notes?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string
          year: number
        }
        Update: {
          achievement_percentage?: number | null
          created_at?: string
          gap_amount?: number | null
          general_goal_amount?: number
          general_result_amount?: number
          id?: string
          month?: number
          notes?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          assignee: string | null
          created_at: string
          deadline: string | null
          demand_type: string | null
          id: string
          priority: string | null
          sort_order: number
          status: string | null
          task_id: string
          title: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          deadline?: string | null
          demand_type?: string | null
          id?: string
          priority?: string | null
          sort_order: number
          status?: string | null
          task_id: string
          title: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          deadline?: string | null
          demand_type?: string | null
          id?: string
          priority?: string | null
          sort_order?: number
          status?: string | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assignee: string
          created_at: string
          task_id: string
        }
        Insert: {
          assignee: string
          created_at?: string
          task_id: string
        }
        Update: {
          assignee?: string
          created_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          position: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_projects: {
        Row: {
          created_at: string
          project_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_projects_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          is_manual: boolean
          note: string | null
          started_at: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          is_manual?: boolean
          note?: string | null
          started_at?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          is_manual?: boolean
          note?: string | null
          started_at?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          client_id: string | null
          created_at: string
          deadline: string | null
          delay_reason: string | null
          demand_type: string | null
          description: string | null
          id: string
          priority: string | null
          project_id: string | null
          recurrence: string | null
          requested_by: string | null
          requires_approval: boolean
          stage_id: string | null
          start_date: string | null
          status: string | null
          tags: string[]
          time_invested_seconds: number
          title: string
          updated_at: string
          visible_to_client: boolean | null
        }
        Insert: {
          assignee?: string | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          delay_reason?: string | null
          demand_type?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          recurrence?: string | null
          requested_by?: string | null
          requires_approval?: boolean
          stage_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          time_invested_seconds?: number
          title: string
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Update: {
          assignee?: string | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          delay_reason?: string | null
          demand_type?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          recurrence?: string | null
          requested_by?: string | null
          requires_approval?: boolean
          stage_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[]
          time_invested_seconds?: number
          title?: string
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_overrides: {
        Row: {
          granted: boolean
          module_key: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          granted: boolean
          module_key: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          granted?: boolean
          module_key?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      work_schedule_items: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          order_index: number
          schedule_id: string
          scheduled_date: string
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          order_index?: number
          schedule_id: string
          scheduled_date: string
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          order_index?: number
          schedule_id?: string
          scheduled_date?: string
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_items_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          project_id: string | null
          public_token: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          project_id?: string | null
          public_token?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          project_id?: string | null
          public_token?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contracts_client_view: {
        Row: {
          client_id: string | null
          created_at: string | null
          download_enabled: boolean | null
          end_date: string | null
          external_link: string | null
          file_path: string | null
          id: string | null
          name: string | null
          product: string | null
          project_id: string | null
          start_date: string | null
          status: string | null
          term_months: number | null
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          download_enabled?: boolean | null
          end_date?: string | null
          external_link?: string | null
          file_path?: string | null
          id?: string | null
          name?: string | null
          product?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          term_months?: number | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          download_enabled?: boolean | null
          end_date?: string | null
          external_link?: string | null
          file_path?: string | null
          id?: string | null
          name?: string | null
          product?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          term_months?: number | null
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alcateia_news_add: {
        Args: {
          _actor: string
          _color: string
          _desc: string
          _entity_id: string
          _entity_type: string
          _event: string
          _icon: string
          _meta: Json
          _title: string
        }
        Returns: string
      }
      alcateia_post_weekly_leaders: { Args: never; Returns: undefined }
      bolao_award_champion: {
        Args: never
        Returns: {
          message: string
          points: number
          user_id: string
        }[]
      }
      bolao_recalc_match_points: {
        Args: { _match_id: string }
        Returns: undefined
      }
      can_access_task: { Args: { _task_id: string }; Returns: boolean }
      can_manage_task: { Args: { _task_id: string }; Returns: boolean }
      claim_habit_reward: {
        Args: { _habit_id: string }
        Returns: {
          awarded: boolean
          message: string
          points: number
        }[]
      }
      create_notification: {
        Args: {
          p_description: string
          p_entity_id?: string
          p_entity_type?: string
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_task_mention: {
        Args: {
          _context?: string
          _excerpt: string
          _mentioned_user_ids: string[]
          _task_id: string
        }
        Returns: number
      }
      get_briefing_by_token: {
        Args: { _token: string }
        Returns: {
          allow_edit: boolean
          contact_name: string
          dados: Json
          email: string
          id: string
          office_name: string
          status: string
          submitted_at: string
          token: string
          updated_at: string
        }[]
      }
      get_contract_by_token: {
        Args: { _token: string }
        Returns: {
          commercial_data: Json
          contractor_snapshot: Json
          id: string
          sent_at: string
          signature_status: string
          signed_at: string
          version: number
        }[]
      }
      get_my_client_id: { Args: never; Returns: string }
      get_my_full_name: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_onboarding_invite: {
        Args: { _token: string }
        Returns: {
          company_hint: string
          contact_name: string
          expires_at: string
          reason: string
          valid: boolean
        }[]
      }
      get_public_form_share: {
        Args: { _token: string }
        Returns: {
          form: Json
        }[]
      }
      is_collab_admin: { Args: never; Returns: boolean }
      is_internal_user: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      list_collaborators_public: {
        Args: never
        Returns: {
          avatar_url: string
          birth_date: string
          department: string
          display_name: string
          full_name: string
          id: string
          job_title: string
          profile_avatar_key: string
          profile_avatar_url: string
          profile_id: string
          role_function: string
          status: string
        }[]
      }
      recalc_task_time: { Args: { _task_id: string }; Returns: undefined }
      save_briefing_progress: {
        Args: { _dados: Json; _token: string }
        Returns: undefined
      }
      sign_contract: {
        Args: {
          _cpf: string
          _html: string
          _ip: string
          _name: string
          _token: string
        }
        Returns: string
      }
      submit_briefing_by_token: {
        Args: { _dados: Json; _token: string }
        Returns: undefined
      }
      submit_onboarding: {
        Args: { _ip: string; _payload: Json; _token: string }
        Returns: string
      }
      submit_public_form: {
        Args: {
          _answers: Json
          _form_id: string
          _form_name: string
          _form_snapshot: Json
          _token: string
        }
        Returns: string
      }
    }
    Enums: {
      collaborator_access_level:
        | "super_admin"
        | "admin"
        | "gerente"
        | "colaborador"
        | "cliente"
        | "visualizador"
      collaborator_contract_type:
        | "clt"
        | "pj"
        | "freelancer"
        | "estagiario"
        | "socio"
        | "terceirizado"
      collaborator_status:
        | "ativo"
        | "inativo"
        | "ferias"
        | "afastado"
        | "desligado"
      commercial_funnel_stage:
        | "lead"
        | "in_contact"
        | "follow_up"
        | "meeting_scheduled"
        | "negotiating"
        | "won"
        | "lost"
        | "incomplete_data"
      commercial_lead_level: "A" | "B" | "C"
      gam_leader_category:
        | "extraordinary_execution"
        | "loyalty"
        | "leadership_by_example"
        | "high_performance"
        | "somus_culture"
        | "courage_to_solve"
        | "collaboration"
        | "evolution"
        | "ownership"
        | "exceptional_result"
      gam_mission_status: "active" | "completed" | "expired" | "cancelled"
      gam_rarity: "bronze" | "silver" | "gold" | "legendary"
      gam_redemption_status: "pending" | "approved" | "rejected" | "delivered"
      gam_user_mission_status: "in_progress" | "completed" | "failed"
      goal_status:
        | "rascunho"
        | "ativa"
        | "encerrada"
        | "batida"
        | "superada"
        | "nao_batida"
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
      collaborator_access_level: [
        "super_admin",
        "admin",
        "gerente",
        "colaborador",
        "cliente",
        "visualizador",
      ],
      collaborator_contract_type: [
        "clt",
        "pj",
        "freelancer",
        "estagiario",
        "socio",
        "terceirizado",
      ],
      collaborator_status: [
        "ativo",
        "inativo",
        "ferias",
        "afastado",
        "desligado",
      ],
      commercial_funnel_stage: [
        "lead",
        "in_contact",
        "follow_up",
        "meeting_scheduled",
        "negotiating",
        "won",
        "lost",
        "incomplete_data",
      ],
      commercial_lead_level: ["A", "B", "C"],
      gam_leader_category: [
        "extraordinary_execution",
        "loyalty",
        "leadership_by_example",
        "high_performance",
        "somus_culture",
        "courage_to_solve",
        "collaboration",
        "evolution",
        "ownership",
        "exceptional_result",
      ],
      gam_mission_status: ["active", "completed", "expired", "cancelled"],
      gam_rarity: ["bronze", "silver", "gold", "legendary"],
      gam_redemption_status: ["pending", "approved", "rejected", "delivered"],
      gam_user_mission_status: ["in_progress", "completed", "failed"],
      goal_status: [
        "rascunho",
        "ativa",
        "encerrada",
        "batida",
        "superada",
        "nao_batida",
      ],
    },
  },
} as const
