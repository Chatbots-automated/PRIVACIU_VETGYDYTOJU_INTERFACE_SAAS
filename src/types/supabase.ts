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
      animal_synchronizations: {
        Row: {
          animal_id: string
          created_at: string | null
          id: string
          insemination_date: string | null
          insemination_number: string | null
          notes: string | null
          protocol_id: string
          result: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          id?: string
          insemination_date?: string | null
          insemination_number?: string | null
          notes?: string | null
          protocol_id: string
          result?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          id?: string
          insemination_date?: string | null
          insemination_number?: string | null
          notes?: string | null
          protocol_id?: string
          result?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_synchronizations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "synchronization_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_visits: {
        Row: {
          animal_id: string
          course_id: string | null
          created_at: string | null
          id: string
          medications_processed: boolean | null
          next_visit_date: string | null
          next_visit_required: boolean | null
          notes: string | null
          planned_medications: Json | null
          procedures: string[]
          related_treatment_id: string | null
          related_visit_id: string | null
          status: string
          sync_step_id: string | null
          temperature: number | null
          temperature_measured_at: string | null
          treatment_required: boolean | null
          updated_at: string | null
          vet_name: string | null
          visit_datetime: string
        }
        Insert: {
          animal_id: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          medications_processed?: boolean | null
          next_visit_date?: string | null
          next_visit_required?: boolean | null
          notes?: string | null
          planned_medications?: Json | null
          procedures?: string[]
          related_treatment_id?: string | null
          related_visit_id?: string | null
          status?: string
          sync_step_id?: string | null
          temperature?: number | null
          temperature_measured_at?: string | null
          treatment_required?: boolean | null
          updated_at?: string | null
          vet_name?: string | null
          visit_datetime: string
        }
        Update: {
          animal_id?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          medications_processed?: boolean | null
          next_visit_date?: string | null
          next_visit_required?: boolean | null
          notes?: string | null
          planned_medications?: Json | null
          procedures?: string[]
          related_treatment_id?: string | null
          related_visit_id?: string | null
          status?: string
          sync_step_id?: string | null
          temperature?: number | null
          temperature_measured_at?: string | null
          treatment_required?: boolean | null
          updated_at?: string | null
          vet_name?: string | null
          visit_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "treatment_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_visits_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_course_schedules"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "animal_visits_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_owner_admin_meds"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "animal_visits_related_treatment_id_fkey"
            columns: ["related_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "animal_visits_related_treatment_id_fkey"
            columns: ["related_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_milk_loss_summary"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "animal_visits_related_treatment_id_fkey"
            columns: ["related_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_visits_related_treatment_id_fkey"
            columns: ["related_treatment_id"]
            isOneToOne: false
            referencedRelation: "vw_treated_animals"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "animal_visits_related_visit_id_fkey"
            columns: ["related_visit_id"]
            isOneToOne: false
            referencedRelation: "animal_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_visits_sync_step_id_fkey"
            columns: ["sync_step_id"]
            isOneToOne: false
            referencedRelation: "synchronization_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          active: boolean
          age_months: number | null
          birth_date: string | null
          breed: string | null
          created_at: string | null
          holder_address: string | null
          holder_name: string | null
          id: string
          sex: string | null
          source: string | null
          species: string | null
          tag_no: string | null
          updated_at: string
          updated_from_vic_at: string | null
        }
        Insert: {
          active?: boolean
          age_months?: number | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          holder_address?: string | null
          holder_name?: string | null
          id?: string
          sex?: string | null
          source?: string | null
          species?: string | null
          tag_no?: string | null
          updated_at?: string
          updated_from_vic_at?: string | null
        }
        Update: {
          active?: boolean
          age_months?: number | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          holder_address?: string | null
          holder_name?: string | null
          id?: string
          sex?: string | null
          source?: string | null
          species?: string | null
          tag_no?: string | null
          updated_at?: string
          updated_from_vic_at?: string | null
        }
        Relationships: []
      }
      batch_waste_tracking: {
        Row: {
          batch_id: string
          created_at: string | null
          medical_waste_id: string
          updated_at: string
          waste_generated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          medical_waste_id: string
          updated_at?: string
          waste_generated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          medical_waste_id?: string
          updated_at?: string
          waste_generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_waste_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_waste_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_waste_tracking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_waste_tracking_medical_waste_id_fkey"
            columns: ["medical_waste_id"]
            isOneToOne: false
            referencedRelation: "medical_waste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_waste_tracking_medical_waste_id_fkey"
            columns: ["medical_waste_id"]
            isOneToOne: false
            referencedRelation: "vw_medical_waste"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "batch_waste_tracking_medical_waste_id_fkey"
            columns: ["medical_waste_id"]
            isOneToOne: false
            referencedRelation: "vw_medical_waste_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_number: string | null
          created_at: string | null
          currency: string | null
          doc_date: string | null
          doc_number: string | null
          doc_title: string | null
          expiry_date: string | null
          id: string
          invoice_id: string | null
          invoice_path: string | null
          lot: string | null
          mfg_date: string | null
          package_count: number | null
          package_size: number | null
          product_id: string
          purchase_price: number | null
          qty_left: number | null
          received_qty: number
          serial_number: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          currency?: string | null
          doc_date?: string | null
          doc_number?: string | null
          doc_title?: string | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string | null
          invoice_path?: string | null
          lot?: string | null
          mfg_date?: string | null
          package_count?: number | null
          package_size?: number | null
          product_id: string
          purchase_price?: number | null
          qty_left?: number | null
          received_qty: number
          serial_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          currency?: string | null
          doc_date?: string | null
          doc_number?: string | null
          doc_title?: string | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string | null
          invoice_path?: string | null
          lot?: string | null
          mfg_date?: string | null
          package_count?: number | null
          package_size?: number | null
          product_id?: string
          purchase_price?: number | null
          qty_left?: number | null
          received_qty?: number
          serial_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      biocide_usage: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          product_id: string
          purpose: string | null
          qty: number
          unit: Database["public"]["Enums"]["unit"]
          updated_at: string
          use_date: string
          used_by_name: string | null
          user_signature_path: string | null
          work_scope: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          purpose?: string | null
          qty: number
          unit: Database["public"]["Enums"]["unit"]
          updated_at?: string
          use_date: string
          used_by_name?: string | null
          user_signature_path?: string | null
          work_scope?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          purpose?: string | null
          qty?: number
          unit?: Database["public"]["Enums"]["unit"]
          updated_at?: string
          use_date?: string
          used_by_name?: string | null
          user_signature_path?: string | null
          work_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biocide_usage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biocide_usage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "biocide_usage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["cost_center_id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_center_summary"
            referencedColumns: ["cost_center_id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_doses: {
        Row: {
          administered_by: string | null
          administered_date: string | null
          course_id: string
          created_at: string | null
          day_number: number
          dose_amount: number | null
          id: string
          notes: string | null
          scheduled_date: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          administered_date?: string | null
          course_id: string
          created_at?: string | null
          day_number: number
          dose_amount?: number | null
          id?: string
          notes?: string | null
          scheduled_date: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          administered_date?: string | null
          course_id?: string
          created_at?: string | null
          day_number?: number
          dose_amount?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          unit?: Database["public"]["Enums"]["unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_doses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "treatment_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_doses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_course_schedules"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_doses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_owner_admin_meds"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_medication_schedules: {
        Row: {
          batch_id: string | null
          course_id: string
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          purpose: string | null
          scheduled_date: string
          teat: string | null
          unit: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          batch_id?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purpose?: string | null
          scheduled_date: string
          teat?: string | null
          unit?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          batch_id?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purpose?: string | null
          scheduled_date?: string
          teat?: string | null
          unit?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_medication_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_medication_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "treatment_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_medication_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_course_schedules"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "vw_owner_admin_meds"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_medication_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "course_medication_schedules_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "animal_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases: {
        Row: {
          code: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_batches: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          expiry_date: string | null
          id: string
          invoice_id: string | null
          location_id: string | null
          lot_number: string | null
          notes: string | null
          product_id: string | null
          purchase_price: number | null
          qty_left: number
          received_qty: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_price?: number | null
          qty_left: number
          received_qty: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_price?: number | null
          qty_left?: number
          received_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_batches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "equipment_batches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "equipment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "equipment_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_invoice_item_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          cost_center_id: string | null
          created_at: string
          id: string
          invoice_item_id: string
          notes: string | null
          tool_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type: string
          cost_center_id?: string | null
          created_at?: string
          id?: string
          invoice_item_id: string
          notes?: string | null
          tool_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          cost_center_id?: string | null
          created_at?: string
          id?: string
          invoice_item_id?: string
          notes?: string | null
          tool_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_invoice_item_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["cost_center_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_center_summary"
            referencedColumns: ["cost_center_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "equipment_invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_parts_usage"
            referencedColumns: ["tool_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "equipment_invoice_item_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_invoice_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          line_no: number | null
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_no?: number | null
          product_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_no?: number | null
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "equipment_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "equipment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "equipment_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      equipment_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pdf_url: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_gross: number | null
          total_net: number | null
          total_vat: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          pdf_url?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pdf_url?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "equipment_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_issuance_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          issuance_id: string | null
          notes: string | null
          product_id: string | null
          quantity: number
          quantity_returned: number | null
          unit_price: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          issuance_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity: number
          quantity_returned?: number | null
          unit_price?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          issuance_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quantity_returned?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_issuance_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "equipment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_issuance_items_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "equipment_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_issuance_items_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "equipment_items_on_loan"
            referencedColumns: ["issuance_id"]
          },
          {
            foreignKeyName: "equipment_issuance_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "equipment_issuance_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_issuance_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      equipment_issuances: {
        Row: {
          actual_return_date: string | null
          created_at: string | null
          created_by: string | null
          expected_return_date: string | null
          id: string
          issuance_number: string
          issue_date: string | null
          issued_by: string | null
          issued_to: string | null
          issued_to_name: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          actual_return_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          issuance_number: string
          issue_date?: string | null
          issued_by?: string | null
          issued_to?: string | null
          issued_to_name?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          actual_return_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          issuance_number?: string
          issue_date?: string | null
          issued_by?: string | null
          issued_to?: string | null
          issued_to_name?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_issuances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_issuances_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_issuances_issued_to_fkey"
            columns: ["issued_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location_type: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string | null
          name?: string
        }
        Relationships: []
      }
      equipment_products: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manufacturer: string | null
          min_stock_level: number | null
          model_number: string | null
          name: string
          product_code: string | null
          unit_type: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          min_stock_level?: number | null
          model_number?: string | null
          name: string
          product_code?: string | null
          unit_type?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          min_stock_level?: number | null
          model_number?: string | null
          name?: string
          product_code?: string | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_stock_movements: {
        Row: {
          batch_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_table: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_table?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "equipment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_suppliers: {
        Row: {
          address: string | null
          code: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          vat_code: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          vat_code?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          vat_code?: string | null
        }
        Relationships: []
      }
      fire_extinguishers: {
        Row: {
          capacity: string | null
          created_at: string | null
          created_by: string | null
          expiry_date: string
          id: string
          is_active: boolean | null
          last_inspection_date: string | null
          location_id: string | null
          next_inspection_date: string | null
          notes: string | null
          placement_type: string
          serial_number: string
          status: string | null
          type: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          capacity?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date: string
          id?: string
          is_active?: boolean | null
          last_inspection_date?: string | null
          location_id?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          placement_type: string
          serial_number: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          capacity?: string | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string
          id?: string
          is_active?: boolean | null
          last_inspection_date?: string | null
          location_id?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          placement_type?: string
          serial_number?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fire_extinguishers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fire_extinguishers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fire_extinguishers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "fire_extinguishers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "fire_extinguishers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gea_daily: {
        Row: {
          animal_id: string
          calved_on: string | null
          collar_no: number | null
          created_at: string | null
          grupe: number | null
          id: number
          in_milk: boolean | null
          inseminated_on: string | null
          kada_versiuosis: string | null
          lact_days: number | null
          liko_iki_apsiversiavimo: number | null
          m1_date: string | null
          m1_qty: number | null
          m1_time: string | null
          m2_date: string | null
          m2_qty: number | null
          m2_time: string | null
          m3_date: string | null
          m3_qty: number | null
          m3_time: string | null
          m4_date: string | null
          m4_qty: number | null
          m4_time: string | null
          m5_date: string | null
          m5_qty: number | null
          m5_time: string | null
          milk_avg: number | null
          snapshot_date: string
          source: string | null
          statusas: string | null
          tag_no: string
          updated_at: string
          veisline_verte: string | null
          versingumas_dienomis: number | null
        }
        Insert: {
          animal_id: string
          calved_on?: string | null
          collar_no?: number | null
          created_at?: string | null
          grupe?: number | null
          id?: number
          in_milk?: boolean | null
          inseminated_on?: string | null
          kada_versiuosis?: string | null
          lact_days?: number | null
          liko_iki_apsiversiavimo?: number | null
          m1_date?: string | null
          m1_qty?: number | null
          m1_time?: string | null
          m2_date?: string | null
          m2_qty?: number | null
          m2_time?: string | null
          m3_date?: string | null
          m3_qty?: number | null
          m3_time?: string | null
          m4_date?: string | null
          m4_qty?: number | null
          m4_time?: string | null
          m5_date?: string | null
          m5_qty?: number | null
          m5_time?: string | null
          milk_avg?: number | null
          snapshot_date: string
          source?: string | null
          statusas?: string | null
          tag_no: string
          updated_at?: string
          veisline_verte?: string | null
          versingumas_dienomis?: number | null
        }
        Update: {
          animal_id?: string
          calved_on?: string | null
          collar_no?: number | null
          created_at?: string | null
          grupe?: number | null
          id?: number
          in_milk?: boolean | null
          inseminated_on?: string | null
          kada_versiuosis?: string | null
          lact_days?: number | null
          liko_iki_apsiversiavimo?: number | null
          m1_date?: string | null
          m1_qty?: number | null
          m1_time?: string | null
          m2_date?: string | null
          m2_qty?: number | null
          m2_time?: string | null
          m3_date?: string | null
          m3_qty?: number | null
          m3_time?: string | null
          m4_date?: string | null
          m4_qty?: number | null
          m4_time?: string | null
          m5_date?: string | null
          m5_qty?: number | null
          m5_time?: string | null
          milk_avg?: number | null
          snapshot_date?: string
          source?: string | null
          statusas?: string | null
          tag_no?: string
          updated_at?: string
          veisline_verte?: string | null
          versingumas_dienomis?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      hoof_condition_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          name_en: string
          name_lt: string
          treatment_notes: string | null
          typical_severity_range: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name_en: string
          name_lt: string
          treatment_notes?: string | null
          typical_severity_range?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name_en?: string
          name_lt?: string
          treatment_notes?: string | null
          typical_severity_range?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hoof_records: {
        Row: {
          animal_id: string
          bandage_applied: boolean | null
          claw: string
          condition_code: string | null
          created_at: string | null
          examination_date: string
          followup_completed: boolean | null
          followup_date: string | null
          id: string
          leg: string
          notes: string | null
          requires_followup: boolean | null
          severity: number | null
          technician_name: string
          treatment_batch_id: string | null
          treatment_notes: string | null
          treatment_product_id: string | null
          treatment_quantity: number | null
          treatment_unit: Database["public"]["Enums"]["unit"] | null
          updated_at: string | null
          visit_id: string | null
          was_treated: boolean | null
          was_trimmed: boolean | null
        }
        Insert: {
          animal_id: string
          bandage_applied?: boolean | null
          claw: string
          condition_code?: string | null
          created_at?: string | null
          examination_date?: string
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          leg: string
          notes?: string | null
          requires_followup?: boolean | null
          severity?: number | null
          technician_name: string
          treatment_batch_id?: string | null
          treatment_notes?: string | null
          treatment_product_id?: string | null
          treatment_quantity?: number | null
          treatment_unit?: Database["public"]["Enums"]["unit"] | null
          updated_at?: string | null
          visit_id?: string | null
          was_treated?: boolean | null
          was_trimmed?: boolean | null
        }
        Update: {
          animal_id?: string
          bandage_applied?: boolean | null
          claw?: string
          condition_code?: string | null
          created_at?: string | null
          examination_date?: string
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          leg?: string
          notes?: string | null
          requires_followup?: boolean | null
          severity?: number | null
          technician_name?: string
          treatment_batch_id?: string | null
          treatment_notes?: string | null
          treatment_product_id?: string | null
          treatment_quantity?: number | null
          treatment_unit?: Database["public"]["Enums"]["unit"] | null
          updated_at?: string | null
          visit_id?: string | null
          was_treated?: boolean | null
          was_trimmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_condition_code_fkey"
            columns: ["condition_code"]
            isOneToOne: false
            referencedRelation: "hoof_condition_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "hoof_records_treatment_batch_id_fkey"
            columns: ["treatment_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_records_treatment_batch_id_fkey"
            columns: ["treatment_batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "hoof_records_treatment_batch_id_fkey"
            columns: ["treatment_batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "hoof_records_treatment_product_id_fkey"
            columns: ["treatment_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_records_treatment_product_id_fkey"
            columns: ["treatment_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "hoof_records_treatment_product_id_fkey"
            columns: ["treatment_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "hoof_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "animal_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      insemination_inventory: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          received_date: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          received_date?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          received_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insemination_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insemination_products"
            referencedColumns: ["id"]
          },
        ]
      }
      insemination_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          product_type: string
          supplier_group: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          product_type: string
          supplier_group?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          product_type?: string
          supplier_group?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      insemination_records: {
        Row: {
          animal_id: string
          created_at: string | null
          glove_product_id: string | null
          glove_quantity: number | null
          id: string
          insemination_date: string
          notes: string | null
          performed_by: string | null
          pregnancy_check_date: string | null
          pregnancy_confirmed: boolean | null
          pregnancy_notes: string | null
          sperm_product_id: string
          sperm_quantity: number
          sync_step_id: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          glove_product_id?: string | null
          glove_quantity?: number | null
          id?: string
          insemination_date?: string
          notes?: string | null
          performed_by?: string | null
          pregnancy_check_date?: string | null
          pregnancy_confirmed?: boolean | null
          pregnancy_notes?: string | null
          sperm_product_id: string
          sperm_quantity: number
          sync_step_id?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          glove_product_id?: string | null
          glove_quantity?: number | null
          id?: string
          insemination_date?: string
          notes?: string | null
          performed_by?: string | null
          pregnancy_check_date?: string | null
          pregnancy_confirmed?: boolean | null
          pregnancy_notes?: string | null
          sperm_product_id?: string
          sperm_quantity?: number
          sync_step_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "insemination_records_glove_product_id_fkey"
            columns: ["glove_product_id"]
            isOneToOne: false
            referencedRelation: "insemination_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insemination_records_sperm_product_id_fkey"
            columns: ["sperm_product_id"]
            isOneToOne: false
            referencedRelation: "insemination_products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          invoice_id: string
          line_no: number | null
          product_id: string | null
          quantity: number | null
          sku: string | null
          total_price: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          line_no?: number | null
          product_id?: string | null
          quantity?: number | null
          sku?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          line_no?: number | null
          product_id?: string | null
          quantity?: number | null
          sku?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "invoice_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          doc_title: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pdf_filename: string | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_vat: string | null
          total_amount: number | null
          total_gross: number | null
          total_net: number | null
          total_vat: number | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          doc_title?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          pdf_filename?: string | null
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_vat?: string | null
          total_amount?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          doc_title?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pdf_filename?: string | null
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_vat?: string | null
          total_amount?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          estimated_duration_hours: number | null
          id: string
          interval_type: string
          interval_value: number
          is_active: boolean | null
          last_performed_date: string | null
          last_performed_hours: number | null
          last_performed_mileage: number | null
          maintenance_type: string
          next_due_date: string | null
          next_due_hours: number | null
          next_due_mileage: number | null
          notes: string | null
          schedule_name: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          interval_type: string
          interval_value: number
          is_active?: boolean | null
          last_performed_date?: string | null
          last_performed_hours?: number | null
          last_performed_mileage?: number | null
          maintenance_type: string
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_mileage?: number | null
          notes?: string | null
          schedule_name: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          interval_type?: string
          interval_value?: number
          is_active?: boolean | null
          last_performed_date?: string | null
          last_performed_hours?: number | null
          last_performed_mileage?: number | null
          maintenance_type?: string
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_mileage?: number | null
          notes?: string | null
          schedule_name?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_work_orders: {
        Row: {
          assigned_mechanic: string | null
          assigned_to: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          description: string
          engine_hours: number | null
          estimated_cost: number | null
          id: string
          labor_cost: number | null
          labor_hours: number | null
          notes: string | null
          odometer_reading: number | null
          order_type: string
          parts_cost: number | null
          priority: string | null
          schedule_id: string | null
          scheduled_date: string | null
          service_visit_id: string | null
          started_date: string | null
          status: string | null
          tool_id: string | null
          total_cost: number | null
          vehicle_id: string | null
          work_order_number: string
        }
        Insert: {
          assigned_mechanic?: string | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          engine_hours?: number | null
          estimated_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          notes?: string | null
          odometer_reading?: number | null
          order_type: string
          parts_cost?: number | null
          priority?: string | null
          schedule_id?: string | null
          scheduled_date?: string | null
          service_visit_id?: string | null
          started_date?: string | null
          status?: string | null
          tool_id?: string | null
          total_cost?: number | null
          vehicle_id?: string | null
          work_order_number: string
        }
        Update: {
          assigned_mechanic?: string | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          engine_hours?: number | null
          estimated_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          notes?: string | null
          odometer_reading?: number | null
          order_type?: string
          parts_cost?: number | null
          priority?: string | null
          schedule_id?: string | null
          scheduled_date?: string | null
          service_visit_id?: string | null
          started_date?: string | null
          status?: string | null
          tool_id?: string | null
          total_cost?: number | null
          vehicle_id?: string | null
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_parts_usage"
            referencedColumns: ["tool_id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_waste: {
        Row: {
          auto_generated: boolean
          carrier: string | null
          created_at: string | null
          date: string | null
          doc_no: string | null
          id: string
          name: string
          package_count: number | null
          period: string | null
          processor: string | null
          qty_generated: number | null
          qty_transferred: number | null
          responsible: string | null
          source_batch_id: string | null
          source_product_id: string | null
          transfer_date: string | null
          updated_at: string
          waste_code: string
        }
        Insert: {
          auto_generated?: boolean
          carrier?: string | null
          created_at?: string | null
          date?: string | null
          doc_no?: string | null
          id?: string
          name: string
          package_count?: number | null
          period?: string | null
          processor?: string | null
          qty_generated?: number | null
          qty_transferred?: number | null
          responsible?: string | null
          source_batch_id?: string | null
          source_product_id?: string | null
          transfer_date?: string | null
          updated_at?: string
          waste_code: string
        }
        Update: {
          auto_generated?: boolean
          carrier?: string | null
          created_at?: string | null
          date?: string | null
          doc_no?: string | null
          id?: string
          name?: string
          package_count?: number | null
          period?: string | null
          processor?: string | null
          qty_generated?: number | null
          qty_transferred?: number | null
          responsible?: string | null
          source_batch_id?: string | null
          source_product_id?: string | null
          transfer_date?: string | null
          updated_at?: string
          waste_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      milk_composition_tests: {
        Row: {
          atvezimo_data: string
          baltymu_kiekis: number | null
          created_at: string | null
          id: string
          konteineris: string
          laktozes_kiekis: number | null
          milk_weight_id: string | null
          paemimo_data: string
          pastaba: string | null
          persk_koef: number | null
          ph: number | null
          plomba: string | null
          producer_id: string | null
          prot_nr: string
          riebalu_kiekis: number | null
          scrape_session_id: string | null
          tyrimo_data: string
          ureja_mg_100ml: number | null
        }
        Insert: {
          atvezimo_data: string
          baltymu_kiekis?: number | null
          created_at?: string | null
          id?: string
          konteineris: string
          laktozes_kiekis?: number | null
          milk_weight_id?: string | null
          paemimo_data: string
          pastaba?: string | null
          persk_koef?: number | null
          ph?: number | null
          plomba?: string | null
          producer_id?: string | null
          prot_nr: string
          riebalu_kiekis?: number | null
          scrape_session_id?: string | null
          tyrimo_data: string
          ureja_mg_100ml?: number | null
        }
        Update: {
          atvezimo_data?: string
          baltymu_kiekis?: number | null
          created_at?: string | null
          id?: string
          konteineris?: string
          laktozes_kiekis?: number | null
          milk_weight_id?: string | null
          paemimo_data?: string
          pastaba?: string | null
          persk_koef?: number | null
          ph?: number | null
          plomba?: string | null
          producer_id?: string | null
          prot_nr?: string
          riebalu_kiekis?: number | null
          scrape_session_id?: string | null
          tyrimo_data?: string
          ureja_mg_100ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_composition_tests_milk_weight_id_fkey"
            columns: ["milk_weight_id"]
            isOneToOne: false
            referencedRelation: "milk_data_combined"
            referencedColumns: ["weight_id"]
          },
          {
            foreignKeyName: "milk_composition_tests_milk_weight_id_fkey"
            columns: ["milk_weight_id"]
            isOneToOne: false
            referencedRelation: "milk_weights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_composition_tests_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_data_combined"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "milk_composition_tests_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_composition_tests_scrape_session_id_fkey"
            columns: ["scrape_session_id"]
            isOneToOne: false
            referencedRelation: "milk_scrape_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_producers: {
        Row: {
          created_at: string | null
          gamintojas_code: string
          gamintojo_id: string
          id: string
          imone: string | null
          label: string
          punktas: string
          rajonas: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gamintojas_code: string
          gamintojo_id: string
          id?: string
          imone?: string | null
          label: string
          punktas: string
          rajonas: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gamintojas_code?: string
          gamintojo_id?: string
          id?: string
          imone?: string | null
          label?: string
          punktas?: string
          rajonas?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      milk_production: {
        Row: {
          animal_id: string
          conductivity: number | null
          created_at: string | null
          flow_rate: number | null
          id: string
          measurement_date: string
          measurement_time: string
          milk_quantity: number
          milk_temperature: number | null
          milking_duration: number | null
          notes: string | null
          scale_device_id: string | null
          session_type: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          conductivity?: number | null
          created_at?: string | null
          flow_rate?: number | null
          id?: string
          measurement_date?: string
          measurement_time?: string
          milk_quantity: number
          milk_temperature?: number | null
          milking_duration?: number | null
          notes?: string | null
          scale_device_id?: string | null
          session_type?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          conductivity?: number | null
          created_at?: string | null
          flow_rate?: number | null
          id?: string
          measurement_date?: string
          measurement_time?: string
          milk_quantity?: number
          milk_temperature?: number | null
          milking_duration?: number | null
          notes?: string | null
          scale_device_id?: string | null
          session_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      milk_quality_tests: {
        Row: {
          atvezimo_data: string
          bendras_bakteriju_skaicius: number | null
          created_at: string | null
          id: string
          konteineris: string
          milk_weight_id: string | null
          neatit_pst: string | null
          paemimo_data: string
          plomba: string | null
          producer_id: string | null
          prot_nr: string
          scrape_session_id: string | null
          somatiniu_lasteliu_skaicius: number | null
          tyrimo_data: string
        }
        Insert: {
          atvezimo_data: string
          bendras_bakteriju_skaicius?: number | null
          created_at?: string | null
          id?: string
          konteineris: string
          milk_weight_id?: string | null
          neatit_pst?: string | null
          paemimo_data: string
          plomba?: string | null
          producer_id?: string | null
          prot_nr: string
          scrape_session_id?: string | null
          somatiniu_lasteliu_skaicius?: number | null
          tyrimo_data: string
        }
        Update: {
          atvezimo_data?: string
          bendras_bakteriju_skaicius?: number | null
          created_at?: string | null
          id?: string
          konteineris?: string
          milk_weight_id?: string | null
          neatit_pst?: string | null
          paemimo_data?: string
          plomba?: string | null
          producer_id?: string | null
          prot_nr?: string
          scrape_session_id?: string | null
          somatiniu_lasteliu_skaicius?: number | null
          tyrimo_data?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_quality_tests_milk_weight_id_fkey"
            columns: ["milk_weight_id"]
            isOneToOne: false
            referencedRelation: "milk_data_combined"
            referencedColumns: ["weight_id"]
          },
          {
            foreignKeyName: "milk_quality_tests_milk_weight_id_fkey"
            columns: ["milk_weight_id"]
            isOneToOne: false
            referencedRelation: "milk_weights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_quality_tests_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_data_combined"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "milk_quality_tests_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_quality_tests_scrape_session_id_fkey"
            columns: ["scrape_session_id"]
            isOneToOne: false
            referencedRelation: "milk_scrape_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_scrape_sessions: {
        Row: {
          created_at: string | null
          date_from: string
          date_to: string
          id: string
          scraped_at: string
          url: string
        }
        Insert: {
          created_at?: string | null
          date_from: string
          date_to: string
          id?: string
          scraped_at: string
          url: string
        }
        Update: {
          created_at?: string | null
          date_from?: string
          date_to?: string
          id?: string
          scraped_at?: string
          url?: string
        }
        Relationships: []
      }
      milk_test_summaries: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          label: string
          producer_id: string | null
          scrape_session_id: string | null
          summary_type: string
          test_type: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          label: string
          producer_id?: string | null
          scrape_session_id?: string | null
          summary_type: string
          test_type: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          label?: string
          producer_id?: string | null
          scrape_session_id?: string | null
          summary_type?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_test_summaries_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_data_combined"
            referencedColumns: ["producer_id"]
          },
          {
            foreignKeyName: "milk_test_summaries_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "milk_producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_test_summaries_scrape_session_id_fkey"
            columns: ["scrape_session_id"]
            isOneToOne: false
            referencedRelation: "milk_scrape_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_tests: {
        Row: {
          animal_id: string
          bacteria_count: number | null
          created_at: string | null
          fat_percentage: number | null
          freezing_point: number | null
          id: string
          lab_name: string | null
          lab_reference: string | null
          lactose_percentage: number | null
          notes: string | null
          ph_level: number | null
          protein_percentage: number | null
          sample_date: string
          sample_session: string | null
          somatic_cell_count: number | null
          test_date: string
          test_status: string | null
          total_solids: number | null
          updated_at: string | null
          urea_level: number | null
        }
        Insert: {
          animal_id: string
          bacteria_count?: number | null
          created_at?: string | null
          fat_percentage?: number | null
          freezing_point?: number | null
          id?: string
          lab_name?: string | null
          lab_reference?: string | null
          lactose_percentage?: number | null
          notes?: string | null
          ph_level?: number | null
          protein_percentage?: number | null
          sample_date: string
          sample_session?: string | null
          somatic_cell_count?: number | null
          test_date?: string
          test_status?: string | null
          total_solids?: number | null
          updated_at?: string | null
          urea_level?: number | null
        }
        Update: {
          animal_id?: string
          bacteria_count?: number | null
          created_at?: string | null
          fat_percentage?: number | null
          freezing_point?: number | null
          id?: string
          lab_name?: string | null
          lab_reference?: string | null
          lactose_percentage?: number | null
          notes?: string | null
          ph_level?: number | null
          protein_percentage?: number | null
          sample_date?: string
          sample_session?: string | null
          somatic_cell_count?: number | null
          test_date?: string
          test_status?: string | null
          total_solids?: number | null
          updated_at?: string | null
          urea_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "milk_tests_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      milk_weights: {
        Row: {
          created_at: string | null
          date: string
          event_type: string | null
          hose_status: string | null
          id: string
          measurement_timestamp: string
          raw_data: Json | null
          session_id: string | null
          session_type: string
          stable_status: boolean | null
          timezone: string | null
          updated_at: string | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          date: string
          event_type?: string | null
          hose_status?: string | null
          id?: string
          measurement_timestamp: string
          raw_data?: Json | null
          session_id?: string | null
          session_type: string
          stable_status?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          weight: number
        }
        Update: {
          created_at?: string | null
          date?: string
          event_type?: string | null
          hose_status?: string | null
          id?: string
          measurement_timestamp?: string
          raw_data?: Json | null
          session_id?: string | null
          session_type?: string
          stable_status?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          weight?: number
        }
        Relationships: []
      }
      ppe_issuance_records: {
        Row: {
          actual_return_date: string | null
          condition_on_return: string | null
          created_at: string | null
          employee_id: string | null
          expected_return_date: string | null
          id: string
          issue_date: string
          issued_by: string | null
          notes: string | null
          ppe_item_id: string | null
          product_id: string | null
          quantity_issued: number
        }
        Insert: {
          actual_return_date?: string | null
          condition_on_return?: string | null
          created_at?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date: string
          issued_by?: string | null
          notes?: string | null
          ppe_item_id?: string | null
          product_id?: string | null
          quantity_issued: number
        }
        Update: {
          actual_return_date?: string | null
          condition_on_return?: string | null
          created_at?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          notes?: string | null
          ppe_item_id?: string | null
          product_id?: string | null
          quantity_issued?: number
        }
        Relationships: [
          {
            foreignKeyName: "ppe_issuance_records_ppe_item_id_fkey"
            columns: ["ppe_item_id"]
            isOneToOne: false
            referencedRelation: "ppe_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_issuance_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "ppe_issuance_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_issuance_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      ppe_items: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          min_stock_level: number | null
          notes: string | null
          ppe_type: string
          product_id: string | null
          quantity_on_hand: number | null
          size: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          min_stock_level?: number | null
          notes?: string | null
          ppe_type: string
          product_id?: string | null
          quantity_on_hand?: number | null
          size?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          min_stock_level?: number | null
          notes?: string | null
          ppe_type?: string
          product_id?: string | null
          quantity_on_hand?: number | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppe_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "ppe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_quality_reviews: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          rating: number
          review_date: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          rating: number
          review_date?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          rating?: number
          review_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_quality_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          interval_type: string
          interval_value: number
          is_active: boolean
          last_checked_date: string | null
          next_due_date: string | null
          notes: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          interval_type: string
          interval_value: number
          is_active?: boolean
          last_checked_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          interval_type?: string
          interval_value?: number
          is_active?: boolean
          last_checked_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_quality_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_quality_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_quality_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          active_substance: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at: string | null
          dosage_notes: string | null
          id: string
          is_active: boolean
          name: string
          package_weight_g: number | null
          primary_pack_size: number | null
          primary_pack_unit: Database["public"]["Enums"]["unit"]
          registration_code: string | null
          subcategory: string | null
          subcategory_2: string | null
          updated_at: string
          withdrawal_days_meat: number | null
          withdrawal_days_milk: number | null
        }
        Insert: {
          active_substance?: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string | null
          dosage_notes?: string | null
          id?: string
          is_active?: boolean
          name: string
          package_weight_g?: number | null
          primary_pack_size?: number | null
          primary_pack_unit: Database["public"]["Enums"]["unit"]
          registration_code?: string | null
          subcategory?: string | null
          subcategory_2?: string | null
          updated_at?: string
          withdrawal_days_meat?: number | null
          withdrawal_days_milk?: number | null
        }
        Update: {
          active_substance?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string | null
          dosage_notes?: string | null
          id?: string
          is_active?: boolean
          name?: string
          package_weight_g?: number | null
          primary_pack_size?: number | null
          primary_pack_unit?: Database["public"]["Enums"]["unit"]
          registration_code?: string | null
          subcategory?: string | null
          subcategory_2?: string | null
          updated_at?: string
          withdrawal_days_meat?: number | null
          withdrawal_days_milk?: number | null
        }
        Relationships: []
      }
      shared_notepad: {
        Row: {
          content: string
          created_at: string | null
          id: string
          last_edited_by: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          id?: string
          last_edited_by?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          last_edited_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_notepad_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: []
      }
      synchronization_protocols: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          steps: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          steps: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      synchronization_steps: {
        Row: {
          batch_id: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          dosage: number | null
          dosage_unit: string | null
          id: string
          is_evening: boolean | null
          medication_product_id: string | null
          notes: string | null
          scheduled_date: string
          step_name: string
          step_number: number
          synchronization_id: string
          updated_at: string | null
          visit_id: string | null
        }
        Insert: {
          batch_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          dosage?: number | null
          dosage_unit?: string | null
          id?: string
          is_evening?: boolean | null
          medication_product_id?: string | null
          notes?: string | null
          scheduled_date: string
          step_name: string
          step_number: number
          synchronization_id: string
          updated_at?: string | null
          visit_id?: string | null
        }
        Update: {
          batch_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          dosage?: number | null
          dosage_unit?: string | null
          id?: string
          is_evening?: boolean | null
          medication_product_id?: string | null
          notes?: string | null
          scheduled_date?: string
          step_name?: string
          step_number?: number
          synchronization_id?: string
          updated_at?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "synchronization_steps_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synchronization_steps_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "synchronization_steps_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "synchronization_steps_medication_product_id_fkey"
            columns: ["medication_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synchronization_steps_medication_product_id_fkey"
            columns: ["medication_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "synchronization_steps_medication_product_id_fkey"
            columns: ["medication_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "synchronization_steps_synchronization_id_fkey"
            columns: ["synchronization_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["sync_id"]
          },
          {
            foreignKeyName: "synchronization_steps_synchronization_id_fkey"
            columns: ["synchronization_id"]
            isOneToOne: false
            referencedRelation: "animal_synchronizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synchronization_steps_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "animal_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      teat_status: {
        Row: {
          animal_id: string
          created_at: string | null
          disabled_date: string | null
          disabled_reason: string | null
          id: string
          is_disabled: boolean | null
          teat_position: string
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          disabled_date?: string | null
          disabled_reason?: string | null
          id?: string
          is_disabled?: boolean | null
          teat_position: string
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          disabled_date?: string | null
          disabled_reason?: string | null
          id?: string
          is_disabled?: boolean | null
          teat_position?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "teat_status_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      tool_movements: {
        Row: {
          created_at: string | null
          from_holder: string | null
          from_location_id: string | null
          id: string
          movement_date: string | null
          movement_type: string
          notes: string | null
          recorded_by: string | null
          to_holder: string | null
          to_location_id: string | null
          tool_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_holder?: string | null
          from_location_id?: string | null
          id?: string
          movement_date?: string | null
          movement_type: string
          notes?: string | null
          recorded_by?: string | null
          to_holder?: string | null
          to_location_id?: string | null
          tool_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_holder?: string | null
          from_location_id?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string
          notes?: string | null
          recorded_by?: string | null
          to_holder?: string | null
          to_location_id?: string | null
          tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_movements_from_holder_fkey"
            columns: ["from_holder"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_to_holder_fkey"
            columns: ["to_holder"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_movements_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_parts_usage"
            referencedColumns: ["tool_id"]
          },
          {
            foreignKeyName: "tool_movements_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          calibration_due_date: string | null
          condition: string | null
          created_at: string | null
          created_by: string | null
          current_holder: string | null
          current_location_id: string | null
          id: string
          is_available: boolean | null
          name: string | null
          notes: string | null
          product_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          requires_certification: boolean | null
          serial_number: string | null
          tool_number: string
          type: string
        }
        Insert: {
          calibration_due_date?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_holder?: string | null
          current_location_id?: string | null
          id?: string
          is_available?: boolean | null
          name?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          requires_certification?: boolean | null
          serial_number?: string | null
          tool_number: string
          type: string
        }
        Update: {
          calibration_due_date?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_holder?: string | null
          current_location_id?: string | null
          id?: string
          is_available?: boolean | null
          name?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          requires_certification?: boolean | null
          serial_number?: string | null
          tool_number?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_current_holder_fkey"
            columns: ["current_holder"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "tools_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
        ]
      }
      treatment_courses: {
        Row: {
          batch_id: string | null
          created_at: string | null
          daily_dose: number | null
          days: number
          doses_administered: number | null
          id: string
          medication_schedule_flexible: boolean | null
          product_id: string
          start_date: string
          status: string | null
          teat: string | null
          total_dose: number | null
          treatment_id: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          daily_dose?: number | null
          days: number
          doses_administered?: number | null
          id?: string
          medication_schedule_flexible?: boolean | null
          product_id: string
          start_date?: string
          status?: string | null
          teat?: string | null
          total_dose?: number | null
          treatment_id: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          daily_dose?: number | null
          days?: number
          doses_administered?: number | null
          id?: string
          medication_schedule_flexible?: boolean | null
          product_id?: string
          start_date?: string
          status?: string | null
          teat?: string | null
          total_dose?: number | null
          treatment_id?: string
          unit?: Database["public"]["Enums"]["unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_courses_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_courses_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "treatment_courses_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_milk_loss_summary"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "vw_treated_animals"
            referencedColumns: ["treatment_id"]
          },
        ]
      }
      treatments: {
        Row: {
          affected_teats: Json | null
          animal_condition: string | null
          animal_id: string | null
          clinical_diagnosis: string | null
          created_at: string | null
          creates_future_visits: boolean | null
          disabled_teats: string[] | null
          disease_id: string | null
          first_symptoms_date: string | null
          id: string
          mastitis_teat: string | null
          mastitis_type: string | null
          notes: string | null
          outcome: string | null
          reg_date: string
          services: string | null
          sick_teats: Json | null
          syringe_count: number | null
          tests: string | null
          updated_at: string
          vet_name: string | null
          vet_signature_path: string | null
          visit_id: string | null
          withdrawal_until: string | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Insert: {
          affected_teats?: Json | null
          animal_condition?: string | null
          animal_id?: string | null
          clinical_diagnosis?: string | null
          created_at?: string | null
          creates_future_visits?: boolean | null
          disabled_teats?: string[] | null
          disease_id?: string | null
          first_symptoms_date?: string | null
          id?: string
          mastitis_teat?: string | null
          mastitis_type?: string | null
          notes?: string | null
          outcome?: string | null
          reg_date?: string
          services?: string | null
          sick_teats?: Json | null
          syringe_count?: number | null
          tests?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_signature_path?: string | null
          visit_id?: string | null
          withdrawal_until?: string | null
          withdrawal_until_meat?: string | null
          withdrawal_until_milk?: string | null
        }
        Update: {
          affected_teats?: Json | null
          animal_condition?: string | null
          animal_id?: string | null
          clinical_diagnosis?: string | null
          created_at?: string | null
          creates_future_visits?: boolean | null
          disabled_teats?: string[] | null
          disease_id?: string | null
          first_symptoms_date?: string | null
          id?: string
          mastitis_teat?: string | null
          mastitis_type?: string | null
          notes?: string | null
          outcome?: string | null
          reg_date?: string
          services?: string | null
          sick_teats?: Json | null
          syringe_count?: number | null
          tests?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_signature_path?: string | null
          visit_id?: string | null
          withdrawal_until?: string | null
          withdrawal_until_meat?: string | null
          withdrawal_until_milk?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["disease_id"]
          },
          {
            foreignKeyName: "treatments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "animal_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_items: {
        Row: {
          batch_id: string
          biocide_usage_id: string | null
          created_at: string | null
          id: string
          product_id: string
          purpose: string | null
          qty: number
          teat: string | null
          treatment_id: string | null
          unit: Database["public"]["Enums"]["unit"]
          updated_at: string
          vaccination_id: string | null
        }
        Insert: {
          batch_id: string
          biocide_usage_id?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          purpose?: string | null
          qty: number
          teat?: string | null
          treatment_id?: string | null
          unit: Database["public"]["Enums"]["unit"]
          updated_at?: string
          vaccination_id?: string | null
        }
        Update: {
          batch_id?: string
          biocide_usage_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          purpose?: string | null
          qty?: number
          teat?: string | null
          treatment_id?: string | null
          unit?: Database["public"]["Enums"]["unit"]
          updated_at?: string
          vaccination_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "usage_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "usage_items_biocide_usage_id_fkey"
            columns: ["biocide_usage_id"]
            isOneToOne: false
            referencedRelation: "biocide_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_items_biocide_usage_id_fkey"
            columns: ["biocide_usage_id"]
            isOneToOne: false
            referencedRelation: "vw_biocide_journal"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "usage_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "usage_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "usage_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "usage_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_milk_loss_summary"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "usage_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "vw_treated_animals"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "usage_items_vaccination_id_fkey"
            columns: ["vaccination_id"]
            isOneToOne: false
            referencedRelation: "vaccinations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          frozen_at: string | null
          frozen_by: string | null
          full_name: string
          id: string
          is_frozen: boolean
          last_login: string | null
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          frozen_at?: string | null
          frozen_by?: string | null
          full_name?: string
          id?: string
          is_frozen?: boolean
          last_login?: string | null
          password_hash: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          frozen_at?: string | null
          frozen_by?: string | null
          full_name?: string
          id?: string
          is_frozen?: boolean
          last_login?: string | null
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_frozen_by_fkey"
            columns: ["frozen_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          animal_id: string | null
          batch_id: string | null
          created_at: string | null
          dose_amount: number
          dose_number: number | null
          id: string
          next_booster_date: string | null
          notes: string | null
          product_id: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at: string
          vaccination_date: string
        }
        Insert: {
          administered_by?: string | null
          animal_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          dose_amount: number
          dose_number?: number | null
          id?: string
          next_booster_date?: string | null
          notes?: string | null
          product_id: string
          unit: Database["public"]["Enums"]["unit"]
          updated_at?: string
          vaccination_date?: string
        }
        Update: {
          administered_by?: string | null
          animal_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          dose_amount?: number
          dose_number?: number | null
          id?: string
          next_booster_date?: string | null
          notes?: string | null
          product_id?: string
          unit?: Database["public"]["Enums"]["unit"]
          updated_at?: string
          vaccination_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "vaccinations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "vaccinations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "vaccinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vaccinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vehicle_assignments: {
        Row: {
          assigned_date: string
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          ending_mileage: number | null
          id: string
          notes: string | null
          purpose: string | null
          return_date: string | null
          starting_mileage: number | null
          vehicle_id: string | null
        }
        Insert: {
          assigned_date: string
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          ending_mileage?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          return_date?: string | null
          starting_mileage?: number | null
          vehicle_id?: string | null
        }
        Update: {
          assigned_date?: string
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          ending_mileage?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          return_date?: string | null
          starting_mileage?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_name: string | null
          document_number: string | null
          document_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_name?: string | null
          document_number?: string | null
          document_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_name?: string | null
          document_number?: string | null
          document_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          fuel_cost: number
          fuel_quantity: number
          fuel_type: string | null
          id: string
          is_full_tank: boolean | null
          location: string | null
          notes: string | null
          odometer_reading: number | null
          refuel_date: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          fuel_cost: number
          fuel_quantity: number
          fuel_type?: string | null
          id?: string
          is_full_tank?: boolean | null
          location?: string | null
          notes?: string | null
          odometer_reading?: number | null
          refuel_date: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          fuel_cost?: number
          fuel_quantity?: number
          fuel_type?: string | null
          id?: string
          is_full_tank?: boolean | null
          location?: string | null
          notes?: string | null
          odometer_reading?: number | null
          refuel_date?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_service_visits: {
        Row: {
          actual_cost: number | null
          completed_at: string | null
          completed_by: string | null
          cost_estimate: number | null
          created_at: string | null
          created_by: string | null
          engine_hours: number | null
          id: string
          labor_hours: number | null
          mechanic_name: string | null
          next_visit_date: string | null
          next_visit_required: boolean | null
          notes: string | null
          odometer_reading: number | null
          procedures: string[] | null
          status: string
          vehicle_id: string
          visit_datetime: string
          visit_type: string
        }
        Insert: {
          actual_cost?: number | null
          completed_at?: string | null
          completed_by?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          engine_hours?: number | null
          id?: string
          labor_hours?: number | null
          mechanic_name?: string | null
          next_visit_date?: string | null
          next_visit_required?: boolean | null
          notes?: string | null
          odometer_reading?: number | null
          procedures?: string[] | null
          status?: string
          vehicle_id: string
          visit_datetime: string
          visit_type?: string
        }
        Update: {
          actual_cost?: number | null
          completed_at?: string | null
          completed_by?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          engine_hours?: number | null
          id?: string
          labor_hours?: number | null
          mechanic_name?: string | null
          next_visit_date?: string | null
          next_visit_required?: boolean | null
          notes?: string | null
          odometer_reading?: number | null
          procedures?: string[] | null
          status?: string
          vehicle_id?: string
          visit_datetime?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_service_visits_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_service_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_service_visits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_parts_usage"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_service_visits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_service_visits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_visit_parts: {
        Row: {
          batch_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_used: number
          visit_id: string
        }
        Insert: {
          batch_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_used: number
          visit_id: string
        }
        Update: {
          batch_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_used?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_visit_parts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vehicle_visit_parts_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_service_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          current_engine_hours: number | null
          current_mileage: number | null
          fuel_type: string | null
          home_location_id: string | null
          id: string
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_active: boolean | null
          last_service_date: string | null
          last_service_hours: number | null
          last_service_mileage: number | null
          make: string | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_number: string
          status: string | null
          tank_capacity: number | null
          technical_inspection_due_date: string | null
          vehicle_type: string
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          current_engine_hours?: number | null
          current_mileage?: number | null
          fuel_type?: string | null
          home_location_id?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          last_service_mileage?: number | null
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_number: string
          status?: string | null
          tank_capacity?: number | null
          technical_inspection_due_date?: string | null
          vehicle_type: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          current_engine_hours?: number | null
          current_mileage?: number | null
          fuel_type?: string | null
          home_location_id?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          last_service_mileage?: number | null
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_number?: string
          status?: string | null
          tank_capacity?: number | null
          technical_inspection_due_date?: string | null
          vehicle_type?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "equipment_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_labor: {
        Row: {
          created_at: string | null
          hourly_rate: number | null
          hours_worked: number
          id: string
          labor_type: string | null
          notes: string | null
          technician_id: string | null
          total_cost: number
          work_date: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number | null
          hours_worked: number
          id?: string
          labor_type?: string | null
          notes?: string | null
          technician_id?: string | null
          total_cost: number
          work_date: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number | null
          hours_worked?: number
          id?: string
          labor_type?: string | null
          notes?: string | null
          technician_id?: string | null
          total_cost?: number
          work_date?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_labor_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
          work_order_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
          work_order_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "equipment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cost_center_parts_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "work_order_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "equipment_warehouse_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          notes: string | null
          schedule_type: string
          shift_end: string | null
          shift_start: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          schedule_type?: string
          shift_end?: string | null
          shift_start?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          schedule_type?: string
          shift_end?: string | null
          shift_start?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      animal_milk_loss_by_synchronization: {
        Row: {
          animal_id: string | null
          animal_name: string | null
          animal_number: string | null
          avg_daily_milk_kg: number | null
          loss_days: number | null
          milk_loss_value_eur: number | null
          milk_price_used: number | null
          protocol_id: string | null
          protocol_name: string | null
          sync_end: string | null
          sync_id: string | null
          sync_start: string | null
          sync_status: string | null
          total_milk_lost_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_synchronizations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "synchronization_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_visit_summary: {
        Row: {
          animal_id: string | null
          last_visit: string | null
          next_visit: string | null
          species: string | null
          tag_no: string | null
        }
        Insert: {
          animal_id?: string | null
          last_visit?: never
          next_visit?: never
          species?: string | null
          tag_no?: string | null
        }
        Update: {
          animal_id?: string | null
          last_visit?: never
          next_visit?: never
          species?: string | null
          tag_no?: string | null
        }
        Relationships: []
      }
      cost_center_parts_usage: {
        Row: {
          assigned_at: string | null
          assigned_by_name: string | null
          assignment_notes: string | null
          category_name: string | null
          cost_center_color: string | null
          cost_center_description: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          item_description: string | null
          item_id: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          supplier_name: string | null
          total_price: number | null
          unit_price: number | null
          unit_type: string | null
        }
        Relationships: []
      }
      cost_center_summary: {
        Row: {
          color: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          description: string | null
          first_assignment_date: string | null
          is_active: boolean | null
          last_assignment_date: string | null
          total_assignments: number | null
          total_cost: number | null
        }
        Relationships: []
      }
      equipment_items_on_loan: {
        Row: {
          expected_return_date: string | null
          issuance_id: string | null
          issuance_number: string | null
          issue_date: string | null
          issued_to: string | null
          issued_to_name: string | null
          product_name: string | null
          quantity_issued: number | null
          quantity_outstanding: number | null
          quantity_returned: number | null
          status: string | null
          unit_price: number | null
          unit_type: string | null
          value_outstanding: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_issuances_issued_to_fkey"
            columns: ["issued_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_warehouse_stock: {
        Row: {
          avg_price: number | null
          batch_count: number | null
          category_name: string | null
          max_price: number | null
          min_price: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          total_qty: number | null
          total_value: number | null
          unit_type: string | null
        }
        Relationships: []
      }
      hoof_analytics_summary: {
        Row: {
          animal_id: string | null
          avg_severity: number | null
          days_since_last_trim: number | null
          last_examination_date: string | null
          most_common_condition: string | null
          pending_followups: number | null
          recurring_conditions_count: number | null
          species: string | null
          tag_no: string | null
          total_conditions_found: number | null
          total_examinations: number | null
          total_treatments: number | null
          total_trims: number | null
        }
        Relationships: []
      }
      hoof_condition_trends: {
        Row: {
          affected_animals_count: number | null
          avg_severity: number | null
          condition_code: string | null
          condition_name: string | null
          month: string | null
          occurrence_count: number | null
          severe_count: number | null
          treated_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_records_condition_code_fkey"
            columns: ["condition_code"]
            isOneToOne: false
            referencedRelation: "hoof_condition_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      hoof_followup_needed: {
        Row: {
          animal_id: string | null
          claw: string | null
          condition_code: string | null
          condition_name: string | null
          days_until_followup: number | null
          examination_date: string | null
          followup_date: string | null
          hoof_record_id: string | null
          leg: string | null
          notes: string | null
          severity: number | null
          tag_no: string | null
          technician_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_condition_code_fkey"
            columns: ["condition_code"]
            isOneToOne: false
            referencedRelation: "hoof_condition_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      hoof_recurring_problems: {
        Row: {
          animal_id: string | null
          claw: string | null
          condition_code: string | null
          condition_name: string | null
          days_between: number | null
          latest_examination: string | null
          leg: string | null
          previous_examination: string | null
          recurrence_count: number | null
          tag_no: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "hoof_records_condition_code_fkey"
            columns: ["condition_code"]
            isOneToOne: false
            referencedRelation: "hoof_condition_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      milk_data_combined: {
        Row: {
          collection_point: string | null
          company_name: string | null
          composition_paemimo_data: string | null
          composition_protocol_nr: string | null
          composition_recorded_at: string | null
          composition_test_id: string | null
          composition_tyrimo_data: string | null
          conversion_coefficient: number | null
          date: string | null
          event_type: string | null
          fat_percentage: number | null
          lactose_percentage: number | null
          measurement_timestamp: string | null
          milk_weight_kg: number | null
          non_compliance_pst: string | null
          ph_level: number | null
          producer_code: string | null
          producer_id: string | null
          protein_percentage: number | null
          quality_paemimo_data: string | null
          quality_protocol_nr: string | null
          quality_recorded_at: string | null
          quality_test_id: string | null
          quality_tyrimo_data: string | null
          region: string | null
          session_id: string | null
          session_type: string | null
          somatic_cell_count: number | null
          total_bacteria_count: number | null
          urea_mg_100ml: number | null
          weight_id: string | null
          weight_recorded_at: string | null
        }
        Relationships: []
      }
      stock_by_batch: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          lot: string | null
          mfg_date: string | null
          on_hand: number | null
          product_category:
            | Database["public"]["Enums"]["product_category"]
            | null
          product_id: string | null
          product_name: string | null
          received_qty: number | null
          status: string | null
          stock_status: string | null
          total_used: number | null
        }
        Relationships: []
      }
      stock_by_product: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null
          name: string | null
          on_hand: number | null
          product_id: string | null
        }
        Relationships: []
      }
      tool_parts_usage: {
        Row: {
          assigned_at: string | null
          assigned_by_name: string | null
          assignment_notes: string | null
          invoice_date: string | null
          invoice_number: string | null
          item_description: string | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          serial_number: string | null
          supplier_name: string | null
          tool_id: string | null
          tool_name: string | null
          tool_type: string | null
          total_price: number | null
          unit_price: number | null
        }
        Relationships: []
      }
      treatment_history_view: {
        Row: {
          animal_condition: string | null
          animal_id: string | null
          animal_tag: string | null
          clinical_diagnosis: string | null
          created_at: string | null
          disease_code: string | null
          disease_id: string | null
          disease_name: string | null
          first_symptoms_date: string | null
          mastitis_teat: string | null
          mastitis_type: string | null
          notes: string | null
          outcome: string | null
          owner_name: string | null
          products_used: Json | null
          reg_date: string | null
          services: string | null
          species: string | null
          syringe_count: number | null
          tests: string | null
          treatment_courses: Json | null
          treatment_id: string | null
          vet_name: string | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Relationships: []
      }
      treatment_milk_loss_summary: {
        Row: {
          animal_id: string | null
          animal_tag: string | null
          avg_daily_milk_kg: number | null
          clinical_diagnosis: string | null
          medications_used: Json | null
          milk_price_eur_per_kg: number | null
          safety_days: number | null
          total_loss_days: number | null
          total_milk_lost_kg: number | null
          total_value_lost_eur: number | null
          treatment_date: string | null
          treatment_id: string | null
          vet_name: string | null
          withdrawal_days: number | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vehicle_parts_usage: {
        Row: {
          assigned_at: string | null
          assigned_by_name: string | null
          assignment_notes: string | null
          invoice_date: string | null
          invoice_number: string | null
          item_description: string | null
          make: string | null
          model: string | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          registration_number: string | null
          supplier_name: string | null
          total_price: number | null
          unit_price: number | null
          vehicle_id: string | null
          vehicle_type: string | null
        }
        Relationships: []
      }
      vehicle_service_history: {
        Row: {
          last_service_date: string | null
          make: string | null
          model: string | null
          registration_number: string | null
          total_labor_hours: number | null
          total_service_cost: number | null
          total_services: number | null
          total_work_order_cost: number | null
          total_work_orders: number | null
          vehicle_id: string | null
        }
        Relationships: []
      }
      vet_analytics_summary: {
        Row: {
          active_days: number | null
          first_visit_date: string | null
          last_visit_date: string | null
          prevention_visits: number | null
          total_treatments_administered: number | null
          total_visits: number | null
          treatment_visits: number | null
          unique_animals_treated: number | null
          vaccination_visits: number | null
          vet_name: string | null
        }
        Relationships: []
      }
      vw_animal_cost_analytics: {
        Row: {
          animal_id: string | null
          medicine_cost: number | null
          tag_no: string | null
          total_cost: number | null
          treatment_count: number | null
          vaccination_count: number | null
          vaccine_cost: number | null
          visit_cost: number | null
          visit_count: number | null
        }
        Relationships: []
      }
      vw_animal_latest_collar: {
        Row: {
          animal_id: string | null
          collar_no: number | null
          last_snapshot_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_animal_milk_revenue: {
        Row: {
          animal_id: string | null
          avg_daily_milk: number | null
          collar_no: number | null
          current_group: number | null
          current_status: string | null
          days_in_withdrawal: number | null
          days_tracked: number | null
          first_date: string | null
          is_producing: boolean | null
          lactation_days: number | null
          last_date: string | null
          milk_revenue: number | null
          tag_no: string | null
          total_milk_liters: number | null
          withdrawal_revenue_loss: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_animal_product_usage: {
        Row: {
          animal_id: string | null
          category: Database["public"]["Enums"]["product_category"] | null
          product_id: string | null
          product_name: string | null
          total_cost: number | null
          total_quantity: number | null
          unit: Database["public"]["Enums"]["unit"] | null
          usage_count: number | null
          usage_rank: number | null
        }
        Relationships: []
      }
      vw_animal_profitability: {
        Row: {
          adjusted_milk_revenue: number | null
          animal_id: string | null
          avg_daily_milk: number | null
          collar_no: number | null
          cost_to_revenue_ratio: number | null
          current_group: number | null
          current_status: string | null
          days_in_withdrawal: number | null
          days_tracked: number | null
          first_date: string | null
          is_producing: boolean | null
          lactation_days: number | null
          last_date: string | null
          medication_costs: number | null
          milk_revenue: number | null
          net_profit: number | null
          roi_percentage: number | null
          tag_no: string | null
          total_costs: number | null
          total_milk_liters: number | null
          treatment_count: number | null
          vaccination_count: number | null
          visit_costs: number | null
          visit_count: number | null
          withdrawal_revenue_loss: number | null
        }
        Relationships: []
      }
      vw_animal_treatment_outcomes: {
        Row: {
          animal_id: string | null
          deceased_count: number | null
          ongoing_count: number | null
          recovered_count: number | null
          recovery_rate_percent: number | null
          tag_no: string | null
          total_treatments: number | null
          unknown_outcome_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_animal_visit_analytics: {
        Row: {
          animal_id: string | null
          avg_temperature: number | null
          cancelled_visits: number | null
          completed_visits: number | null
          first_visit: string | null
          last_visit: string | null
          max_temperature: number | null
          planned_visits: number | null
          tag_no: string | null
          temperature_checks: number | null
          total_visits: number | null
          treatments_required_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "animal_visits_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_biocide_journal: {
        Row: {
          active_substance: string | null
          applied_by: string | null
          batch_expiry: string | null
          batch_number: string | null
          biocide_name: string | null
          entry_id: string | null
          logged_at: string | null
          product_id: string | null
          purpose: string | null
          quantity_used: number | null
          registration_code: string | null
          unit: Database["public"]["Enums"]["unit"] | null
          use_date: string | null
          work_scope: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "biocide_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vw_course_schedules: {
        Row: {
          animal_id: string | null
          completed_visits: number | null
          course_id: string | null
          course_status: string | null
          medication_schedule_flexible: boolean | null
          pending_visits: number | null
          scheduled_dates: number | null
          start_date: string | null
          tag_no: string | null
          total_days: number | null
          treatment_id: string | null
          unique_medications: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_milk_loss_summary"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_courses_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "vw_treated_animals"
            referencedColumns: ["treatment_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_herd_profitability_summary: {
        Row: {
          avg_daily_milk_per_animal: number | null
          avg_profit_per_animal: number | null
          overall_cost_to_revenue_ratio: number | null
          profitable_count: number | null
          severe_loss_count: number | null
          total_animals: number | null
          total_herd_milk: number | null
          total_herd_profit: number | null
          total_milk_revenue: number | null
          total_treatment_costs: number | null
          total_withdrawal_days: number | null
          total_withdrawal_loss: number | null
          unprofitable_count: number | null
        }
        Relationships: []
      }
      vw_latest_animal_collars: {
        Row: {
          animal_id: string | null
          collar_no: number | null
          snapshot_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "gea_daily_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      vw_medical_waste: {
        Row: {
          entry_id: string | null
          logged_at: string | null
          quantity_generated: number | null
          quantity_transferred: number | null
          record_date: string | null
          reporting_period: string | null
          responsible_person: string | null
          transfer_date: string | null
          transfer_document: string | null
          waste_carrier: string | null
          waste_code: string | null
          waste_processor: string | null
          waste_type: string | null
        }
        Insert: {
          entry_id?: string | null
          logged_at?: string | null
          quantity_generated?: number | null
          quantity_transferred?: number | null
          record_date?: string | null
          reporting_period?: string | null
          responsible_person?: string | null
          transfer_date?: string | null
          transfer_document?: string | null
          waste_carrier?: string | null
          waste_code?: string | null
          waste_processor?: string | null
          waste_type?: string | null
        }
        Update: {
          entry_id?: string | null
          logged_at?: string | null
          quantity_generated?: number | null
          quantity_transferred?: number | null
          record_date?: string | null
          reporting_period?: string | null
          responsible_person?: string | null
          transfer_date?: string | null
          transfer_document?: string | null
          waste_carrier?: string | null
          waste_code?: string | null
          waste_processor?: string | null
          waste_type?: string | null
        }
        Relationships: []
      }
      vw_medical_waste_with_details: {
        Row: {
          auto_generated: boolean | null
          auto_generated_at: string | null
          batch_expiry: string | null
          batch_lot: string | null
          batch_mfg_date: string | null
          carrier: string | null
          created_at: string | null
          date: string | null
          doc_no: string | null
          id: string | null
          name: string | null
          package_count: number | null
          period: string | null
          processor: string | null
          product_category:
            | Database["public"]["Enums"]["product_category"]
            | null
          product_name: string | null
          qty_generated: number | null
          qty_transferred: number | null
          responsible: string | null
          source_batch_id: string | null
          source_product_id: string | null
          source_type: string | null
          transfer_date: string | null
          waste_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "medical_waste_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "vw_vet_drug_journal"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "medical_waste_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vw_milk_analytics: {
        Row: {
          animal_id: string | null
          avg_milk_per_session: number | null
          holder_name: string | null
          latest_fat_pct: number | null
          latest_milking_time: string | null
          latest_protein_pct: number | null
          latest_scc: number | null
          latest_test_date: string | null
          latest_test_status: string | null
          milk_today: number | null
          milkings_last_7_days: number | null
          species: string | null
          tag_no: string | null
          total_milk_7_days: number | null
        }
        Insert: {
          animal_id?: string | null
          avg_milk_per_session?: never
          holder_name?: string | null
          latest_fat_pct?: never
          latest_milking_time?: never
          latest_protein_pct?: never
          latest_scc?: never
          latest_test_date?: never
          latest_test_status?: never
          milk_today?: never
          milkings_last_7_days?: never
          species?: string | null
          tag_no?: string | null
          total_milk_7_days?: never
        }
        Update: {
          animal_id?: string | null
          avg_milk_per_session?: never
          holder_name?: string | null
          latest_fat_pct?: never
          latest_milking_time?: never
          latest_protein_pct?: never
          latest_scc?: never
          latest_test_date?: never
          latest_test_status?: never
          milk_today?: never
          milkings_last_7_days?: never
          species?: string | null
          tag_no?: string | null
          total_milk_7_days?: never
        }
        Relationships: []
      }
      vw_owner_admin_meds: {
        Row: {
          animal_id: string | null
          animal_tag: string | null
          batch_expiry: string | null
          batch_number: string | null
          course_id: string | null
          course_status: string | null
          daily_dose: number | null
          disease_id: string | null
          disease_name: string | null
          doses_administered: number | null
          first_admin_date: string | null
          owner_name: string | null
          prescribing_vet: string | null
          prescription_date: string | null
          product_id: string | null
          product_name: string | null
          registration_code: string | null
          species: string | null
          total_dose: number | null
          treatment_days: number | null
          unit: Database["public"]["Enums"]["unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "treatment_courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["disease_id"]
          },
        ]
      }
      vw_spend_per_animal: {
        Row: {
          animal_id: string | null
          tag_no: string | null
          total_spend: number | null
          treatment_count: number | null
        }
        Relationships: []
      }
      vw_teat_treatment_analytics: {
        Row: {
          animal_id: string | null
          first_treatment_date: string | null
          last_treatment_date: string | null
          new_case_count: number | null
          ongoing_count: number | null
          recovered_count: number | null
          recurring_case_count: number | null
          tag_no: string | null
          teat: string | null
          treatment_count: number | null
        }
        Relationships: []
      }
      vw_treated_animals: {
        Row: {
          animal_condition: string | null
          animal_id: string | null
          animal_tag: string | null
          clinical_diagnosis: string | null
          disease_code: string | null
          disease_id: string | null
          disease_name: string | null
          dose_summary: string | null
          first_symptoms_date: string | null
          notes: string | null
          owner_address: string | null
          owner_name: string | null
          products_used: string | null
          registration_date: string | null
          species: string | null
          treatment_days: number | null
          treatment_id: string | null
          treatment_outcome: string | null
          veterinarian: string | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["disease_id"]
          },
        ]
      }
      vw_treated_animals_detailed: {
        Row: {
          animal_condition: string | null
          animal_id: string | null
          animal_tag: string | null
          clinical_diagnosis: string | null
          disease_code: string | null
          disease_id: string | null
          disease_name: string | null
          dose: string | null
          first_symptoms_date: string | null
          medication_source: string | null
          notes: string | null
          owner_address: string | null
          owner_name: string | null
          product_name: string | null
          registration_date: string | null
          species: string | null
          treatment_days: number | null
          treatment_id: string | null
          treatment_outcome: string | null
          veterinarian: string | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Relationships: []
      }
      vw_treatment_roi_analysis: {
        Row: {
          animal_id: string | null
          avg_daily_milk: number | null
          avg_treatment_cost: number | null
          collar_no: number | null
          current_status: string | null
          current_total_costs: number | null
          days_to_payback_avg_treatment: number | null
          is_producing: boolean | null
          last_treatment_date: string | null
          net_profit: number | null
          ongoing_treatments: number | null
          recommendation: string | null
          success_rate_percentage: number | null
          successful_treatments: number | null
          tag_no: string | null
          total_treatment_cost: number | null
          treatment_count_last_90_days: number | null
        }
        Relationships: []
      }
      vw_vet_drug_journal: {
        Row: {
          active_substance: string | null
          batch_id: string | null
          batch_number: string | null
          expiry_date: string | null
          invoice_date: string | null
          invoice_number: string | null
          manufacture_date: string | null
          product_id: string | null
          product_name: string | null
          quantity_received: number | null
          quantity_remaining: number | null
          quantity_used: number | null
          receipt_date: string | null
          registration_code: string | null
          supplier_name: string | null
          unit: Database["public"]["Enums"]["unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_batch"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_by_product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vw_withdrawal_status: {
        Row: {
          animal_id: string | null
          meat_active: boolean | null
          meat_until: string | null
          milk_active: boolean | null
          milk_until: string | null
          tag_no: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_milk_loss_by_synchronization"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal_visit_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "hoof_analytics_summary"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "treatment_history_view"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_animal_cost_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_milk_analytics"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "vw_spend_per_animal"
            referencedColumns: ["animal_id"]
          },
        ]
      }
    }
    Functions: {
      auto_generate_medical_waste: {
        Args: { p_batch_id: string }
        Returns: string
      }
      calculate_average_daily_milk: {
        Args: { p_animal_id: string; p_before_date?: string }
        Returns: number
      }
      calculate_milk_loss_for_synchronization: {
        Args: { p_animal_id: string; p_sync_id: string }
        Returns: {
          avg_daily_milk: number
          milk_loss_value: number
          milk_price_per_kg: number
          sync_end_date: string
          sync_start_date: string
          total_days: number
          total_milk_lost: number
        }[]
      }
      calculate_treatment_milk_loss: {
        Args: { p_treatment_id: string }
        Returns: {
          animal_tag: string
          avg_daily_milk_kg: number
          milk_price_eur_per_kg: number
          safety_days: number
          total_loss_days: number
          total_milk_lost_kg: number
          total_value_lost_eur: number
          treatment_date: string
          withdrawal_days: number
          withdrawal_until: string
        }[]
      }
      calculate_withdrawal_dates: {
        Args: { p_treatment_id: string }
        Returns: undefined
      }
      cancel_animal_synchronization_protocols: {
        Args: { p_animal_id: string }
        Returns: number
      }
      complete_synchronization_step: {
        Args: {
          p_actual_dosage?: number
          p_actual_unit?: string
          p_batch_id?: string
          p_notes?: string
          p_step_id: string
        }
        Returns: boolean
      }
      course_has_flexible_schedule: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      create_user: {
        Args: { p_email: string; p_password: string; p_role?: string }
        Returns: string
      }
      deactivate_missing_animals: {
        Args: { _current_tag_nos: string[] }
        Returns: undefined
      }
      determine_session_type: {
        Args: { measurement_time: string; tz: string }
        Returns: string
      }
      fn_fifo_batch: { Args: { p_product_id: string }; Returns: string }
      freeze_user: {
        Args: { p_admin_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_equipment_issuance_number: { Args: never; Returns: string }
      generate_work_order_number: { Args: never; Returns: string }
      get_animal_avg_milk_at_date: {
        Args: { p_animal_id: string; p_date: string }
        Returns: number
      }
      get_course_progress: {
        Args: { p_course_id: string }
        Returns: {
          completed_visits: number
          next_visit_date: string
          pending_visits: number
          total_visits: number
        }[]
      }
      get_scheduled_medications_for_visit: {
        Args: { p_course_id: string; p_visit_date: string }
        Returns: {
          batch_id: string
          notes: string
          product_id: string
          product_name: string
          purpose: string
          schedule_id: string
          teat: string
          unit: string
        }[]
      }
      get_setting: {
        Args: { default_value?: number; key: string }
        Returns: number
      }
      get_user_audit_logs: {
        Args: { p_limit?: number; p_offset?: number; p_user_id?: string }
        Returns: {
          action: string
          created_at: string
          id: string
          ip_address: string
          new_data: Json
          old_data: Json
          record_id: string
          table_name: string
          user_agent: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_role: { Args: { user_uuid: string }; Returns: string }
      import_milk_data: { Args: { p_scraped_data: Json }; Returns: Json }
      initialize_animal_synchronization: {
        Args: {
          p_animal_id: string
          p_protocol_id: string
          p_start_date: string
        }
        Returns: string
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_user_frozen: { Args: { p_user_id: string }; Returns: boolean }
      link_medications_to_visit: {
        Args: { p_course_id: string; p_visit_date: string; p_visit_id: string }
        Returns: undefined
      }
      link_past_milk_tests_to_weights: { Args: never; Returns: Json }
      log_user_action: {
        Args: {
          p_action: string
          p_ip_address?: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      lookup_bom: { Args: { comp: string }; Returns: number }
      parse_milk_date: { Args: { date_str: string }; Returns: string }
      reset_planned_medication_quantities: {
        Args: { p_visit_id: string }
        Returns: undefined
      }
      sync_animals: { Args: { _rows: Json; _source?: string }; Returns: Json }
      unfreeze_user: {
        Args: { p_admin_id: string; p_user_id: string }
        Returns: boolean
      }
      update_last_login: { Args: { p_user_id: string }; Returns: boolean }
      update_user_password: {
        Args: { p_password: string; p_user_id: string }
        Returns: boolean
      }
      upsert_animals_json: { Args: { payload: Json }; Returns: Json }
      upsert_animals_named: {
        Args: { _deactivate_missing?: boolean; _rows: Json }
        Returns: Json
      }
      upsert_gea_daily: { Args: { payload: Json }; Returns: Json }
      upsert_milk_weight:
        | { Args: { p_payload: Json }; Returns: Json }
        | {
            Args: {
              p_hose_status: string
              p_measurement_timestamp: string
              p_raw_data: Json
              p_session_id: string
              p_stable_status: boolean
              p_timezone: string
              p_weight: number
            }
            Returns: Json
          }
      validate_visit_medications: {
        Args: { p_visit_id: string }
        Returns: {
          error_message: string
          is_valid: boolean
          missing_quantities: number
        }[]
      }
      verify_password: {
        Args: { p_email: string; p_password: string }
        Returns: {
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      visit_needs_medication_entry: {
        Args: { p_visit_id: string }
        Returns: boolean
      }
    }
    Enums: {
      product_category:
        | "medicines"
        | "prevention"
        | "reproduction"
        | "treatment_materials"
        | "hygiene"
        | "biocide"
        | "technical"
        | "svirkstukai"
        | "bolusas"
        | "vakcina"
      unit:
        | "ml"
        | "l"
        | "g"
        | "kg"
        | "pcs"
        | "vnt"
        | "tablet"
        | "bolus"
        | "syringe"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      product_category: [
        "medicines",
        "prevention",
        "reproduction",
        "treatment_materials",
        "hygiene",
        "biocide",
        "technical",
        "svirkstukai",
        "bolusas",
        "vakcina",
      ],
      unit: ["ml", "l", "g", "kg", "pcs", "vnt", "tablet", "bolus", "syringe"],
    },
  },
} as const
