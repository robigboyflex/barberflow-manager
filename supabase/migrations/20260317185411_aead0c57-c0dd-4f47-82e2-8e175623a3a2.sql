
CREATE OR REPLACE FUNCTION public.record_expense(p_shop_id uuid, p_staff_id uuid, p_category expense_category, p_description text, p_amount numeric, p_session_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_expense_id UUID;
  v_staff_record RECORD;
BEGIN
  -- Validate session token if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  -- Verify the staff exists and is active in the shop (cashier role)
  SELECT * INTO v_staff_record FROM staff
  WHERE id = p_staff_id 
    AND shop_id = p_shop_id 
    AND role = 'cashier'
    AND is_active = true;

  IF NOT FOUND THEN
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

  -- Log activity so it appears in the owner's activity feed
  PERFORM log_activity(
    p_shop_id,
    p_staff_id,
    v_staff_record.name,
    v_staff_record.role::text,
    'expense_recorded',
    v_staff_record.name || ' recorded expense: ' || trim(p_description) || ' (GH₵' || p_amount || ')',
    jsonb_build_object(
      'expense_id', new_expense_id,
      'category', p_category::text,
      'amount', p_amount,
      'description', trim(p_description)
    )
  );
  
  RETURN new_expense_id;
END;
$function$;
