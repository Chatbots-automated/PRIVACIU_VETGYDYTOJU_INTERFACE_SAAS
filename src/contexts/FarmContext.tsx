import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getClientId } from '../lib/clientHelpers';

interface Farm {
  id: string;
  name: string;
  code: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  vic_production_username?: string;
  vic_production_password?: string;
  vic_pet_username?: string;
  vic_pet_password?: string;
  is_active: boolean;
  is_eco_farm?: boolean;
}

interface FarmContextType {
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  farms: Farm[];
  loadFarms: () => Promise<void>;
  loading: boolean;
  switching: boolean;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedFarm, setSelectedFarmState] = useState<Farm | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const setSelectedFarm = (farm: Farm | null) => {
    setSwitching(true);
    // Simulate loading delay for data refresh
    setTimeout(() => {
      setSelectedFarmState(farm);
      setTimeout(() => {
        setSwitching(false);
      }, 500);
    }, 100);
  };

  const loadFarms = async () => {
    try {
      const clientId = getClientId(user);
      if (!clientId) {
        console.warn('FarmContext: No client_id available yet');
        setFarms([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setFarms(data || []);

      if (data && data.length > 0 && !selectedFarm) {
        const savedFarmId = localStorage.getItem('selectedFarmId');
        const farmToSelect = savedFarmId 
          ? data.find(f => f.id === savedFarmId) || data[0]
          : data[0];
        setSelectedFarmState(farmToSelect);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadFarms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      localStorage.setItem('selectedFarmId', selectedFarm.id);
    }
  }, [selectedFarm]);

  return (
    <FarmContext.Provider value={{ selectedFarm, setSelectedFarm, farms, loadFarms, loading, switching }}>
      {switching && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-950/95 backdrop-blur-sm animate-fade-in">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-white mx-auto"></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Keičiamas ūkis...</h3>
            <p className="text-blue-200">Kraunami duomenys</p>
          </div>
        </div>
      )}
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
