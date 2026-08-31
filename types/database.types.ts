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
      agenda_items: {
        Row: {
          agenda_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string | null
          id: string
          location: string | null
          organization_id: string
          related_resource_id: string | null
          related_resource_type: string | null
          start_at: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          agenda_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          organization_id: string
          related_resource_id?: string | null
          related_resource_type?: string | null
          start_at: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          agenda_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          related_resource_id?: string | null
          related_resource_type?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience_type: string
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          organization_id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_session_id: string
          check_in_at: string | null
          created_at: string
          id: string
          member_id: string
          notes: string | null
          organization_id: string
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_session_id: string
          check_in_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          organization_id: string
          recorded_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          attendance_session_id?: string
          check_in_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          organization_id?: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_fk"
            columns: ["attendance_session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          close_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          method: string
          name: string
          open_at: string | null
          organization_id: string
          qr_token_expires_at: string | null
          qr_token_hash: string | null
          qr_token_issued_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          close_at?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          method?: string
          name: string
          open_at?: string | null
          organization_id: string
          qr_token_expires_at?: string | null
          qr_token_hash?: string | null
          qr_token_issued_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          close_at?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          method?: string
          name?: string
          open_at?: string | null
          organization_id?: string
          qr_token_expires_at?: string | null
          qr_token_hash?: string | null
          qr_token_issued_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_event_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent_summary: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent_summary?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ballots: {
        Row: {
          ballot_receipt_hash: string
          candidate_id: string
          created_at: string
          election_id: string
          id: string
          organization_id: string
        }
        Insert: {
          ballot_receipt_hash: string
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
          organization_id: string
        }
        Update: {
          ballot_receipt_hash?: string
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballots_candidate_fk"
            columns: ["candidate_id", "election_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id", "election_id"]
          },
          {
            foreignKeyName: "ballots_election_fk"
            columns: ["election_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          category_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          planned_amount: number
          updated_at: string
          work_program_id: string | null
        }
        Insert: {
          budget_id: string
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          planned_amount: number
          updated_at?: string
          work_program_id?: string | null
        }
        Update: {
          budget_id?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          planned_amount?: number
          updated_at?: string
          work_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_fk"
            columns: ["budget_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "budget_items_category_fk"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "budget_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_program_fk"
            columns: ["work_program_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_programs"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          organization_period_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          organization_period_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          organization_period_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      cadreship_records: {
        Row: {
          activity_name: string
          cadreship_type_id: string
          certificate_document_id: string | null
          certificate_number: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          location: string | null
          member_id: string
          notes: string | null
          organization_id: string
          organizer: string | null
          start_date: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activity_name: string
          cadreship_type_id: string
          certificate_document_id?: string | null
          certificate_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          member_id: string
          notes?: string | null
          organization_id: string
          organizer?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activity_name?: string
          cadreship_type_id?: string
          certificate_document_id?: string | null
          certificate_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          member_id?: string
          notes?: string | null
          organization_id?: string
          organizer?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadreship_records_cadreship_type_id_fkey"
            columns: ["cadreship_type_id"]
            isOneToOne: false
            referencedRelation: "cadreship_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadreship_records_certificate_fk"
            columns: ["certificate_document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cadreship_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadreship_records_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cadreship_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadreship_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cadreship_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level_order: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_order?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_order?: number | null
          name?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          candidate_number: number
          created_at: string
          display_name_snapshot: string
          election_id: string
          id: string
          member_id: string | null
          mission: string | null
          organization_id: string
          photo_path_snapshot: string | null
          profile_text: string | null
          status: string
          updated_at: string
          vision: string | null
        }
        Insert: {
          candidate_number: number
          created_at?: string
          display_name_snapshot: string
          election_id: string
          id?: string
          member_id?: string | null
          mission?: string | null
          organization_id: string
          photo_path_snapshot?: string | null
          profile_text?: string | null
          status?: string
          updated_at?: string
          vision?: string | null
        }
        Update: {
          candidate_number?: number
          created_at?: string
          display_name_snapshot?: string
          election_id?: string
          id?: string
          member_id?: string | null
          mission?: string | null
          organization_id?: string
          photo_path_snapshot?: string | null
          profile_text?: string | null
          status?: string
          updated_at?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_fk"
            columns: ["election_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "candidates_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          file_size: number
          id: string
          mime_type: string
          organization_id: string
          original_filename: string
          related_resource_id: string | null
          related_resource_type: string | null
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_size: number
          id?: string
          mime_type: string
          organization_id: string
          original_filename: string
          related_resource_id?: string | null
          related_resource_type?: string | null
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_size?: number
          id?: string
          mime_type?: string
          organization_id?: string
          original_filename?: string
          related_resource_id?: string | null
          related_resource_type?: string | null
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      election_committee_permissions: {
        Row: {
          created_at: string
          election_committee_id: string
          permission_id: string
        }
        Insert: {
          created_at?: string
          election_committee_id: string
          permission_id: string
        }
        Update: {
          created_at?: string
          election_committee_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_committee_permissions_election_committee_id_fkey"
            columns: ["election_committee_id"]
            isOneToOne: false
            referencedRelation: "election_committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_committee_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      election_committees: {
        Row: {
          created_at: string
          created_by: string | null
          election_id: string
          end_at: string | null
          id: string
          member_id: string
          organization_id: string
          position_name: string
          start_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          election_id: string
          end_at?: string | null
          id?: string
          member_id: string
          organization_id: string
          position_name: string
          start_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          election_id?: string
          end_at?: string | null
          id?: string
          member_id?: string
          organization_id?: string
          position_name?: string
          start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_committees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_committees_election_fk"
            columns: ["election_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "election_committees_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      election_voters: {
        Row: {
          created_at: string
          election_id: string
          eligible: boolean
          has_voted: boolean
          id: string
          ineligible_reason: string | null
          member_id: string
          organization_id: string
          updated_at: string
          voted_at: string | null
        }
        Insert: {
          created_at?: string
          election_id: string
          eligible?: boolean
          has_voted?: boolean
          id?: string
          ineligible_reason?: string | null
          member_id: string
          organization_id: string
          updated_at?: string
          voted_at?: string | null
        }
        Update: {
          created_at?: string
          election_id?: string
          eligible?: boolean
          has_voted?: boolean
          id?: string
          ineligible_reason?: string | null
          member_id?: string
          organization_id?: string
          updated_at?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_voters_election_fk"
            columns: ["election_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "election_voters_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      elections: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          election_type: string
          end_at: string
          id: string
          is_secret_ballot: boolean
          name: string
          opened_at: string | null
          organization_id: string
          organization_period_id: string | null
          published_at: string | null
          result_visibility: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          election_type?: string
          end_at: string
          id?: string
          is_secret_ballot?: boolean
          name: string
          opened_at?: string | null
          organization_id: string
          organization_period_id?: string | null
          published_at?: string | null
          result_visibility?: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          election_type?: string
          end_at?: string
          id?: string
          is_secret_ballot?: boolean
          name?: string
          opened_at?: string | null
          organization_id?: string
          organization_period_id?: string | null
          published_at?: string | null
          result_visibility?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      event_committee_permissions: {
        Row: {
          created_at: string
          event_committee_id: string
          permission_id: string
        }
        Insert: {
          created_at?: string
          event_committee_id: string
          permission_id: string
        }
        Update: {
          created_at?: string
          event_committee_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_committee_permissions_event_committee_id_fkey"
            columns: ["event_committee_id"]
            isOneToOne: false
            referencedRelation: "event_committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_committee_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_committees: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string | null
          event_id: string
          id: string
          member_id: string
          organization_id: string
          position_name: string
          start_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_id: string
          id?: string
          member_id: string
          organization_id: string
          position_name: string
          start_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_id?: string
          id?: string
          member_id?: string
          organization_id?: string
          position_name?: string
          start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_committees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_committees_event_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "event_committees_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "event_committees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          cancelled_at: string | null
          created_at: string
          event_id: string
          id: string
          member_id: string
          organization_id: string
          registered_at: string
          registration_status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          member_id: string
          organization_id: string
          registered_at?: string
          registration_status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          member_id?: string
          organization_id?: string
          registered_at?: string
          registration_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "event_participants_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "event_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string | null
          id: string
          location: string | null
          name: string
          organization_id: string
          organization_period_id: string | null
          registration_end_at: string | null
          registration_start_at: string | null
          responsible_member_id: string | null
          start_at: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id: string
          organization_period_id?: string | null
          registration_end_at?: string | null
          registration_start_at?: string | null
          responsible_member_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          organization_period_id?: string | null
          registration_end_at?: string | null
          registration_start_at?: string | null
          responsible_member_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "events_responsible_member_fk"
            columns: ["responsible_member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          organization_id: string
          organization_period_id: string | null
          proof_document_id: string | null
          reference_number: string | null
          status: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          account_id: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          organization_id: string
          organization_period_id?: string | null
          proof_document_id?: string | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          organization_id?: string
          organization_period_id?: string | null
          proof_document_id?: string | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_fk"
            columns: ["account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_fk"
            columns: ["category_id", "organization_id", "transaction_type"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id", "organization_id", "type"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_transactions_proof_fk"
            columns: ["proof_document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "financial_transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_role_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          profile_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_role_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_letters: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string | null
          id: string
          letter_date: string | null
          letter_number: string | null
          notes: string | null
          organization_id: string
          organization_period_id: string | null
          received_date: string
          sender: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          letter_date?: string | null
          letter_number?: string | null
          notes?: string | null
          organization_id: string
          organization_period_id?: string | null
          received_date?: string
          sender: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          letter_date?: string | null
          letter_number?: string | null
          notes?: string | null
          organization_id?: string
          organization_period_id?: string | null
          received_date?: string
          sender?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_letters_document_fk"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "incoming_letters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_letters_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      management_assignments: {
        Row: {
          appointed_by: string | null
          created_at: string
          end_date: string | null
          id: string
          member_id: string
          organization_id: string
          organization_period_id: string
          position_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointed_by?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id: string
          organization_id: string
          organization_period_id: string
          position_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointed_by?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id?: string
          organization_id?: string
          organization_period_id?: string
          position_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_assignments_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_assignments_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "management_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_assignments_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "management_assignments_position_fk"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          decisions: string | null
          follow_up: string | null
          id: string
          meeting_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          follow_up?: string | null
          id?: string
          meeting_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          follow_up?: string | null
          id?: string
          meeting_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_fk"
            columns: ["meeting_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_minutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attendance_status: string
          created_at: string
          id: string
          meeting_id: string
          member_id: string
          organization_id: string
          participant_role: string | null
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          id?: string
          meeting_id: string
          member_id: string
          organization_id: string
          participant_role?: string | null
        }
        Update: {
          attendance_status?: string
          created_at?: string
          id?: string
          meeting_id?: string
          member_id?: string
          organization_id?: string
          participant_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_fk"
            columns: ["meeting_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_participants_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_at: string | null
          id: string
          location: string | null
          organization_id: string
          organization_period_id: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          organization_id: string
          organization_period_id?: string | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          organization_period_id?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      member_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          member_id: string
          organization_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          member_id: string
          organization_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          member_id?: string
          organization_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_status_history_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          join_date: string | null
          member_number: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          photo_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          join_date?: string | null
          member_number?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          photo_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          join_date?: string | null
          member_number?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          photo_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_levels: {
        Row: {
          code: string
          created_at: string
          hierarchy_rank: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          hierarchy_rank: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          hierarchy_rank?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          joined_at: string
          member_id: string | null
          organization_id: string
          profile_id: string
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          joined_at?: string
          member_id?: string | null
          organization_id: string
          profile_id: string
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          joined_at?: string
          member_id?: string | null
          organization_id?: string
          profile_id?: string
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_member_fk"
            columns: ["member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          organization_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          organization_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          organization_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          city_regency: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          district: string | null
          email: string | null
          id: string
          logo_path: string | null
          name: string
          organization_level_id: string
          organization_type_id: string
          parent_organization_id: string | null
          phone: string | null
          province: string | null
          short_name: string | null
          slug: string
          status: string
          updated_at: string
          village: string | null
        }
        Insert: {
          address?: string | null
          city_regency?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          name: string
          organization_level_id: string
          organization_type_id: string
          parent_organization_id?: string | null
          phone?: string | null
          province?: string | null
          short_name?: string | null
          slug: string
          status?: string
          updated_at?: string
          village?: string | null
        }
        Update: {
          address?: string | null
          city_regency?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          organization_level_id?: string
          organization_type_id?: string
          parent_organization_id?: string | null
          phone?: string | null
          province?: string | null
          short_name?: string | null
          slug?: string
          status?: string
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_organization_level_id_fkey"
            columns: ["organization_level_id"]
            isOneToOne: false
            referencedRelation: "organization_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outgoing_letters: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string | null
          id: string
          letter_date: string
          letter_number: string
          notes: string | null
          organization_id: string
          organization_period_id: string | null
          recipient: string
          signer_member_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          letter_date?: string
          letter_number: string
          notes?: string | null
          organization_id: string
          organization_period_id?: string | null
          recipient: string
          signer_member_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          letter_date?: string
          letter_number?: string
          notes?: string | null
          organization_id?: string
          organization_period_id?: string | null
          recipient?: string
          signer_member_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outgoing_letters_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outgoing_letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outgoing_letters_document_fk"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "outgoing_letters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outgoing_letters_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "outgoing_letters_signer_fk"
            columns: ["signer_member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_platform: boolean
          resource: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_platform?: boolean
          resource: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_platform?: boolean
          resource?: string
        }
        Relationships: []
      }
      position_permissions: {
        Row: {
          created_at: string
          permission_id: string
          position_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          position_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_position_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_position_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_position_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          last_active_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_path?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_active_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_active_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          scope: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          scope: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          scope?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          effect: string
          expires_at: string | null
          id: string
          organization_id: string
          permission_id: string
          profile_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effect: string
          expires_at?: string | null
          id?: string
          organization_id: string
          permission_id: string
          profile_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effect?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          permission_id?: string
          profile_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_programs: {
        Row: {
          budget_amount: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          organization_period_id: string
          progress: number
          responsible_member_id: string | null
          responsible_position_id: string | null
          start_date: string | null
          status: string
          target: string | null
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          organization_period_id: string
          progress?: number
          responsible_member_id?: string | null
          responsible_position_id?: string | null
          start_date?: string | null
          status?: string
          target?: string | null
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          organization_period_id?: string
          progress?: number
          responsible_member_id?: string | null
          responsible_position_id?: string | null
          start_date?: string | null
          status?: string
          target?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_programs_member_fk"
            columns: ["responsible_member_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "work_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_programs_period_fk"
            columns: ["organization_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "work_programs_position_fk"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mipnu_access_context: {
        Args: { p_organization_id?: string }
        Returns: Json
      }
      mipnu_account_balances: {
        Args: { p_as_of?: string; p_organization_id: string }
        Returns: Json
      }
      mipnu_activate_period: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      mipnu_advance_election_stage: {
        Args: { p_election_id: string; p_next_status: string }
        Returns: Json
      }
      mipnu_archive_election: { Args: { p_election_id: string }; Returns: Json }
      mipnu_bootstrap: {
        Args: { p_preferred_organization_id?: string }
        Returns: Json
      }
      mipnu_budget_vs_actual: { Args: { p_budget_id: string }; Returns: Json }
      mipnu_cancel_election: {
        Args: { p_election_id: string; p_reason: string }
        Returns: Json
      }
      mipnu_cast_vote: {
        Args: { p_candidate_id: string; p_election_id: string }
        Returns: Json
      }
      mipnu_check_in_with_token: { Args: { p_token: string }; Returns: Json }
      mipnu_close_election: { Args: { p_election_id: string }; Returns: Json }
      mipnu_election_integrity: {
        Args: { p_election_id: string }
        Returns: Json
      }
      mipnu_election_participation: {
        Args: { p_election_id: string }
        Returns: Json
      }
      mipnu_election_result: { Args: { p_election_id: string }; Returns: Json }
      mipnu_finance_summary: {
        Args: {
          p_account_id?: string
          p_end?: string
          p_organization_id: string
          p_period_id?: string
          p_start?: string
        }
        Returns: Json
      }
      mipnu_issue_attendance_qr: {
        Args: {
          p_session_id: string
          p_token: string
          p_valid_minutes?: number
        }
        Returns: undefined
      }
      mipnu_open_election: { Args: { p_election_id: string }; Returns: Json }
      mipnu_organization_stats: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      mipnu_platform_stats: { Args: never; Returns: Json }
      mipnu_publish_election_result: {
        Args: { p_election_id: string }
        Returns: Json
      }
      mipnu_revoke_attendance_qr: {
        Args: { p_session_id: string }
        Returns: undefined
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
