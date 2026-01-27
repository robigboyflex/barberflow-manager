-- =====================================================
-- SECURITY FIX: Session Token Validation
-- Addresses: CLIENT_SIDE_AUTH, DEFINER_OR_RPC_BYPASS, PUBLIC_DATA_EXPOSURE
-- =====================================================

-- 1. Create staff_sessions table for server-side session validation
CREATE TABLE IF NOT EXISTS public.staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '8 hours') NOT NULL,
  revoked BOOLEAN DEFAULT false NOT NULL
);

-- Enable RLS on staff_sessions
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Only allow access through RPC functions (no direct access)
CREATE POLICY "No direct access to staff sessions"
  ON public.staff_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create index for fast token lookups
CREATE INDEX idx_staff_sessions_token ON public.staff_sessions(token) WHERE NOT revoked;
CREATE INDEX idx_staff_sessions_staff_id ON public.staff_sessions(staff_id);
CREATE INDEX idx_staff_sessions_expires_at ON public.staff_sessions(expires_at);

-- 2. Create session validation function
CREATE OR REPLACE FUNCTION public.validate_staff_session(
  p_staff_id UUID,
  p_session_token TEXT
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_sessions
    WHERE staff_id = p_staff_id
    AND token = p_session_token
    AND expires_at > now()
    AND NOT revoked
  );
$$;

