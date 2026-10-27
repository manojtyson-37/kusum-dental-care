-- Seed the 7 services shown on the marketing site (src/components/Services.jsx)
-- so the public catalog endpoint (GET /api/v1/services) returns real data.

insert into public.services (name, description, category, base_price, duration_minutes, complexity_level)
values
  ('Root Canal Treatment', 'Pain-free root canal procedures using advanced rotary systems to save your natural tooth.', 'GENERAL', 4500.00, 60, 'HIGH'),
  ('Dental Implants', 'Permanent, natural-looking tooth replacements with titanium implants for a confident smile.', 'SURGERY', 25000.00, 90, 'HIGH'),
  ('Cosmetic Dentistry', 'Teeth whitening, veneers, and smile makeovers to give you the radiant smile you deserve.', 'COSMETIC', 8000.00, 45, 'MEDIUM'),
  ('Dental Bridges', 'Customized fixed bridges to restore missing teeth and maintain your bite alignment.', 'GENERAL', 12000.00, 60, 'MEDIUM'),
  ('Braces & Aligners', 'Traditional braces and clear aligners for perfectly aligned teeth and a beautiful smile.', 'ORTHODONTICS', 35000.00, 45, 'MEDIUM'),
  ('Gum Surgery', 'Advanced periodontal treatments to treat gum disease and restore healthy gum tissue.', 'SURGERY', 15000.00, 60, 'HIGH'),
  ('Dentures', 'Full and partial dentures crafted for comfort and a natural appearance, restoring your smile.', 'GENERAL', 18000.00, 60, 'MEDIUM')
on conflict do nothing;
