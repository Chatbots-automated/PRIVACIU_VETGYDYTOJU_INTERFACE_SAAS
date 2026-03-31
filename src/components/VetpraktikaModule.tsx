import { useState } from 'react';
import { WarehouseStock } from './WarehouseStock';
import { WarehouseInventory } from './WarehouseInventory';
import { StockAllocation } from './StockAllocation';
import { AllFarmsReports } from './AllFarmsReports';
import { AllocationAnalytics } from './AllocationAnalytics';
import { Products } from './Products';
import { 
  Package, 
  ArrowRight, 
  FileText, 
  BarChart3, 
  Grid3x3, 
  LogOut,
  User,
  Warehouse,
  Menu,
  X,
  Pill
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface VetpraktikaModuleProps {
  onBackToModules: () => void;
}

const menuItems = [
  { id: 'warehouse-inventory', label: 'Sandėlio Atsargos', icon: Package },
  { id: 'receive-stock', label: 'Pajamavimas', icon: Warehouse },
  { id: 'allocate-stock', label: 'Paskirstymas', icon: ArrowRight },
  { id: 'products', label: 'Produktai', icon: Pill },
  { id: 'reports', label: 'Bendros Ataskaitos', icon: FileText },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
];

export function VetpraktikaModule({ onBackToModules }: VetpraktikaModuleProps) {
  const [currentView, setCurrentView] = useState('warehouse-inventory');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'warehouse-inventory':
        return <WarehouseInventory />;
      case 'receive-stock':
        return <WarehouseStock />;
      case 'allocate-stock':
        return <StockAllocation />;
      case 'products':
        return <Products />;
      case 'reports':
        return <AllFarmsReports />;
      case 'analytics':
        return <AllocationAnalytics />;
      default:
        return <WarehouseInventory />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-56 xl:w-72 bg-gradient-to-b from-slate-900 via-gray-900 to-slate-800 shadow-lg z-30 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-gray-700`}>
        <div className="h-full flex flex-col">
          <div className="p-4 xl:p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3 xl:mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            <div className="flex items-center gap-3 xl:gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 xl:w-16 h-12 xl:h-16 rounded-lg bg-white p-2 flex items-center justify-center">
                  <Warehouse className="w-8 h-8 text-gray-900" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-base xl:text-xl text-white">Vetpraktika UAB</h1>
                <p className="text-xs text-gray-300 xl:mt-1">Sandėlio Valdymas</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 xl:p-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-lg transition-colors duration-200 min-h-[40px] xl:min-h-[44px] touch-manipulation ${
                      isActive
                        ? 'bg-white text-gray-900 font-medium shadow-md'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-3 xl:p-4 border-t border-gray-700">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-3 px-3 xl:px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors text-sm min-h-[40px] xl:min-h-[44px] touch-manipulation"
            >
              <Grid3x3 className="w-5 h-5" />
              <span className="truncate">Modulių pasirinkimas</span>
            </button>
            <div className="text-xs text-gray-400 text-center pt-3">
              <p>Vetpraktika UAB v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-56 xl:pl-72">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-4 xl:px-6 py-4 xl:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 xl:gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[40px] min-h-[40px] touch-manipulation"
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                  <h2 className="text-lg xl:text-2xl font-bold text-gray-900">
                    {menuItems.find(item => item.id === currentView)?.label || 'Sandėlis'}
                  </h2>
                  <p className="text-xs xl:text-sm text-gray-600 mt-0.5 hidden xl:block">Vetpraktika UAB</p>
                </div>
              </div>

              <div className="flex items-center gap-1 xl:gap-3">
                <button
                  onClick={onBackToModules}
                  className="hidden xl:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                  title="Modulių pasirinkimas"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Moduliai</span>
                </button>
                <div className="flex items-center gap-2 px-3 xl:px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
                  <User className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[80px] xl:max-w-none">
                      {user?.full_name || user?.email}
                    </span>
                    {user && (
                      <span className="text-xs text-gray-600 hidden xl:block">
                        {user.role === 'admin' ? 'Admin' : 'Vartotojas'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-300 hover:border-red-300"
                  title="Atsijungti"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Atsijungti</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-2 xl:p-8 min-h-screen relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMSIgZmlsbD0iIzM3ODFmNiIgZmlsbC1vcGFjaXR5PSIwLjA4Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none"></div>
          <div className="relative">
            {renderView()}
          </div>
        </main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-gray-700" />
                <span>© 2025 Vetpraktika UAB. Visos teisės saugomos.</span>
              </div>
              <div className="text-xs text-gray-500">
                Sandėlio Valdymo Sistema · Versija 1.0.0
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
