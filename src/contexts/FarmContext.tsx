import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Farm {
  id: string;
  name: string;
  code: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  vic_username?: string;
  vic_password?: string;
  is_active: boolean;
}

interface FarmContextType {
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  farms: Farm[];
  loadFarms: () => Promise<void>;
  loading: boolean;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setFarms(data || []);

      if (data && data.length > 0 && !selectedFarm) {
        const savedFarmId = localStorage.getItem('selectedFarmId');
        const farmToSelect = savedFarmId 
          ? data.find(f => f.id === savedFarmId) || data[0]
          : data[0];
        setSelectedFarm(farmToSelect);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      localStorage.setItem('selectedFarmId', selectedFarm.id);
    }
  }, [selectedFarm]);

  return (
    <FarmContext.Provider value={{ selectedFarm, setSelectedFarm, farms, loadFarms, loading }}>
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
