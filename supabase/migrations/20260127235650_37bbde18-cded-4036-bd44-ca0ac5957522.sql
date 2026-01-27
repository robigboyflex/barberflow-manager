-- Create RPC function for cashier to record a payment (logs and confirms cut in one transaction)
CREATE OR REPLACE FUNCTION public.cashier_record_payment(
  p_cashier_id UUID,
  p_shop_id UUID,
  p_barber_id UUID,
  p_service_id UUID,
  p_price NUMERIC,
  p_client_name TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_session_token TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_cut_id UUID;
BEGIN
  -- Validate session token
  IF p_session_token IS NULL OR NOT validate_staff_session(p_cashier_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Verify cashier is active in this shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_cashier_id 
    AND shop_id = p_shop_id 
    AND role = 'cashier'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized as cashier';
  END IF;

  -- Verify barber is active in this shop
  IF NOT EXISTS (
    SELECT 1 FROM staff 
    WHERE id = p_barber_id 
    AND shop_id = p_shop_id 
    AND role = 'barber'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: Barber not found';
  END IF;

  -- Verify service is active in this shop
  IF NOT EXISTS (
    SELECT 1 FROM services 
    WHERE id = p_service_id 
    AND shop_id = p_shop_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: Service not found';
  END IF;

  -- Validate price range
  IF p_price <= 0 OR p_price > 100000 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid price value';
  END IF;

  -- Validate client name length
  IF p_client_name IS NOT NULL AND length(p_client_name) > 100 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Name too long';
  END IF;

  -- Insert and confirm cut in one transaction
  INSERT INTO cuts (
    shop_id, 
    barber_id, 
    service_id, 
    price, 
    client_name, 
    status,
    payment_method,
    confirmed_by,
    confirmed_at
  )
  VALUES (
    p_shop_id, 
    p_barber_id, 
    p_service_id, 
    p_price, 
    p_client_name, 
    'confirmed',
    p_payment_method,
    p_cashier_id,
    now()
  )
  RETURNING id INTO new_cut_id;

  RETURN new_cut_id;
END;
$$;

-- Create RPC to get shop barbers for cashier
CREATE OR REPLACE FUNCTION public.get_shop_barbers(
  p_shop_id UUID,
  p_staff_id UUID,
  p_session_token TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT
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
  SELECT s.id, s.name
  FROM staff s
  WHERE s.shop_id = p_shop_id 
    AND s.role = 'barber'
    AND s.is_active = true
  ORDER BY s.name;
END;
$$;