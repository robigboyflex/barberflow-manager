-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add pin_hash column for hashed PINs
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Create function to hash existing PINs and set them
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id, pin FROM public.staff WHERE pin IS NOT NULL AND pin_hash IS NULL
    LOOP
        UPDATE public.staff 
        SET pin_hash = crypt(rec.pin, gen_salt('bf'))
        WHERE id = rec.id;
    END LOOP;
END $$;

-- Create trigger to auto-hash new PINs on insert/update
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If pin is being set or changed, hash it
    IF NEW.pin IS NOT NULL AND (OLD IS NULL OR NEW.pin != OLD.pin) THEN
        NEW.pin_hash = crypt(NEW.pin, gen_salt('bf'));
        NEW.pin = '****'; -- Mask the original PIN
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS hash_staff_pin_trigger ON public.staff;

-- Create trigger
CREATE TRIGGER hash_staff_pin_trigger
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.hash_staff_pin();

-- Create secure PIN verification function that returns a signed session token
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
    shop_uuid UUID,
    pin_input TEXT
)
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
SET search_path = public
AS $$
DECLARE
    found_staff RECORD;
    token TEXT;
BEGIN
    -- Find staff member with matching shop and PIN hash
    SELECT s.id, s.name, s.role, s.shop_id, s.phone, s.is_active,
           sh.name as shop_name, sh.location as shop_location
    INTO found_staff
    FROM staff s
    JOIN shops sh ON sh.id = s.shop_id
    WHERE s.shop_id = shop_uuid
      AND s.pin_hash = crypt(pin_input, s.pin_hash)
      AND s.is_active = true;
    
    IF found_staff IS NULL THEN
        RETURN;
    END IF;
    
    -- Generate a secure session token (UUID + timestamp hash)
    token := encode(
        digest(
            gen_random_uuid()::text || now()::text || found_staff.id::text,
            'sha256'
        ),
        'hex'
    );
    
    RETURN QUERY SELECT 
        found_staff.id,
        found_staff.name,
        found_staff.role,
        found_staff.shop_id,
        found_staff.phone,
        found_staff.is_active,
        found_staff.shop_name,
        found_staff.shop_location,
        token;
END;
$$;

-- Create function to log cuts with server-side staff validation
CREATE OR REPLACE FUNCTION public.log_cut(
    p_shop_id UUID,
    p_barber_id UUID,
    p_service_id UUID,
    p_price NUMERIC,
    p_client_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_cut_id UUID;
BEGIN
    -- Verify the barber exists and is active in the shop
    IF NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE id = p_barber_id 
        AND shop_id = p_shop_id 
        AND role = 'barber'
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid barber or barber not authorized for this shop';
    END IF;
    
    -- Verify service exists and belongs to shop
    IF NOT EXISTS (
        SELECT 1 FROM services 
        WHERE id = p_service_id 
        AND shop_id = p_shop_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid service or service not available for this shop';
    END IF;
    
    -- Insert the cut
    INSERT INTO cuts (shop_id, barber_id, service_id, price, client_name, status)
    VALUES (p_shop_id, p_barber_id, p_service_id, p_price, p_client_name, 'pending')
    RETURNING id INTO new_cut_id;
    
    RETURN new_cut_id;
END;
$$;

-- Create function to confirm cuts with server-side cashier validation
CREATE OR REPLACE FUNCTION public.confirm_cut(
    p_cut_id UUID,
    p_cashier_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cut_shop_id UUID;
BEGIN
    -- Get the cut's shop_id
    SELECT shop_id INTO cut_shop_id FROM cuts WHERE id = p_cut_id;
    
    IF cut_shop_id IS NULL THEN
        RAISE EXCEPTION 'Cut not found';
    END IF;
    
    -- Verify the cashier exists and is active in the same shop
    IF NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE id = p_cashier_id 
        AND shop_id = cut_shop_id 
        AND role = 'cashier'
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid cashier or cashier not authorized for this shop';
    END IF;
    
    -- Update the cut
    UPDATE cuts
    SET status = 'confirmed',
        confirmed_by = p_cashier_id,
        confirmed_at = now()
    WHERE id = p_cut_id
      AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- Create function to dispute cuts with server-side cashier validation
CREATE OR REPLACE FUNCTION public.dispute_cut(
    p_cut_id UUID,
    p_cashier_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cut_shop_id UUID;
BEGIN
    -- Get the cut's shop_id
    SELECT shop_id INTO cut_shop_id FROM cuts WHERE id = p_cut_id;
    
    IF cut_shop_id IS NULL THEN
        RAISE EXCEPTION 'Cut not found';
    END IF;
    
    -- Verify the cashier exists and is active in the same shop
    IF NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE id = p_cashier_id 
        AND shop_id = cut_shop_id 
        AND role = 'cashier'
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid cashier or cashier not authorized for this shop';
    END IF;
    
    -- Update the cut
    UPDATE cuts
    SET status = 'disputed'
    WHERE id = p_cut_id
      AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- Create function to record expenses with server-side staff validation
CREATE OR REPLACE FUNCTION public.record_expense(
    p_shop_id UUID,
    p_staff_id UUID,
    p_category expense_category,
    p_description TEXT,
    p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_expense_id UUID;
BEGIN
    -- Verify the staff exists and is active in the shop (cashier role)
    IF NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE id = p_staff_id 
        AND shop_id = p_shop_id 
        AND role = 'cashier'
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid staff or staff not authorized to record expenses';
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Validate description
    IF p_description IS NULL OR trim(p_description) = '' THEN
        RAISE EXCEPTION 'Description is required';
    END IF;
    
    -- Insert the expense
    INSERT INTO expenses (shop_id, recorded_by, category, description, amount)
    VALUES (p_shop_id, p_staff_id, p_category, trim(p_description), p_amount)
    RETURNING id INTO new_expense_id;
    
    RETURN new_expense_id;
END;
$$;

-- Remove direct client access to sensitive operations by updating RLS policies
-- First, drop existing permissive policies for cuts inserts that allow client-side IDs

DROP POLICY IF EXISTS "Staff can insert cuts for their shop" ON public.cuts;
DROP POLICY IF EXISTS "Staff can update cuts for their shop" ON public.cuts;

-- Create more restrictive policies that require server-side validation
CREATE POLICY "Cuts can only be inserted via RPC"
ON public.cuts FOR INSERT
WITH CHECK (false);  -- Block direct inserts; must use log_cut function

CREATE POLICY "Cuts can only be updated via RPC"
ON public.cuts FOR UPDATE
USING (false)  -- Block direct updates; must use confirm_cut/dispute_cut functions
WITH CHECK (false);

-- Similarly for expenses
DROP POLICY IF EXISTS "Cashiers can insert expenses" ON public.expenses;

CREATE POLICY "Expenses can only be inserted via RPC"
ON public.expenses FOR INSERT
WITH CHECK (false);  -- Block direct inserts; must use record_expense function