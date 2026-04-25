import { useState } from 'react';
import { Building2, MapPin, Phone, Mail, ArrowRight, Hash, ArrowLeft, Search } from 'lucide-react';
import { useFarm } from '../contexts/FarmContext';

interface FarmSelectorProps {
  onFarmSelected: () => void;
  onBack: () => void;
}

export function FarmSelector({ onFarmSelected, onBack }: FarmSelectorProps) {
  const { farms, selectedFarm, setSelectedFarm, loading } = useFarm();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectFarm = (farm: any) => {
    setSelectedFarm(farm);
    onFarmSelected();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kraunami ūkiai...</p>
        </div>
      </div>
    );
  }

  const activeFarms = farms.filter(f => f.is_active);

  const filteredFarms = activeFarms.filter(farm => {
    const query = searchQuery.toLowerCase();
    return (
      farm.name?.toLowerCase().includes(query) ||
      farm.code?.toLowerCase().includes(query) ||
      farm.address?.toLowerCase().includes(query) ||
      farm.contact_person?.toLowerCase().includes(query)
    );
  });

  if (activeFarms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <Building2 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nėra aktyvių ūkių</h2>
          <p className="text-gray-600 mb-6">
            Prieš naudojant veterinarijos modulį, sukurkite bent vieną aktyvų ūkį Klientų modulyje.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 bg-white rounded-lg shadow hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Grįžti į modulius</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Pasirinkite Ūkį
          </h1>
          <p className="text-xl text-gray-600">
            Veterinarijos modulis
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ieškoti ūkio pagal pavadinimą, kodą, adresą..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        {filteredFarms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nerasta ūkių pagal paieškos kriterijus</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFarms.map((farm) => (
            <button
              key={farm.id}
              onClick={() => handleSelectFarm(farm)}
              className={`group bg-white rounded-2xl shadow-lg border-2 p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 text-left ${
                selectedFarm?.id === farm.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    selectedFarm?.id === farm.id
                      ? 'bg-blue-600 shadow-lg'
                      : 'bg-blue-100 group-hover:bg-blue-200'
                  }`}>
                    <Building2 className={`w-7 h-7 ${
                      selectedFarm?.id === farm.id ? 'text-white' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{farm.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Hash className="w-3 h-3" />
                      {farm.code}
                    </div>
                  </div>
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
                  <span className="truncate">{farm.contact_email}</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Pasirinkti ūkį
                  </span>
                  <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
            ))}
          </div>
        )}

        {selectedFarm && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Pasirinktas ūkis: <span className="font-semibold text-gray-900">{selectedFarm.name}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
