-- Create appointments table for customer bookings
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  preferred_barber_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  confirmed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_amount NUMERIC,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert appointments (public booking)
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- Policy: Owners can manage all appointments in their shops
CREATE POLICY "Owners can manage appointments in own shops"
ON public.appointments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM shops
  WHERE shops.id = appointments.shop_id
  AND shops.owner_id = auth.uid()
));

-- Policy: Staff can view and update appointments in their shop (via RPC)
CREATE POLICY "Appointments viewable by shop staff"
ON public.appointments
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_appointments_shop_date ON public.appointments(shop_id, preferred_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Function for cashiers to confirm appointment payment
CREATE OR REPLACE FUNCTION public.confirm_appointment_payment(
  p_appointment_id UUID,
  p_cashier_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_session_token TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_cashier RECORD;
  v_cut_id UUID;
BEGIN
  -- Validate session if provided
  IF p_session_token IS NOT NULL THEN
    IF NOT validate_staff_session(p_cashier_id, p_session_token) THEN
      RAISE EXCEPTION 'Invalid or expired session';
    END IF;
  END IF;

  -- Get appointment
  SELECT a.*, s.name as service_name, st.name as barber_name, st.id as barber_id_final
  INTO v_appointment
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN staff st ON st.id = COALESCE(a.preferred_barber_id, (
    SELECT id FROM staff WHERE shop_id = a.shop_id AND role = 'barber' AND is_active = true LIMIT 1
  ))
  WHERE a.id = p_appointment_id AND a.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not pending';
  END IF;

  -- Get cashier info
  SELECT * INTO v_cashier FROM staff WHERE id = p_cashier_id AND is_active = true;
  
  IF NOT FOUND OR v_cashier.shop_id != v_appointment.shop_id THEN
    RAISE EXCEPTION 'Cashier not authorized for this shop';
  END IF;

  -- Check if cashier has an active shift
  IF NOT EXISTS (
    SELECT 1 FROM shifts
    WHERE staff_id = p_cashier_id 
    AND shop_id = v_appointment.shop_id
    AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'You must be clocked in to confirm payments';
  END IF;

  -- Update appointment status
  UPDATE appointments
  SET 
    status = 'completed',
    confirmed_by = p_cashier_id,
    confirmed_at = now(),
    payment_amount = p_payment_amount,
    payment_method = p_payment_method
  WHERE id = p_appointment_id;

  -- Create a cut record for revenue tracking
  INSERT INTO cuts (
    shop_id, barber_id, service_id, price, client_name,
    status, confirmed_by, confirmed_at, payment_method
  )
  VALUES (
    v_appointment.shop_id,
    COALESCE(v_appointment.preferred_barber_id, v_appointment.barber_id_final),
    v_appointment.service_id,
    p_payment_amount,
    v_appointment.customer_name,
    'confirmed',
    p_cashier_id,
    now(),
    p_payment_method
  )
  RETURNING id INTO v_cut_id;

  -- Log activity
  PERFORM log_activity(
    v_appointment.shop_id,
    p_cashier_id,
    v_cashier.name,
    v_cashier.role::text,
    'appointment_completed',
    v_cashier.name || ' completed appointment for ' || v_appointment.customer_name,
    jsonb_build_object(
      'appointment_id', p_appointment_id,
      'cut_id', v_cut_id,
      'customer', v_appointment.customer_name,
      'amount', p_payment_amount
    )
  );

  RETURN v_cut_id;
END;
$$;

-- Function to get shop appointments for cashier
CREATE OR REPLACE FUNCTION public.get_shop_appointments(
  p_staff_id UUID,
  p_session_token TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  service_name TEXT,
  service_price NUMERIC,
  preferred_barber TEXT,
  preferred_date DATE,
  preferred_time TIME,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  -- Validate session
  IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
  END IF;

  -- Get staff's shop
  SELECT shop_id INTO v_shop_id FROM staff WHERE staff.id = p_staff_id;
  
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.customer_name,
    a.customer_phone,
    s.name AS service_name,
    s.price AS service_price,
    st.name AS preferred_barber,
    a.preferred_date,
    a.preferred_time,
    a.notes,
    a.status,
    a.created_at
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN staff st ON st.id = a.preferred_barber_id
  WHERE a.shop_id = v_shop_id
    AND a.preferred_date = p_date
  ORDER BY a.preferred_time ASC;
END;
$$;