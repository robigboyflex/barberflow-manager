
-- Add salary configuration columns to staff table
ALTER TABLE public.staff
ADD COLUMN salary_type text DEFAULT 'fixed' CHECK (salary_type IN ('fixed', 'percentage', 'per_cut')),
ADD COLUMN salary_amount numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.staff.salary_type IS 'Compensation type: fixed (monthly), percentage (of cut price), per_cut (per completed cut)';
COMMENT ON COLUMN public.staff.salary_amount IS 'Amount: fixed=monthly GHC, percentage=% of cut price, per_cut=GHC per cut';
