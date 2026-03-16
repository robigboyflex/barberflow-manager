
-- 1. Drop the overly permissive appointments SELECT policy
DROP POLICY IF EXISTS "Appointments viewable by shop staff" ON public.appointments;

-- 2. Drop the three permissive staff-facing shifts policies
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can insert own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can update own shifts" ON public.shifts;

-- 3. Create a public RPC for fetching barber names (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_shop_barbers(p_shop_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT s.id, s.name
  FROM public.staff s
  JOIN public.shops sh ON sh.id = s.shop_id
  WHERE s.shop_id = p_shop_id
    AND s.role = 'barber'
    AND s.is_active = true
    AND sh.is_active = true
  ORDER BY s.name;
$$;
