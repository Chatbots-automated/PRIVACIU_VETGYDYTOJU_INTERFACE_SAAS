import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatDateLT, formatNumberLT } from '../lib/formatters';
import { calculateSafeUnitCost, TREATMENT_COST_CONFIG, formatCost, formatUnitCost } from '../lib/costCalculations';
import { fetchAllRows } from '../lib/helpers';
import { useFarm } from '../contexts/FarmContext';
import { Euro, Activity, Syringe, Calendar, TrendingDown, Package, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
// TreatmentMilkLossAnalysis removed - GEA integration no longer available

interface AnimalCostData {
  animal_id: string;
  tag_no: string | null;
  treatment_count: number;
  visit_count: number;
  visit_costs: number;
  medication_costs: number;
  medication_costs_from_usage_items: number;
  medication_costs_from_sync: number;
  vaccination_count: number;
  vaccination_costs: number;
  total_costs: number;
  earliest_visit_date: string | null;
  latest_visit_date: string | null;
}

interface MedicationDetail {
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  is_vaccine?: boolean;
}

interface TreatmentDetail {
  treatment_id: string;
  disease_name: string | null;
  start_date: string;
  end_date: string | null;
  visit_count: number;
  visit_cost: number;
  medication_cost: number;
  medications: MedicationDetail[];
  total_cost: number;
}

interface VisitDetail {
  id: string;
  visit_datetime: string;
  status: string;
  procedures: string | null;
  notes: string | null;
  vet_name: string | null;
  treatment_info: {
    disease_name: string | null;
    treatment_id: string | null;
  } | null;
  all_products: MedicationDetail[];
  total_products_cost: number;
}

interface AnimalDetailData {
  visits: VisitDetail[];
}

interface RawData {
  animals: Array<{ id: string; tag_no: string | null }>;
  treatments: any[];
  usageItems: any[];
  vaccinations: any[];
  visits: any[];
  syncs: any[];
  syncSteps: any[];
}

export function TreatmentCostAnalysis() {
  const { selectedFarm } = useFarm();
  const [costData, setCostData] = useState<AnimalCostData[]>([]);
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [animalDetails, setAnimalDetails] = useState<Map<string, AnimalDetailData>>(new Map());
  const [sortBy, setSortBy] = useState<'total' | 'visits' | 'medications' | 'vaccinations' | 'tag_no' | 'visit_count' | 'treatment_count'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minCost, setMinCost] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Milk loss modal removed - GEA integration no longer available

  useEffect(() => {
    loadCostData();
  }, [selectedFarm]);

  // Recalculate costs when date filters change
  useEffect(() => {
    if (!rawData) return;

    const recalculateCosts = () => {
      const { animals, treatments, usageItems, vaccinations, visits, syncs, syncSteps, servicePrices } = rawData;
      
      // Helper function to calculate visit service cost based on procedures
      const calculateVisitServiceCost = (procedures: string[] | string | null): number => {
        if (!procedures || (Array.isArray(procedures) && procedures.length === 0)) return 0;
        
        const proceduresArray = Array.isArray(procedures) ? procedures : [procedures];
        let totalCost = 0;
        for (const procedure of proceduresArray) {
          const price = servicePrices.get(procedure) || 0;
          totalCost += price;
        }
        return totalCost;
      };

      const animalCosts: AnimalCostData[] = [];

      for (const animal of animals) {
        const animalTreatments = treatments.filter(t => t.animal_id === animal.id);
        const animalVaccinations = vaccinations.filter(v => v.animal_id === animal.id);
        const animalSyncs = syncs.filter(s => s.animal_id === animal.id);

        // Filter visits by date range
        let completedVisits = visits.filter(v =>
          v.animal_id === animal.id && v.status === 'Baigtas'
        );

        if (dateFrom || dateTo) {
          completedVisits = completedVisits.filter(v => {
            const visitDate = v.visit_datetime.split('T')[0]; // Get date part only
            if (dateFrom && visitDate < dateFrom) return false;
            if (dateTo && visitDate > dateTo) return false;
            return true;
          });
        }

        // Get treatment IDs from filtered visits only
        const treatmentIdsInRange = new Set(
          animalTreatments
            .filter(t => {
              // Find if this treatment has a visit in the date range
              return completedVisits.some(v => {
                // Check if treatment was created around the visit time
                const treatmentDate = t.reg_date?.split('T')[0];
                return treatmentDate; // Include if we have a treatment date
              });
            })
            .map(t => t.id)
        );

        // Filter vaccinations by date range
        let filteredVaccinations = animalVaccinations;
        if (dateFrom || dateTo) {
          filteredVaccinations = filteredVaccinations.filter(v => {
            const vaccDate = v.vaccination_date;
            if (dateFrom && vaccDate < dateFrom) return false;
            if (dateTo && vaccDate > dateTo) return false;
            return true;
          });
        }

        // Filter syncs by date range
        let filteredSyncs = animalSyncs;
        if (dateFrom || dateTo) {
          filteredSyncs = filteredSyncs.filter(s => {
            const syncDate = s.start_date;
            if (dateFrom && syncDate < dateFrom) return false;
            if (dateTo && syncDate > dateTo) return false;
            return true;
          });
        }

        // Calculate medication costs from usage items (only for treatments with visits in range)
        let medicationCostsFromUsageItems = 0;
        for (const usage of usageItems) {
          if (treatmentIdsInRange.has(usage.treatment_id) && usage.batches && usage.quantity) {
            const unitCost = calculateSafeUnitCost(
              usage.batches.purchase_price,
              usage.batches.qty_received
            );
            medicationCostsFromUsageItems += usage.quantity * unitCost;
          }
        }

        // In SaaS schema, all medication costs (including sync) are tracked in usage_items
        const medicationCosts = medicationCostsFromUsageItems;

        // Calculate vaccination costs (only for vaccinations in range)
        let vaccinationCosts = 0;
        
        // Include legacy vaccinations from the vaccinations table
        for (const vaccination of filteredVaccinations) {
          if (vaccination.batches && vaccination.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vaccination.batches.purchase_price,
              vaccination.batches.qty_received
            );
            vaccinationCosts += vaccination.dose_amount * unitCost;
          }
        }

        // Calculate visit costs based on actual service prices (only for visits in range)
        const visitCount = completedVisits.length;
        let visitCosts = 0;
        for (const visit of completedVisits) {
          visitCosts += calculateVisitServiceCost(visit.procedures);
        }

        const totalCosts = visitCosts + medicationCosts + vaccinationCosts;

        // Get earliest and latest visit dates (from filtered visits)
        let earliestVisitDate: string | null = null;
        let latestVisitDate: string | null = null;
        if (completedVisits.length > 0) {
          const visitDates = completedVisits.map(v => v.visit_datetime).sort();
          earliestVisitDate = visitDates[0];
          latestVisitDate = visitDates[visitDates.length - 1];
        }

        // Include animals with activity in the filtered date range
        if (visitCount > 0 || filteredVaccinations.length > 0 || filteredSyncs.length > 0) {
          animalCosts.push({
            animal_id: animal.id,
            tag_no: animal.tag_no,
            treatment_count: treatmentIdsInRange.size,
            visit_count: visitCount,
            visit_costs: visitCosts,
            medication_costs: medicationCosts,
            medication_costs_from_usage_items: medicationCostsFromUsageItems,
            medication_costs_from_sync: 0, // SaaS: included in usage_items
            vaccination_count: filteredVaccinations.length,
            vaccination_costs: vaccinationCosts,
            total_costs: totalCosts,
            earliest_visit_date: earliestVisitDate,
            latest_visit_date: latestVisitDate,
          });
        }
      }

      setCostData(animalCosts);
    };

    recalculateCosts();
  }, [rawData, dateFrom, dateTo]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      if (!selectedFarm) {
        setLoading(false);
        return;
      }

      // Get all animals using pagination helper
      const animalsRes = await supabase.from('animals').select('id, tag_no').eq('farm_id', selectedFarm.id).order('tag_no');
      const animals = animalsRes.data || [];

      console.log('Animals loaded:', animals?.length);

      // Get all treatments (all time)
      const treatmentsRes = await supabase
        .from('treatments')
        .select(`
          id,
          animal_id,
          disease_id,
          reg_date,
          outcome,
          diseases(name)
        `)
        .eq('farm_id', selectedFarm.id);
      const treatments = treatmentsRes.data || [];

      console.log('Treatments loaded:', treatments?.length);

      // Get all usage items with batch info
      const { data: usageItems, error: usageError } = await supabase
        .from('usage_items')
        .select(`
          id,
          treatment_id,
          vaccination_id,
          product_id,
          batch_id,
          quantity,
          administered_date,
          batches(purchase_price, qty_received)
        `)
        .eq('farm_id', selectedFarm.id);

      if (usageError) {
        console.error('Usage items error:', usageError);
        throw usageError;
      }

      console.log('Usage items loaded:', usageItems?.length);

      // Get all vaccinations (all time)
      const { data: vaccinationsData, error: vaccinationsError } = await supabase
        .from('vaccinations')
        .select('id, animal_id, dose_amount, batch_id, vaccination_date')
        .eq('farm_id', selectedFarm.id);

      if (vaccinationsError) {
        console.error('Vaccinations error:', vaccinationsError);
        throw vaccinationsError;
      }

      // Get batch info separately for vaccinations
      const vaccinationBatchIds = [...new Set(vaccinationsData?.filter(v => v.batch_id).map(v => v.batch_id))];
      const { data: vaccinationBatches } = await supabase
        .from('batches')
        .select('id, purchase_price, qty_received')
        .in('id', vaccinationBatchIds.length > 0 ? vaccinationBatchIds : ['00000000-0000-0000-0000-000000000000']);

      // Merge batch data with vaccinations
      const vaccinations = vaccinationsData?.map(v => ({
        ...v,
        batches: v.batch_id ? vaccinationBatches?.find(b => b.id === v.batch_id) : null
      })) || [];

      console.log('Vaccinations loaded:', vaccinations?.length);

      // Get all visits with dates and procedures for cost calculation
      const { data: visits, error: visitsError } = await supabase
        .from('animal_visits')
        .select('id, animal_id, visit_datetime, status, procedures')
        .eq('farm_id', selectedFarm.id);

      if (visitsError) throw visitsError;

      // NOTE: In SaaS schema, synchronization medication costs are tracked via usage_items table
      // Synchronization steps only track protocol scheduling, not actual usage/costs
      // Skipping synchronization_steps query to avoid schema incompatibility
      console.log('ℹ️ Sync medication costs tracked via usage_items (SaaS schema)');
      
      // Load service prices for visit cost calculations
      // Note: service_prices are per client, not per farm
      const { data: clientData } = await supabase
        .from('farms')
        .select('client_id')
        .eq('id', selectedFarm.id)
        .single();
      
      const { data: servicePricesData, error: servicePricesError} = await supabase
        .from('service_prices')
        .select('procedure_type, base_price')
        .eq('client_id', clientData?.client_id)
        .eq('active', true);
      
      if (servicePricesError) {
        console.error('Service prices error:', servicePricesError);
      }
      
      // Create a map of procedure_type -> price
      const servicePricesMap = new Map<string, number>();
      if (servicePricesData) {
        for (const price of servicePricesData) {
          servicePricesMap.set(price.procedure_type, price.base_price);
        }
      }
      
      console.log('Service prices loaded:', servicePricesMap.size);

      // Helper function to calculate visit service cost based on procedures
      const calculateVisitServiceCost = (procedures: string[] | string | null): number => {
        if (!procedures || (Array.isArray(procedures) && procedures.length === 0)) return 0;
        
        const proceduresArray = Array.isArray(procedures) ? procedures : [procedures];
        let totalCost = 0;
        for (const procedure of proceduresArray) {
          const price = servicePricesMap.get(procedure) || 0;
          totalCost += price;
        }
        return totalCost;
      };

      // Calculate costs for each animal
      const animalCosts: AnimalCostData[] = [];

      for (const animal of animals || []) {
        const animalTreatments = (treatments || []).filter(t => t.animal_id === animal.id);
        const animalVaccinations = (vaccinations || []).filter(v => v.animal_id === animal.id);
        const completedVisits = (visits || []).filter(v =>
          v.animal_id === animal.id && v.status === 'Baigtas'
        );

        // Calculate medication costs from usage items
        let medicationCostsFromUsageItems = 0;
        for (const treatment of animalTreatments) {
          const treatmentUsage = (usageItems || []).filter(ui => ui.treatment_id === treatment.id);
          for (const usage of treatmentUsage) {
            if (usage.batches && usage.quantity) {
              const unitCost = calculateSafeUnitCost(
                usage.batches.purchase_price,
                usage.batches.qty_received
              );
              medicationCostsFromUsageItems += usage.quantity * unitCost;
            }
          }
        }

        // NOTE: We DO NOT add planned_medications here because they are converted to usage_items
        // when visits are completed. Adding both would be double-counting!
        // The dropdown detail view handles planned_medications with proper duplicate detection.

        // In SaaS schema, all medication costs (including sync medications) are in usage_items
        const medicationCosts = medicationCostsFromUsageItems;

        // Calculate vaccination costs
        // NOTE: New vaccinations are tracked in usage_items with purpose='vaccination'
        let vaccinationCosts = 0;
        
        // Get all usage items for this animal (for vaccination cost from usage_items)
        const animalUsageItems = (usageItems || []).filter(ui => {
          const treatment = animalTreatments.find(t => t.id === ui.treatment_id);
          return treatment !== undefined;
        });
        
        // Get vaccination costs from usage_items (NEW method)
        // In SaaS schema, vaccination usage has vaccination_id set (no purpose field)
        for (const item of animalUsageItems) {
          if (item.batches && item.quantity && item.vaccination_id) {
            const unitCost = calculateSafeUnitCost(
              item.batches.purchase_price,
              item.batches.qty_received
            );
            vaccinationCosts += item.quantity * unitCost;
          }
        }
        
        // Also include legacy vaccinations (that don't have usage_items)
        for (const vaccination of animalVaccinations) {
          // Skip if this vaccination has usage_items (already counted above)
          const hasUsageItem = usageItems?.some(ui => ui.vaccination_id === vaccination.id);
          if (hasUsageItem) continue;
          
          if (vaccination.batches && vaccination.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vaccination.batches.purchase_price,
              vaccination.batches.qty_received
            );
            vaccinationCosts += vaccination.dose_amount * unitCost;
          }
        }

        // Calculate visit costs based on actual service prices
        const visitCount = completedVisits.length;
        let visitCosts = 0;
        for (const visit of completedVisits) {
          visitCosts += calculateVisitServiceCost(visit.procedures);
        }

        const totalCosts = visitCosts + medicationCosts + vaccinationCosts;

        // Get earliest and latest visit dates
        let earliestVisitDate: string | null = null;
        let latestVisitDate: string | null = null;
        if (completedVisits.length > 0) {
          const visitDates = completedVisits.map(v => v.visit_datetime).sort();
          earliestVisitDate = visitDates[0];
          latestVisitDate = visitDates[visitDates.length - 1];
        }

        // Include animals with any treatment activity OR synchronizations
        if (animalTreatments.length > 0 || animalVaccinations.length > 0 || visitCount > 0 || animalSyncs.length > 0) {
          animalCosts.push({
            animal_id: animal.id,
            tag_no: animal.tag_no,
            treatment_count: animalTreatments.length,
            visit_count: visitCount,
            visit_costs: visitCosts,
            medication_costs: medicationCosts,
            medication_costs_from_usage_items: medicationCostsFromUsageItems,
            medication_costs_from_sync: 0, // SaaS: included in usage_items
            vaccination_count: animalVaccinations.length,
            vaccination_costs: vaccinationCosts,
            total_costs: totalCosts,
            earliest_visit_date: earliestVisitDate,
            latest_visit_date: latestVisitDate,
          });
        }
      }

      console.log('Final animal costs calculated:', animalCosts.length);
      console.log('Sample data:', animalCosts.slice(0, 3));
      setCostData(animalCosts);

      // Store raw data for filtering
      setRawData({
        animals: animals || [],
        treatments: treatments || [],
        usageItems: usageItems || [],
        vaccinations: vaccinations || [],
        visits: visits || [],
        syncs: [], // SaaS: not loaded (sync costs in usage_items)
        syncSteps: [], // SaaS: not loaded (sync costs in usage_items)
        servicePrices: servicePricesMap,
      });
    } catch (error) {
      console.error('Error loading cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimalDetails = async (animalId: string) => {
    if (animalDetails.has(animalId)) {
      return; // Already loaded
    }

    try {
      // Get all visits for this animal
      const { data: visits } = await supabase
        .from('animal_visits')
        .select('id, visit_datetime, status, procedures, notes, vet_name, planned_medications')
        .eq('animal_id', animalId)
        .eq('status', 'Baigtas')
        .order('visit_datetime', { ascending: false });

      const visitDetails: VisitDetail[] = [];

      for (const visit of visits || []) {
        let totalProductsCost = 0;
        const allProducts: MedicationDetail[] = [];

        // 1. Get treatment info for this visit (if exists)
        const { data: treatment } = await supabase
          .from('treatments')
          .select('id, diseases(name)')
          .eq('visit_id', visit.id)
          .maybeSingle();

        const treatmentInfo = treatment ? {
          disease_name: (treatment.diseases as any)?.name || null,
          treatment_id: treatment.id
        } : null;

        // 2. Get ALL usage_items for this visit's treatment (medicines, gloves, supplies, EVERYTHING)
        if (treatment?.id) {
          const { data: usageItems } = await supabase
            .from('usage_items')
            .select(`
              quantity,
              products(name, primary_pack_unit, category, subcategory),
              batches(purchase_price, qty_received)
            `)
            .eq('treatment_id', treatment.id);

          for (const usage of usageItems || []) {
            if (usage.batches && usage.quantity) {
              const unitCost = calculateSafeUnitCost(
                usage.batches.purchase_price,
                usage.batches.qty_received
              );
              const itemCost = usage.quantity * unitCost;

              // Debug logging for math verification
              if (usage.quantity >= 40 && unitCost > 0) {
                console.log('=== MATH VERIFICATION ===');
                console.log('Product:', (usage.products as any)?.name);
                console.log('Quantity:', usage.quantity, (usage.products as any)?.primary_pack_unit);
                console.log('Batch purchase price:', usage.batches.purchase_price);
                console.log('Batch received qty:', usage.batches.qty_received);
                console.log('Unit cost:', unitCost.toFixed(6));
                console.log('Calculation:', usage.quantity, '×', unitCost.toFixed(6), '=', itemCost.toFixed(6));
                console.log('Expected for 40×0.03:', (40 * 0.03).toFixed(2));
                console.log('Actual result:', itemCost.toFixed(2));
                console.log('========================');
              }

              totalProductsCost += itemCost;

              // Check if it's a vaccine based on category or subcategory
              const isVaccine = ['prevention', 'ovules', 'vakcina'].includes((usage.products as any)?.category) ||
                               (usage.products as any)?.subcategory === 'Vakcinos' ||
                               (usage.products as any)?.name?.toLowerCase().includes('vakcin');

              allProducts.push({
                name: (usage.products as any)?.name || 'Nežinomas produktas',
                quantity: usage.quantity,
                unit: (usage.products as any)?.primary_pack_unit || 'vnt',
                unit_cost: unitCost,
                total_cost: itemCost,
                is_vaccine: isVaccine,
              });
            }
          }
        }

        // 3. Get ALL vaccinations for this visit (prevention products like Rycaps, Hydrocaps, etc.)
        // Vaccinations are linked to animal_id, not visit_id, so we match by date
        const visitDate = new Date(visit.visit_datetime).toISOString().split('T')[0];
        const { data: vaccinations } = await supabase
          .from('vaccinations')
          .select(`
            dose_amount,
            unit,
            vaccination_date,
            products(name, primary_pack_unit, category),
            batches(purchase_price, qty_received)
          `)
          .eq('animal_id', animalId)
          .eq('vaccination_date', visitDate);

        for (const vacc of vaccinations || []) {
          if (vacc.batches && vacc.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vacc.batches.purchase_price,
              vacc.batches.qty_received
            );
            const itemCost = vacc.dose_amount * unitCost;

            totalProductsCost += itemCost;

            allProducts.push({
              name: (vacc.products as any)?.name || 'Nežinomas produktas',
              quantity: vacc.dose_amount,
              unit: vacc.unit || (vacc.products as any)?.primary_pack_unit || 'vnt',
              unit_cost: unitCost,
              total_cost: itemCost,
              is_vaccine: true,
            });
          }
        }

        // 4. ALSO add products from planned_medications (in case they weren't processed yet)
        const plannedMeds = visit.planned_medications as any[];
        if (plannedMeds && Array.isArray(plannedMeds)) {
          for (const med of plannedMeds) {
            const { data: product } = await supabase
              .from('products')
              .select('name, primary_pack_unit, category, subcategory')
              .eq('id', med.product_id)
              .maybeSingle();

            const { data: batch } = await supabase
              .from('batches')
              .select('purchase_price, qty_received')
              .eq('id', med.batch_id)
              .maybeSingle();

            if (batch && med.quantity) {
              const unitCost = calculateSafeUnitCost(
                batch.purchase_price,
                batch.qty_received
              );
              const itemCost = med.quantity * unitCost;

              // Check if this product is already in allProducts (avoid duplicates)
              const alreadyExists = allProducts.some(p =>
                p.name === (product?.name || 'Nežinomas produktas') &&
                p.quantity === med.quantity
              );

              if (!alreadyExists) {
                totalProductsCost += itemCost;

                // Check if it's a vaccine based on category or subcategory
                const isVaccine = ['prevention', 'ovules', 'vakcina'].includes(product?.category) ||
                                 product?.subcategory === 'Vakcinos' ||
                                 product?.name?.toLowerCase().includes('vakcin');

                allProducts.push({
                  name: product?.name || 'Nežinomas produktas',
                  quantity: med.quantity,
                  unit: med.unit || product?.primary_pack_unit || 'vnt',
                  unit_cost: unitCost,
                  total_cost: itemCost,
                  is_vaccine: isVaccine,
                });
              }
            }
          }
        }

        // Debug logging for cost calculation
        if (allProducts.length > 0) {
          console.log(`\n🔍 Visit ${visit.visit_datetime} - Cost Breakdown:`);
          let sumCheck = 0;
          allProducts.forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.name}: ${p.quantity} × €${p.unit_cost.toFixed(6)} = €${p.total_cost.toFixed(6)}`);
            sumCheck += p.total_cost;
          });
          console.log(`  ➕ Sum of individual costs: €${sumCheck.toFixed(6)}`);
          console.log(`  📊 Total products cost: €${totalProductsCost.toFixed(6)}`);
          console.log(`  ✅ Rounded display: €${totalProductsCost.toFixed(2)}`);
          if (Math.abs(sumCheck - totalProductsCost) > 0.001) {
            console.log(`  ⚠️ MISMATCH DETECTED!`);
          }
        }

        visitDetails.push({
          id: visit.id,
          visit_datetime: visit.visit_datetime,
          status: visit.status,
          procedures: visit.procedures,
          notes: visit.notes,
          vet_name: visit.vet_name,
          treatment_info: treatmentInfo,
          all_products: allProducts,
          total_products_cost: totalProductsCost,
        });
      }

      // Also load standalone vaccinations (not associated with any visit)
      const { data: allVaccinations } = await supabase
        .from('vaccinations')
        .select(`
          id,
          dose_amount,
          unit,
          vaccination_date,
          products(name, primary_pack_unit, category),
          batches(purchase_price, qty_received)
        `)
        .eq('animal_id', animalId)
        .order('vaccination_date', { ascending: false });

      // Get dates of visits to exclude vaccinations already included
      const visitDates = new Set((visits || []).map(v =>
        new Date(v.visit_datetime).toISOString().split('T')[0]
      ));

      // Create synthetic "visit" entries for standalone vaccinations
      const standaloneVaccsByDate = new Map<string, any[]>();

      for (const vacc of allVaccinations || []) {
        const vaccDate = new Date(vacc.vaccination_date).toISOString().split('T')[0];

        // Skip if this vaccination date matches a visit date (already included)
        if (visitDates.has(vaccDate)) continue;

        if (!standaloneVaccsByDate.has(vaccDate)) {
          standaloneVaccsByDate.set(vaccDate, []);
        }
        standaloneVaccsByDate.get(vaccDate)!.push(vacc);
      }

      // Add standalone vaccinations as synthetic visits
      for (const [vaccDate, vaccs] of standaloneVaccsByDate.entries()) {
        let totalVaccCost = 0;
        const vaccProducts: MedicationDetail[] = [];

        for (const vacc of vaccs) {
          if (vacc.batches && vacc.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vacc.batches.purchase_price,
              vacc.batches.qty_received
            );
            const itemCost = vacc.dose_amount * unitCost;

            totalVaccCost += itemCost;
            vaccProducts.push({
              name: (vacc.products as any)?.name || 'Nežinomas produktas',
              quantity: vacc.dose_amount,
              unit: vacc.unit || (vacc.products as any)?.primary_pack_unit || 'vnt',
              unit_cost: unitCost,
              total_cost: itemCost,
              is_vaccine: true,
            });
          }
        }

        // Add as a synthetic visit for standalone vaccinations
        visitDetails.push({
          id: `vacc-${vaccDate}`,
          visit_datetime: vaccDate,
          status: 'Baigtas',
          procedures: ['Vakcina'],
          notes: 'Vakcinacija be vizito',
          vet_name: null,
          treatment_info: null,
          all_products: vaccProducts,
          total_products_cost: totalVaccCost,
        });
      }

      // Sort all visit details by date (newest first)
      visitDetails.sort((a, b) =>
        new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime()
      );

      setAnimalDetails(prev => new Map(prev).set(animalId, {
        visits: visitDetails
      }));
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  const toggleExpand = (animalId: string) => {
    if (expandedAnimal === animalId) {
      setExpandedAnimal(null);
      setExpandedVisits(new Set()); // Clear expanded visits when collapsing
    } else {
      setExpandedAnimal(animalId);
      setExpandedVisits(new Set()); // Clear previous expanded visits
      loadAnimalDetails(animalId);
    }
  };

  const toggleVisitExpand = (visitId: string) => {
    setExpandedVisits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  const filteredData = costData.filter(animal => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!animal.tag_no?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Minimum cost filter
    if (minCost) {
      const minCostNum = parseFloat(minCost);
      if (!isNaN(minCostNum) && animal.total_costs < minCostNum) {
        return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setMinCost('');
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo || minCost;

  const sortedData = [...filteredData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'total':
        compareValue = a.total_costs - b.total_costs;
        break;
      case 'visits':
        compareValue = a.visit_costs - b.visit_costs;
        break;
      case 'medications':
        compareValue = a.medication_costs - b.medication_costs;
        break;
      case 'vaccinations':
        compareValue = a.vaccination_costs - b.vaccination_costs;
        break;
      case 'visit_count':
        compareValue = a.visit_count - b.visit_count;
        break;
      case 'treatment_count':
        compareValue = a.treatment_count - b.treatment_count;
        break;
      case 'tag_no':
        compareValue = (a.tag_no || '').localeCompare(b.tag_no || '', 'lt');
        break;
    }
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  const totalStats = filteredData.reduce(
    (acc, row) => ({
      totalAnimals: acc.totalAnimals + 1,
      totalVisits: acc.totalVisits + row.visit_count,
      totalVisitCosts: acc.totalVisitCosts + row.visit_costs,
      totalMedicationCosts: acc.totalMedicationCosts + row.medication_costs,
      totalMedicationCostsFromUsageItems: acc.totalMedicationCostsFromUsageItems + row.medication_costs_from_usage_items,
      totalMedicationCostsFromSync: acc.totalMedicationCostsFromSync + row.medication_costs_from_sync,
      totalVaccinationCosts: acc.totalVaccinationCosts + row.vaccination_costs,
      totalCosts: acc.totalCosts + row.total_costs,
    }),
    {
      totalAnimals: 0,
      totalVisits: 0,
      totalVisitCosts: 0,
      totalMedicationCosts: 0,
      totalMedicationCostsFromUsageItems: 0,
      totalMedicationCostsFromSync: 0,
      totalVaccinationCosts: 0,
      totalCosts: 0,
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Euro className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gydymų Savikainos</h2>
              <p className="text-sm text-gray-600">Detalus gydymų išlaidų skaičiavimas</p>
            </div>
          </div>
          <button
            onClick={loadCostData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search Bar and Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal gyvūno numerį..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'}`}
            >
              {showFilters ? 'Paslėpti filtrus' : 'Rodyti filtrus'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Išvalyti visus filtrus"
              >
                Išvalyti
              </button>
            )}
          </div>

          {showFilters && (
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vizitai nuo
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vizitai iki
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimali kaina (€)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                {(dateFrom || dateTo) && (
                  <div className="mb-2">
                    Laikotarpis: {dateFrom ? formatDateLT(dateFrom) : 'pradžia'} - {dateTo ? formatDateLT(dateTo) : 'dabar'}
                  </div>
                )}
                {hasActiveFilters && (
                  <div>
                    Rodoma: <span className="font-semibold">{filteredData.length}</span> gyvūnų
                    {(searchTerm || minCost) && <span> (iš {costData.length})</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vizitų</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalVisits}</div>
            <div className="text-xs text-gray-500 mt-1">{formatCost(totalStats.totalVisitCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vaistų</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{formatCost(totalStats.totalMedicationCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Syringe className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vakcinų</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{formatCost(totalStats.totalVaccinationCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Viso</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCost(totalStats.totalCosts)}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div className="text-xs font-semibold text-gray-600 uppercase">Vaistų išlaidų paskirstymas pagal šaltinį:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Gydymo vaistai:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCost(totalStats.totalMedicationCostsFromUsageItems)}</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Sinchronizacijos vaistai:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCost(totalStats.totalMedicationCostsFromSync)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Vidutinė kaina per gyvūną:</span>
              <span className="ml-2 font-bold text-blue-700">
                {formatCost(totalStats.totalAnimals > 0 ? totalStats.totalCosts / totalStats.totalAnimals : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vidutinė kaina per vizitą:</span>
              <span className="ml-2 font-bold text-blue-700">
                {formatCost(totalStats.totalVisits > 0 ? totalStats.totalCosts / totalStats.totalVisits : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vizitų kainos:</span>
              <span className="ml-2 font-medium text-blue-600">
                Pagal paslaugų kainas (Finansai → Kainų valdymas)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Rūšiuoti pagal:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <optgroup label="Pagal kainą">
              <option value="total">Bendra kaina</option>
              <option value="visits">Paslaugos kaina</option>
              <option value="medications">Vaistų kaina</option>
              <option value="vaccinations">Vakcinų kaina</option>
            </optgroup>
            <optgroup label="Pagal kiekį">
              <option value="treatment_count">Gydymų skaičius</option>
              <option value="visit_count">Vizitų skaičius</option>
            </optgroup>
            <optgroup label="Pagal gyvūną">
              <option value="tag_no">Ausies numeris</option>
            </optgroup>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ Didėjančia' : '↑ Mažėjančia'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Euro className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nerasta gydymų išlaidų duomenų</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ausies Nr.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Gydymų
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vizitų
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Paslaugos kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vaistų kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vakcinų kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Viso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((row) => {
                  const isExpanded = expandedAnimal === row.animal_id;
                  const detailData = animalDetails.get(row.animal_id);

                  return (
                    <React.Fragment key={row.animal_id}>
                      <tr
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(row.animal_id)}
                      >
                        <td className="px-4 py-4 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{row.tag_no || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {row.treatment_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {row.visit_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-blue-700">
                            {formatCost(row.visit_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-orange-700">
                            {formatCost(row.medication_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-purple-700">
                            {formatCost(row.vaccination_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-lg font-bold text-blue-700">
                            {formatCost(row.total_costs)}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Details - ONLY VISITS */}
                      {isExpanded && detailData && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gradient-to-br from-blue-50 to-blue-100">
                            <div className="max-w-5xl mx-auto">
                              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-400">
                                <h4 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                                  <Calendar className="w-7 h-7 text-blue-600" />
                                  Vizitai ({detailData.visits.length})
                                </h4>
                              </div>

                              <div className="space-y-3">
                                {detailData.visits.length === 0 ? (
                                  <div className="text-gray-500 text-sm italic p-6 bg-white rounded-lg text-center">
                                    Nėra užbaigtų vizitų
                                  </div>
                                ) : (
                                  detailData.visits.map((visit) => {
                                    const isVisitExpanded = expandedVisits.has(visit.id);
                                    const procedures = Array.isArray(visit.procedures) ? visit.procedures : [];
                                    const serviceCost = procedures.reduce((sum, p) => sum + (rawData?.servicePrices?.get(p) || 0), 0);
                                    const totalVisitCost = serviceCost + visit.total_products_cost;
                                    const hasProducts = visit.all_products.length > 0;

                                    return (
                                      <div key={visit.id} className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500">
                                        {/* Visit Header - Clickable */}
                                        <div
                                          className="p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                                          onClick={() => hasProducts && toggleVisitExpand(visit.id)}
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            {/* Left: Visit Info */}
                                            <div className="flex-1 flex items-start gap-3">
                                              {hasProducts && (
                                                <div className="mt-1">
                                                  {isVisitExpanded ?
                                                    <ChevronDown className="w-5 h-5 text-blue-600" /> :
                                                    <ChevronRight className="w-5 h-5 text-blue-600" />
                                                  }
                                                </div>
                                              )}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                  <div className="font-bold text-gray-900 text-lg">
                                                    {formatDateLT(visit.visit_datetime)}
                                                  </div>
                                                  {visit.vet_name && (
                                                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                      {visit.vet_name}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Treatment Info */}
                                                {visit.treatment_info && (
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Activity className="w-4 h-4 text-orange-600" />
                                                    <span className="font-semibold text-orange-700">
                                                      {visit.treatment_info.disease_name}
                                                    </span>
                                                  </div>
                                                )}

                                                {/* Procedures - Format better */}
                                                {visit.procedures && typeof visit.procedures === 'string' && (
                                                  <div className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-1.5 rounded-md inline-block">
                                                    {visit.procedures.replace(/([A-Z])/g, ' $1').trim()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Right: Cost Breakdown */}
                                            <div className="text-right">
                                              <div className="font-bold text-blue-600 text-2xl mb-1">
                                                {formatCost(totalVisitCost)}
                                              </div>
                                              <div className="text-xs text-gray-600 space-y-0.5">
                                                {serviceCost > 0 && (
                                                  <div>Paslaugos: {formatCost(serviceCost)}</div>
                                                )}
                                                {visit.total_products_cost > 0 && (
                                                  <div>Produktai: {formatCost(visit.total_products_cost)}</div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Expanded Products List */}
                                        {isVisitExpanded && hasProducts && (
                                          <div className="px-4 pb-4 pt-2 bg-gradient-to-r from-blue-50 to-white border-t border-blue-200">
                                            {/* Medicines Section */}
                                            {visit.all_products.some(p => !p.is_vaccine) && (
                                              <div className="mb-4">
                                                <div className="text-xs font-bold text-blue-900 uppercase mb-3 flex items-center gap-2">
                                                  <Package className="w-4 h-4" />
                                                  Vaistai ir priemonės ({visit.all_products.filter(p => !p.is_vaccine).length})
                                                </div>
                                                <div className="space-y-2">
                                                  {visit.all_products.filter(p => !p.is_vaccine).map((product, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                          <div className="font-semibold text-gray-900">{product.name}</div>
                                                          <div className="text-sm text-gray-600 mt-1">
                                                            {formatNumberLT(product.quantity)} {product.unit} × {formatUnitCost(product.unit_cost)}/{product.unit}
                                                          </div>
                                                        </div>
                                                        <div className="font-bold text-blue-700 text-lg ml-4">
                                                          {formatCost(product.total_cost)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Vaccines Section */}
                                            {visit.all_products.some(p => p.is_vaccine) && (
                                              <div>
                                                <div className="text-xs font-bold text-purple-900 uppercase mb-3 flex items-center gap-2">
                                                  <Syringe className="w-4 h-4" />
                                                  Vakcinacijos ({visit.all_products.filter(p => p.is_vaccine).length})
                                                </div>
                                                <div className="space-y-2">
                                                  {visit.all_products.filter(p => p.is_vaccine).map((product, idx) => (
                                                    <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200 shadow-sm">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                          <div className="font-semibold text-gray-900">{product.name}</div>
                                                          <div className="text-sm text-gray-600 mt-1">
                                                            {formatNumberLT(product.quantity)} {product.unit} × {formatUnitCost(product.unit_cost)}/{product.unit}
                                                          </div>
                                                        </div>
                                                        <div className="font-bold text-purple-700 text-lg ml-4">
                                                          {formatCost(product.total_cost)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Total Summary */}
                              {detailData.visits.length > 0 && (
                                <div className="mt-6 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Paslaugos ({detailData.visits.length} vizitai):</span>
                                      <span className="font-semibold">
                                        {formatCost(detailData.visits.reduce((sum, v) => {
                                          const procedures = Array.isArray(v.procedures) ? v.procedures : [];
                                          return sum + procedures.reduce((s, p) => s + (rawData?.servicePrices?.get(p) || 0), 0);
                                        }, 0))}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Visi produktai:</span>
                                      <span className="font-semibold">
                                        {formatCost(detailData.visits.reduce((sum, v) => sum + v.total_products_cost, 0))}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-blue-400">
                                      <span className="font-bold text-lg">VISO:</span>
                                      <span className="font-bold text-2xl">
                                        {formatCost(
                                          detailData.visits.reduce((sum, v) => {
                                            const procedures = Array.isArray(v.procedures) ? v.procedures : [];
                                            const serviceCost = procedures.reduce((s, p) => s + (rawData?.servicePrices?.get(p) || 0), 0);
                                            return sum + serviceCost + v.total_products_cost;
                                          }, 0)
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Milk Loss Modal removed - GEA integration no longer available */}
    </div>
  );
}
