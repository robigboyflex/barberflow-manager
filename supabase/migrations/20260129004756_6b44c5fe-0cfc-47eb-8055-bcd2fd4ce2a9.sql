-- ============================================================
-- SHIFT CLOSING & DAILY LOCKING WORKFLOW
-- ============================================================

-- 1. Add closing fields to shifts table (may already exist from partial migration)
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_transactions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0;

-- 2. Add day locking to daily_summaries
ALTER TABLE public.daily_summaries
ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by uuid;

-- 3. Create activities table for real-time tracking (may already exist)
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name text NOT NULL,
    staff_role text NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_activities_shop_date ON public.activities(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities (drop if exists first)
DROP POLICY IF EXISTS "Activities can only be inserted via RPC" ON public.activities;
DROP POLICY IF EXISTS "Owners can view activities in own shops" ON public.activities;

CREATE POLICY "Activities can only be inserted via RPC"
ON public.activities FOR INSERT
WITH CHECK (false);

CREATE POLICY "Owners can view activities in own shops"
ON public.activities FOR SELECT
USING (EXISTS (
    SELECT 1 FROM shops 
    WHERE shops.id = activities.shop_id 
    AND shops.owner_id = auth.uid()
));

-- 4. Drop existing functions that need parameter changes
DROP FUNCTION IF EXISTS public.cashier_record_payment(uuid, uuid, uuid, uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.confirm_cut(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.confirm_cut(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_cut(uuid, uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.log_cut(uuid, uuid, uuid, numeric, text);

-- 5. Create helper function to log activities (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_activity(
    p_shop_id uuid,
    p_staff_id uuid,
    p_staff_name text,
    p_staff_role text,
    p_activity_type text,
    p_description text,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_activity_id uuid;
BEGIN
    INSERT INTO public.activities (
        shop_id, staff_id, staff_name, staff_role, 
        activity_type, description, metadata
    ) VALUES (
        p_shop_id, p_staff_id, p_staff_name, p_staff_role,
        p_activity_type, p_description, p_metadata
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$;

-- 6. Create close_shift function
CREATE OR REPLACE FUNCTION public.close_shift(
    p_staff_id uuid,
    p_shift_id uuid,
    p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_record RECORD;
    v_shift_record RECORD;
    v_transactions integer;
    v_revenue numeric;
    v_today date;
    v_active_shifts integer;
    v_shop_id uuid;
BEGIN
    -- Validate session
    IF NOT validate_staff_session(p_session_token, p_staff_id) THEN
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
$$;

-- 7. Update existing clock-in function to log activity
CREATE OR REPLACE FUNCTION public.staff_clock_in(
    p_staff_id uuid,
    p_shop_id uuid,
    p_session_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift_id uuid;
    v_staff_record RECORD;
BEGIN
    -- Validate session
    IF NOT validate_staff_session(p_session_token, p_staff_id) THEN
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
$$;

-- 8. Recreate log_cut with activity logging
CREATE OR REPLACE FUNCTION public.log_cut(
    p_shop_id uuid,
    p_barber_id uuid,
    p_service_id uuid,
    p_price numeric,
    p_client_name text DEFAULT NULL,
    p_session_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cut_id uuid;
    v_staff_record RECORD;
    v_service_name text;
BEGIN
    -- Validate session if provided
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_session_token, p_barber_id) THEN
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
$$;

-- 9. Recreate confirm_cut with activity logging
CREATE OR REPLACE FUNCTION public.confirm_cut(
    p_cut_id uuid,
    p_cashier_id uuid,
    p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cut_record RECORD;
    v_cashier_record RECORD;
BEGIN
    -- Validate session if provided
    IF p_session_token IS NOT NULL THEN
        IF NOT validate_staff_session(p_session_token, p_cashier_id) THEN
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
$$;

-- 10. Recreate cashier_record_payment with activity logging
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

-- 11. Create function to get shop activities for owner dashboard
CREATE OR REPLACE FUNCTION public.get_shop_activities(
    p_owner_id uuid,
    p_shop_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    shop_id uuid,
    shop_name text,
    staff_id uuid,
    staff_name text,
    staff_role text,
    activity_type text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.shop_id,
        s.name as shop_name,
        a.staff_id,
        a.staff_name,
        a.staff_role,
        a.activity_type,
        a.description,
        a.metadata,
        a.created_at
    FROM activities a
    JOIN shops s ON s.id = a.shop_id
    WHERE s.owner_id = p_owner_id
    AND (p_shop_id IS NULL OR a.shop_id = p_shop_id)
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 12. Add unique constraint for daily_summaries if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_summaries_shop_date_unique'
    ) THEN
        ALTER TABLE public.daily_summaries
        ADD CONSTRAINT daily_summaries_shop_date_unique UNIQUE (shop_id, summary_date);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;