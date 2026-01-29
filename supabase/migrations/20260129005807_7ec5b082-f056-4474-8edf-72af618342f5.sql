-- Fix close_shift function to use correct parameter order for validate_staff_session
CREATE OR REPLACE FUNCTION public.close_shift(p_staff_id uuid, p_shift_id uuid, p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_staff_record RECORD;
    v_shift_record RECORD;
    v_transactions integer;
    v_revenue numeric;
    v_today date;
    v_active_shifts integer;
    v_shop_id uuid;
BEGIN
    -- Validate session (correct parameter order: p_staff_id, p_session_token)
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    
    -- Get staff info
    SELECT s.*, sh.name as shop_name 
    INTO v_staff_record
    FROM staff s
    JOIN shops sh ON sh.id = s.shop_id
    WHERE s.id = p_staff_id AND s.is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff not found or inactive';
    END IF;
    
    -- Get shift info
    SELECT * INTO v_shift_record
    FROM shifts
    WHERE id = p_shift_id 
    AND staff_id = p_staff_id
    AND clock_out IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active shift not found';
    END IF;
    
    v_shop_id := v_shift_record.shop_id;
    
    -- Calculate transactions and revenue for this shift (only for cashiers)
    IF v_staff_record.role = 'cashier' THEN
        SELECT 
            COUNT(*),
            COALESCE(SUM(price), 0)
        INTO v_transactions, v_revenue
        FROM cuts
        WHERE shop_id = v_shop_id
        AND confirmed_by = p_staff_id
        AND confirmed_at >= v_shift_record.clock_in
        AND confirmed_at <= now()
        AND status = 'confirmed';
    ELSE
        v_transactions := 0;
        v_revenue := 0;
    END IF;
    
    -- Close the shift (clock out + mark as closed)
    UPDATE shifts
    SET 
        clock_out = now(),
        is_closed = true,
        closed_at = now(),
        total_transactions = v_transactions,
        total_revenue = v_revenue
    WHERE id = p_shift_id;
    
    -- Log the activity
    PERFORM log_activity(
        v_shop_id,
        p_staff_id,
        v_staff_record.name,
        v_staff_record.role::text,
        'shift_closed',
        v_staff_record.name || ' closed their shift with ' || v_transactions || ' transactions',
        jsonb_build_object(
            'shift_id', p_shift_id,
            'transactions', v_transactions,
            'revenue', v_revenue
        )
    );
    
    -- Check if this was the last active shift of the day
    v_today := CURRENT_DATE;
    
    SELECT COUNT(*) INTO v_active_shifts
    FROM shifts
    WHERE shop_id = v_shop_id
    AND DATE(clock_in) = v_today
    AND (clock_out IS NULL OR is_closed = false);
    
    -- If no more active shifts, auto-close the day
    IF v_active_shifts = 0 THEN
        -- Insert or update daily summary
        INSERT INTO daily_summaries (shop_id, summary_date, is_locked, locked_at, locked_by)
        VALUES (v_shop_id, v_today, true, now(), p_staff_id)
        ON CONFLICT (shop_id, summary_date) DO UPDATE
        SET is_locked = true, locked_at = now(), locked_by = p_staff_id;
        
        -- Update daily summary totals
        UPDATE daily_summaries
        SET 
            total_cuts = (
                SELECT COUNT(*) FROM cuts 
                WHERE shop_id = v_shop_id 
                AND DATE(created_at) = v_today 
                AND status = 'confirmed'
            ),
            total_revenue = (
                SELECT COALESCE(SUM(price), 0) FROM cuts 
                WHERE shop_id = v_shop_id 
                AND DATE(created_at) = v_today 
                AND status = 'confirmed'
            ),
            total_expenses = (
                SELECT COALESCE(SUM(amount), 0) FROM expenses 
                WHERE shop_id = v_shop_id 
                AND expense_date = v_today
            ),
            net_profit = (
                SELECT COALESCE(SUM(price), 0) FROM cuts 
                WHERE shop_id = v_shop_id 
                AND DATE(created_at) = v_today 
                AND status = 'confirmed'
            ) - (
                SELECT COALESCE(SUM(amount), 0) FROM expenses 
                WHERE shop_id = v_shop_id 
                AND expense_date = v_today
            ),
            updated_at = now()
        WHERE shop_id = v_shop_id AND summary_date = v_today;
        
        -- Log day closed activity
        PERFORM log_activity(
            v_shop_id,
            p_staff_id,
            v_staff_record.name,
            v_staff_record.role::text,
            'day_closed',
            'Business day closed automatically after last shift',
            jsonb_build_object('date', v_today)
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'shift_closed', true,
            'day_closed', true,
            'transactions', v_transactions,
            'revenue', v_revenue
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'shift_closed', true,
        'day_closed', false,
        'transactions', v_transactions,
        'revenue', v_revenue
    );
END;
$function$;