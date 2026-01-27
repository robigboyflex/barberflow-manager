-- Create enum for cut status
CREATE TYPE public.cut_status AS ENUM ('pending', 'confirmed', 'disputed', 'cancelled');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partial');

-- Create enum for expense category
CREATE TYPE public.expense_category AS ENUM ('supplies', 'utilities', 'rent', 'equipment', 'maintenance', 'other');

-- Create services table (types of cuts/services offered)
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cuts table (barber logs each cut)
CREATE TABLE public.cuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_name TEXT,
  price DECIMAL(10,2) NOT NULL,
  status public.cut_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES public.staff(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  category public.expense_category NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_summaries table for quick lookups
CREATE TABLE public.daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_cuts INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, summary_date)
);

-- Create audit_logs table for transparency
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS for services: owners can manage, staff can view
CREATE POLICY "Owners can manage services in own shops"
ON public.services FOR ALL
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = services.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Staff can view services in their shop"
ON public.services FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.shop_id = services.shop_id AND staff.is_active = true));

-- RLS for cuts: barbers can create/view, cashiers can confirm, owners full access
CREATE POLICY "Owners can manage all cuts in own shops"
ON public.cuts FOR ALL
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = cuts.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Staff can view cuts in their shop"
ON public.cuts FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.shop_id = cuts.shop_id AND staff.is_active = true));

CREATE POLICY "Staff can insert cuts in their shop"
ON public.cuts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = cuts.barber_id AND staff.shop_id = cuts.shop_id AND staff.is_active = true));

CREATE POLICY "Staff can update cuts in their shop"
ON public.cuts FOR UPDATE
USING (EXISTS (SELECT 1 FROM staff WHERE staff.shop_id = cuts.shop_id AND staff.is_active = true));

-- RLS for expenses: cashiers can create, owners can manage
CREATE POLICY "Owners can manage expenses in own shops"
ON public.expenses FOR ALL
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Staff can view expenses in their shop"
ON public.expenses FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.shop_id = expenses.shop_id AND staff.is_active = true));

CREATE POLICY "Staff can insert expenses in their shop"
ON public.expenses FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.id = expenses.recorded_by AND staff.shop_id = expenses.shop_id AND staff.is_active = true));

-- RLS for daily_summaries
CREATE POLICY "Owners can manage daily summaries in own shops"
ON public.daily_summaries FOR ALL
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = daily_summaries.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Staff can view daily summaries in their shop"
ON public.daily_summaries FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.shop_id = daily_summaries.shop_id AND staff.is_active = true));

-- RLS for audit_logs
CREATE POLICY "Owners can view audit logs in own shops"
ON public.audit_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = audit_logs.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Staff can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = audit_logs.shop_id));

-- Add update triggers
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cuts_updated_at
BEFORE UPDATE ON public.cuts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();