
CREATE OR REPLACE FUNCTION public.get_shop_expenses_for_cashier(
  p_cashier_id uuid,
  p_session_token text,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(id uuid, description text, amount numeric, category text, expense_date date, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Get cashier's shop
  SELECT shop_id INTO v_shop_id FROM staff WHERE staff.id = p_cashier_id AND role = 'cashier' AND is_active = true;
  
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.description,
    e.amount,
    e.category::text,
    e.expense_date,
    e.created_at
  FROM expenses e
  WHERE e.shop_id = v_shop_id
    AND e.expense_date >= p_start_date
    AND e.expense_date <= p_end_date
  ORDER BY e.created_at DESC;
END;
$$;
