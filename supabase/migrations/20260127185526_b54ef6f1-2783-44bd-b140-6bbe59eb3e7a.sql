-- Fix the hash_staff_pin function to use the correct schema reference for pgcrypto functions
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if PIN is provided and not already hashed
  IF NEW.pin IS NOT NULL AND NEW.pin != '' AND NEW.pin != '****' THEN
    -- Use extensions schema for pgcrypto functions
    NEW.pin_hash := extensions.crypt(NEW.pin, extensions.gen_salt('bf'));
    -- Mask the original PIN
    NEW.pin := '****';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Also update verify_staff_pin to use the correct schema
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
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.role,
    s.shop_id,
    s.phone,
    s.is_active,
    sh.name,
    sh.location,
    encode(extensions.gen_random_bytes(32), 'hex')::TEXT
  FROM staff s
  JOIN shops sh ON sh.id = s.shop_id
  WHERE s.shop_id = shop_uuid
    AND s.is_active = true
    AND s.pin_hash = extensions.crypt(pin_input, s.pin_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;