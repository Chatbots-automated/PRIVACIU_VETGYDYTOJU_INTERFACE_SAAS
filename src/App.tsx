import { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm';
import { ModuleSelector } from './components/ModuleSelector';
import { InvoiceViewer } from './components/InvoiceViewer';
import { NotificationToast, setNotificationCallback, NotificationType } from './components/NotificationToast';
import { useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { FarmProvider } from './contexts/FarmContext';
import { Farms } from './components/Farms';
import { VeterinaryModule } from './components/VeterinaryModule';
import { Euro, Building2 } from 'lucide-react';

type Module = 'veterinarija' | 'islaidos' | 'klientai' | null;

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState<Module>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const { user, loading } = useAuth();

  // Initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const module = params.get('module') as Module;
    const view = params.get('view');
    
    if (module) {
      setSelectedModule(module);
    }
    if (view) {
      setCurrentView(view);
    }
  }, []);

  // Update URL when navigation changes
  useEffect(() => {
    if (!user) return;
    
    const params = new URLSearchParams();
    if (selectedModule) {
      params.set('module', selectedModule);
    }
    if (currentView !== 'dashboard' || selectedModule) {
      params.set('view', currentView);
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.pushState({}, '', newUrl);
  }, [currentView, selectedModule, user]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const module = params.get('module') as Module;
      const view = params.get('view');
      
      if (!module && !view) {
        setSelectedModule(null);
        setCurrentView('dashboard');
      } else {
        if (module) setSelectedModule(module);
        if (view) setCurrentView(view);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setNotificationCallback((message: string, type: NotificationType) => {
      setNotification({
        id: Date.now().toString(),
        message,
        type,
      });
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView, selectedModule]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!selectedModule) {
    return <ModuleSelector onSelectModule={setSelectedModule} />;
  }

  if (selectedModule === 'klientai') {
    return (
      <RealtimeProvider>
        <FarmProvider>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50">
            <div className="max-w-7xl mx-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Klientų Valdymas</h1>
                    <p className="text-gray-600">Ūkių registras ir informacija</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModule(null)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
                >
                  Grįžti
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <Farms />
              </div>
            </div>
          </div>
        </FarmProvider>
      </RealtimeProvider>
    );
  }

  if (selectedModule === 'islaidos') {
    return (
      <RealtimeProvider>
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
          <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Euro className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Išlaidų Valdymas</h1>
                  <p className="text-gray-600">Finansų apskaita ir kontrolė</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
              >
                Grįžti
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <InvoiceViewer />
            </div>
          </div>
        </div>
      </RealtimeProvider>
    );
  }

  return (
    <RealtimeProvider>
      <FarmProvider>
        <VeterinaryModule onBackToModules={() => setSelectedModule(null)} />
        <NotificationToast
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      </FarmProvider>
    </RealtimeProvider>
  );
}

export default App;
