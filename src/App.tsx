import { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm';
import { ModuleSelector } from './components/ModuleSelector';
import { NotificationToast, setNotificationCallback, NotificationType } from './components/NotificationToast';
import { useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { FarmProvider } from './contexts/FarmContext';
import { Farms } from './components/Farms';
import { VeterinaryModule } from './components/VeterinaryModule';
import { VetpraktikaModule } from './components/VetpraktikaModule';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientRegistration } from './components/ClientRegistration';
import { SignatureVerification } from './components/SignatureVerification';
import { Building2 } from 'lucide-react';

type Module = 'veterinarija' | 'klientai' | 'vetpraktika' | null;

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState<Module>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isAdminPage, setIsAdminPage] = useState(false);
  const [isRegistrationPage, setIsRegistrationPage] = useState(false);
  const { user, loading, isClientAdmin } = useAuth();

  // Initialize from URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Check if we're on the registration page
    if (path === '/register') {
      setIsRegistrationPage(true);
      return;
    }
    
    // Check if we're on the admin page
    if (path === '/admin') {
      setIsAdminPage(true);
      return;
    }
    
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
    if (!user && !isRegistrationPage) return;
    
    if (isRegistrationPage) {
      return; // Keep registration URL as is
    }
    
    if (isAdminPage) {
      window.history.pushState({}, '', '/admin');
      return;
    }
    
    const params = new URLSearchParams();
    if (selectedModule) {
      params.set('module', selectedModule);
    }
    if (currentView !== 'dashboard' || selectedModule) {
      params.set('view', currentView);
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.pushState({}, '', newUrl);
  }, [currentView, selectedModule, user, isAdminPage, isRegistrationPage]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      if (path === '/register') {
        setIsRegistrationPage(true);
        setIsAdminPage(false);
        setSelectedModule(null);
        return;
      }
      
      if (path === '/admin') {
        setIsAdminPage(true);
        setIsRegistrationPage(false);
        setSelectedModule(null);
        return;
      }
      
      setIsAdminPage(false);
      setIsRegistrationPage(false);
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

  // Prevent scroll wheel from changing number input values
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kraunama...</p>
        </div>
      </div>
    );
  }

  // Signature verification page - accessible without login
  if (window.location.pathname.startsWith('/verify-signature/')) {
    return <SignatureVerification />;
  }

  // Registration page - accessible without login
  if (isRegistrationPage) {
    return <ClientRegistration />;
  }

  if (!user) {
    return <AuthForm />;
  }

  // Admin page route
  if (isAdminPage) {
    return <AdminDashboard />;
  }

  if (!selectedModule) {
    return <ModuleSelector onSelectModule={setSelectedModule} />;
  }

  if (selectedModule === 'klientai') {
    return (
      <RealtimeProvider>
        <FarmProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50">
            <div className="max-w-7xl mx-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
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

  if (selectedModule === 'vetpraktika') {
    return (
      <RealtimeProvider>
        <FarmProvider>
          <VetpraktikaModule onBackToModules={() => setSelectedModule(null)} />
          <NotificationToast
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </FarmProvider>
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
