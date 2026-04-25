import { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Check, 
  AlertTriangle,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Crown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ClientInfo {
  id: string;
  name: string;
  company_code: string | null;
  contact_email: string;
  contact_phone: string | null;
  subscription_plan: string;
  subscription_status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  max_farms: number;
  max_users: number;
  is_active: boolean;
  vat_registered: boolean;
  address: string | null;
  city: string | null;
}

interface UsageStats {
  farms_count: number;
  users_count: number;
  animals_count: number;
}

interface SubscriptionProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionProfile({ isOpen, onClose }: SubscriptionProfileProps) {
  const { user } = useAuth();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const pricingPlans = {
    trial: {
      name: 'Trial',
      price: '€0',
      duration: '7 dienų',
      color: 'gray',
      maxFarms: 3,
    },
    starter: {
      name: 'Startas',
      price: '€19/sav',
      duration: 'Savaitinis',
      color: 'blue',
      maxFarms: 5,
    },
    professional: {
      name: 'Praktika',
      price: '€39/sav',
      duration: 'Savaitinis',
      color: 'purple',
      maxFarms: 15,
    },
    enterprise: {
      name: 'Augimas',
      price: '€69/sav',
      duration: 'Savaitinis',
      color: 'amber',
      maxFarms: 35,
    },
    komanda: {
      name: 'Komanda',
      price: '€119/sav',
      duration: 'Savaitinis',
      color: 'indigo',
      maxFarms: 999,
    },
  };

  useEffect(() => {
    if (isOpen && user?.client_id) {
      loadClientData();
    }
  }, [isOpen, user]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user!.client_id)
        .single();

      if (error) throw error;
      setClientInfo(client);

      // Load usage stats
      const { count: farmsCount } = await supabase
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user!.client_id)
        .eq('is_active', true);

      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user!.client_id)
        .eq('is_frozen', false);

      const { count: animalsCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user!.client_id)
        .eq('active', true);

      setUsageStats({
        farms_count: farmsCount || 0,
        users_count: usersCount || 0,
        animals_count: animalsCount || 0,
      });
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPlan = clientInfo?.subscription_plan ? pricingPlans[clientInfo.subscription_plan as keyof typeof pricingPlans] : null;
  const isTrialExpiringSoon = clientInfo?.subscription_plan === 'trial' && clientInfo?.subscription_end_date;
  const daysUntilExpiry = isTrialExpiringSoon 
    ? Math.ceil((new Date(clientInfo.subscription_end_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Jūsų organizacija</h3>
              <p className="text-blue-100 text-sm">Prenumeratos ir naudojimo informacija</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Kraunama...</p>
          </div>
        ) : clientInfo ? (
          <div className="p-6 space-y-6">
            {/* Trial Warning */}
            {isTrialExpiringSoon && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Trial baigiasi po {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dienos' : 'dienų'}!
                    </h4>
                    <p className="text-sm text-amber-800">
                      Pasirinkite prenumeratos planą, kad tęstumėte naudojimą po {new Date(clientInfo.subscription_end_date!).toLocaleDateString('lt-LT')}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Organizacijos informacija</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pavadinimas</p>
                  <p className="font-semibold text-gray-900">{clientInfo.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Organizacijos ID</p>
                  <p className="font-mono text-sm text-gray-700 bg-white px-2 py-1 rounded border border-gray-200">
                    {clientInfo.id}
                  </p>
                </div>
                {clientInfo.company_code && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Įmonės kodas</p>
                    <p className="font-medium text-gray-900">{clientInfo.company_code}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {clientInfo.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">El. paštas</p>
                        <p className="text-sm text-gray-900">{clientInfo.contact_email}</p>
                      </div>
                    </div>
                  )}
                  {clientInfo.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Telefonas</p>
                        <p className="text-sm text-gray-900">{clientInfo.contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                {clientInfo.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Adresas</p>
                      <p className="text-sm text-gray-900">
                        {clientInfo.address}
                        {clientInfo.city && `, ${clientInfo.city}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Plan */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Dabartinis planas</h4>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-blue-600" />
                      <h5 className="text-2xl font-bold text-gray-900">{currentPlan?.name || 'Unknown'}</h5>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-1">{currentPlan?.price || '-'}</p>
                    <p className="text-sm text-gray-600">{currentPlan?.duration || '-'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    clientInfo.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {clientInfo.subscription_status === 'active' ? 'Aktyvi' : 'Neaktyvi'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Maksimaliai ūkių</p>
                    <p className="text-xl font-bold text-gray-900">{clientInfo.max_farms}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Maksimaliai vartotojų</p>
                    <p className="text-xl font-bold text-gray-900">{clientInfo.max_users === 999 ? '∞' : clientInfo.max_users}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">VAT</p>
                    <p className="text-xl font-bold text-gray-900">{clientInfo.vat_registered ? 'Taip' : 'Ne'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            {usageStats && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Dabartinis naudojimas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className={`text-xs font-bold ${
                        usageStats.farms_count >= clientInfo.max_farms 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {usageStats.farms_count}/{clientInfo.max_farms}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mb-1">Aktyvūs ūkiai</p>
                    <p className="text-2xl font-bold text-blue-900">{usageStats.farms_count}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className={`text-xs font-bold ${
                        usageStats.users_count >= clientInfo.max_users 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {usageStats.users_count}/{clientInfo.max_users === 999 ? '∞' : clientInfo.max_users}
                      </span>
                    </div>
                    <p className="text-xs text-purple-600 mb-1">Vartotojai</p>
                    <p className="text-2xl font-bold text-purple-900">{usageStats.users_count}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-green-600 mb-1">Gyvūnai</p>
                    <p className="text-2xl font-bold text-green-900">{usageStats.animals_count}</p>
                  </div>
                </div>

                {/* Usage Warnings */}
                {usageStats.farms_count >= clientInfo.max_farms && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Pasiektas ūkių limitas</p>
                        <p className="text-xs text-red-700 mt-1">
                          Jūs pasiekėte maksimalų ūkių skaičių. Norėdami pridėti daugiau ūkių, atnaujinkite prenumeratos planą.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Available Plans */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Galimi planai</h4>
              <div className="space-y-3">
                {Object.entries(pricingPlans).map(([key, plan]) => {
                  const isCurrent = clientInfo.subscription_plan === key;
                  return (
                    <div
                      key={key}
                      className={`relative rounded-lg border-2 p-4 transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-gray-900">{plan.name}</h5>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                                Dabartinis
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-blue-600 mb-1">{plan.price}</p>
                          <p className="text-xs text-gray-600">
                            Iki {plan.maxFarms === 999 ? 'neribotai' : plan.maxFarms} ūkių
                          </p>
                        </div>
                        {!isCurrent && clientInfo.subscription_plan !== 'trial' && (
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            onClick={() => alert('Susisiekite su administratoriumi dėl plano keitimo')}
                          >
                            Pasirinkti
                          </button>
                        )}
                        {isCurrent && (
                          <Check className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subscription Dates */}
            {clientInfo.subscription_start_date && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Prenumeratos datos</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Pradžia</p>
                      <p className="text-gray-900 font-medium">
                        {new Date(clientInfo.subscription_start_date).toLocaleDateString('lt-LT')}
                      </p>
                    </div>
                  </div>
                  {clientInfo.subscription_end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Pabaiga</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(clientInfo.subscription_end_date).toLocaleDateString('lt-LT')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Support */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 mb-2">
                Turite klausimų apie prenumeratą ar norite pakeisti planą?
              </p>
              <p className="text-xs text-gray-600">
                Susisiekite su mumis: <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a>
              </p>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Nepavyko užkrauti informacijos</p>
          </div>
        )}
      </div>
    </div>
  );
}
