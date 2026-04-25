import { useState, useEffect } from 'react';
import { Check, AlertTriangle, Building2, Mail, Lock, User, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClientInfo {
  client_id: string;
  client_name: string;
  client_email: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: boolean;
}

export function ClientRegistration() {
  const [registrationCode, setRegistrationCode] = useState('');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Client info form (editable during registration)
  const [clientFormData, setClientFormData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    contact_phone: '',
    contact_person: '',
  });

  // Get code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setRegistrationCode(code);
      validateCode(code);
    }
  }, []);

  const validateCode = async (code: string) => {
    setValidating(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .rpc('validate_registration_code', { p_code: code });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('Invalid or expired registration code. Please contact support.');
        return;
      }

      setClientInfo(data[0]);
      
      // Pre-fill client form with existing data
      setClientFormData({
        name: data[0].client_name || '',
        address: '',
        city: '',
        postal_code: '',
        contact_phone: '',
        contact_person: '',
      });
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Failed to validate registration code. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      // Update client info if any fields were edited
      if (clientFormData.address || clientFormData.city || clientFormData.postal_code || 
          clientFormData.contact_phone || clientFormData.contact_person) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            address: clientFormData.address || null,
            city: clientFormData.city || null,
            postal_code: clientFormData.postal_code || null,
            contact_phone: clientFormData.contact_phone || null,
            contact_person: clientFormData.contact_person || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientInfo!.client_id);

        if (updateError) console.warn('Failed to update client info:', updateError);
      }

      // Create user using the create_user function
      const { data: userId, error: createError } = await supabase
        .rpc('create_user', {
          p_email: formData.email,
          p_password: formData.password,
          p_role: 'admin', // Default role for first user
          p_client_id: clientInfo!.client_id,
          p_full_name: formData.fullName,
          p_default_farm_id: null,
          p_can_access_all_farms: true,
        });

      if (createError) throw createError;

      setSuccess(true);

      // Auto-login after 2 seconds
      setTimeout(() => {
        window.location.href = '/?auto_login=' + formData.email;
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message.includes('duplicate key')) {
        setError('This email is already registered. Please use a different email or contact support.');
      } else if (err.message.includes('maximum user limit')) {
        setError('Client has reached maximum user limit. Please contact support.');
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating code
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Validating registration code...</p>
        </div>
      </div>
    );
  }

  // Show error if code is invalid
  if (!clientInfo && !validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Invalid Registration Code</h2>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            {error || 'The registration code is invalid or has expired. Please contact your administrator for a new code.'}
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter registration code (XXXX-XXXX-XXXX)"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => validateCode(registrationCode)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Validate Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-green-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Welcome to Veterinary Management</h1>
              <p className="text-blue-100 text-sm">Create your account to get started</p>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div className="bg-blue-50 border-b border-blue-100 px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-blue-600 font-medium mb-1">ORGANIZACIJA</p>
              <p className="font-bold text-gray-900">{clientFormData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 font-medium mb-1">PLANAS</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 capitalize">
                {clientInfo?.subscription_plan}
              </span>
            </div>
          </div>
          <p className="text-xs text-blue-700">
            Užpildykite arba patikslinkite informaciją apie organizaciją
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Organization Information Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Organizacijos informacija</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Kontaktinis asmuo
                  </label>
                  <input
                    type="text"
                    value={clientFormData.contact_person}
                    onChange={(e) => setClientFormData({ ...clientFormData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Vardas Pavardė"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Telefonas
                  </label>
                  <input
                    type="tel"
                    value={clientFormData.contact_phone}
                    onChange={(e) => setClientFormData({ ...clientFormData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="+370 600 12345"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Adresas
                  </label>
                  <input
                    type="text"
                    value={clientFormData.address}
                    onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Gatvė 123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Miestas
                  </label>
                  <input
                    type="text"
                    value={clientFormData.city}
                    onChange={(e) => setClientFormData({ ...clientFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Vilnius"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Pašto kodas
                  </label>
                  <input
                    type="text"
                    value={clientFormData.postal_code}
                    onChange={(e) => setClientFormData({ ...clientFormData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="01234"
                  />
                </div>
              </div>
            </div>

            {/* User Account Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Jūsų paskyros duomenys</h3>
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vardas ir pavardė *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Įveskite vardą ir pavardę"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    El. paštas *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="jusu.email@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slaptažodis *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sukurkite saugų slaptažodį"
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mažiausiai 8 simboliai</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pakartokite slaptažodį *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Įveskite slaptažodį dar kartą"
                      minLength={8}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Sukurti paskyrą
                  </>
                )}
              </button>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-6">
              Kurdami paskyrą sutinkate su naudojimosi sąlygomis ir privatumo politika
            </p>
        </form>
      </div>
    </div>
  );
}
