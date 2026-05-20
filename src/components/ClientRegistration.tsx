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
    company_code: '',
    vat_code: '',
    address: '',
    city: '',
    postal_code: '',
    contact_email: '',
    contact_phone: '',
    contact_person: '',
  });

  // VIC credentials and personal code
  const [vicData, setVicData] = useState({
    username: '',
    password: '',
    personalCode: '',
  });

  const [loadingData, setLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState('');
  const [farmId, setFarmId] = useState<string | null>(null);
  const [vicDataLoaded, setVicDataLoaded] = useState(false);

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
        setError('Neteisingas arba pasibaigęs registracijos kodas. Kreipkitės į pagalbos tarnybą.');
        return;
      }

      setClientInfo(data[0]);
      
      // Pre-fill client form with existing data
      setClientFormData({
        name: data[0].client_name || '',
        company_code: '',
        vat_code: '',
        address: '',
        city: '',
        postal_code: '',
        contact_email: data[0].client_email || '',
        contact_phone: '',
        contact_person: '',
      });
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Nepavyko patikrinti registracijos kodo. Bandykite dar kartą.');
    } finally {
      setValidating(false);
    }
  };

  const handleLoadData = async () => {
    setLoadingData(true);
    setDataLoadError('');

    // Validation
    if (!vicData.username || !vicData.password || !vicData.personalCode) {
      setDataLoadError('Prašome užpildyti VIC prisijungimo duomenis ir asmens kodą');
      setLoadingData(false);
      return;
    }

    try {
      // Create a farm first to get the farm ID
      if (!farmId) {
        const { data: farmData, error: farmError } = await supabase
          .from('farms')
          .insert({
            client_id: clientInfo!.client_id,
            name: clientFormData.name || 'Pagrindinis ūkis',
            vic_username: vicData.username,
            vic_password_encrypted: vicData.password, // Note: In production, encrypt this
            is_active: true,
          })
          .select()
          .single();

        if (farmError) throw farmError;
        setFarmId(farmData.id);

        // Send webhook
        await sendWebhook(farmData.id);
      } else {
        // Farm already exists, just send webhook
        await sendWebhook(farmId);
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      setDataLoadError(`Nepavyko užkrauti duomenų: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const sendWebhook = async (currentFarmId: string) => {
    const webhookUrl = 'https://n8n-up8s.onrender.com/webhook/ff95a207-1b7b-4b38-b41c-265ea4471a2f';
    
    const payload = {
      requestId: `reg-${Date.now()}`,
      workerType: 'holder_lookup',
      username: vicData.username,
      password: vicData.password,
      personalCode: vicData.personalCode,
      tenantId: clientInfo!.client_id,
      farmId: currentFarmId,
      userId: formData.email || 'pending',
      metadata: {
        source: 'n8n',
        reason: 'new_user_onboarding',
        repo: 'PRIVACIU_VETGYTOJU_INTERFACE_SAAS_VIC-WORKERS',
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Check if we got data back in the new format
      if (result && result.vic_raw_payload && result.vic_raw_payload.data) {
        const vicResponseData = result.vic_raw_payload.data;
        const vicFullPayload = result.vic_raw_payload;
        
        // Auto-populate form fields with VIC data
        const firstName = vicResponseData.basic?.firstName || '';
        const lastName = vicResponseData.basic?.lastNameOrCompanyName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Update user form data
        setFormData(prev => ({
          ...prev,
          fullName: fullName,
          email: vicResponseData.contact?.email || prev.email,
        }));

        // Update client form data with address
        const street = vicResponseData.address?.street || '';
        const houseNumber = vicResponseData.address?.houseNumber || '';
        const apartment = vicResponseData.address?.apartmentNumber || '';
        const fullAddress = `${street} ${houseNumber}${apartment ? `-${apartment}` : ''}`.trim();

        setClientFormData(prev => ({
          ...prev,
          address: fullAddress,
          postal_code: vicResponseData.address?.postalCode || prev.postal_code,
          city: vicResponseData.address?.locality || vicResponseData.address?.municipality || prev.city,
          contact_email: vicResponseData.contact?.email || prev.contact_email,
          contact_phone: vicResponseData.contact?.mobilePhone || vicResponseData.contact?.phone || prev.contact_phone,
          contact_person: fullName,
        }));

        // Update farm with comprehensive VIC info
        const { error: farmUpdateError } = await supabase
          .from('farms')
          .update({
            contact_person: fullName,
            contact_email: vicResponseData.contact?.email || null,
            contact_phone: vicResponseData.contact?.mobilePhone || vicResponseData.contact?.phone || null,
            address: fullAddress || null,
            // Store complete VIC response in a JSONB column
            vic_data: vicFullPayload,
            // Store key VIC identifiers
            vic_personal_code: vicResponseData.basic?.personalOrCompanyCode || null,
            vic_vet_license: vicResponseData.additional?.vetLicenseNumber || null,
            vic_is_vet_doctor: vicResponseData.additional?.isVetDoctor || false,
            vic_is_marker: vicResponseData.additional?.isMarker || false,
            // Store holdings count
            vic_holdings_count: vicResponseData.holdings?.length || 0,
            // Timestamp of last VIC sync
            vic_last_synced_at: new Date().toISOString(),
          })
          .eq('id', currentFarmId);

        if (farmUpdateError) {
          console.error('Failed to update farm with VIC data:', farmUpdateError);
          throw new Error('Nepavyko išsaugoti VIC duomenų');
        }

        // Mark VIC data as loaded
        setVicDataLoaded(true);
        alert('Duomenys sėkmingai užkrauti iš VIC sistemos!');
      } else {
        throw new Error('Negautas tinkamas atsakymas iš VIC sistemos');
      }
    } catch (error: any) {
      console.error('Webhook error:', error);
      throw new Error('Nepavyko išsiųsti duomenų: ' + error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Prašome užpildyti visus privalomas laukus');
      setLoading(false);
      return;
    }

    if (!clientFormData.name || !clientFormData.contact_email) {
      setError('Prašome užpildyti organizacijos pavadinimą ir el. paštą');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Slaptažodžiai nesutampa');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Slaptažodis turi būti ne trumpesnis nei 8 simboliai');
      setLoading(false);
      return;
    }

    try {
      // Update client info with all provided fields
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          name: clientFormData.name,
          company_code: clientFormData.company_code || null,
          vat_code: clientFormData.vat_code || null,
          vat_rate: 21.00, // Default Lithuanian VAT rate
          contact_email: clientFormData.contact_email,
          address: clientFormData.address || null,
          city: clientFormData.city || null,
          postal_code: clientFormData.postal_code || null,
          contact_phone: clientFormData.contact_phone || null,
          contact_person: clientFormData.contact_person || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientInfo!.client_id);

      if (updateError) {
        console.error('Failed to update client info:', updateError);
        throw new Error('Nepavyko atnaujinti organizacijos informacijos');
      }

      // Create farm if it doesn't exist yet
      let currentFarmId = farmId;
      if (!currentFarmId) {
        const { data: farmData, error: farmError } = await supabase
          .from('farms')
          .insert({
            client_id: clientInfo!.client_id,
            name: clientFormData.name || 'Pagrindinis ūkis',
            vic_username: vicData.username || null,
            vic_password_encrypted: vicData.password || null,
            is_active: true,
          })
          .select()
          .single();

        if (farmError) {
          console.error('Failed to create farm:', farmError);
          throw new Error('Nepavyko sukurti ūkio');
        }
        currentFarmId = farmData.id;
      }

      // Create user using the create_user function
      const { data: userId, error: createError } = await supabase
        .rpc('create_user', {
          p_email: formData.email,
          p_password: formData.password,
          p_role: 'admin', // Default role for first user
          p_client_id: clientInfo!.client_id,
          p_full_name: formData.fullName,
          p_default_farm_id: currentFarmId,
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
        setError('Šis el. paštas jau užregistruotas. Naudokite kitą el. paštą arba kreipkitės į pagalbos tarnybą.');
      } else if (err.message.includes('maximum user limit')) {
        setError('Klientas pasiekė maksimalų vartotojų skaičių. Kreipkitės į pagalbos tarnybą.');
      } else if (err.message.includes('organizacijos informacijos')) {
        setError(err.message);
      } else {
        setError(`Registracija nepavyko: ${err.message}`);
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
          <p className="text-gray-600 font-medium">Tikrinamas registracijos kodas...</p>
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
              <h2 className="text-xl font-bold text-gray-900">Neteisingas registracijos kodas</h2>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            {error || 'Registracijos kodas yra neteisingas arba pasibaigęs. Kreipkitės į administratorių dėl naujo kodo.'}
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Įveskite registracijos kodą (XXXX-XXXX-XXXX)"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => validateCode(registrationCode)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Patikrinti kodą
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registracija sėkminga!</h2>
          <p className="text-gray-600 mb-4">
            Jūsų paskyra sukurta sėkmingai.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              Nukreipiame į prisijungimo puslapį...
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
              <h1 className="text-2xl font-bold text-white mb-1">Sveiki prisijungę</h1>
              <p className="text-blue-100 text-sm">Sukurkite paskyrą, kad pradėtumėte naudotis sistema</p>
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
            {/* VIC Credentials Section - Always visible first */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-4">VIC prisijungimo duomenys</h3>
              <p className="text-xs text-blue-700 mb-4">
                Įveskite savo VIC (Veterinarijos informacijos centro) prisijungimo duomenis ir asmens kodą
              </p>
              
              <div className="space-y-4">
                {/* VIC Username */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    VIC vartotojo vardas *
                  </label>
                  <input
                    type="text"
                    value={vicData.username}
                    onChange={(e) => setVicData({ ...vicData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="pvz. vardas.pavarde"
                    disabled={vicDataLoaded}
                  />
                </div>

                {/* VIC Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    VIC slaptažodis *
                  </label>
                  <input
                    type="password"
                    value={vicData.password}
                    onChange={(e) => setVicData({ ...vicData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Įveskite VIC slaptažodį"
                    disabled={vicDataLoaded}
                  />
                </div>

                {/* Personal Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Asmens kodas *
                  </label>
                  <input
                    type="text"
                    value={vicData.personalCode}
                    onChange={(e) => setVicData({ ...vicData, personalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Įveskite asmens kodą"
                    maxLength={11}
                    disabled={vicDataLoaded}
                  />
                </div>

                {/* Load Data Button */}
                {!vicDataLoaded && (
                  <button
                    type="button"
                    onClick={handleLoadData}
                    disabled={loadingData || !vicData.username || !vicData.password || !vicData.personalCode}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingData ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Kraunami duomenys...
                      </>
                    ) : (
                      'Užkrauti duomenis'
                    )}
                  </button>
                )}

                {/* Success message when loaded */}
                {vicDataLoaded && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800 font-medium">✓ Duomenys sėkmingai užkrauti iš VIC sistemos</p>
                  </div>
                )}

                {/* Data Load Error */}
                {dataLoadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-800">{dataLoadError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Show other sections only after VIC data is loaded */}
            {vicDataLoaded && (
              <>
            {/* Organization Information Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pagrindinė informacija</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Organization Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Organizacijos pavadinimas *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientFormData.name}
                    onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="UAB Veterinarijos klinika"
                  />
                </div>

                {/* Company Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Įmonės kodas
                  </label>
                  <input
                    type="text"
                    value={clientFormData.company_code}
                    onChange={(e) => setClientFormData({ ...clientFormData, company_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="123456789"
                  />
                </div>

                {/* VAT Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PVM kodas
                  </label>
                  <input
                    type="text"
                    value={clientFormData.vat_code}
                    onChange={(e) => setClientFormData({ ...clientFormData, vat_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="LT123456789"
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mb-4 mt-6">Kontaktinė informacija</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Contact Email */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    El. paštas *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientFormData.contact_email}
                    onChange={(e) => setClientFormData({ ...clientFormData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="info@veterinarija.lt"
                  />
                </div>

                {/* Contact Phone */}
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

                {/* Contact Person */}
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
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mb-4 mt-6">Adresas</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Address */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Gatvė
                  </label>
                  <input
                    type="text"
                    value={clientFormData.address}
                    onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Gatvės pavadinimas 123"
                  />
                </div>

                {/* City */}
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

                {/* Postal Code */}
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
            </>
            )}
          </div>

          {/* Submit Button - Only show when VIC data is loaded */}
          {vicDataLoaded && (
            <>
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Kuriama paskyra...
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
