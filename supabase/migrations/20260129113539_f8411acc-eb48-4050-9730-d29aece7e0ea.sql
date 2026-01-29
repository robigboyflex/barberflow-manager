-- Fix cashier/staff "Clock In" UX: active shift detection was limited to CURRENT_DATE,
-- causing the UI to think the cashier is not clocked in while staff_clock_in blocks with "Already clocked in".

CREATE OR REPLACE FUNCTION public.get_staff_active_shift(p_staff_id uuid, p_session_token text)
RETURNS TABLE(shift_id uuid, clock_in timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Return the latest open shift (even if it started before midnight)
  RETURN QUERY
  SELECT s.id, s.clock_in
  FROM shifts s
  WHERE s.staff_id = p_staff_id
    AND s.clock_out IS NULL
    AND COALESCE(s.is_closed, false) = false
  ORDER BY s.clock_in DESC
  LIMIT 1;
END;
$$;

-- Keep the clock-in guard consistent with the definition of an "open" shift.
CREATE OR REPLACE FUNCTION public.staff_clock_in(p_staff_id uuid, p_shop_id uuid, p_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_shift_id uuid;
    v_staff_record RECORD;
BEGIN
    -- Validate session
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    -- Get staff info
    SELECT * INTO v_staff_record
    FROM staff
    WHERE id = p_staff_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff not found or inactive';
    END IF;

    -- Check for existing active shift
    IF EXISTS (
        SELECT 1 FROM shifts
        WHERE staff_id = p_staff_id
          AND clock_out IS NULL
          AND COALESCE(is_closed, false) = false
    ) THEN
        RAISE EXCEPTION 'Already clocked in';
    END IF;

    -- Create new shift
    INSERT INTO shifts (staff_id, shop_id)
    VALUES (p_staff_id, p_shop_id)
    RETURNING id INTO v_shift_id;

    -- Log activity
    PERFORM log_activity(
        p_shop_id,
        p_staff_id,
        v_staff_record.name,
        v_staff_record.role::text,
        'clock_in',
        v_staff_record.name || ' (' || v_staff_record.role || ') clocked in',
        jsonb_build_object('shift_id', v_shift_id)
    );

    RETURN v_shift_id;
END;
$$;