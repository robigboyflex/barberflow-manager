-- Remove the PIN hashing trigger
DROP TRIGGER IF EXISTS hash_staff_pin_trigger ON staff;

-- Simplify verify_staff_pin to use plain text comparison
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
    AND s.pin = pin_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Allow public to call verify_staff_pin for staff login
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(UUID, TEXT) TO anon, authenticated;

-- Make shops viewable by anyone for staff login shop selection
CREATE POLICY "Anyone can view shops for login"
  ON shops FOR SELECT
  TO anon
  USING (is_active = true);