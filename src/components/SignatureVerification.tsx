import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateLT } from '../lib/formatters';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface TreatmentDetails {
  treatment_id: string;
  registration_date: string;
  animal_tag: string;
  animal_species: string;
  owner_name: string;
  owner_address: string;
  diagnosis: string;
  vet_name: string;
  signature_status: string;
  already_signed: boolean;
}

export function SignatureVerification() {
  // Extract token from URL pathname
  const token = window.location.pathname.split('/verify-signature/')[1];
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<TreatmentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (token) {
      loadTreatmentDetails();
    }
  }, [token]);

  const loadTreatmentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_signature_details', {
        token_param: token
      });

      if (error) throw error;

      if (data?.error) {
        setError('Netinkama arba pasibaigusi nuoroda');
        return;
      }

      setDetails(data);
    } catch (err) {
      console.error('Error loading treatment details:', err);
      setError('Nepavyko užkrauti duomenų');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignature = async () => {
    if (!token) return;

    try {
      setVerifying(true);
      
      const { data, error } = await supabase.rpc('verify_owner_signature', {
        token_param: token,
        ip_address_param: null, // Could be obtained from an API
        user_agent_param: navigator.userAgent
      });

      if (error) throw error;

      if (data?.success) {
        setVerified(true);
        // Reload details to show updated status
        await loadTreatmentDetails();
      } else {
        setError(data?.message || 'Nepavyko pasirašyti dokumento');
      }
    } catch (err) {
      console.error('Error verifying signature:', err);
      setError('Įvyko klaida pasirašant dokumentą');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Klaida</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Grįžti į pradžią
          </button>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dokumentas nerastas</h1>
          <p className="text-gray-600">Patikrinkite nuorodą ir bandykite dar kartą</p>
        </div>
      </div>
    );
  }

  if (verified || details.already_signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ✓ Dokumentas pasirašytas
            </h1>
            <p className="text-gray-600">
              Jūsų parašas sėkmingai užregistruotas
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dokumento informacija
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Registracijos data:</dt>
                <dd className="text-gray-900 font-medium">{formatDateLT(details.registration_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Gyvūno numeris:</dt>
                <dd className="text-gray-900 font-medium">{details.animal_tag}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Rūšis:</dt>
                <dd className="text-gray-900 font-medium">{details.animal_species}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Diagnozė:</dt>
                <dd className="text-gray-900 font-medium">{details.diagnosis || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Veterinarijos gydytojas:</dt>
                <dd className="text-gray-900 font-medium">{details.vet_name}</dd>
              </div>
            </dl>
          </div>

          <div className="text-center text-sm text-gray-500">
            Jūsų parašas yra saugiai išsaugotas ir galios kaip oficialus patvirtinimas
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gydomo gyvūno registro patvirtinimas
          </h1>
          <p className="text-gray-600">
            Prašome patvirtinti, kad susipažinote su gydymo informacija
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dokumento informacija</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-600 mb-1">Savininkas:</dt>
              <dd className="text-gray-900 font-medium">
                {details.owner_name}
                {details.owner_address && (
                  <div className="text-sm text-gray-600 mt-0.5">{details.owner_address}</div>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Registracijos data:</dt>
                <dd className="text-gray-900 font-medium">{formatDateLT(details.registration_date)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Gyvūno numeris:</dt>
                <dd className="text-gray-900 font-medium">{details.animal_tag}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Rūšis:</dt>
                <dd className="text-gray-900 font-medium">{details.animal_species}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Veterinarijos gydytojas:</dt>
                <dd className="text-gray-900 font-medium">{details.vet_name}</dd>
              </div>
            </div>
            {details.diagnosis && (
              <div>
                <dt className="text-sm text-gray-600 mb-1">Diagnozė:</dt>
                <dd className="text-gray-900 font-medium">{details.diagnosis}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-900">
            <strong>Svarbu:</strong> Paspaudus "Pasirašyti dokumentą" patvirtinate, kad susipažinote 
            su gydymo informacija ir sutinkate su dokumentu. Šis veiksmas bus įrašytas į sistemą.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleVerifySignature}
            disabled={verifying}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                Pasirašoma...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Pasirašyti dokumentą
              </>
            )}
          </button>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Atšaukti
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Pasirašant dokumentą, bus išsaugotas IP adresas ir laikas saugumo tikslais
        </div>
      </div>
    </div>
  );
}
