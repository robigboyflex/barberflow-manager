
-- Add payment_method validation to cashier_record_payment
CREATE OR REPLACE FUNCTION public.cashier_record_payment(
    p_shop_id uuid,
    p_cashier_id uuid,
    p_barber_id uuid,
    p_service_id uuid,
    p_price numeric,
    p_client_name text DEFAULT NULL,
    p_payment_method text DEFAULT 'cash',
    p_session_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cut_id uuid;
    v_cashier_record RECORD;
    v_barber_record RECORD;
    v_service_name text;
BEGIN
    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'card', 'momo') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Invalid payment method. Must be cash, card, or momo';
    END IF;

    -- Validate session if provided
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_session_token, p_cashier_id) THEN
            RAISE EXCEPTION 'Invalid or expired session';
        END IF;
    END IF;
    
    -- Check if cashier has an active shift
    IF NOT EXISTS (
        SELECT 1 FROM shifts
        WHERE staff_id = p_cashier_id 
        AND shop_id = p_shop_id
        AND clock_out IS NULL
    ) THEN
        RAISE EXCEPTION 'You must be clocked in to record payments';
    END IF;
    
    -- Get cashier and barber info
    SELECT * INTO v_cashier_record FROM staff WHERE id = p_cashier_id AND is_active = true;
    SELECT * INTO v_barber_record FROM staff WHERE id = p_barber_id AND is_active = true;
    SELECT name INTO v_service_name FROM services WHERE id = p_service_id;
    
    IF v_cashier_record IS NULL OR v_barber_record IS NULL THEN
        RAISE EXCEPTION 'Staff or service not found';
    END IF;
    
    -- Create confirmed cut directly
    INSERT INTO cuts (
        shop_id, barber_id, service_id, price, client_name,
        status, confirmed_by, confirmed_at, payment_method
    )
    VALUES (
        p_shop_id, p_barber_id, p_service_id, p_price, p_client_name,
        'confirmed', p_cashier_id, now(), p_payment_method
    )
    RETURNING id INTO v_cut_id;
    
    -- Log activity
    PERFORM log_activity(
        p_shop_id,
        p_cashier_id,
        v_cashier_record.name,
        v_cashier_record.role::text,
        'payment_recorded',
        v_cashier_record.name || ' recorded GH₵' || p_price || ' payment for ' || v_barber_record.name,
        jsonb_build_object(
            'cut_id', v_cut_id,
            'barber', v_barber_record.name,
            'service', v_service_name,
            'price', p_price,
            'payment_method', p_payment_method,
            'client', p_client_name
        )
    );
    
    RETURN v_cut_id;
END;
$$;

-- Add payment_method validation to confirm_appointment_payment
CREATE OR REPLACE FUNCTION public.confirm_appointment_payment(
  p_appointment_id UUID,
  p_cashier_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_session_token TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_cashier RECORD;
  v_cut_id UUID;
BEGIN
  -- Validate payment method
  IF p_payment_method NOT IN ('cash', 'card', 'momo') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid payment method. Must be cash, card, or momo';
  END IF;

  -- Validate session if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
      RAISE EXCEPTION 'Invalid or expired session';
    END IF;
  END IF;

  -- Get appointment
  SELECT a.*, s.name as service_name, st.name as barber_name, st.id as barber_id_final
  INTO v_appointment
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN staff st ON st.id = COALESCE(a.preferred_barber_id, (
    SELECT id FROM staff WHERE shop_id = a.shop_id AND role = 'barber' AND is_active = true LIMIT 1
  ))
  WHERE a.id = p_appointment_id AND a.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not pending';
  END IF;

  -- Get cashier info
  SELECT * INTO v_cashier FROM staff WHERE id = p_cashier_id AND is_active = true;
  
  IF NOT FOUND OR v_cashier.shop_id != v_appointment.shop_id THEN
    RAISE EXCEPTION 'Cashier not authorized for this shop';
  END IF;

  -- Check if cashier has an active shift
  IF NOT EXISTS (
    SELECT 1 FROM shifts
    WHERE staff_id = p_cashier_id 
    AND shop_id = v_appointment.shop_id
    AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'You must be clocked in to confirm payments';
  END IF;

  -- Update appointment status
  UPDATE appointments
  SET 
    status = 'completed',
    confirmed_by = p_cashier_id,
    confirmed_at = now(),
    payment_amount = p_payment_amount,
    payment_method = p_payment_method
  WHERE id = p_appointment_id;

  -- Create a cut record for revenue tracking
  INSERT INTO cuts (
    shop_id, barber_id, service_id, price, client_name,
    status, confirmed_by, confirmed_at, payment_method
  )
  VALUES (
    v_appointment.shop_id,
    COALESCE(v_appointment.preferred_barber_id, v_appointment.barber_id_final),
    v_appointment.service_id,
    p_payment_amount,
    v_appointment.customer_name,
    'confirmed',
    p_cashier_id,
    now(),
    p_payment_method
  )
  RETURNING id INTO v_cut_id;

  -- Log activity
  PERFORM log_activity(
    v_appointment.shop_id,
    p_cashier_id,
    v_cashier.name,
    v_cashier.role::text,
    'appointment_payment',
    v_cashier.name || ' confirmed payment for appointment: ' || v_appointment.customer_name,
    jsonb_build_object(
      'appointment_id', p_appointment_id,
      'cut_id', v_cut_id,
      'customer', v_appointment.customer_name,
      'amount', p_payment_amount,
      'payment_method', p_payment_method
    )
  );

  RETURN v_cut_id;
END;
$$;
