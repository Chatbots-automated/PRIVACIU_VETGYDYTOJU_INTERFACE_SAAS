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
  StickyNote,
  ChevronDown
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
  { id: 'animals', label: 'Gyvūnai', icon: Stethoscope, permission: 'animals' },
  { id: 'visits', label: 'Vizitai', icon: Calendar, permission: 'animals' },
  { id: 'synchronizations', label: 'Sinchronizacijos', icon: Repeat, permission: 'animals' },
  { id: 'insemination', label: 'Sėklinimas', icon: Heart, permission: 'animals' },
  { id: 'bulk-treatment', label: 'Masinis Gydymas ir Vakcinacijos', icon: Users, permission: 'treatment' },
  { id: 'treatment-history', label: 'Gydymų Istorija', icon: Activity, permission: 'view' },
  { id: 'treatment-costs', label: 'Gydymų Savikaina', icon: Euro, permission: 'view' },
  { id: 'products', label: 'Produktai', icon: Pill, permission: 'products' },
  { id: 'reports', label: 'Ataskaitos', icon: FileText, permission: 'view' },
  { id: 'users', label: 'Vartotojai', icon: Users, permission: 'manage_users' },
];

export function Layout({ children, currentView, onNavigate, onBackToModules }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [farmSwitchModalOpen, setFarmSwitchModalOpen] = useState(false);
  const [farmToConfirm, setFarmToConfirm] = useState<typeof farms[0] | null>(null);
  const { user, hasPermission, signOut, isFrozen, logAction } = useAuth();
  const { selectedFarm, setSelectedFarm, farms } = useFarm();

  const handleFarmSwitch = (farm: typeof farms[0]) => {
    if (farm.id === selectedFarm?.id) return;
    setFarmToConfirm(farm);
  };

  const confirmFarmSwitch = () => {
    if (farmToConfirm) {
      setSelectedFarm(farmToConfirm);
      setFarmToConfirm(null);
      setFarmSwitchModalOpen(false);
    }
  };

  const cancelFarmSwitch = () => {
    setFarmToConfirm(null);
    setFarmSwitchModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-56 xl:w-72 bg-slate-800 shadow-lg z-30 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-gray-200`}>
        <div className="h-full flex flex-col">
          <div className="p-4 xl:p-6 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3 xl:mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            <div className="flex items-center gap-3 xl:gap-4">
              <div>
                <h1 className="font-bold text-base xl:text-xl text-white">VET Praktika, UAB</h1>
                <p className="text-xs text-gray-400 xl:mt-1">Veterinarija Sistema</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 xl:p-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
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
                    className={`w-full flex items-center gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-lg transition-colors duration-200 min-h-[40px] xl:min-h-[44px] touch-manipulation ${
                      isActive
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-3 xl:p-4 border-t border-slate-700">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-3 px-3 xl:px-4 py-2.5 text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-sm min-h-[40px] xl:min-h-[44px] touch-manipulation"
            >
              <Grid3x3 className="w-5 h-5" />
              <span className="truncate">Modulių pasirinkimas</span>
            </button>
            <div className="text-xs text-gray-500 text-center pt-3">
              <p>Veterinarijos apskaita v1.0.0</p>
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
                    {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                  </h2>
                  <p className="text-xs xl:text-sm text-gray-600 mt-0.5 hidden xl:block">Valdymo sistema</p>
                </div>
              </div>

              <div className="flex items-center gap-1 xl:gap-3">
                {selectedFarm && (
                  <button
                    type="button"
                    onClick={() => setFarmSwitchModalOpen(true)}
                    className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
                    title="Keisti ūkį"
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate max-w-[100px] xl:max-w-[160px]">{selectedFarm.name}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </button>
                )}
                <button
                  onClick={onBackToModules}
                  className="hidden xl:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                  title="Modulių pasirinkimas"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Moduliai</span>
                </button>
                <button
                  onClick={() => setNotepadOpen(true)}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                  title="Užrašinė"
                >
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden xl:inline">Užrašinė</span>
                </button>
                <div className="flex items-center gap-2 px-3 xl:px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
                  <User className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[80px] xl:max-w-none">
                      {user?.full_name || user?.email}
                    </span>
                    {user && (
                      <span className="text-xs text-gray-600 hidden xl:block">
                        {user.role === 'admin' ? 'Admin' : user.role === 'vet' ? 'Veterinaras' : user.role === 'tech' ? 'Technikas' : 'Žiūrėtojas'}
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
            {isFrozen && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-800">Paskyra užšaldyta</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Jūsų paskyra yra laikinai užšaldyta. Negalite atlikti jokių veiksmų sistemoje.
                      Kreipkitės į administratorių dėl daugiau informacijos.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
        </main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>© 2025 VET Praktika, UAB. Visos teisės saugomos.</span>
              </div>
              <div className="text-xs text-gray-500">
                Veterinarijos Valdymo Sistema · Versija 1.0.0
              </div>
            </div>
          </div>
        </footer>
      </div>

      <Notepad isOpen={notepadOpen} onClose={() => setNotepadOpen(false)} />

      {farmSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={cancelFarmSwitch} aria-hidden="true" />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-8 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Keisti ūkį</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Perjungiant į kitą ūkį, visi duomenys (atsargos, gyvūnai, vizitai ir kt.) bus rodomi iš to ūkio perspektyvos. Įsitikinkite, kad pasirinkote teisingą ūkį.
                </p>
              </div>
            </div>

            {farmToConfirm ? (
              <div className="space-y-5">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-300">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Perjungti į:</p>
                  <p className="font-bold text-blue-900 text-2xl mb-1">{farmToConfirm.name}</p>
                  <p className="text-sm font-medium text-blue-700">{farmToConfirm.code}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={confirmFarmSwitch}
                    className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Taip, perjungti
                  </button>
                  <button
                    onClick={() => setFarmToConfirm(null)}
                    className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Atgal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin pr-2">
                {farms.map(farm => (
                  <button
                    key={farm.id}
                    onClick={() => handleFarmSwitch(farm)}
                    disabled={farm.id === selectedFarm?.id}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left group ${
                      farm.id === selectedFarm?.id
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-default'
                        : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${farm.id === selectedFarm?.id ? 'bg-gray-200' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                        <Building2 className={`w-5 h-5 ${farm.id === selectedFarm?.id ? 'text-gray-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-base">{farm.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{farm.code}</p>
                      </div>
                    </div>
                    {farm.id === selectedFarm?.id ? (
                      <span className="text-xs font-bold text-gray-500 px-3 py-1 bg-gray-200 rounded-full">Dabartinis</span>
                    ) : (
                      <span className="text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Perjungti →</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={cancelFarmSwitch}
              className="mt-6 w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              Atšaukti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
