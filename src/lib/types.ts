export type ProductCategory = 'medicines' | 'prevention' | 'vakcina' | 'reproduction' | 'treatment_materials' | 'hygiene' | 'biocide' | 'technical' | 'svirkstukai' | 'bolusas';
export type Unit = 'ml' | 'l' | 'g' | 'kg' | 'vnt' | 'pcs' | 'tabletkė' | 'bolus' | 'syringe';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  primary_pack_unit: Unit;
  primary_pack_size: number | null;
  active_substance: string | null;
  registration_code: string | null;
  withdrawal_days: number | null;
  dosage_notes: string | null;
  is_active: boolean;
  package_weight_g: number | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  vat_code: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  product_id: string;
  lot: string | null;
  mfg_date: string | null;
  expiry_date: string | null;
  supplier_id: string | null;
  doc_title: string | null;
  doc_number: string | null;
  doc_date: string | null;
  purchase_price: number | null;
  currency: string;
  received_qty: number;
  package_size: number | null;
  package_count: number | null;
  invoice_path: string | null;
  created_at: string;
}

export interface Animal {
  id: string;
  tag_no: string | null;
  collar_no: string | null;
  species: string;
  sex: string | null;
  age_months: number | null;
  holder_name: string | null;
  holder_address: string | null;
  created_at: string;
}

export interface Disease {
  id: string;
  code: string | null;
  name: string;
}

export interface Treatment {
  id: string;
  reg_date: string;
  first_symptoms_date: string | null;
  animal_condition: string | null;
  tests: string | null;
  clinical_diagnosis: string | null;
  outcome: string | null;
  services: string | null;
  withdrawal_until: string | null;
  vet_name: string | null;
  vet_signature_path: string | null;
  notes: string | null;
  animal_id: string | null;
  disease_id: string | null;
  created_at: string;
}

export interface UsageItem {
  id: string;
  treatment_id: string | null;  // Nullable - vaccinations don't have treatment_id
  product_id: string;
  batch_id: string;
  qty: number;
  unit: Unit;
  purpose: string;
  vaccination_id?: string | null;  // Links to vaccination if this usage came from a vaccination
  created_at: string;
}

