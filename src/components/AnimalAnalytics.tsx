import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Euro, Activity, Syringe, Calendar, TrendingUp, Package, AlertCircle } from 'lucide-react';

interface CostAnalytics {
  animal_id: string;
  tag_no: string;
  treatment_count: number;
  medicine_cost: number;
  vaccination_count: number;
  vaccine_cost: number;
  visit_count: number;
  visit_cost: number;
  total_cost: number;
}

interface TeatAnalytics {
  animal_id: string;
  teat: string;
  treatment_count: number;
  new_case_count: number;
  recurring_case_count: number;
  recovered_count: number;
  ongoing_count: number;
  first_treatment_date: string;
  last_treatment_date: string;
}

interface ProductUsage {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  usage_count: number;
  total_quantity: number;
  total_cost: number;
  usage_rank: number;
}

interface VisitAnalytics {
  animal_id: string;
  total_visits: number;
  completed_visits: number;
  planned_visits: number;
  cancelled_visits: number;
  temperature_checks: number;
  avg_temperature: number;
  max_temperature: number;
  treatments_required_count: number;
  first_visit: string;
  last_visit: string;
}

interface TreatmentOutcomes {
  animal_id: string;
  total_treatments: number;
  recovered_count: number;
  ongoing_count: number;
  deceased_count: number;
  unknown_outcome_count: number;
  recovery_rate_percent: number;
}

interface AnimalAnalyticsProps {
  animalId: string;
  tagNumber: string;
}

