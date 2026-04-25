import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegisterCodeInput, setShowRegisterCodeInput] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  const { signIn } = useAuth();

  const handleRegisterClick = () => {
    if (registrationCode.trim()) {
      window.location.href = `/register?code=${registrationCode.trim()}`;
    } else {
      setShowRegisterCodeInput(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Įvyko klaida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-blue-600 px-8 py-10 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              Veterinarinė apskaita
            </h1>
            <p className="text-blue-100">
              Veterinarijos Valdymo Sistema
            </p>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Prisijungimas
              </h2>
              <p className="text-sm text-gray-600">
                Įveskite prisijungimo duomenis
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  El. paštas
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="jusu.email@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Slaptažodis
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Prašome palaukti...</span>
                  </>
                ) : (
                  <>
                    <span>Prisijungti</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Registration Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {showRegisterCodeInput ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Įveskite registracijos kodą (XXXX-XXXX-XXXX)"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-center font-mono text-lg tracking-wider"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRegisterCodeInput(false)}
                      className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Atšaukti
                    </button>
                    <button
                      onClick={handleRegisterClick}
                      disabled={!registrationCode.trim()}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tęsti
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRegisterCodeInput(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Registruotis</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Stethoscope className="w-4 h-4" />
              <span>Saugus veterinarijos atsargų valdymas</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>© 2026 Veterinarinė apskaitos sistema v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