export interface OwnerMedAdmin {
  id: string;
  first_admin_date: string;
  product_id: string | null;
  dose_qty: number | null;
  dose_unit: Unit | null;
  supplier_name: string | null;
  purchase_proof: string | null;
  animal_ident: string | null;
  prescribing_vet: string | null;
  prescribing_vet_contacts: string | null;
  withdrawal_until: string | null;
  treatment_duration_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface BiocideUsage {
  id: string;
  product_id: string;
  batch_id: string | null;
  use_date: string;
  purpose: string | null;
  work_scope: string | null;
  qty: number;
  unit: Unit;
  used_by_name: string | null;
  user_signature_path: string | null;
  created_at: string;
}

export interface MedicalWaste {
  id: string;
  waste_code: string;
  name: string;
  period: string | null;
  date: string | null;
  qty_generated: number | null;
  qty_transferred: number | null;
  carrier: string | null;
  processor: string | null;
  transfer_date: string | null;
  doc_no: string | null;
  responsible: string | null;
  auto_generated: boolean;
  source_batch_id: string | null;
  source_product_id: string | null;
  package_count: number | null;
  created_at: string;
}

export type WasteSource = 'automatic' | 'manual';

export interface MedicalWasteWithDetails extends MedicalWaste {
  source_type: WasteSource;
  product_name: string | null;
  product_category: ProductCategory | null;
  batch_lot: string | null;
  batch_expiry: string | null;
  batch_mfg_date: string | null;
  auto_generated_at: string | null;
}

export interface StockByBatch {
  batch_id: string;
  product_id: string;
  on_hand: number;
  expiry_date: string | null;
  lot: string | null;
  mfg_date: string | null;
}

export interface StockByProduct {
  product_id: string;
  name: string;
  category: ProductCategory;
  on_hand: number;
}

export type VisitStatus = 'Planuojamas' | 'Vykdomas' | 'Baigtas' | 'Atšauktas' | 'Neįvykęs';
export type VisitProcedure = 'Apžiūra' | 'Profilaktika' | 'Gydymas' | 'Vakcina' | 'Sinchronizacijos protokolas' | 'Nagai' | 'Kita';

export interface AnimalVisit {
  id: string;
  animal_id: string;
  visit_datetime: string;
  procedures: VisitProcedure[];
  temperature: number | null;
  temperature_measured_at: string | null;
  status: VisitStatus;
  notes: string | null;
  vet_name: string | null;
  next_visit_required: boolean;
  next_visit_date: string | null;
  treatment_required: boolean;
  created_at: string;
  updated_at: string;
  sync_step_id: string | null;
  related_treatment_id: string | null;
  planned_medications: any[] | null;
  medications_processed: boolean;
  related_visit_id: string | null;
}

export interface AnimalVisitSummary {
  animal_id: string;
  tag_no: string | null;
  species: string;
  next_visit: string | null;
  last_visit: string | null;
}

export type SynchronizationStatus = 'Active' | 'Completed' | 'Cancelled';

export interface SynchronizationProtocol {
  id: string;
  name: string;
  description: string | null;
  steps: ProtocolStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProtocolStep {
  step: number;
  medication: string;
  day_offset: number;
  is_evening?: boolean;
  is_insemination?: boolean;
}

export interface AnimalSynchronization {
  id: string;
  animal_id: string;
  protocol_id: string;
  start_date: string;
  status: SynchronizationStatus;
  insemination_date: string | null;
  insemination_number: string | null;
  result: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SynchronizationStep {
  id: string;
  synchronization_id: string;
  step_number: number;
  step_name: string;
  scheduled_date: string;
  is_evening: boolean;
  medication_product_id: string | null;
  dosage: number | null;
  dosage_unit: string | null;
  completed: boolean;
  completed_at: string | null;
  visit_id: string | null;
  batch_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SynchronizationStepWithDetails extends SynchronizationStep {
  product?: Product;
  batch?: Batch;
}

export interface AnimalSynchronizationWithDetails extends AnimalSynchronization {
  protocol?: SynchronizationProtocol;
  steps?: SynchronizationStepWithDetails[];
  animal?: Animal;
}

export type HoofLeg = 'LF' | 'RF' | 'LH' | 'RH';
export type HoofClaw = 'inner' | 'outer';

export interface HoofConditionCode {
  id: string;
  code: string;
  name_en: string;
  name_lt: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface HoofRecord {
  id: string;
  animal_id: string;
  examination_date: string;
  leg: HoofLeg;
  claw: HoofClaw;
  condition_code: string;
  severity: number;
  was_trimmed: boolean;
  was_treated: boolean;
  treatment_product_id: string | null;
  treatment_batch_id: string | null;
  treatment_quantity: number | null;
  treatment_unit: Unit | null;
  treatment_notes: string | null;
  bandage_applied: boolean;
  requires_followup: boolean;
  followup_date: string | null;
  followup_completed: boolean;
  technician_name: string | null;
  notes: string | null;
  visit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MastitisMilkData {
  animal_id: string;
  tag_no: string | null;
  collar_no: number | null;
  m1_total: number | null;
  m2_total: number | null;
  m3_total: number | null;
  m4_total: number | null;
  m5_total: number | null;
  total_milk_liters: number;
  days_tracked: number;
  first_milking_date: string | null;
  last_milking_date: string | null;
  first_group5_date: string | null;
  last_group5_date: string | null;
  days_in_group5: number | null;
}

export interface ProductUnitCost {
  batch_id: string;
  product_id: string;
  product_name: string;
  category: string;
  primary_pack_unit: string;
  lot: string | null;
  purchase_price: number | null;
  received_qty: number;
  unit_cost: number;
  package_size: number | null;
  package_count: number | null;
  batch_received_date: string;
}

export interface TreatmentCostDetail {
  treatment_id: string;
  animal_id: string;
  tag_no: string | null;
  disease_id: string | null;
  disease_name: string | null;
  treatment_start_date: string;
  treatment_end_date: string | null;
  outcome: string | null;
  visit_count: number;
  visit_costs: number;
  medication_costs: number;
  medication_item_count: number;
  total_treatment_cost: number;
}

export interface AnimalCostSummary {
  animal_id: string;
  tag_no: string | null;
  collar_no: string | null;
  treatment_count: number;
  total_visits: number;
  total_visit_costs: number;
  total_medication_costs: number;
  vaccination_count: number;
  total_vaccination_costs: number;
  total_costs: number;
}

export type InseminationProductType = 'SPERM' | 'GLOVES';

export interface InseminationProduct {
  id: string;
  name: string;
  product_type: InseminationProductType;
  supplier_group: string;
  unit: string;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InseminationInventory {
  id: string;
  product_id: string;
  quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  received_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: InseminationProduct;
}

export interface InseminationRecord {
  id: string;
  sync_step_id: string | null;
  animal_id: string;
  insemination_date: string;
  sperm_product_id: string;
  sperm_quantity: number;
  glove_product_id: string | null;
  glove_quantity: number | null;
  notes: string | null;
  performed_by: string | null;
  pregnancy_confirmed: boolean | null;
  pregnancy_check_date: string | null;
  pregnancy_notes: string | null;
  created_at: string;
  updated_at: string;
  animal?: Animal;
  sperm_product?: InseminationProduct;
  glove_product?: InseminationProduct;
}

export interface MilkLossCalculation {
  total_days: number;
  avg_daily_milk: number;
  total_milk_lost: number;
  milk_loss_value: number;
  milk_price_per_kg: number;
  sync_start_date: string;
  sync_end_date: string;
}

export interface AnimalMilkLossBySynchronization {
  animal_id: string;
  animal_number: string;
  animal_name: string | null;
  sync_id: string;
  sync_start: string;
  sync_end: string;
  sync_status: string;
  protocol_id: string | null;
  protocol_name: string | null;
  loss_days: number;
  avg_daily_milk_kg: number;
  total_milk_lost_kg: number;
  milk_loss_value_eur: number;
  milk_price_used: number;
}
