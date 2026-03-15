import { Stethoscope, Euro, Package, Shield, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ModuleSelectorProps {
  onSelectModule: (module: 'veterinarija' | 'islaidos' | 'klientai') => void;
}

export function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6TTE2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="text-center mb-12 animate-slide-down">
          <div className="inline-block mb-6 relative">
            <div className="absolute inset-0 bg-blue-400 rounded-2xl blur-2xl opacity-50 animate-pulse-slow"></div>
            <img 
              src="https://rvac.lt/s/img/wp-content/uploads/RVAC_logo.png" 
              alt="RVAC Logo" 
              className="relative h-28 w-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white">
              RVAC Veterinarija
            </span>
          </h1>
          <div className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-3">
            <p className="text-lg text-blue-100 font-semibold">
              Respublikinis veterinarijos aprūpinimo centras
            </p>
          </div>
          <p className="text-blue-300 text-lg font-medium mt-4">
            Pasirinkite modulį
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mx-auto max-w-6xl animate-scale-in">
          <button
            onClick={() => onSelectModule('veterinarija')}
            className="group relative bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-blue-500/50 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-blue-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 lg:p-8 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative w-28 h-28 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/30">
                <Stethoscope className="w-16 h-16 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 drop-shadow-lg">
                Veterinarija
              </h2>
              <p className="text-sm lg:text-base text-blue-100 font-medium">
                Veterinarinė sistema
              </p>
            </div>

            <div className="p-6 lg:p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Atsargų valdymas</p>
                    <p className="text-sm text-gray-600">Vaistų ir medžiagų apskaita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Gydymo įrašai</p>
                    <p className="text-sm text-gray-600">Gyvūnų gydymo dokumentavimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Ataskaitos</p>
                    <p className="text-sm text-gray-600">Teisės aktų reikalavimai</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Sinchronizacijos</p>
                    <p className="text-sm text-gray-600">Gyvūnų reprodukcijos valdymas</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 text-blue-600 font-bold group-hover:gap-4 transition-all text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectModule('klientai')}
            className="group relative bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-indigo-500/50 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-indigo-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 lg:p-8 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative w-28 h-28 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/30">
                <Building2 className="w-16 h-16 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 drop-shadow-lg">
                Klientai
              </h2>
              <p className="text-sm lg:text-base text-indigo-100 font-medium">
                Ūkių valdymas
              </p>
            </div>

            <div className="p-6 lg:p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Ūkių registras</p>
                    <p className="text-sm text-gray-600">Klientų ūkių duomenų bazė</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Kontaktai</p>
                    <p className="text-sm text-gray-600">Ūkių kontaktinė informacija</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">VIC Duomenys</p>
                    <p className="text-sm text-gray-600">Veterinarijos informacijos centras</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 text-indigo-600 font-bold group-hover:gap-4 transition-all text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectModule('islaidos')}
            className="group relative bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-amber-500/50 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-amber-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 lg:p-8 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative w-28 h-28 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/30">
                <Euro className="w-16 h-16 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 drop-shadow-lg">
                Išlaidos
              </h2>
              <p className="text-sm lg:text-base text-amber-100 font-medium">
                Sąskaitų valdymas
              </p>
            </div>

            <div className="p-6 lg:p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Sąskaitos</p>
                    <p className="text-sm text-gray-600">Sąskaitų registravimas ir valdymas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <Euro className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Išlaidų apskaita</p>
                    <p className="text-sm text-gray-600">Finansinė ataskaita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Tiekėjai</p>
                    <p className="text-sm text-gray-600">Tiekėjų duomenų bazė</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 text-amber-600 font-bold group-hover:gap-4 transition-all text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center animate-fade-in">
          <div className="inline-flex items-center gap-4 glass-dark rounded-2xl px-8 py-4 border-2 border-white/20 shadow-2xl">
            <div className="text-white">
              <p className="text-sm text-blue-300 font-medium">Prisijungęs kaip</p>
              <p className="font-bold text-lg">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/80 hover:bg-red-600 rounded-xl text-white transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              <span>Atsijungti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
