import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextType {
  isConnected: boolean;
  subscriptionCount: number;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  subscriptionCount: 0,
});

export const useRealtime = () => useContext(RealtimeContext);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  useEffect(() => {
    // Enable real-time for critical tables
    const criticalTables = [
      'animals',
      'animal_visits',
      'treatments',
      'usage_items',
      'vaccinations',
      'batches',
      'products',
      'inventory_transactions',
      'biocide_usage',
      'users',
    ];

    const newChannels: RealtimeChannel[] = [];

    criticalTables.forEach(tableName => {
      const channel = supabase
        .channel(`public:${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          (payload) => {
            // Broadcast to window for components to listen
            window.dispatchEvent(
              new CustomEvent(`realtime:${tableName}`, {
                detail: payload,
              })
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Real-time enabled for ${tableName}`);
            setSubscriptionCount(prev => prev + 1);
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Real-time error for ${tableName}`);
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏱️ Real-time timeout for ${tableName}`);
          }
        });

      newChannels.push(channel);
    });

    setChannels(newChannels);

    return () => {
      newChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setIsConnected(false);
      setSubscriptionCount(0);
      console.log('🔌 All real-time subscriptions cleaned up');
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscriptionCount }}>
      {isConnected && (
        <div className="fixed top-20 right-4 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2 z-[5]">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          Sinchronizuota
        </div>
      )}
      {children}
    </RealtimeContext.Provider>
  );
}
