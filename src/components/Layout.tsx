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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-56 xl:w-72 bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-950 shadow-2xl z-30 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} border-r-2 border-blue-500/20`}>
        <div className="h-full flex flex-col relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
          
          <div className="relative p-3 xl:p-6 border-b border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2 xl:mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 xl:p-2 hover:bg-blue-700/50 rounded-lg transition-colors">
                <X className="w-4 xl:w-5 h-4 xl:h-5 text-blue-200" />
              </button>
            </div>
            <div className="flex items-center gap-2 xl:gap-4">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-blue-400 rounded-xl blur-md opacity-50 animate-pulse-slow"></div>
                <img
                  src="https://rvac.lt/s/img/wp-content/uploads/RVAC_logo.png"
                  alt="RVAC"
                  className="relative w-10 xl:w-16 h-10 xl:h-16 rounded-xl bg-white p-0.5 xl:p-1 shadow-2xl object-contain ring-2 ring-blue-400/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-black text-sm xl:text-2xl text-white leading-tight tracking-tight">RVAC</h1>
                <p className="text-xs text-blue-300 xl:mt-1 font-medium">Veterinarija<span className="hidden xl:inline"> Sistema</span></p>
              </div>
            </div>
          </div>

          <nav className="relative flex-1 p-2 xl:p-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="space-y-2">
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
                    className={`relative w-full flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-xl transition-all duration-200 min-h-[40px] xl:min-h-[44px] touch-manipulation group ${
                      isActive
                        ? 'bg-gradient-to-r from-white to-blue-50 text-blue-900 shadow-xl font-bold scale-105'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white active:bg-white/20 hover:translate-x-1'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full shadow-lg"></div>
                    )}
                    <Icon className={`w-4 xl:w-5 h-4 xl:h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'group-hover:scale-110 transition-transform'}`} />
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
        <header className="glass border-b-2 border-blue-200/50 sticky top-0 z-10 shadow-xl">
          <div className="px-2 xl:px-6 py-3 xl:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 xl:gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-blue-100 rounded-xl transition-all min-w-[40px] xl:min-w-[44px] min-h-[40px] xl:min-h-[44px] touch-manipulation active:bg-blue-200 hover:scale-110"
                >
                  <Menu className="w-5 xl:w-6 h-5 xl:h-6 text-blue-700" />
                </button>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-20"></div>
                  <div className="relative">
                    <h2 className="text-base xl:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                    </h2>
                    <p className="text-xs xl:text-sm text-gray-600 mt-0.5 hidden xl:block font-medium">Valdymo sistema · Real-time apskaita</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 xl:gap-3">
                {selectedFarm && (
                  <button
                    type="button"
                    onClick={() => setFarmSwitchModalOpen(true)}
                    className="flex items-center gap-2 px-2 xl:px-4 py-1.5 xl:py-2 text-xs xl:text-sm font-medium bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    title="Keisti ūkį"
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate max-w-[100px] xl:max-w-[160px]">{selectedFarm.name}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  </button>
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

        <main className="p-2 xl:p-8 min-h-screen relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMSIgZmlsbD0iIzM3ODFmNiIgZmlsbC1vcGFjaXR5PSIwLjA4Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none"></div>
          <div className="relative">
            {isFrozen && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-lg animate-slide-down">
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

      {farmSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelFarmSwitch} aria-hidden="true" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-blue-200 animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-3xl"></div>
            <div className="flex items-start gap-4 mb-6 mt-2">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
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
                <div className="relative p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Perjungti į:</p>
                    <p className="font-black text-blue-900 text-2xl mb-1">{farmToConfirm.name}</p>
                    <p className="text-sm font-medium text-blue-700">{farmToConfirm.code}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={confirmFarmSwitch}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  >
                    Taip, perjungti
                  </button>
                  <button
                    onClick={() => setFarmToConfirm(null)}
                    className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all hover:scale-105 active:scale-95"
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
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group ${
                      farm.id === selectedFarm?.id
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-default'
                        : 'bg-gradient-to-r from-white to-blue-50/30 border-blue-200 hover:border-blue-400 hover:shadow-md text-gray-900 hover:scale-102'
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
