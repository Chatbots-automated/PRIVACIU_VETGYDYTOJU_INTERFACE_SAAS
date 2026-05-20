-- =====================================================
-- Fix treatments with incorrect withdrawal dates
-- =====================================================
-- When a product has 0 withdrawal days (no withdrawal period required),
-- the withdrawal_until_meat and withdrawal_until_milk should be NULL,
-- not a calculated date. This migration fixes existing data.

-- Fix withdrawal_until_meat: set to NULL where ALL products used in treatment have 0 or NULL withdrawal_days_meat
UPDATE public.treatments t
SET withdrawal_until_meat = NULL
WHERE t.withdrawal_until_meat IS NOT NULL
  AND NOT EXISTS (
    -- Check if there's any product with actual withdrawal days
    SELECT 1 
    FROM public.usage_items ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE ui.treatment_id = t.id
      AND p.withdrawal_days_meat IS NOT NULL 
      AND p.withdrawal_days_meat > 0
  );

-- Fix withdrawal_until_milk: set to NULL where ALL products used in treatment have 0 or NULL withdrawal_days_milk
UPDATE public.treatments t
SET withdrawal_until_milk = NULL
WHERE t.withdrawal_until_milk IS NOT NULL
  AND NOT EXISTS (
    -- Check if there's any product with actual withdrawal days
    SELECT 1 
    FROM public.usage_items ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE ui.treatment_id = t.id
      AND p.withdrawal_days_milk IS NOT NULL 
      AND p.withdrawal_days_milk > 0
  );

-- Fix route-specific withdrawals: if a product was used with a specific route 
-- and that route has 0 withdrawal, clear the dates

-- For i.v (intravenous) - clear if route withdrawal is 0
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.v'
        AND p.withdrawal_iv_meat IS NOT NULL 
        AND p.withdrawal_iv_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.v'
        AND p.withdrawal_iv_milk IS NOT NULL 
        AND p.withdrawal_iv_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 'i.v'
);

-- For i.m (intramuscular)
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.m'
        AND p.withdrawal_im_meat IS NOT NULL 
        AND p.withdrawal_im_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.m'
        AND p.withdrawal_im_milk IS NOT NULL 
        AND p.withdrawal_im_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 'i.m'
);

-- For s.c (subcutaneous)
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 's.c'
        AND p.withdrawal_sc_meat IS NOT NULL 
        AND p.withdrawal_sc_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 's.c'
        AND p.withdrawal_sc_milk IS NOT NULL 
        AND p.withdrawal_sc_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 's.c'
);

-- For i.u (intrauterine)
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.u'
        AND p.withdrawal_iu_meat IS NOT NULL 
        AND p.withdrawal_iu_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.u'
        AND p.withdrawal_iu_milk IS NOT NULL 
        AND p.withdrawal_iu_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 'i.u'
);

-- For i.mm (intramammary)
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.mm'
        AND p.withdrawal_imm_meat IS NOT NULL 
        AND p.withdrawal_imm_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'i.mm'
        AND p.withdrawal_imm_milk IS NOT NULL 
        AND p.withdrawal_imm_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 'i.mm'
);

-- For p.o.s (per os / oral)
UPDATE public.treatments t
SET 
  withdrawal_until_meat = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'p.o.s'
        AND p.withdrawal_pos_meat IS NOT NULL 
        AND p.withdrawal_pos_meat > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_meat 
  END,
  withdrawal_until_milk = CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM public.usage_items ui
      JOIN public.products p ON ui.product_id = p.id
      WHERE ui.treatment_id = t.id
        AND ui.administration_route = 'p.o.s'
        AND p.withdrawal_pos_milk IS NOT NULL 
        AND p.withdrawal_pos_milk > 0
    ) THEN NULL 
    ELSE t.withdrawal_until_milk 
  END
WHERE EXISTS (
  SELECT 1 
  FROM public.usage_items ui
  WHERE ui.treatment_id = t.id
    AND ui.administration_route = 'p.o.s'
);
