-- Create treatment_history_view for comprehensive treatment history display
-- This view is used in TreatmentHistory.tsx component

DROP VIEW IF EXISTS public.treatment_history_view CASCADE;

CREATE OR REPLACE VIEW public.treatment_history_view AS
SELECT 
    t.id AS treatment_id,
    t.farm_id,
    t.reg_date,
    t.first_symptoms_date,
    t.animal_condition,
    t.tests,
    t.clinical_diagnosis,
    t.outcome,
    t.outcome_date,
    t.services,
    t.vet_name,
    t.notes,
    t.mastitis_teat,
    t.mastitis_type,
    t.sick_teats,
    t.affected_teats,
    t.syringe_count,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.created_at,
    a.id AS animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.holder_name AS owner_name,
    d.id AS disease_id,
    d.code AS disease_code,
    d.name AS disease_name,
    (
        SELECT json_agg(json_build_object(
            'product_name', p.name,
            'quantity', ui.quantity,
            'unit', ui.unit,
            'batch_lot', b.lot,
            'administration_route', ui.administration_route
        ))
        FROM public.usage_items ui
        LEFT JOIN public.products p ON ui.product_id = p.id
        LEFT JOIN public.batches b ON ui.batch_id = b.id
        WHERE ui.treatment_id = t.id
    ) AS products_used,
    (
        SELECT json_agg(json_build_object(
            'course_id', tc.id,
            'course_name', tc.course_name,
            'product_name', p.name,
            'total_dose', cms.dose_amount * cms.total_doses,
            'daily_dose', cms.dose_amount,
            'days', cms.total_doses,
            'unit', cms.dose_unit,
            'start_date', tc.start_date,
            'doses_administered', (
                SELECT COUNT(*) 
                FROM public.course_doses cd 
                WHERE cd.course_id = tc.id AND cd.administered_date IS NOT NULL
            ),
            'status', tc.status,
            'batch_lot', NULL,
            'administration_route', NULL
        ))
        FROM public.treatment_courses tc
        LEFT JOIN public.course_medication_schedules cms ON cms.course_id = tc.id
        LEFT JOIN public.products p ON cms.product_id = p.id
        WHERE tc.initial_treatment_id = t.id
    ) AS treatment_courses
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
ORDER BY t.reg_date DESC, t.created_at DESC;

COMMENT ON VIEW public.treatment_history_view IS 'Comprehensive treatment history with products, courses, and administration routes';

-- Grant permissions on the view
GRANT ALL ON public.treatment_history_view TO anon;
GRANT ALL ON public.treatment_history_view TO authenticated;
GRANT ALL ON public.treatment_history_view TO service_role;
