-- =====================================================================
-- ADD PAYMENT TRACKING FOR CUSTOM DAILY PLANS
-- =====================================================================
-- Track payments and custom subscription durations
-- =====================================================================

-- Create payments table
CREATE TABLE IF NOT EXISTS public.client_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    amount numeric(10,2) NOT NULL DEFAULT 0,
    days_purchased integer NOT NULL DEFAULT 0,
    payment_date timestamptz DEFAULT now() NOT NULL,
    payment_method text,
    notes text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON public.client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_payment_date ON public.client_payments(payment_date DESC);

-- Add RLS
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- Policy: client_admin can manage payments (drop first if exists)
DROP POLICY IF EXISTS "client_admin can manage payments" ON public.client_payments;

CREATE POLICY "client_admin can manage payments"
    ON public.client_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'client_admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;

-- Add comments
COMMENT ON TABLE public.client_payments IS 'Payment tracking for custom daily subscription plans';
COMMENT ON COLUMN public.client_payments.days_purchased IS 'Number of days purchased with this payment';
COMMENT ON COLUMN public.client_payments.amount IS 'Payment amount in EUR';
