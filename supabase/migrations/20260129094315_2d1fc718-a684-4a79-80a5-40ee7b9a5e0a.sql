-- Fix validate_staff_session parameter order in all affected functions

-- Fix staff_clock_in
CREATE OR REPLACE FUNCTION public.staff_clock_in(p_staff_id uuid, p_shop_id uuid, p_session_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_shift_id uuid;
    v_staff_record RECORD;
BEGIN
    -- Validate session (correct parameter order: staff_id, session_token)
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    
    -- Get staff info
    SELECT * INTO v_staff_record
    FROM staff
    WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff not found or inactive';
    END IF;
    
    -- Check for existing active shift
    IF EXISTS (
        SELECT 1 FROM shifts
        WHERE staff_id = p_staff_id AND clock_out IS NULL
    ) THEN
        RAISE EXCEPTION 'Already clocked in';
    END IF;
    
    -- Create new shift
    INSERT INTO shifts (staff_id, shop_id)
    VALUES (p_staff_id, p_shop_id)
    RETURNING id INTO v_shift_id;
    
    -- Log activity
    PERFORM log_activity(
        p_shop_id,
        p_staff_id,
        v_staff_record.name,
        v_staff_record.role::text,
        'clock_in',
        v_staff_record.name || ' (' || v_staff_record.role || ') clocked in',
        jsonb_build_object('shift_id', v_shift_id)
    );
    
    RETURN v_shift_id;
END;
$function$;

-- Fix log_cut
CREATE OR REPLACE FUNCTION public.log_cut(p_shop_id uuid, p_barber_id uuid, p_service_id uuid, p_price numeric, p_client_name text DEFAULT NULL::text, p_session_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cut_id uuid;
    v_staff_record RECORD;
    v_service_name text;
BEGIN
    -- Validate session if provided (correct parameter order: staff_id, session_token)
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_barber_id, p_session_token) THEN
            RAISE EXCEPTION 'Invalid or expired session';
        END IF;
    END IF;
    
    -- Get staff info
    SELECT * INTO v_staff_record
    FROM staff
    WHERE id = p_barber_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barber not found or inactive';
    END IF;
    
    -- Get service name
    SELECT name INTO v_service_name FROM services WHERE id = p_service_id;
    
    -- Insert cut
    INSERT INTO cuts (shop_id, barber_id, service_id, price, client_name)
    VALUES (p_shop_id, p_barber_id, p_service_id, p_price, p_client_name)
    RETURNING id INTO v_cut_id;
    
    -- Log activity
    PERFORM log_activity(
        p_shop_id,
        p_barber_id,
        v_staff_record.name,
        v_staff_record.role::text,
        'cut_logged',
        v_staff_record.name || ' logged a ' || COALESCE(v_service_name, 'service'),
        jsonb_build_object(
            'cut_id', v_cut_id,
            'service', v_service_name,
            'price', p_price,
            'client', p_client_name
        )
    );
    
    RETURN v_cut_id;
END;
$function$;

-- Fix confirm_cut
CREATE OR REPLACE FUNCTION public.confirm_cut(p_cut_id uuid, p_cashier_id uuid, p_session_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cut_record RECORD;
    v_cashier_record RECORD;
BEGIN
    -- Validate session if provided (correct parameter order: staff_id, session_token)
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
            RAISE EXCEPTION 'Invalid or expired session';
        END IF;
    END IF;
    
    -- Get cashier info
    SELECT * INTO v_cashier_record
    FROM staff
    WHERE id = p_cashier_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cashier not found or inactive';
    END IF;
    
    -- Get cut info
    SELECT c.*, s.name as service_name, b.name as barber_name
    INTO v_cut_record
    FROM cuts c
    JOIN services s ON s.id = c.service_id
    JOIN staff b ON b.id = c.barber_id
    WHERE c.id = p_cut_id AND c.status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cut not found or not pending';
    END IF;
    
    -- Update cut status
    UPDATE cuts
    SET status = 'confirmed', confirmed_by = p_cashier_id, confirmed_at = now()
    WHERE id = p_cut_id;
    
    -- Log activity
    PERFORM log_activity(
        v_cut_record.shop_id,
        p_cashier_id,
        v_cashier_record.name,
        v_cashier_record.role::text,
        'payment_confirmed',
        v_cashier_record.name || ' confirmed payment for ' || v_cut_record.barber_name || '''s ' || v_cut_record.service_name,
        jsonb_build_object(
            'cut_id', p_cut_id,
            'barber', v_cut_record.barber_name,
            'service', v_cut_record.service_name,
            'price', v_cut_record.price
        )
    );
    
    RETURN true;
END;
$function$;

-- Fix cashier_record_payment
CREATE OR REPLACE FUNCTION public.cashier_record_payment(p_shop_id uuid, p_cashier_id uuid, p_barber_id uuid, p_service_id uuid, p_price numeric, p_client_name text DEFAULT NULL::text, p_payment_method text DEFAULT 'cash'::text, p_session_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cut_id uuid;
    v_cashier_record RECORD;
    v_barber_record RECORD;
    v_service_name text;
BEGIN
    -- Validate session if provided (correct parameter order: staff_id, session_token)
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
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
$function$;