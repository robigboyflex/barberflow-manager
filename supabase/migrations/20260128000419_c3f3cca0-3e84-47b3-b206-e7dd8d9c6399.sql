-- Insert default barbershop services for all existing shops that don't have services yet
INSERT INTO public.services (shop_id, name, price, duration_minutes, is_active)
SELECT 
  s.id as shop_id,
  service_data.name,
  service_data.price,
  service_data.duration_minutes,
  true as is_active
FROM public.shops s
CROSS JOIN (
  VALUES 
    ('Haircut', 25.00, 30),
    ('Beard Trim', 15.00, 15),
    ('Hot Towel Shave', 30.00, 25),
    ('Haircut + Beard', 35.00, 45),
    ('Kids Haircut', 20.00, 20),
    ('Hair Wash', 10.00, 10),
    ('Line Up', 15.00, 15),
    ('Full Grooming', 50.00, 60)
) AS service_data(name, price, duration_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.services srv 
  WHERE srv.shop_id = s.id AND srv.name = service_data.name
);