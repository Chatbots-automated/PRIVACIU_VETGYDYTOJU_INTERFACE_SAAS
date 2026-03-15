import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  Pill,
  Syringe,
  AlertTriangle,
  Droplet,
  Droplets,
  Trash2,
  Menu,
  X,
  Building2,
  Stethoscope,
  LogOut,
  User,
  Grid3x3,
  Users,
  Activity,
  Calendar,
  Repeat,
  Euro,
  Heart,
  StickyNote
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import Notepad from './Notepad';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  onBackToModules: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Pagrindinis', icon: LayoutDashboard, permission: 'view' },
  { id: 'inventory', label: 'Atsargos', icon: Package, permission: 'view' },
  { id: 'receive', label: 'Priėmimas', icon: FileText, permission: 'receive_stock' },
  { id: 'animals', label: 'Gyvūnai', icon: Stethoscope, permission: 'animals' },
  { id: 'visits', label: 'Vizitai', icon: Calendar, permission: 'animals' },
  { id: 'synchronizations', label: 'Sinchronizacijos', icon: Repeat, permission: 'animals' },
  { id: 'insemination', label: 'Sėklinimas', icon: Heart, permission: 'animals' },
  { id: 'bulk-treatment', label: 'Masinis Gydymas', icon: Users, permission: 'treatment' },
  { id: 'treatment-history', label: 'Gydymų Istorija', icon: Activity, permission: 'view' },
  { id: 'treatment-costs', label: 'Gydymų Savikaina', icon: Euro, permission: 'view' },
  { id: 'vaccinations', label: 'Vakcinacijos', icon: Syringe, permission: 'treatment' },
  { id: 'products', label: 'Produktai', icon: Pill, permission: 'products' },
  { id: 'reports', label: 'Ataskaitos', icon: FileText, permission: 'view' },
  { id: 'users', label: 'Vartotojai', icon: Users, permission: 'manage_users' },
];

export function Layout({ children, currentView, onNavigate, onBackToModules }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const { user, hasPermission, signOut, isFrozen, logAction } = useAuth();
  const { selectedFarm, setSelectedFarm, farms } = useFarm();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-56 xl:w-72 bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 shadow-2xl z-30 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-3 xl:p-6 border-b border-blue-700/50">
            <div className="flex items-center justify-between mb-2 xl:mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 xl:p-2 hover:bg-blue-700/50 rounded">
                <X className="w-4 xl:w-5 h-4 xl:h-5 text-blue-200" />
              </button>
            </div>
            <div className="flex items-center gap-2 xl:gap-4">
              <div className="flex-shrink-0">
                <img
                  src="https://rvac.lt/s/img/wp-content/uploads/RVAC_logo.png"
                  alt="RVAC"
                  className="w-10 xl:w-16 h-10 xl:h-16 rounded-lg bg-white p-0.5 xl:p-1 shadow-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-bold text-sm xl:text-xl text-white leading-tight">RVAC</h1>
                <p className="text-xs text-blue-200 xl:mt-1">Veterinarija<span className="hidden xl:inline"> Sistema</span></p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-2 xl:p-4 overflow-y-auto overflow-x-hidden">
            <div className="space-y-1">
              {menuItems.filter(item => hasPermission(item.permission)).map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                      logAction('navigate_to_page', null, null, null, { page: item.id, label: item.label });
                    }}
                    className={`w-full flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-2 xl:py-3 rounded-lg transition-all duration-200 min-h-[40px] xl:min-h-[44px] touch-manipulation ${
                      isActive
                        ? 'bg-white text-blue-900 shadow-lg font-semibold'
                        : 'text-blue-50 hover:bg-blue-700/50 hover:text-white active:bg-blue-600/50'
                    }`}
                  >
                    <Icon className={`w-4 xl:w-5 h-4 xl:h-5 flex-shrink-0 ${isActive ? 'text-blue-700' : ''}`} />
                    <span className="text-xs xl:text-sm truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-2 xl:p-4 border-t border-blue-700/50 xl:space-y-3">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-2 xl:py-2.5 text-blue-50 hover:bg-blue-700/50 hover:text-white rounded-lg transition-all text-xs xl:text-sm min-h-[40px] xl:min-h-[44px] touch-manipulation active:bg-blue-600/50"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="truncate"><span className="xl:hidden">Moduliai</span><span className="hidden xl:inline">Modulių pasirinkimas</span></span>
            </button>
            <div className="text-xs text-blue-300 xl:text-blue-400 text-center pt-1 xl:pt-2">
              <p className="hidden xl:block">Veterinarijos apskaita</p>
              <p className="xl:mt-1">v1.0<span className="hidden xl:inline">.0</span></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-56 xl:pl-72">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-2 xl:px-6 py-2 xl:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 xl:gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[40px] xl:min-w-[44px] min-h-[40px] xl:min-h-[44px] touch-manipulation active:bg-slate-200"
                >
                  <Menu className="w-5 xl:w-6 h-5 xl:h-6 text-slate-700" />
                </button>
                <div>
                  <h2 className="text-base xl:text-2xl font-bold text-gray-900">
                    {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                  </h2>
                  <p className="text-xs xl:text-sm text-gray-500 mt-0.5 hidden xl:block">Valdymo sistema · Real-time apskaita</p>
                </div>
              </div>

              <div className="flex items-center gap-1 xl:gap-3">
                {selectedFarm && (
                  <select
                    value={selectedFarm.id}
                    onChange={(e) => {
                      const farm = farms.find(f => f.id === e.target.value);
                      if (farm) setSelectedFarm(farm);
                    }}
                    className="px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} ({farm.code})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={onBackToModules}
                  className="hidden xl:flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                  title="Modulių pasirinkimas"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Moduliai</span>
                </button>
                <button
                  onClick={() => setNotepadOpen(true)}
                  className="flex items-center gap-2 px-2 xl:px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 hover:border-amber-300"
                  title="Užrašinė"
                >
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden xl:inline">Užrašinė</span>
                </button>
                <div className="flex items-center gap-2 px-2 xl:px-4 py-1.5 xl:py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 min-h-[36px]">
                  <User className="w-4 h-4 text-blue-700 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs xl:text-sm font-medium text-blue-900 truncate max-w-[80px] xl:max-w-none">
                      {user?.full_name || user?.email}
                    </span>
                    {user && (
                      <span className="text-xs text-blue-600 hidden xl:block">
                        {user.role === 'admin' ? 'Admin' : user.role === 'vet' ? 'Veterinaras' : user.role === 'tech' ? 'Technikas' : 'Žiūrėtojas'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-2 xl:px-4 py-2 text-xs xl:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 min-w-[36px]"
                  title="Atsijungti"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Atsijungti</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-2 xl:p-8 min-h-screen">
          {isFrozen && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Paskyra užšaldyta</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Jūsų paskyra yra laikinai užšaldyta. Negalite atlikti jokių veiksmų sistemoje.
                    Kreipkitės į administratorių dėl daugiau informacijos.
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <img
                  src="https://rekvizitai.vz.lt/logos/berciunai-16440-447.jpg"
                  alt="ŽŪB"
                  className="w-6 h-6 rounded object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>© 2025 RVAC. Visos teisės saugomos.</span>
              </div>
              <div className="text-xs text-gray-500">
                Veterinarijos Valdymo Sistema · Versija 1.0.0
              </div>
            </div>
          </div>
        </footer>
      </div>

      <Notepad isOpen={notepadOpen} onClose={() => setNotepadOpen(false)} />
    </div>
  );
}
