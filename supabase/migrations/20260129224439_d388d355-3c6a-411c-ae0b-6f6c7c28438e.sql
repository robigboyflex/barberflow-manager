-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create trigger function to hash PIN on insert/update
CREATE OR REPLACE FUNCTION public.hash_staff_pin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if pin is provided and changed (or on insert)
  IF NEW.pin IS NOT NULL AND NEW.pin != '****' AND (TG_OP = 'INSERT' OR OLD.pin IS DISTINCT FROM NEW.pin) THEN
    NEW.pin_hash := extensions.crypt(NEW.pin, extensions.gen_salt('bf'));
    -- Mask the plain pin for security (store as ****)
    NEW.pin := '****';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS hash_staff_pin_trigger ON public.staff;
CREATE TRIGGER hash_staff_pin_trigger
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_staff_pin();

-- Fix existing staff with null pin_hash (the new "eddynm" user with pin 5656)
UPDATE public.staff 
SET pin_hash = extensions.crypt('5656', extensions.gen_salt('bf')), pin = '****'
WHERE id = '0252a5bf-86d2-47bc-8800-6f0f06a95dd2' AND pin_hash IS NULL;

-- Clear rate limiting for this shop so user can test immediately
DELETE FROM public.failed_pin_attempts 
WHERE shop_id = '1cfe758b-2e68-46f1-990a-1f0f910ad971';