-- =====================================================
-- FIX 1: Add database constraints for input validation
-- =====================================================

-- Shop name and location constraints
ALTER TABLE shops 
  ADD CONSTRAINT shop_name_length CHECK (length(name) <= 100 AND length(name) > 0),
  ADD CONSTRAINT location_length CHECK (length(location) <= 200 AND length(location) > 0);

-- Staff input constraints  
ALTER TABLE staff
  ADD CONSTRAINT staff_name_length CHECK (length(name) <= 100 AND length(name) > 0),
  ADD CONSTRAINT staff_pin_format CHECK (pin ~ '^[0-9]{4,6}$');

-- Service constraints
ALTER TABLE services
  ADD CONSTRAINT service_name_length CHECK (length(name) <= 100 AND length(name) > 0),
  ADD CONSTRAINT service_price_range CHECK (price >= 0 AND price <= 100000);

-- Cuts constraints
ALTER TABLE cuts
  ADD CONSTRAINT price_range CHECK (price > 0 AND price <= 100000),
  ADD CONSTRAINT client_name_length CHECK (client_name IS NULL OR length(client_name) <= 100);

-- Expenses constraints  
ALTER TABLE expenses
  ADD CONSTRAINT amount_range CHECK (amount > 0 AND amount <= 10000000),
  ADD CONSTRAINT description_length CHECK (length(description) <= 500 AND length(description) > 0);

-- =====================================================
-- FIX 2: Rate limiting for PIN verification
-- =====================================================

-- Create table to track failed PIN attempts
CREATE TABLE public.failed_pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.failed_pin_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts via the verify_staff_pin function (no direct access)
CREATE POLICY "No direct access to failed attempts"
  ON public.failed_pin_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Index for efficient lookups
CREATE INDEX idx_failed_attempts_shop_time 
  ON failed_pin_attempts (shop_id, attempt_time DESC);

-- Auto-cleanup old attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_pin_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM failed_pin_attempts 
  WHERE attempt_time < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 3: Update verify_staff_pin with rate limiting
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_staff_pin(shop_uuid UUID, pin_input TEXT)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  staff_role staff_role,
  staff_shop_id UUID,
  staff_phone TEXT,
  staff_is_active BOOLEAN,
  shop_name TEXT,
  shop_location TEXT,
  session_token TEXT
) AS $$
DECLARE
  recent_attempts INT;
  found_staff RECORD;
BEGIN
  -- Validate input format
  IF pin_input IS NULL OR NOT (pin_input ~ '^[0-9]{4,6}$') THEN
    RAISE EXCEPTION 'Invalid PIN format';
  END IF;

  -- Check for rate limiting (max 5 attempts per 15 minutes)
  SELECT COUNT(*) INTO recent_attempts
  FROM failed_pin_attempts
  WHERE failed_pin_attempts.shop_id = shop_uuid
    AND attempt_time > (now() - interval '15 minutes');
  
  IF recent_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many failed attempts. Please try again in 15 minutes.';
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

  -- Return the staff data
  RETURN QUERY SELECT 
    found_staff.id,
    found_staff.name,
    found_staff.role,
    found_staff.shop_id,
    found_staff.phone,
    found_staff.is_active,
    found_staff.sname,
    found_staff.slocation,
    encode(extensions.gen_random_bytes(32), 'hex')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Ensure anon and authenticated can call verify_staff_pin
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(UUID, TEXT) TO anon, authenticated;

-- =====================================================
-- Update log_cut with price validation
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_cut(
  p_shop_id uuid, 
  p_barber_id uuid, 
  p_service_id uuid, 
  p_price numeric, 
  p_client_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    new_cut_id UUID;
BEGIN
    -- Validate price range
    IF p_price <= 0 OR p_price > 100000 THEN
        RAISE EXCEPTION 'Price must be between 0 and 100000';
    END IF;
    
    -- Validate client name length
    IF p_client_name IS NOT NULL AND length(p_client_name) > 100 THEN
        RAISE EXCEPTION 'Client name must be less than 100 characters';
    END IF;

    -- Verify the barber exists and is active in the shop
    IF NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE id = p_barber_id 
        AND shop_id = p_shop_id 
        AND role = 'barber'
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid barber or barber not authorized for this shop';
    END IF;
    
    -- Verify service exists and belongs to shop
    IF NOT EXISTS (
        SELECT 1 FROM services 
        WHERE id = p_service_id 
        AND shop_id = p_shop_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid service or service not available for this shop';
    END IF;
    
    -- Insert the cut
    INSERT INTO cuts (shop_id, barber_id, service_id, price, client_name, status)
    VALUES (p_shop_id, p_barber_id, p_service_id, p_price, p_client_name, 'pending')
    RETURNING id INTO new_cut_id;
    
    RETURN new_cut_id;
END;
$$;