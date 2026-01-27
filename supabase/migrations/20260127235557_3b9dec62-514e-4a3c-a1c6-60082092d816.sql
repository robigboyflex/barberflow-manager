-- Create RPC function for staff clock in
CREATE OR REPLACE FUNCTION public.staff_clock_in(
  p_staff_id UUID,
  p_shop_id UUID,
  p_session_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_shift_id UUID;
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Verify staff belongs to this shop and is active
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_staff_id 
    AND shop_id = p_shop_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  -- Check if already clocked in today
  IF EXISTS (
    SELECT 1 FROM shifts
    WHERE staff_id = p_staff_id
    AND clock_in >= CURRENT_DATE
    AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Already clocked in';
  END IF;

  -- Insert the shift
  INSERT INTO shifts (staff_id, shop_id, clock_in)
  VALUES (p_staff_id, p_shop_id, now())
  RETURNING id INTO new_shift_id;

  RETURN new_shift_id;
END;
$$;

-- Create RPC function for staff clock out
CREATE OR REPLACE FUNCTION public.staff_clock_out(
  p_staff_id UUID,
  p_shift_id UUID,
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Update the shift (only if belongs to this staff)
  UPDATE shifts
  SET clock_out = now()
  WHERE id = p_shift_id
    AND staff_id = p_staff_id
    AND clock_out IS NULL;

  RETURN FOUND;
END;
$$;

-- Create RPC function to get staff shift status
CREATE OR REPLACE FUNCTION public.get_staff_active_shift(
  p_staff_id UUID,
  p_session_token TEXT
)
RETURNS TABLE(
  shift_id UUID,
  clock_in TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  RETURN QUERY
  SELECT s.id, s.clock_in
  FROM shifts s
  WHERE s.staff_id = p_staff_id
    AND s.clock_in >= CURRENT_DATE
    AND s.clock_out IS NULL
  ORDER BY s.clock_in DESC
  LIMIT 1;
END;
$$;

-- Create RPC function to get today's shifts for activity display
CREATE OR REPLACE FUNCTION public.get_staff_today_shifts(
  p_staff_id UUID,
  p_session_token TEXT
)
RETURNS TABLE(
  shift_id UUID,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  RETURN QUERY
  SELECT s.id, s.clock_in, s.clock_out
  FROM shifts s
  WHERE s.staff_id = p_staff_id
    AND s.clock_in >= CURRENT_DATE
  ORDER BY s.clock_in DESC;
END;
$$;