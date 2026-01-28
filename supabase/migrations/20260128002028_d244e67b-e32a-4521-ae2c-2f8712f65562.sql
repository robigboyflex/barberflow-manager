-- First, drop the check constraint that requires specific PIN format
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_pin_format;

-- Now hash all existing plaintext PINs
UPDATE public.staff 
SET pin_hash = extensions.crypt(pin, extensions.gen_salt('bf')),
    pin = '****'
WHERE pin IS NOT NULL 
  AND pin != '****' 
  AND pin != '';

-- Update verify_staff_pin to use hashed comparison
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
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  recent_attempts INT;
  found_staff RECORD;
  new_token TEXT;
BEGIN
  -- Validate input format (4-6 digit PIN)
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

  -- Try to find matching staff using bcrypt comparison
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
    AND s.pin_hash IS NOT NULL
    AND s.pin_hash = extensions.crypt(pin_input, s.pin_hash)
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