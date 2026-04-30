-- =====================================================================
-- Add Signature Functionality to Treatments
-- =====================================================================
-- Created: 2026-04-30
-- Description:
--   Adds signature columns to treatments table for official documentation:
--   - Column 14: Gyvūno savininko parašas (Owner's signature)
--   - Column 15: Veterinarijos gydytojo parašas (Vet's signature)
-- =====================================================================

-- Add signature columns to treatments table
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS owner_signature_status text CHECK (owner_signature_status IN ('pending', 'verified', 'declined', NULL)),
  ADD COLUMN IF NOT EXISTS owner_signature_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS owner_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_signature_ip text,
  ADD COLUMN IF NOT EXISTS vet_signed_at timestamptz DEFAULT now();

-- Create signature_verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.signature_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('owner', 'vet')),
  action text NOT NULL CHECK (action IN ('sent', 'viewed', 'verified', 'declined', 'expired')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signature_logs_treatment_id ON public.signature_verification_logs(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatments_owner_signature_token ON public.treatments(owner_signature_token);

-- Add comments
COMMENT ON COLUMN public.treatments.owner_signature_status IS 'Status of owner signature: pending, verified, declined, or NULL (not requested)';
COMMENT ON COLUMN public.treatments.owner_signature_token IS 'Unique token for owner signature verification URL';
COMMENT ON COLUMN public.treatments.owner_signed_at IS 'Timestamp when owner signed the treatment record';
COMMENT ON COLUMN public.treatments.owner_signature_ip IS 'IP address from which owner signed';
COMMENT ON COLUMN public.treatments.vet_signed_at IS 'Timestamp when vet signed (automatically set on treatment creation)';
COMMENT ON TABLE public.signature_verification_logs IS 'Audit log for all signature verification activities';

-- Create function to generate owner signature URL
CREATE OR REPLACE FUNCTION public.generate_owner_signature_url(treatment_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token uuid;
  base_url text := 'https://your-app-domain.com'; -- TODO: Update with actual domain
BEGIN
  -- Get or create token
  SELECT owner_signature_token INTO token
  FROM public.treatments
  WHERE id = treatment_id_param;
  
  -- Update status to pending if not already set
  UPDATE public.treatments
  SET owner_signature_status = COALESCE(owner_signature_status, 'pending')
  WHERE id = treatment_id_param AND owner_signature_status IS NULL;
  
  -- Log the action
  INSERT INTO public.signature_verification_logs (treatment_id, signature_type, action)
  VALUES (treatment_id_param, 'owner', 'sent');
  
  -- Return the URL
  RETURN base_url || '/verify-signature/' || token::text;
END;
$$;

-- Create function to verify owner signature
CREATE OR REPLACE FUNCTION public.verify_owner_signature(
  token_param uuid,
  ip_address_param text DEFAULT NULL,
  user_agent_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  treatment_record record;
  result jsonb;
BEGIN
  -- Find treatment by token
  SELECT id, owner_signature_status, animal_id
  INTO treatment_record
  FROM public.treatments
  WHERE owner_signature_token = token_param;
  
  -- Check if treatment exists
  IF treatment_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Signature link is invalid or expired'
    );
  END IF;
  
  -- Check if already verified
  IF treatment_record.owner_signature_status = 'verified' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_verified',
      'message', 'This document has already been signed'
    );
  END IF;
  
  -- Update signature status
  UPDATE public.treatments
  SET 
    owner_signature_status = 'verified',
    owner_signed_at = now(),
    owner_signature_ip = ip_address_param
  WHERE id = treatment_record.id;
  
  -- Log the verification
  INSERT INTO public.signature_verification_logs (
    treatment_id, 
    signature_type, 
    action, 
    ip_address, 
    user_agent
  )
  VALUES (
    treatment_record.id, 
    'owner', 
    'verified', 
    ip_address_param, 
    user_agent_param
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Document signed successfully',
    'treatment_id', treatment_record.id
  );
END;
$$;

-- Create function to get signature verification details
CREATE OR REPLACE FUNCTION public.get_signature_details(token_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'treatment_id', t.id,
    'registration_date', t.reg_date,
    'animal_tag', a.tag_no,
    'animal_species', a.species,
    'owner_name', a.holder_name,
    'owner_address', a.holder_address,
    'diagnosis', COALESCE(d.name, t.clinical_diagnosis),
    'vet_name', t.vet_name,
    'signature_status', t.owner_signature_status,
    'already_signed', (t.owner_signature_status = 'verified')
  )
  INTO result
  FROM public.treatments t
  LEFT JOIN public.animals a ON a.id = t.animal_id
  LEFT JOIN public.diseases d ON d.id = t.disease_id
  WHERE t.owner_signature_token = token_param;
  
  -- Log the view
  IF result IS NOT NULL THEN
    INSERT INTO public.signature_verification_logs (
      treatment_id,
      signature_type,
      action
    )
    SELECT 
      (result->>'treatment_id')::uuid,
      'owner',
      'viewed'
    WHERE result->>'already_signed' = 'false';
  END IF;
  
  RETURN COALESCE(result, jsonb_build_object('error', 'invalid_token'));
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_owner_signature_url TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_owner_signature TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_signature_details TO authenticated, anon;

COMMENT ON FUNCTION public.generate_owner_signature_url IS 'Generates a unique signature verification URL for the animal owner';
COMMENT ON FUNCTION public.verify_owner_signature IS 'Verifies and records owner signature using the token from URL';
COMMENT ON FUNCTION public.get_signature_details IS 'Retrieves treatment details for signature verification page';
