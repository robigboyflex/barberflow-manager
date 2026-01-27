-- Create shifts table for clock in/out tracking
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Policies for shifts
CREATE POLICY "Staff can view own shifts"
ON public.shifts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM staff WHERE staff.id = shifts.staff_id AND staff.is_active = true
));

CREATE POLICY "Staff can insert own shifts"
ON public.shifts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM staff WHERE staff.id = shifts.staff_id AND staff.is_active = true
));

CREATE POLICY "Staff can update own shifts"
ON public.shifts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM staff WHERE staff.id = shifts.staff_id AND staff.is_active = true
));

CREATE POLICY "Owners can manage shifts in own shops"
ON public.shifts FOR ALL
USING (EXISTS (
  SELECT 1 FROM shops WHERE shops.id = shifts.shop_id AND shops.owner_id = auth.uid()
));

-- Add payment_method to cuts table
ALTER TABLE public.cuts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'momo'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shifts_staff_date ON public.shifts (staff_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_cuts_shop_date ON public.cuts (shop_id, created_at);