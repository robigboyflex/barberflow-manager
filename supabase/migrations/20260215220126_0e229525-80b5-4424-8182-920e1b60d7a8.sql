
-- Drop the overly permissive INSERT policy on appointments
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

-- Create a tighter INSERT policy that validates shop_id references an active shop
CREATE POLICY "Anyone can create appointments for active shops"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = appointments.shop_id
    AND shops.is_active = true
  )
);
