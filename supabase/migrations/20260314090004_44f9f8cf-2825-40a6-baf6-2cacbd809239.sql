
-- 1. Add pin_plain column to staff (visible to owners only, already protected by RLS)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin_plain text;

-- 2. Add salary_pay_day column to staff (day of month 1-31)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_pay_day integer;

-- 3. Update the hash_staff_pin trigger to also store plain PIN
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only hash if pin is provided and changed (or on insert)
  IF NEW.pin IS NOT NULL AND NEW.pin != '****' AND (TG_OP = 'INSERT' OR OLD.pin IS DISTINCT FROM NEW.pin) THEN
    -- Store the plain PIN for owner visibility
    NEW.pin_plain := NEW.pin;
    NEW.pin_hash := extensions.crypt(NEW.pin, extensions.gen_salt('bf'));
    -- Mask the plain pin field for backward compat
    NEW.pin := '****';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Create salary_payments table
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date,
  period_end date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- Owners can manage salary payments in own shops
CREATE POLICY "Owners can manage salary payments" ON public.salary_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = salary_payments.shop_id AND shops.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = salary_payments.shop_id AND shops.owner_id = auth.uid()));
