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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_invocations: {
        Row: {
          created_at: string
          error_message: string | null
          feature: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          success: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          success?: boolean
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          id: string
          intake_cleanup: boolean
          nl_query: boolean
          quiz_drafting: boolean
          report_phrasing: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          intake_cleanup?: boolean
          nl_query?: boolean
          quiz_drafting?: boolean
          report_phrasing?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          intake_cleanup?: boolean
          nl_query?: boolean
          quiz_drafting?: boolean
          report_phrasing?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          id: string
          participant_id: string
          pickup_name: string | null
          session_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          id?: string
          participant_id: string
          pickup_name?: string | null
          session_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          id?: string
          participant_id?: string
          pickup_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_signatures: {
        Row: {
          captured_by: string | null
          created_at: string
          id: string
          kind: string
          participant_id: string
          session_id: string
          signature_json: Json
          signed_at: string
          signer_name: string
        }
        Insert: {
          captured_by?: string | null
          created_at?: string
          id?: string
          kind: string
          participant_id: string
          session_id: string
          signature_json: Json
          signed_at?: string
          signer_name: string
        }
        Update: {
          captured_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          participant_id?: string
          session_id?: string
          signature_json?: Json
          signed_at?: string
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_signatures_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_signatures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_signatures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_signatures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "attendance_signatures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_signatures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "attendance_signatures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "attendance_signatures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience: string
          body_html: string
          created_at: string | null
          id: string
          recipient_count: number | null
          sent_at: string | null
          sent_by: string | null
          session_id: string | null
          subject: string
        }
        Insert: {
          audience: string
          body_html: string
          created_at?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          session_id?: string | null
          subject: string
        }
        Update: {
          audience?: string
          body_html?: string
          created_at?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          session_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "broadcasts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "broadcasts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bucks_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          participant_id: string
          reason: string
          session_id: string | null
          source_id: string | null
          source_kind: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          participant_id: string
          reason: string
          session_id?: string | null
          source_id?: string | null
          source_kind?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          participant_id?: string
          reason?: string
          session_id?: string | null
          source_id?: string | null
          source_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bucks_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucks_ledger_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "bucks_ledger_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "bucks_ledger_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "bucks_ledger_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucks_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "bucks_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "bucks_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bucks_settings: {
        Row: {
          id: number
          points_per_check_in: number
          points_per_participation: number
          points_per_quiz_attempt: number
          points_per_reading_minute: number
          points_quiz_perfect_bonus: number
          updated_at: string
        }
        Insert: {
          id?: number
          points_per_check_in?: number
          points_per_participation?: number
          points_per_quiz_attempt?: number
          points_per_reading_minute?: number
          points_quiz_perfect_bonus?: number
          updated_at?: string
        }
        Update: {
          id?: number
          points_per_check_in?: number
          points_per_participation?: number
          points_per_quiz_attempt?: number
          points_per_reading_minute?: number
          points_quiz_perfect_bonus?: number
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_units: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reading_assignment: string | null
          session_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reading_assignment?: string | null
          session_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reading_assignment?: string | null
          session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_units_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "curriculum_units_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "curriculum_units_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      go_badge_lookup_throttle: {
        Row: {
          fail_count: number
          lookup_key: string
          window_started_at: string
        }
        Insert: {
          fail_count?: number
          lookup_key: string
          window_started_at?: string
        }
        Update: {
          fail_count?: number
          lookup_key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      jotform_forms: {
        Row: {
          active: boolean
          auto_approve: boolean
          created_at: string | null
          field_mapping: Json
          id: string
          jotform_id: string
          kind: string
          label: string
        }
        Insert: {
          active?: boolean
          auto_approve?: boolean
          created_at?: string | null
          field_mapping?: Json
          id?: string
          jotform_id: string
          kind?: string
          label: string
        }
        Update: {
          active?: boolean
          auto_approve?: boolean
          created_at?: string | null
          field_mapping?: Json
          id?: string
          jotform_id?: string
          kind?: string
          label?: string
        }
        Relationships: []
      }
      participant_guardian_contacts: {
        Row: {
          created_at: string
          guardian_email: string | null
          guardian_phone: string | null
          participant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guardian_email?: string | null
          guardian_phone?: string | null
          participant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guardian_email?: string | null
          guardian_phone?: string | null
          participant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_guardian_contacts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "participant_guardian_contacts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "participant_guardian_contacts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "participant_guardian_contacts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          active: boolean
          age: number | null
          authorized_pickups: string[]
          created_at: string | null
          cy_ref: string | null
          display_id: number
          enrollment_status: string | null
          first_name: string
          grade: string | null
          guardian_name: string
          how_heard: string | null
          id: string
          jotform_submission_id: string | null
          last_initial: string
          last_name: string | null
          media_release: boolean
          medical_emergency_form: boolean
          off_site_permission: boolean
          other_required_forms: boolean
          parental_guardian_affirmation: boolean
          qr_token: string
          registration_date: string | null
          school: string | null
          shirt_size: string | null
          transportation_permission: boolean
          virtual_meeting_performance_agreement: boolean
          youth_code_of_conduct: boolean
          youth_pickup_authorization: boolean
        }
        Insert: {
          active?: boolean
          age?: number | null
          authorized_pickups?: string[]
          created_at?: string | null
          cy_ref?: string | null
          display_id?: number
          enrollment_status?: string | null
          first_name: string
          grade?: string | null
          guardian_name: string
          how_heard?: string | null
          id?: string
          jotform_submission_id?: string | null
          last_initial: string
          last_name?: string | null
          media_release?: boolean
          medical_emergency_form?: boolean
          off_site_permission?: boolean
          other_required_forms?: boolean
          parental_guardian_affirmation?: boolean
          qr_token?: string
          registration_date?: string | null
          school?: string | null
          shirt_size?: string | null
          transportation_permission?: boolean
          virtual_meeting_performance_agreement?: boolean
          youth_code_of_conduct?: boolean
          youth_pickup_authorization?: boolean
        }
        Update: {
          active?: boolean
          age?: number | null
          authorized_pickups?: string[]
          created_at?: string | null
          cy_ref?: string | null
          display_id?: number
          enrollment_status?: string | null
          first_name?: string
          grade?: string | null
          guardian_name?: string
          how_heard?: string | null
          id?: string
          jotform_submission_id?: string | null
          last_initial?: string
          last_name?: string | null
          media_release?: boolean
          medical_emergency_form?: boolean
          off_site_permission?: boolean
          other_required_forms?: boolean
          parental_guardian_affirmation?: boolean
          qr_token?: string
          registration_date?: string | null
          school?: string | null
          shirt_size?: string | null
          transportation_permission?: boolean
          virtual_meeting_performance_agreement?: boolean
          youth_code_of_conduct?: boolean
          youth_pickup_authorization?: boolean
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          ai_flags: Json
          form_id: string
          id: string
          mapped: Json
          participant_id: string | null
          raw_payload: Json
          received_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string
        }
        Insert: {
          ai_flags?: Json
          form_id: string
          id?: string
          mapped?: Json
          participant_id?: string | null
          raw_payload: Json
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id: string
        }
        Update: {
          ai_flags?: Json
          form_id?: string
          id?: string
          mapped?: Json
          participant_id?: string | null
          raw_payload?: Json
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "jotform_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "pending_registrations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "pending_registrations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "pending_registrations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          password_set_at: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          password_set_at?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          password_set_at?: string | null
          role?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          participant_id: string
          quiz_id: string
          score: number
          session_id: string | null
          taken_at: string
          total: number
        }
        Insert: {
          id?: string
          participant_id: string
          quiz_id: string
          score: number
          session_id?: string | null
          taken_at?: string
          total: number
        }
        Update: {
          id?: string
          participant_id?: string
          quiz_id?: string
          score?: number
          session_id?: string | null
          taken_at?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "quiz_attempts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "quiz_attempts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "quiz_attempts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "quiz_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "quiz_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          ai_drafted: boolean
          correct_index: number
          id: string
          options: Json
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          ai_drafted?: boolean
          correct_index: number
          id?: string
          options: Json
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          ai_drafted?: boolean
          correct_index?: number
          id?: string
          options?: Json
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          format: string
          id: string
          title: string
          unit_id: string
        }
        Insert: {
          created_at?: string | null
          format?: string
          id?: string
          title: string
          unit_id: string
        }
        Update: {
          created_at?: string | null
          format?: string
          id?: string
          title?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_logs: {
        Row: {
          client_event_id: string | null
          id: string
          logged_at: string
          logged_by: string | null
          minutes: number
          participant_id: string
          session_id: string
          unit_id: string | null
        }
        Insert: {
          client_event_id?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          minutes: number
          participant_id: string
          session_id: string
          unit_id?: string | null
        }
        Update: {
          client_event_id?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          minutes?: number
          participant_id?: string
          session_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_bucks_balance"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "reading_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "reading_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "reading_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reading_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reading_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          body_template: string
          days_before: number
          enabled: boolean
          id: string
          subject_template: string
          updated_at: string | null
        }
        Insert: {
          body_template: string
          days_before?: number
          enabled?: boolean
          id?: string
          subject_template: string
          updated_at?: string | null
        }
        Update: {
          body_template?: string
          days_before?: number
          enabled?: boolean
          id?: string
          subject_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      session_door_grants: {
        Row: {
          auth_user_id: string | null
          created_at: string
          created_by: string
          expires_at: string
          helper_name: string
          id: string
          login_email: string | null
          night_id: string | null
          pin_hash: string | null
          revoked_at: string | null
          session_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          helper_name: string
          id?: string
          login_email?: string | null
          night_id?: string | null
          pin_hash?: string | null
          revoked_at?: string | null
          session_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          helper_name?: string
          id?: string
          login_email?: string | null
          night_id?: string | null
          pin_hash?: string | null
          revoked_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_door_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_door_grants_night_id_fkey"
            columns: ["night_id"]
            isOneToOne: false
            referencedRelation: "session_door_nights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_door_grants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_door_grants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_door_grants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_door_helper_names: {
        Row: {
          created_at: string
          created_by: string | null
          helper_name: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          helper_name: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          helper_name?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_door_helper_names_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_door_helper_names_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_door_nights: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          pin_hash: string
          revoked_at: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          pin_hash: string
          revoked_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          pin_hash?: string
          revoked_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_door_nights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_door_nights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          requires_check_in: boolean
          session_date: string
          supports_reading: boolean
          title: string
        }
        Insert: {
          created_at?: string | null
          event_type?: string
          id?: string
          requires_check_in?: boolean
          session_date: string
          supports_reading?: boolean
          title: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          requires_check_in?: boolean
          session_date?: string
          supports_reading?: boolean
          title?: string
        }
        Relationships: []
      }
      staff_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      volunteer_attendance: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          id: string
          recorded_by: string | null
          session_id: string
          volunteer_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          id?: string
          recorded_by?: string | null
          session_id: string
          volunteer_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          id?: string
          recorded_by?: string | null
          session_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "volunteer_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_session_summary_admin"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "volunteer_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_attendance_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          active: boolean
          created_at: string | null
          display_id: number
          email: string | null
          full_name: string
          id: string
          phone: string | null
          qr_token: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          display_id?: number
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          qr_token?: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          display_id?: number
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          qr_token?: string
        }
        Relationships: []
      }
    }
    Views: {
      participant_bucks_balance: {
        Row: {
          active: boolean | null
          balance: number | null
          display_id: number | null
          first_name: string | null
          last_initial: string | null
          ledger_entries: number | null
          participant_id: string | null
        }
        Relationships: []
      }
      participant_session_summary: {
        Row: {
          attended: boolean | null
          checked_out: boolean | null
          display_id: number | null
          first_name: string | null
          guardian_name: string | null
          last_initial: string | null
          minutes_read: number | null
          participant_id: string | null
          pickup_name: string | null
          quiz_score: number | null
          quiz_total: number | null
          session_date: string | null
          session_event_type: string | null
          session_id: string | null
          session_requires_check_in: boolean | null
          session_supports_reading: boolean | null
          session_title: string | null
        }
        Relationships: []
      }
      participant_session_summary_admin: {
        Row: {
          attended: boolean | null
          checked_out: boolean | null
          display_id: number | null
          first_name: string | null
          guardian_email: string | null
          guardian_name: string | null
          last_initial: string | null
          minutes_read: number | null
          participant_id: string | null
          pickup_name: string | null
          quiz_score: number | null
          quiz_total: number | null
          session_date: string | null
          session_event_type: string | null
          session_id: string | null
          session_requires_check_in: boolean | null
          session_supports_reading: boolean | null
          session_title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      door_session_allowed: { Args: { p_session_id: string }; Returns: boolean }
      admin_create_guardian_portal_link: {
        Args: { p_guardian_email: string; p_label?: string | null }
        Returns: Json
      }
      guardian_portal_family: {
        Args: { p_token: string }
        Returns: Json
      }
      guardian_portal_mask_email: { Args: { p_email: string }; Returns: string }
      is_active_door: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_authorized_pickup: {
        Args: { p_participant_id: string; p_pickup_name: string }
        Returns: boolean
      }
      is_door: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_staff_email: { Args: { check_email: string }; Returns: boolean }
      is_volunteer: { Args: never; Returns: boolean }
      participant_portal_bucks_balance: {
        Args: { p_qr_token: string }
        Returns: number
      }
      participant_portal_client_key: { Args: never; Returns: string }
      participant_portal_context: {
        Args: { p_qr_token: string; p_session_id?: string }
        Returns: Json
      }
      participant_portal_find_quiz_id: {
        Args: { p_session_id: string }
        Returns: string
      }
      participant_portal_identity: {
        Args: { p_qr_token: string }
        Returns: Json
      }
      participant_portal_leaderboard: {
        Args: { p_qr_token: string }
        Returns: {
          balance: number
          display_id: number
          first_name: string
          last_initial: string
        }[]
      }
      participant_portal_progress: {
        Args: { p_qr_token: string }
        Returns: Json
      }
      participant_portal_quiz_questions: {
        Args: { p_qr_token: string; p_session_id?: string }
        Returns: {
          id: string
          options: Json
          position: number
          prompt: string
        }[]
      }
      participant_portal_record_display_id_miss: {
        Args: never
        Returns: undefined
      }
      participant_portal_resolve_qr_token: {
        Args: { p_badge: string }
        Returns: string
      }
      participant_portal_resolve_session: {
        Args: { p_session_id: string }
        Returns: string
      }
      participant_portal_submit_quiz: {
        Args: { p_answers: Json; p_qr_token: string; p_session_id?: string }
        Returns: Json
      }
      participant_portal_throttle_display_id: {
        Args: never
        Returns: undefined
      }
      participant_portal_today_stamps: {
        Args: { p_qr_token: string }
        Returns: Json
      }
      record_bucks_adjustment: {
        Args: {
          p_amount: number
          p_note?: string
          p_participant_id: string
          p_reason?: string
          p_session_id?: string
        }
        Returns: string
      }
      record_bucks_earn: {
        Args: {
          p_amount: number
          p_note?: string
          p_participant_id: string
          p_reason: string
          p_session_id: string
          p_source_id: string
          p_source_kind: string
        }
        Returns: string
      }
      staff_display_name: {
        Args: { metadata: Json; user_email: string }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
