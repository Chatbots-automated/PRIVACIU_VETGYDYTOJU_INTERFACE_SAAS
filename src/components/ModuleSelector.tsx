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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6TTE2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      <div className="w-full max-w-6xl relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <img 
              src="https://rvac.lt/s/img/wp-content/uploads/RVAC_logo.png" 
              alt="RVAC Logo" 
              className="h-24 w-auto"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
            RVAC Veterinarija
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            Respublikinis veterinarijos aprūpinimo centras
          </p>
          <p className="text-blue-300">
            Pasirinkite modulį
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mx-auto max-w-6xl">
          {/* Veterinarija Module */}
          <button
            onClick={() => onSelectModule('veterinarija')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 lg:p-8 text-center">
              <div className="w-24 h-24 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Stethoscope className="w-14 h-14 text-blue-600" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Veterinarija
              </h2>
              <p className="text-sm lg:text-base text-blue-100">
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

              <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                <span>Atidaryti</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Klientai Module */}
          <button
            onClick={() => onSelectModule('klientai')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 lg:p-8 text-center">
              <div className="w-24 h-24 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-14 h-14 text-indigo-600" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Klientai
              </h2>
              <p className="text-sm lg:text-base text-indigo-100">
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

              <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
                <span>Atidaryti</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Išlaidos Module */}
          <button
            onClick={() => onSelectModule('islaidos')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-6 lg:p-8 text-center">
              <div className="w-24 h-24 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Euro className="w-14 h-14 text-amber-600" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Išlaidos
              </h2>
              <p className="text-sm lg:text-base text-amber-100">
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

              <div className="flex items-center justify-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all">
                <span>Atidaryti</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* User Info and Logout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
            <div className="text-white">
              <p className="text-sm text-blue-200">Prisijungęs kaip</p>
              <p className="font-semibold">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Atsijungti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
