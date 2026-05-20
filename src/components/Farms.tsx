import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Save, X, Building2, Phone, Mail, MapPin, Hash, CheckCircle, XCircle, Download, Loader } from 'lucide-react';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';

interface Farm {
  id?: string;
  name: string;
  code: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  vic_production_username?: string;
  vic_production_password?: string;
  vic_pet_username?: string;
  vic_pet_password?: string;
  is_active: boolean;
  is_eco_farm?: boolean;
  client_personal_code?: string;
}

export function Farms() {
  const { user } = useAuth();
  const { loadFarms } = useFarm();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [clientLimits, setClientLimits] = useState<{ max_farms: number; max_users: number } | null>(null);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [animalsLoaded, setAnimalsLoaded] = useState(false);
  const [vicResponse, setVicResponse] = useState<any>(null);
  const [savingData, setSavingData] = useState(false);

  const emptyFarm: Farm = {
    name: '',
    code: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    vic_production_username: '',
    vic_production_password: '',
    vic_pet_username: '',
    vic_pet_password: '',
    is_active: true,
    is_eco_farm: false,
    client_personal_code: '',
  };

  const [formData, setFormData] = useState<Farm>(emptyFarm);

  // Debug: Track state changes
  useEffect(() => {
    console.log('[Farms] State changed:', {
      animalsLoaded,
      hasVicResponse: !!vicResponse,
      vicResponseKeys: vicResponse ? Object.keys(vicResponse) : []
    });
  }, [animalsLoaded, vicResponse]);

  // Debug: Track formData changes
  useEffect(() => {
    console.log('[Farms] FormData changed:', {
      name: formData.name,
      code: formData.code,
      address: formData.address,
      contact_person: formData.contact_person
    });
  }, [formData]);

  useEffect(() => {
    loadData();
    loadClientLimits();
  }, []);

  const loadClientLimits = async () => {
    try {
      const clientId = requireClientId(user);
      const { data, error } = await supabase
        .from('clients')
        .select('max_farms, max_users')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClientLimits(data);
    } catch (error) {
      console.error('Error loading client limits:', error);
    }
  };

  const handleLoadAnimals = async () => {
    if (!formData.client_personal_code) {
      alert('Įveskite kliento asmens kodą');
      return;
    }

    setLoadingAnimals(true);
    try {
      const clientId = requireClientId(user);
      let farmId = formData.id;

      // If farm doesn't exist yet, create it first
      if (!farmId) {
        const { data: newFarm, error: farmError } = await supabase
          .from('farms')
          .insert([{
            client_id: clientId,
            name: 'Temp - ' + formData.client_personal_code,
            code: formData.client_personal_code || 'TEMP',
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            vic_production_username: formData.vic_production_username || null,
            vic_production_password: formData.vic_production_password || null,
            vic_pet_username: formData.vic_pet_username || null,
            vic_pet_password: formData.vic_pet_password || null,
            is_active: formData.is_active,
            is_eco_farm: formData.is_eco_farm || false,
            client_personal_code: formData.client_personal_code || null,
          }])
          .select()
          .single();

        if (farmError) {
          console.error('Farm creation error:', farmError);
          throw new Error(`Nepavyko sukurti ūkio: ${farmError.message}`);
        }
        
        farmId = newFarm.id;
        setFormData({ ...formData, id: farmId });
      }

      // Get VIC credentials from organization's farm
      const { data: orgFarm, error: orgError } = await supabase
        .from('farms')
        .select('id, name, vic_username, vic_password_encrypted')
        .eq('client_id', clientId)
        .not('vic_username', 'is', null)
        .not('vic_password_encrypted', 'is', null)
        .limit(1)
        .single();

      if (orgError || !orgFarm?.vic_username || !orgFarm?.vic_password_encrypted) {
        throw new Error('VIC prisijungimo duomenys nerasti. Užpildykite juos registracijos metu arba organizacijos nustatymuose.');
      }

      // Show warning if VIC password looks like it might be wrong
      if (orgFarm.vic_password_encrypted === 'veterinaras') {
        throw new Error('VIC slaptažodis yra neteisingas. Prašome atnaujinti VIC prisijungimo duomenis organizacijos nustatymuose (Profilio mygtukas viršutinėje dešinėje).');
      }

      const webhookUrl = 'https://n8n-up8s.onrender.com/webhook/1eef952b-45de-4b61-b608-61960363853e';
      
      const payload = {
        requestId: `farm-${Date.now()}`,
        workerType: 'live_animals_pdf',
        vicUsername: orgFarm.vic_username,
        vicPassword: orgFarm.vic_password_encrypted,
        clientPersonalCode: formData.client_personal_code,
        tenantId: clientId,
        farmId: farmId,
        clientId: farmId,
        userId: user!.id,
        metadata: {
          source: 'n8n',
          reason: 'client_animals_fetch',
          repo: 'PRIVACIU_VETGYDYTOJU_INTERFACE_SAAS_VIC-WORKERS',
        },
      };

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
      console.log('Raw webhook response:', result);
      
      // Extract the vic_raw_payload - it's NOT an array anymore
      let vicPayload;
      if (result.vic_raw_payload) {
        // Response format: { vic_raw_payload: { data, pageData } }
        vicPayload = result.vic_raw_payload;
      } else if (Array.isArray(result) && result[0]?.vic_raw_payload) {
        // Old array format: [{ vic_raw_payload: { data, pageData } }]
        vicPayload = result[0].vic_raw_payload;
      } else if (Array.isArray(result)) {
        // Fallback: array with direct data
        vicPayload = result[0];
      } else {
        // Fallback: direct data
        vicPayload = result;
      }
      
      console.log('Parsed VIC payload:', vicPayload);
      console.log('Has pageData:', !!vicPayload?.pageData);
      console.log('Has data:', !!vicPayload?.data);
      
      // Store the full response (with vic_raw_payload wrapper) for display
      setVicResponse(result);
      setAnimalsLoaded(true);
      console.log('State updated - animalsLoaded: true, vicResponse set');
      
      // Auto-fill farm data from VIC response
      if (vicPayload?.pageData?.clientCards?.[0]) {
        const clientCard = vicPayload.pageData.clientCards[0];
        console.log('Client card data:', clientCard);
        console.log('Holder name:', clientCard.holderName);
        console.log('Holding number:', clientCard.holdingNumber);
        console.log('Herd address:', clientCard.herdAddress);
        
        const newFormData = {
          ...formData,
          id: farmId,
          name: clientCard.holderName || '',
          code: clientCard.holdingNumber || '',
          address: clientCard.herdAddress || clientCard.holderAddress || '',
          contact_person: clientCard.holderName || '',
        };
        
        console.log('Setting form data to:', newFormData);
        setFormData(newFormData);
        
        // Update the farm in database with real VIC data
        if (farmId) {
          const { error: updateError } = await supabase
            .from('farms')
            .update({
              name: clientCard.holderName || null,
              code: clientCard.holdingNumber || null,
              address: clientCard.herdAddress || clientCard.holderAddress || null,
              contact_person: clientCard.holderName || null,
            })
            .eq('id', farmId);
            
          if (updateError) {
            console.error('Error updating farm with VIC data:', updateError);
          } else {
            console.log('Farm updated with VIC data');
          }
        }
        
        console.log('Form data updated');
      } else {
        console.log('No client card data found in payload');
      }

      alert('Duomenys užkrauti iš VIC! Peržiūrėkite informaciją ir išsaugokite.');
    } catch (error: any) {
      console.error('Error loading animals:', error);
      alert(`Klaida užkraunant duomenis: ${error.message}`);
    } finally {
      setLoadingAnimals(false);
    }
  };

  const handleSaveClientAndAnimals = async () => {
    if (!vicResponse || !formData.id) {
      alert('Nėra duomenų išsaugojimui');
      return;
    }

    setSavingData(true);
    try {
      const clientId = requireClientId(user);
      const data = vicResponse.vic_raw_payload?.data;
      const pageData = vicResponse.vic_raw_payload?.pageData;
      
      if (!data?.animals || !Array.isArray(data.animals)) {
        throw new Error('Nerasta gyvūnų duomenų');
      }

      // Prepare animals data for insertion
      const animalsToInsert = data.animals.map((animal: any) => {
        console.log('🐄 Animal from webhook:', {
          tagNo: animal.tagNo,
          animalType: animal.animalType,
          name: animal.name,
          sex: animal.sex,
          passportSeries: animal.passportSeries,
          passportNumber: animal.passportNumber
        });
        
        return {
          client_id: clientId,
          farm_id: formData.id,
          tag_no: animal.tagNo || animal.animalNumber,
          name: animal.name || null,
          animal_type: 'produkcinis', // All cattle from VIC are production animals
          animal_subtype: animal.animalType || null, // Specific type like "Karvė", "Bulius", etc.
          species: animal.species || 'Galvijai',
          sex: animal.sex === 'female' ? 'Patelė' : animal.sex === 'male' ? 'Patinas' : null,
          age_months: animal.ageMonths || null,
          holder_name: pageData?.clientCards?.[0]?.holderName || null,
          holder_address: pageData?.clientCards?.[0]?.holderAddress || null,
          breed: animal.breed || null,
          birth_date: animal.birthDate || null,
          passport_series: animal.passportSeries || null,
          passport_number: animal.passportNumber || null,
          active: true,
        };
      });

      // Insert animals in batches
      const { error: animalsError } = await supabase
        .from('animals')
        .insert(animalsToInsert);

      if (animalsError) throw animalsError;

      alert(`Sėkmingai išsaugota! ${animalsToInsert.length} gyvūnų įrašai sukurti.`);
      
      // Close form and reload
      setEditing(null);
      setShowAdd(false);
      setFormData(emptyFarm);
      setAnimalsLoaded(false);
      setVicResponse(null);
      await loadData();
      await loadFarms();
    } catch (error: any) {
      console.error('Error saving client and animals:', error);
      alert(`Klaida išsaugant duomenis: ${error.message}`);
    } finally {
      setSavingData(false);
    }
  };

  const loadData = async () => {
    try {
      const clientId = requireClientId(user);
      
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('client_id', clientId)
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error loading farms:', error);
      alert('Klaida kraunant ūkius');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // For initial save, only require personal code
      if (!animalsLoaded && !formData.client_personal_code) {
        alert('Įveskite kliento asmens kodą');
        return;
      }

      // For final save, require name and code
      if (animalsLoaded && (!formData.name || !formData.code)) {
        alert('Pavadinimas ir kodas yra privalomi');
        return;
      }

      const clientId = requireClientId(user);
      
      if (editing) {
        const { error } = await supabase
          .from('farms')
          .update({
            name: formData.name,
            code: formData.code,
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            vic_production_username: formData.vic_production_username || null,
            vic_production_password: formData.vic_production_password || null,
            vic_pet_username: formData.vic_pet_username || null,
            vic_pet_password: formData.vic_pet_password || null,
            is_active: formData.is_active,
            is_eco_farm: formData.is_eco_farm || false,
            client_personal_code: formData.client_personal_code || null,
          })
          .eq('id', editing);

        if (error) throw error;
        alert('Ūkis atnaujintas!');
        setEditing(null);
        setShowAdd(false);
        await loadData();
        await loadFarms();
      } else {
        // For new farm, create a placeholder entry for initial save
        const { data: newFarm, error } = await supabase
          .from('farms')
          .insert([{
            client_id: clientId,
            name: formData.name || 'Temp - ' + formData.client_personal_code,
            code: formData.code || formData.client_personal_code || 'TEMP',
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            vic_production_username: formData.vic_production_username || null,
            vic_production_password: formData.vic_production_password || null,
            vic_pet_username: formData.vic_pet_username || null,
            vic_pet_password: formData.vic_pet_password || null,
            is_active: formData.is_active,
            is_eco_farm: formData.is_eco_farm || false,
            client_personal_code: formData.client_personal_code || null,
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Update form data with the new farm ID so we can load animals
        if (newFarm) {
          setFormData({ ...formData, id: newFarm.id });
        }
        
        if (!animalsLoaded) {
          alert('Pradinė informacija išsaugota! Dabar užkraukite gyvūnus iš VIC.');
        } else {
          alert('Ūkis sukurtas!');
          setEditing(null);
          setShowAdd(false);
          await loadData();
          await loadFarms();
        }
      }
    } catch (error: any) {
      console.error('Error saving farm:', error);
      alert(`Klaida išsaugant ūkį: ${error.message}`);
    }
  };

  const handleEdit = (farm: Farm) => {
    setFormData(farm);
    setEditing(farm.id!);
    setShowAdd(false);
    setAnimalsLoaded(true);
    setVicResponse(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyFarm);
    setAnimalsLoaded(false);
    setVicResponse(null);
    loadData();
  };

  const handleToggleActive = async (farm: Farm) => {
    try {
      const { error } = await supabase
        .from('farms')
        .update({ is_active: !farm.is_active })
        .eq('id', farm.id);

      if (error) throw error;
      await loadData();
      await loadFarms();
    } catch (error: any) {
      console.error('Error toggling farm status:', error);
      alert(`Klaida keičiant ūkio statusą: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeFarms = farms.filter(f => f.is_active).length;
  const canAddFarm = !clientLimits || activeFarms < clientLimits.max_farms;
  const isAtLimit = clientLimits && activeFarms >= clientLimits.max_farms;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klientų Ūkiai</h2>
          <p className="text-gray-600 mt-1">Valdykite veterinarinių paslaugų klientus</p>
          {clientLimits && (
            <p className="text-sm text-gray-500 mt-1">
              Aktyvūs ūkiai: <span className={activeFarms >= clientLimits.max_farms ? 'text-red-600 font-semibold' : 'text-gray-700'}>{activeFarms}</span> / {clientLimits.max_farms}
            </p>
          )}
        </div>
        {!showAdd && !editing && (
          <>
            {isAtLimit && (
              <div className="text-right">
                <p className="text-sm text-red-600 font-medium mb-2">
                  Pasiekėte ūkių limitą ({clientLimits?.max_farms})
                </p>
                <p className="text-xs text-gray-600">
                  Atnaujinkite prenumeratą, kad pridėtumėte daugiau ūkių
                </p>
              </div>
            )}
            <button
              onClick={() => canAddFarm ? setShowAdd(true) : alert('Pasiekėte maksimalų ūkių skaičių. Atnaujinkite prenumeratą.')}
              disabled={!canAddFarm}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                canAddFarm
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              Pridėti ūkį
            </button>
          </>
        )}
      </div>

      {(showAdd || editing) && (
        <div className="bg-white border-2 border-blue-500 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? 'Redaguoti ūkį' : 'Naujas ūkis'}
          </h3>
          
          {/* Always show Personal Code field first */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Kliento gyvūnų duomenys</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kliento asmens kodas *
                </label>
                <input
                  type="text"
                  value={formData.client_personal_code || ''}
                  onChange={(e) => setFormData({ ...formData, client_personal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Įveskite kliento asmens kodą (11 skaitmenų)"
                  maxLength={11}
                  disabled={animalsLoaded}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Įveskite asmens kodą ir spauskite "Užkrauti duomenis iš VIC"
                </p>
              </div>
              {!animalsLoaded && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLoadAnimals}
                    disabled={loadingAnimals || !formData.client_personal_code}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAnimals ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Kraunami duomenys...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Užkrauti duomenis iš VIC
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Atšaukti
                  </button>
                </div>
              )}
            </div>
            {animalsLoaded && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800 font-medium">✓ Duomenys sėkmingai užkrauti iš VIC</p>
              </div>
            )}
          </div>

          {/* Display VIC Response Data */}
          {vicResponse && vicResponse.vic_raw_payload && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              {console.log('[Farms] Rendering VIC Response Data')}
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Kliento informacija iš VIC</h4>
              
              {/* Client Card Data */}
              {vicResponse.vic_raw_payload.pageData?.clientCards?.[0] && (
                <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
                  {(() => {
                    const client = vicResponse.vic_raw_payload.pageData.clientCards[0];
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Laikytojas</p>
                            <p className="font-semibold text-gray-900">{client.holderName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Asmens kodas</p>
                            <p className="font-medium text-gray-900">{client.holderCode}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Laikytojo adresas</p>
                            <p className="text-gray-900">{client.holderAddress}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valdos numeris</p>
                            <p className="font-medium text-gray-900">{client.holdingNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bandos numeris</p>
                            <p className="font-medium text-gray-900">{client.herdNumber}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Bandos adresas</p>
                            <p className="text-gray-900">{client.herdAddress}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Rūšis</p>
                            <p className="text-gray-900">{client.species}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Įregistruota</p>
                            <p className="text-gray-900">{new Date(client.registeredAt).toLocaleDateString('lt-LT')}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Animal Summary */}
              {vicResponse.vic_raw_payload.data && (
                <div className="bg-white rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Gyvūnų suvestinė</h5>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {vicResponse.vic_raw_payload.data.animalCount || 0}
                      </p>
                      <p className="text-xs text-gray-600">Iš viso gyvūnų</p>
                    </div>
                    {vicResponse.vic_raw_payload.data.groupedStatistics?.map((stat: any, idx: number) => (
                      stat.group === 'Galvijai' && (
                        <React.Fragment key={idx}>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{stat.dairy || 0}</p>
                            <p className="text-xs text-gray-600">Pieno gamybai</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">{stat.meat || 0}</p>
                            <p className="text-xs text-gray-600">Mėsos gamybai</p>
                          </div>
                        </React.Fragment>
                      )
                    ))}
                  </div>

                  {/* Grouped Statistics */}
                  {vicResponse.vic_raw_payload.data.groupedStatistics && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Pagal tipus:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {vicResponse.vic_raw_payload.data.groupedStatistics
                          .filter((stat: any) => stat.group !== 'Galvijai')
                          .map((stat: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 rounded px-3 py-2 flex justify-between items-center">
                              <span className="text-xs text-gray-700">{stat.group}</span>
                              <span className="text-sm font-semibold text-gray-900">{stat.total}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show other fields only after animals are loaded */}
          {animalsLoaded && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pavadinimas *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ūkio pavadinimas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kodas *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ŪKIO-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresas
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ūkio adresas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kontaktinis asmuo
              </label>
              <input
                type="text"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Vardas Pavardė"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefonas
              </label>
              <input
                type="text"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+370 600 00000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                El. paštas
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="kontaktas@ukis.lt"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Aktyvus</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_eco_farm || false}
                  onChange={(e) => setFormData({ ...formData, is_eco_farm: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Ekoūkis (karencija x2)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSaveClientAndAnimals}
              disabled={savingData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingData ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Išsaugoma...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Išsaugoti klientą ir {vicResponse?.vic_raw_payload?.data?.animalCount || 0} gyvūnus
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti kliento info
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Atšaukti
            </button>
          </div>
          </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map((farm) => (
          <div
            key={farm.id}
            className={`bg-white rounded-xl shadow-md border-2 p-6 transition-all ${
              farm.is_active 
                ? 'border-blue-200 hover:border-blue-400' 
                : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  farm.is_active ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-6 h-6 ${farm.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{farm.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Hash className="w-3 h-3" />
                      {farm.code}
                    </div>
                    {farm.is_eco_farm && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ECO
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {farm.is_active ? (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {farm.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{farm.address}</span>
              </div>
            )}

            {farm.contact_person && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span>{farm.contact_person}</span>
              </div>
            )}

            {farm.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4" />
                <span>{farm.contact_phone}</span>
              </div>
            )}

            {farm.contact_email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Mail className="w-4 h-4" />
                <span>{farm.contact_email}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleEdit(farm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Redaguoti
              </button>
              <button
                onClick={() => handleToggleActive(farm)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  farm.is_active
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {farm.is_active ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Deaktyvuoti
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Aktyvuoti
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {farms.length === 0 && !showAdd && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nėra registruotų ūkių</p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti pirmą ūkį
          </button>
        </div>
      )}
    </div>
  );
}
