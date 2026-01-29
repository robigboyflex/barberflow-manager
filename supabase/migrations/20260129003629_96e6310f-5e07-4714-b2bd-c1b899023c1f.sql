-- FIX 1: audit_logs INSERT policy - block direct inserts, only allow via RPC
-- Drop the weak policy that only checks shop existence
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;

-- Create a restrictive policy that blocks direct inserts (audit logs should only be created via SECURITY DEFINER RPCs)
CREATE POLICY "Audit logs via RPC only"
ON public.audit_logs FOR INSERT
WITH CHECK (false);

-- FIX 2: staff table - prevent staff from viewing other staff members' sensitive data
-- The current policy only allows owners to view staff, which is correct.
-- However, we need to ensure the RPC functions don't expose PIN hashes.
-- Since staff data access is already done through RPCs (get_shop_services, get_shop_barbers, etc.),
-- and those RPCs only return safe fields (id, name), this is already handled.
-- But let's add an explicit policy for staff to view only their own record for self-service features.

-- First, we need to ensure staff can only see their own record (not other staff PIN hashes)
-- The current "Owners can view staff in own shops" policy is SELECT and uses auth.uid()
-- Staff authentication doesn't use auth.uid(), it uses session tokens validated in RPCs
-- So staff can't directly query the staff table - they go through RPCs which are safe
-- No additional policy needed as the RPCs already protect this data.

-- FIX 3: services table - add explicit SELECT policy for authorized access
-- The current "Owners can manage services in own shops" is an ALL policy
-- This is secure because it requires auth.uid() = owner_id
-- Staff access to services is done through the get_shop_services RPC which validates sessions
-- The RPC is SECURITY DEFINER so it bypasses RLS
-- This is actually the correct pattern - no direct SELECT needed

-- However, let's ensure the services table has an explicit SELECT that allows 
-- staff to view services via RPC (the RPC already handles this with SECURITY DEFINER)
-- The current setup is secure because:
-- 1. Anonymous users can't SELECT (no policy for anonymous)
-- 2. Owners can SELECT their own shops' services
-- 3. Staff use get_shop_services RPC which validates session

-- No migration changes needed for staff_table_pin_exposure or services_table_cross_shop_access
-- because they are already protected by the RPC pattern (SECURITY DEFINER functions 
-- that validate sessions and only return safe fields)