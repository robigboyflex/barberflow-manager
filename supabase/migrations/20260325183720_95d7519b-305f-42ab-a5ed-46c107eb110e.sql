-- Table to track salary advances/borrows for barbers
CREATE TABLE public.salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  recorded_by uuid NOT NULL REFERENCES staff(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- Owners can view/manage advances in their shops
CREATE POLICY "Owners can manage salary advances"
  ON public.salary_advances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = salary_advances.shop_id AND shops.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = salary_advances.shop_id AND shops.owner_id = auth.uid()));

-- Insert via RPC only for cashiers
CREATE POLICY "Advances insert via RPC"
  ON public.salary_advances FOR INSERT TO public
  WITH CHECK (false);

-- RPC for cashier to record an advance
CREATE OR REPLACE FUNCTION public.record_salary_advance(
  p_shop_id uuid,
  p_staff_id uuid,
  p_barber_id uuid,
  p_amount numeric,
  p_notes text DEFAULT NULL,
  p_session_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_advance_id uuid;
  v_cashier RECORD;
  v_barber RECORD;
BEGIN
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;
  END IF;

  SELECT * INTO v_cashier FROM staff
  WHERE id = p_staff_id AND shop_id = p_shop_id AND role = 'cashier' AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  SELECT * INTO v_barber FROM staff
  WHERE id = p_barber_id AND shop_id = p_shop_id AND role = 'barber' AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Barber not found';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Amount must be positive';
  END IF;

  INSERT INTO salary_advances (staff_id, shop_id, amount, recorded_by, notes)
  VALUES (p_barber_id, p_shop_id, p_amount, p_staff_id, p_notes)
  RETURNING id INTO v_advance_id;

  PERFORM log_activity(
    p_shop_id, p_staff_id, v_cashier.name, v_cashier.role::text,
    'salary_advance',
    v_cashier.name || ' recorded salary advance of GH₵' || p_amount || ' for ' || v_barber.name,
    jsonb_build_object('advance_id', v_advance_id, 'barber', v_barber.name, 'amount', p_amount)
  );

  RETURN v_advance_id;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE salary_advances;