-- 3. Update verify_staff_pin to store session in database
CREATE OR REPLACE FUNCTION public.verify_staff_pin(shop_uuid UUID, pin_input TEXT)
RETURNS TABLE(
  staff_id UUID,
  staff_name TEXT,
  staff_role staff_role,
  staff_shop_id UUID,
  staff_phone TEXT,
  staff_is_active BOOLEAN,
  shop_name TEXT,
  shop_location TEXT,
  session_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  recent_attempts INT;
  found_staff RECORD;
  new_token TEXT;
BEGIN
  -- Validate input format
  IF pin_input IS NULL OR NOT (pin_input ~ '^[0-9]{4,6}$') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid input format';
  END IF;

  -- Check for rate limiting (max 5 attempts per 15 minutes)
  SELECT COUNT(*) INTO recent_attempts
  FROM failed_pin_attempts
  WHERE failed_pin_attempts.shop_id = shop_uuid
    AND attempt_time > (now() - interval '15 minutes');
  
  IF recent_attempts >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: Please try again later';
  END IF;

  -- Try to find matching staff
  SELECT 
    s.id,
    s.name,
    s.role,
    s.shop_id,
    s.phone,
    s.is_active,
    sh.name AS sname,
    sh.location AS slocation
  INTO found_staff
  FROM staff s
  JOIN shops sh ON sh.id = s.shop_id
  WHERE s.shop_id = shop_uuid
    AND s.is_active = true
    AND s.pin = pin_input
  LIMIT 1;

  -- If not found, log failed attempt
  IF found_staff IS NULL THEN
    INSERT INTO failed_pin_attempts (shop_id) VALUES (shop_uuid);
    RETURN;
  END IF;

  -- Success - clear failed attempts for this shop
  DELETE FROM failed_pin_attempts WHERE failed_pin_attempts.shop_id = shop_uuid;

  -- Generate secure session token
  new_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Revoke any existing sessions for this staff
  UPDATE staff_sessions 
  SET revoked = true 
  WHERE staff_sessions.staff_id = found_staff.id AND NOT revoked;

  -- Store new session in database
  INSERT INTO staff_sessions (staff_id, token, expires_at)
  VALUES (found_staff.id, new_token, now() + interval '8 hours');

  -- Return the staff data with session token
  RETURN QUERY SELECT 
    found_staff.id,
    found_staff.name,
    found_staff.role,
    found_staff.shop_id,
    found_staff.phone,
    found_staff.is_active,
    found_staff.sname,
    found_staff.slocation,
    new_token;
END;
$$;

-- 4. Update log_cut to require session validation
CREATE OR REPLACE FUNCTION public.log_cut(
  p_shop_id UUID,
  p_barber_id UUID,
  p_service_id UUID,
  p_price NUMERIC,
  p_client_name TEXT DEFAULT NULL,
  p_session_token TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_cut_id UUID;
BEGIN
  -- Validate session token if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_barber_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  -- Validate price range
  IF p_price <= 0 OR p_price > 100000 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid price value';
  END IF;
  
  -- Validate client name length
  IF p_client_name IS NOT NULL AND length(p_client_name) > 100 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Name too long';
  END IF;

  -- Verify the barber exists and is active in the shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_barber_id 
    AND shop_id = p_shop_id 
    AND role = 'barber'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;
  
  -- Verify service exists and belongs to shop
  IF NOT EXISTS (
    SELECT 1 FROM services 
    WHERE id = p_service_id 
    AND shop_id = p_shop_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: Service not available';
  END IF;
  
  -- Insert the cut
  INSERT INTO cuts (shop_id, barber_id, service_id, price, client_name, status)
  VALUES (p_shop_id, p_barber_id, p_service_id, p_price, p_client_name, 'pending')
  RETURNING id INTO new_cut_id;
  
  RETURN new_cut_id;
END;
$$;

-- 5. Update confirm_cut to require session validation
CREATE OR REPLACE FUNCTION public.confirm_cut(
  p_cut_id UUID,
  p_cashier_id UUID,
  p_session_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cut_shop_id UUID;
BEGIN
  -- Validate session token if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  -- Get the cut's shop_id
  SELECT shop_id INTO cut_shop_id FROM cuts WHERE id = p_cut_id;
  
  IF cut_shop_id IS NULL THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: Record not found';
  END IF;
  
  -- Verify the cashier exists and is active in the same shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_cashier_id 
    AND shop_id = cut_shop_id 
    AND role = 'cashier'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;
  
  -- Update the cut
  UPDATE cuts
  SET status = 'confirmed',
      confirmed_by = p_cashier_id,
      confirmed_at = now()
  WHERE id = p_cut_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- 6. Update dispute_cut to require session validation
CREATE OR REPLACE FUNCTION public.dispute_cut(
  p_cut_id UUID,
  p_cashier_id UUID,
  p_session_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cut_shop_id UUID;
BEGIN
  -- Validate session token if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  -- Get the cut's shop_id
  SELECT shop_id INTO cut_shop_id FROM cuts WHERE id = p_cut_id;
  
  IF cut_shop_id IS NULL THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: Record not found';
  END IF;
  
  -- Verify the cashier exists and is active in the same shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_cashier_id 
    AND shop_id = cut_shop_id 
    AND role = 'cashier'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;
  
  -- Update the cut
  UPDATE cuts
  SET status = 'disputed'
  WHERE id = p_cut_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- 7. Update record_expense to require session validation
CREATE OR REPLACE FUNCTION public.record_expense(
  p_shop_id UUID,
  p_staff_id UUID,
  p_category expense_category,
  p_description TEXT,
  p_amount NUMERIC,
  p_session_token TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_expense_id UUID;
BEGIN
  -- Validate session token if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  -- Verify the staff exists and is active in the shop (cashier role)
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_staff_id 
    AND shop_id = p_shop_id 
    AND role = 'cashier'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid amount';
  END IF;
  
  -- Validate description
  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Description required';
  END IF;
  
  -- Insert the expense
  INSERT INTO expenses (shop_id, recorded_by, category, description, amount)
  VALUES (p_shop_id, p_staff_id, p_category, trim(p_description), p_amount)
  RETURNING id INTO new_expense_id;
  
  RETURN new_expense_id;
END;
$$;

-- 8. Create RPC function for staff to get services (replaces direct table access)
CREATE OR REPLACE FUNCTION public.get_shop_services(
  p_shop_id UUID,
  p_staff_id UUID,
  p_session_token TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  price NUMERIC,
  duration_minutes INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Verify staff belongs to this shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.id = p_staff_id 
    AND staff.shop_id = p_shop_id 
    AND staff.is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.price, s.duration_minutes, s.is_active
  FROM services s
  WHERE s.shop_id = p_shop_id AND s.is_active = true
  ORDER BY s.name;
END;
$$;

-- 9. Create RPC function for barbers to get their own cuts
CREATE OR REPLACE FUNCTION public.get_barber_cuts(
  p_barber_id UUID,
  p_session_token TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  service_id UUID,
  service_name TEXT,
  service_price NUMERIC,
  client_name TEXT,
  price NUMERIC,
  status cut_status,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_barber_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.service_id,
    s.name AS service_name,
    s.price AS service_price,
    c.client_name,
    c.price,
    c.status,
    c.created_at
  FROM cuts c
  JOIN services s ON s.id = c.service_id
  WHERE c.barber_id = p_barber_id
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at < p_end_date)
  ORDER BY c.created_at DESC;
END;
$$;

-- 10. Create RPC function for cashiers to get shop cuts
CREATE OR REPLACE FUNCTION public.get_shop_cuts_for_cashier(
  p_cashier_id UUID,
  p_session_token TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  barber_id UUID,
  barber_name TEXT,
  service_name TEXT,
  client_name TEXT,
  price NUMERIC,
  status cut_status,
  payment_method TEXT,
  created_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Get cashier's shop
  SELECT shop_id INTO v_shop_id FROM staff WHERE staff.id = p_cashier_id AND role = 'cashier';
  
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.barber_id,
    st.name AS barber_name,
    sv.name AS service_name,
    c.client_name,
    c.price,
    c.status,
    c.payment_method,
    c.created_at,
    c.confirmed_at
  FROM cuts c
  JOIN staff st ON st.id = c.barber_id
  JOIN services sv ON sv.id = c.service_id
  WHERE c.shop_id = v_shop_id
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at < p_end_date)
  ORDER BY c.created_at DESC;
END;
$$;

-- 11. Remove overly permissive staff RLS policies (staff don't use Supabase Auth)
DROP POLICY IF EXISTS "Staff can view cuts in their shop" ON public.cuts;
DROP POLICY IF EXISTS "Staff can update cuts in their shop" ON public.cuts;
DROP POLICY IF EXISTS "Staff can insert cuts in their shop" ON public.cuts;
DROP POLICY IF EXISTS "Staff can view expenses in their shop" ON public.expenses;
DROP POLICY IF EXISTS "Staff can insert expenses in their shop" ON public.expenses;
DROP POLICY IF EXISTS "Staff can view daily summaries in their shop" ON public.daily_summaries;
DROP POLICY IF EXISTS "Staff can view services in their shop" ON public.services;

-- 12. Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM staff_sessions 
  WHERE expires_at < now() - interval '1 day'
     OR (revoked = true AND created_at < now() - interval '1 hour');
END;
$$;

-- 13. Create logout function
CREATE OR REPLACE FUNCTION public.staff_logout(
  p_staff_id UUID,
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE staff_sessions
  SET revoked = true
  WHERE staff_id = p_staff_id
    AND token = p_session_token
    AND NOT revoked;
  
  RETURN FOUND;
END;
$$;