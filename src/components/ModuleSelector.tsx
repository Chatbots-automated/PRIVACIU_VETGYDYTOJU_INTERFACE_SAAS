import { Stethoscope, Euro, Package, Shield, LogOut, Building2, Warehouse } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ModuleSelectorProps {
  onSelectModule: (module: 'veterinarija' | 'klientai' | 'vetpraktika') => void;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
            Veterinarinė apskaita
          </h1>
          <p className="text-blue-200 text-base mb-2">
            Valdymo sistema
          </p>
          <p className="text-blue-300 text-sm mt-4">
            Pasirinkite modulį
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mx-auto max-w-6xl">
          <button
            onClick={() => onSelectModule('veterinarija')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 overflow-hidden border-2 border-gray-200 hover:border-blue-400 text-left transform hover:scale-105"
          >
            <div className="bg-blue-600 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Stethoscope className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Veterinarija
              </h2>
              <p className="text-base text-blue-100">
                Veterinarinė sistema
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Atsargų valdymas</p>
                    <p className="text-sm text-gray-600">Vaistų ir medžiagų apskaita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Stethoscope className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Gydymo įrašai</p>
                    <p className="text-sm text-gray-600">Gyvūnų gydymo dokumentavimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Ataskaitos</p>
                    <p className="text-sm text-gray-600">Teisės aktų reikalavimai</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Sinchronizacijos</p>
                    <p className="text-sm text-gray-600">Gyvūnų reprodukcijos valdymas</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectModule('klientai')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 overflow-hidden border-2 border-gray-200 hover:border-indigo-400 text-left transform hover:scale-105"
          >
            <div className="bg-indigo-600 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Building2 className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Klientai
              </h2>
              <p className="text-base text-indigo-100">
                Ūkių valdymas
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Building2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Ūkių registras</p>
                    <p className="text-sm text-gray-600">Klientų ūkių duomenų bazė</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Kontaktai</p>
                    <p className="text-sm text-gray-600">Ūkių kontaktinė informacija</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">VIC Duomenys</p>
                    <p className="text-sm text-gray-600">Veterinarijos informacijos centras</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectModule('vetpraktika')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 overflow-hidden border-2 border-gray-200 hover:border-slate-400 text-left transform hover:scale-105"
          >
            <div className="bg-gradient-to-r from-slate-700 to-gray-800 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Warehouse className="w-12 h-12 text-slate-700" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Veterinarinė apskaitos sistema
              </h2>
              <p className="text-base text-gray-300">
                Bendras sandėlis
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Package className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Sandėlio atsargos</p>
                    <p className="text-sm text-gray-600">Bendras vaistų sandėlis</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Warehouse className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Pajamavimas</p>
                    <p className="text-sm text-gray-600">Produktų priėmimas į sandėlį</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Paskirstymas</p>
                    <p className="text-sm text-gray-600">Atsargų paskirstymas ūkiams</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-base">Bendros ataskaitos</p>
                    <p className="text-sm text-gray-600">Visų ūkių suvestinės</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-slate-700 font-semibold text-lg">
                  <span>Atidaryti</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg px-6 py-3 border border-gray-200 shadow-sm">
            <div className="text-gray-700">
              <p className="text-sm text-gray-500">Prisijungęs kaip</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
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
