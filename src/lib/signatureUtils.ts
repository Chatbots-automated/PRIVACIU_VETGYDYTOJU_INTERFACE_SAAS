import { supabase } from './supabase';

interface SignatureRequestParams {
  treatmentId: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

/**
 * Generate a signature verification URL for a treatment
 */
export async function generateSignatureUrl(treatmentId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_owner_signature_url', {
      treatment_id_param: treatmentId
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error generating signature URL:', err);
    return null;
  }
}

/**
 * Request owner signature for a treatment
 * This will generate a URL and optionally send it via email/SMS
 */
export async function requestOwnerSignature(params: SignatureRequestParams): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const url = await generateSignatureUrl(params.treatmentId);
    
    if (!url) {
      return {
        success: false,
        error: 'Nepavyko sugeneruoti parašo nuorodos'
      };
    }

    // TODO: Integrate with email service to send the URL
    // For now, we just return the URL for manual sharing
    if (params.ownerEmail) {
      // await sendSignatureEmail(params.ownerEmail, url);
      console.log(`Would send signature request to ${params.ownerEmail}: ${url}`);
    }

    if (params.ownerPhone) {
      // await sendSignatureSMS(params.ownerPhone, url);
      console.log(`Would send signature request to ${params.ownerPhone}: ${url}`);
    }

    return {
      success: true,
      url
    };
  } catch (err) {
    console.error('Error requesting signature:', err);
    return {
      success: false,
      error: 'Įvyko klaida prašant parašo'
    };
  }
}

/**
 * Check signature status for a treatment
 */
export async function checkSignatureStatus(treatmentId: string): Promise<{
  status: 'verified' | 'pending' | 'declined' | null;
  signedAt?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select('owner_signature_status, owner_signed_at')
      .eq('id', treatmentId)
      .single();

    if (error) throw error;

    return {
      status: data?.owner_signature_status as any,
      signedAt: data?.owner_signed_at
    };
  } catch (err) {
    console.error('Error checking signature status:', err);
    return { status: null };
  }
}

/**
 * Get signature verification logs for a treatment
 */
export async function getSignatureLogs(treatmentId: string) {
  try {
    const { data, error } = await supabase
      .from('signature_verification_logs')
      .select('*')
      .eq('treatment_id', treatmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching signature logs:', err);
    return [];
  }
}

/**
 * Copy signature URL to clipboard
 */
export async function copySignatureUrlToClipboard(treatmentId: string): Promise<boolean> {
  try {
    const url = await generateSignatureUrl(treatmentId);
    if (!url) return false;

    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    return false;
  }
}

/**
 * Format signature display text
 */
export function formatSignatureDisplay(
  status: 'verified' | 'pending' | 'declined' | null,
  signedAt?: string
): string {
  switch (status) {
    case 'verified':
      return signedAt ? `✓ Pasirašyta ${new Date(signedAt).toLocaleDateString('lt-LT')}` : '✓ Pasirašyta';
    case 'pending':
      return '⏳ Laukiama parašo';
    case 'declined':
      return '✗ Atsisakyta';
    default:
      return '-';
  }
}
