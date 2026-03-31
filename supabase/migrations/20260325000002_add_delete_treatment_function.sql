-- =====================================================================
-- Add Function to Delete Treatment and Revert Stock
-- =====================================================================
-- Migration: 20260325000002
-- Created: 2026-03-25
--
-- OVERVIEW:
-- Creates a function to safely delete a treatment record and revert all
-- associated stock deductions, ensuring data integrity.
--
-- WHAT IT DOES:
-- 1. Reverts stock deductions by adding quantities back to batches
-- 2. Deletes usage_items (or CASCADE will handle it)
-- 3. Deletes treatment_courses (or CASCADE will handle it)
-- 4. Deletes the treatment record
-- 5. Returns success status
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_treatment_and_revert_stock(
    p_treatment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_farm_id uuid;
    v_user_farm_id uuid;
    v_is_admin boolean;
    v_usage_record record;
    v_deleted_count integer := 0;
BEGIN
    -- Get current user's farm_id and admin status
    SELECT farm_id, (role = 'admin') INTO v_user_farm_id, v_is_admin
    FROM users
    WHERE id = auth.uid();

    -- Get treatment's farm_id
    SELECT farm_id INTO v_farm_id
    FROM treatments
    WHERE id = p_treatment_id;

    IF v_farm_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Treatment not found'
        );
    END IF;

    -- Verify user has permission (must be admin or belong to the same farm)
    IF NOT (v_is_admin OR v_user_farm_id = v_farm_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: You do not have access to this treatment'
        );
    END IF;

    -- Revert stock deductions from usage_items
    FOR v_usage_record IN 
        SELECT batch_id, qty
        FROM usage_items
        WHERE treatment_id = p_treatment_id
    LOOP
        -- Add the quantity back to the batch
        UPDATE batches
        SET 
            qty_left = qty_left + v_usage_record.qty,
            status = CASE 
                WHEN status = 'depleted' AND (qty_left + v_usage_record.qty) > 0 THEN 'active'
                ELSE status
            END,
            updated_at = now()
        WHERE id = v_usage_record.batch_id;

        v_deleted_count := v_deleted_count + 1;
    END LOOP;

    -- Delete treatment_courses (CASCADE will handle course_doses)
    DELETE FROM treatment_courses
    WHERE treatment_id = p_treatment_id;

    -- Delete usage_items
    DELETE FROM usage_items
    WHERE treatment_id = p_treatment_id;

    -- Delete the treatment record itself
    DELETE FROM treatments
    WHERE id = p_treatment_id;

    RETURN jsonb_build_object(
        'success', true,
        'reverted_usage_items', v_deleted_count,
        'message', 'Treatment deleted and stock reverted successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.delete_treatment_and_revert_stock(uuid) IS 
'Safely deletes a treatment and reverts all stock deductions. Returns success status and count of reverted items.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_treatment_and_revert_stock(uuid) TO authenticated;