export function AnimalAnalytics({ animalId, tagNumber }: AnimalAnalyticsProps) {
  const [costAnalytics, setCostAnalytics] = useState<CostAnalytics | null>(null);
  const [teatAnalytics, setTeatAnalytics] = useState<TeatAnalytics[]>([]);
  const [productUsage, setProductUsage] = useState<ProductUsage[]>([]);
  const [visitAnalytics, setVisitAnalytics] = useState<VisitAnalytics | null>(null);
  const [treatmentOutcomes, setTreatmentOutcomes] = useState<TreatmentOutcomes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();

    const handleRealtimeUpdate = () => {
      loadAnalytics();
    };

    window.addEventListener('realtime:treatments', handleRealtimeUpdate);
    window.addEventListener('realtime:vaccinations', handleRealtimeUpdate);
    window.addEventListener('realtime:animal_visits', handleRealtimeUpdate);
    window.addEventListener('realtime:usage_items', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('realtime:treatments', handleRealtimeUpdate);
      window.removeEventListener('realtime:vaccinations', handleRealtimeUpdate);
      window.removeEventListener('realtime:animal_visits', handleRealtimeUpdate);
      window.removeEventListener('realtime:usage_items', handleRealtimeUpdate);
    };
  }, [animalId]);

  const loadAnalytics = async () => {
    try {
      const [costRes, teatRes, productRes, visitRes, outcomeRes] = await Promise.all([
        supabase
          .from('vw_animal_cost_analytics')
          .select('*')
          .eq('animal_id', animalId)
          .maybeSingle(),
        supabase
          .from('vw_teat_treatment_analytics')
          .select('*')
          .eq('animal_id', animalId),
        supabase
          .from('vw_animal_product_usage')
          .select('*')
          .eq('animal_id', animalId)
          .order('usage_rank', { ascending: true })
          .limit(5),
        supabase
          .from('vw_animal_visit_analytics')
          .select('*')
          .eq('animal_id', animalId)
          .maybeSingle(),
        supabase
          .from('vw_animal_treatment_outcomes')
          .select('*')
          .eq('animal_id', animalId)
          .maybeSingle(),
      ]);

      if (costRes.error) console.error('Cost analytics error:', costRes.error);
      if (teatRes.error) console.error('Teat analytics error:', teatRes.error);
      if (productRes.error) console.error('Product usage error:', productRes.error);
      if (visitRes.error) console.error('Visit analytics error:', visitRes.error);
      if (outcomeRes.error) console.error('Outcome analytics error:', outcomeRes.error);

      setCostAnalytics(costRes.data);
      setTeatAnalytics(teatRes.data || []);
      setProductUsage(productRes.data || []);
      setVisitAnalytics(visitRes.data);
      setTreatmentOutcomes(outcomeRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama analizė...</div>
      </div>
    );
  }

  const getTeatLabel = (teat: string) => {
    const labels: Record<string, string> = {
      'LF': 'Kairysis priekinis',
      'RF': 'Dešinysis priekinis',
      'LR': 'Kairysis užpakalinis',
      'RR': 'Dešinysis užpakalinis',
    };
    return labels[teat] || teat;
  };

  const getTeatEmoji = (teat: string) => {
    const emojis: Record<string, string> = {
      'LF': '◀️⬆️',
      'RF': '▶️⬆️',
      'LR': '◀️⬇️',
      'RR': '▶️⬇️',
    };
    return emojis[teat] || '📍';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
          <Euro className="w-6 h-6 text-blue-600" />
          Išlaidų suvestinė
        </h3>

        {costAnalytics ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  €{costAnalytics.total_cost.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Visos išlaidos</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">€{costAnalytics.medicine_cost.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">Vaistai</div>
                <div className="text-xs text-gray-500 mt-0.5">({costAnalytics.treatment_count} gydymai)</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-purple-100">
                <div className="text-2xl font-bold text-purple-600">€{costAnalytics.vaccine_cost.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">Vakcinos</div>
                <div className="text-xs text-gray-500 mt-0.5">({costAnalytics.vaccination_count} vakc.)</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                <div className="text-2xl font-bold text-orange-600">€{costAnalytics.visit_cost.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">Vizitai</div>
                <div className="text-xs text-gray-500 mt-0.5">({costAnalytics.visit_count} viz.)</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Euro className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nėra išlaidų duomenų</p>
          </div>
        )}
      </div>

      {teatAnalytics.length > 0 && (
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Activity className="w-6 h-6 text-pink-600" />
            Spenelių statistika
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {teatAnalytics.map((teat) => (
              <div key={teat.teat} className="bg-white rounded-lg p-4 shadow-sm border border-pink-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 text-sm">
                    {getTeatEmoji(teat.teat)} {getTeatLabel(teat.teat)}
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {teat.treatment_count}
                  </div>
                </div>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Nauji atvejai:</span>
                    <span className="font-medium">{teat.new_case_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pasikartojantys:</span>
                    <span className="font-medium">{teat.recurring_case_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pasveiko:</span>
                    <span className="font-medium text-green-600">{teat.recovered_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gydoma:</span>
                    <span className="font-medium text-orange-600">{teat.ongoing_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {treatmentOutcomes && treatmentOutcomes.total_treatments > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Gydymų efektyvumas
          </h3>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {treatmentOutcomes.recovery_rate_percent || 0}%
              </div>
              <div className="text-sm text-gray-600">Pasveikimo procentas</div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-bold text-green-600 text-lg">{treatmentOutcomes.recovered_count}</div>
                <div className="text-gray-600">Pasveiko</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="font-bold text-orange-600 text-lg">{treatmentOutcomes.ongoing_count}</div>
                <div className="text-gray-600">Gydoma</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-bold text-red-600 text-lg">{treatmentOutcomes.deceased_count}</div>
                <div className="text-gray-600">Kritę</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-bold text-gray-600 text-lg">{treatmentOutcomes.unknown_outcome_count}</div>
                <div className="text-gray-600">Nežinoma</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {productUsage.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Package className="w-6 h-6 text-amber-600" />
            Dažniausiai naudojami vaistai
          </h3>

          <div className="space-y-2">
            {productUsage.map((product) => (
              <div key={product.product_id} className="bg-white rounded-lg p-3 shadow-sm border border-amber-100 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{product.product_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Panaudota {product.usage_count} kartų • Kiekis: {product.total_quantity} {product.unit || ''}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-bold text-amber-600">€{product.total_cost.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visitAnalytics && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Calendar className="w-6 h-6 text-violet-600" />
            Vizitų statistika
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-violet-100">
              <div className="text-2xl font-bold text-violet-600 mb-1">{visitAnalytics.total_visits}</div>
              <div className="text-xs text-gray-600">Iš viso vizitų</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
              <div className="text-2xl font-bold text-green-600 mb-1">{visitAnalytics.completed_visits}</div>
              <div className="text-xs text-gray-600">Užbaigta</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
              <div className="text-2xl font-bold text-orange-600 mb-1">{visitAnalytics.temperature_checks}</div>
              <div className="text-xs text-gray-600">Temperatūrų matavimų</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
              <div className="text-2xl font-bold text-red-600 mb-1">{visitAnalytics.max_temperature}°C</div>
              <div className="text-xs text-gray-600">Aukščiausia T°</div>
            </div>
          </div>

          {visitAnalytics.avg_temperature && (
            <div className="mt-3 bg-white rounded-lg p-3 shadow-sm border border-violet-100 text-center">
              <div className="text-sm text-gray-600">Vidutinė temperatūra</div>
              <div className="text-xl font-bold text-violet-600">{visitAnalytics.avg_temperature}°C</div>
            </div>
          )}
        </div>
      )}

      {!costAnalytics && teatAnalytics.length === 0 && productUsage.length === 0 && !visitAnalytics && !treatmentOutcomes && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nėra duomenų analizei</h3>
          <p className="text-sm text-gray-500">
            Duomenys atsiras po pirmo gyvūno vizito, gydymo ar vakcinacijos
          </p>
        </div>
      )}
    </div>
  );
}
