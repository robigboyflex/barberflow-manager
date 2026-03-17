
-- Fix 1: Tighten anonymous appointment INSERT policy to prevent forged status/payment data
DROP POLICY IF EXISTS "Anyone can create appointments for active shops" ON public.appointments;

CREATE POLICY "Anyone can create appointments for active shops"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = appointments.shop_id
    AND shops.is_active = true
  )
  AND status = 'pending'
  AND confirmed_by IS NULL
  AND confirmed_at IS NULL
  AND payment_amount IS NULL
  AND payment_method IS NULL
);

-- Fix 2: Remove plaintext PIN storage
-- Update the trigger to stop storing pin_plain
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin != '****' AND (TG_OP = 'INSERT' OR OLD.pin IS DISTINCT FROM NEW.pin) THEN
    NEW.pin_hash := extensions.crypt(NEW.pin, extensions.gen_salt('bf'));
    NEW.pin_plain := NULL;
    NEW.pin := '****';
  END IF;
  RETURN NEW;
END;
$$;

-- Clear all existing plaintext PINs
UPDATE public.staff SET pin_plain = NULL WHERE pin_plain IS NOT NULL;
