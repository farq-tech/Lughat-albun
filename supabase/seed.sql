-- Seed: لغة البن / Bean Languages — official approved menu (PDF)
-- Prices in halalas (SAR * 100). No product images in seed.

insert into public.store_settings (
  name_ar, name_en, timezone, currency, tax_rate_bps, service_fee_minor,
  base_prep_minutes, car_pickup_enabled, temporary_pause, max_active_car_orders, phone
) values (
  'لغة البن',
  'Lughat Albun Café',
  'Asia/Riyadh',
  'SAR',
  1500,
  0,
  5,
  true,
  false,
  12,
  '0500000000'
);

insert into public.store_hours (day_of_week, is_closed, open_time, close_time) values
  (0, false, '00:00', '23:59'),
  (1, false, '00:00', '23:59'),
  (2, false, '00:00', '23:59'),
  (3, false, '00:00', '23:59'),
  (4, false, '00:00', '23:59'),
  (5, false, '00:00', '23:59'),
  (6, false, '00:00', '23:59');

-- Categories (official PDF sections only)
insert into public.categories (id, slug, name_ar, name_en, sort_order) values
  ('a1111111-1111-4111-8111-111111111101', 'hot-drinks', 'المشروبات الساخنة', 'Hot Drinks', 1),
  ('a1111111-1111-4111-8111-111111111102', 'cold-drinks', 'المشروبات الباردة', 'Cold Drinks', 2),
  ('a1111111-1111-4111-8111-111111111103', 'drip-coffee', 'القهوة المقطرة', 'Drip Coffee', 3),
  ('a1111111-1111-4111-8111-111111111104', 'coffee-tea', 'قهوة وشاي', 'Coffee & Tea', 4),
  ('a1111111-1111-4111-8111-111111111105', 'mojito', 'موهيتو', 'Mojito', 5),
  ('a1111111-1111-4111-8111-111111111107', 'desserts', 'الحلى', 'Desserts', 6),
  ('a1111111-1111-4111-8111-111111111109', 'sandwiches', 'ساندويتش', 'Sandwiches', 7),
  ('a1111111-1111-4111-8111-111111111110', 'water', 'ماء', 'Water', 8);

-- Products (image_path null — text-first menu)
insert into public.products (
  id, category_id, slug, name_ar, name_en, description_ar, price_minor,
  image_path, is_active, is_available, is_featured, sort_order
) values
  -- Hot drinks
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111101', 'espresso', 'إسبرسو', 'Espresso', null, 900, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222202', 'a1111111-1111-4111-8111-111111111101', 'americano-hot', 'أمريكانو', 'Americano', null, 1200, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222203', 'a1111111-1111-4111-8111-111111111101', 'cortado', 'كورتادو', 'Cortado', null, 1300, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222205', 'a1111111-1111-4111-8111-111111111101', 'flat-white', 'فلات وايت', 'Flat White', null, 1400, null, true, true, true, 4),
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111101', 'cappuccino', 'كابتشينو', 'Cappuccino', null, 1400, null, true, true, true, 5),
  ('b2222222-2222-4222-8222-222222222207', 'a1111111-1111-4111-8111-111111111101', 'mocha', 'موكا', 'Mocha', null, 1400, null, true, true, false, 6),
  ('b2222222-2222-4222-8222-222222222208', 'a1111111-1111-4111-8111-111111111101', 'caffe-latte-hot', 'كافيه لاتيه', 'Caffe Latte', null, 1400, null, true, true, false, 7),
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111101', 'spanish-latte-hot', 'سبانش لاتيه', 'Spanish Latte', null, 1600, null, true, true, true, 8),
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111101', 'caramel-latte-hot', 'كراميل لاتيه', 'Caramel Latte', null, 1600, null, true, true, false, 9),
  ('b2222222-2222-4222-8222-222222222211', 'a1111111-1111-4111-8111-111111111101', 'pistachio-latte-hot', 'بستاشيو لاتيه', 'Pistachio Latte', null, 1800, null, true, true, true, 10),
  ('b2222222-2222-4222-8222-222222222212', 'a1111111-1111-4111-8111-111111111101', 'hot-chocolate', 'هوت شوكليت', 'Hot Chocolate', null, 2000, null, true, true, false, 11),
  -- Cold drinks
  ('b2222222-2222-4222-8222-222222222221', 'a1111111-1111-4111-8111-111111111102', 'americano-cold', 'أمريكانو', 'Americano', null, 1300, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111102', 'caffe-latte-cold', 'كافيه لاتيه', 'Caffe Latte', null, 1800, null, true, true, true, 2),
  ('b2222222-2222-4222-8222-222222222223', 'a1111111-1111-4111-8111-111111111102', 'spanish-latte-cold', 'سبانش لاتيه', 'Spanish Latte', null, 2000, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222224', 'a1111111-1111-4111-8111-111111111102', 'caramel-latte-cold', 'كراميل لاتيه', 'Caramel Latte', null, 2000, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222225', 'a1111111-1111-4111-8111-111111111102', 'pistachio-latte-cold', 'بستاشيو لاتيه', 'Pistachio Latte', null, 2200, null, true, true, true, 5),
  ('b2222222-2222-4222-8222-222222222226', 'a1111111-1111-4111-8111-111111111102', 'white-mocha', 'وايت موكا', 'White Mocha', null, 2000, null, true, true, false, 6),
  -- Drip coffee
  ('b2222222-2222-4222-8222-222222222231', 'a1111111-1111-4111-8111-111111111103', 'v60', 'V60', 'V60', null, 1400, null, true, true, true, 1),
  ('b2222222-2222-4222-8222-222222222232', 'a1111111-1111-4111-8111-111111111103', 'chemex', 'كيمكس', 'Chemex', null, 1400, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222233', 'a1111111-1111-4111-8111-111111111103', 'ice-drip', 'آيس دريب', 'Ice Drip', null, 1600, null, true, true, false, 3),
  -- Coffee & tea
  ('b2222222-2222-4222-8222-222222222241', 'a1111111-1111-4111-8111-111111111104', 'red-tea', 'كوب شاهي أحمر', 'Red Tea Cup', null, 1000, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222242', 'a1111111-1111-4111-8111-111111111104', 'green-tea', 'كوب شاهي أخضر', 'Green Tea Cup', null, 1000, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222244', 'a1111111-1111-4111-8111-111111111104', 'saudi-coffee', 'قهوة سعودية', 'Saudi Coffee', null, 1000, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222246', 'a1111111-1111-4111-8111-111111111104', 'turkish-coffee', 'قهوة تركية', 'Turkish Coffee', null, 1200, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222245', 'a1111111-1111-4111-8111-111111111104', 'cold-roselle', 'كركديه بارد', 'Cold Roselle', null, 1600, null, true, true, false, 5),
  -- Mojito (all 20 SR)
  ('b2222222-2222-4222-8222-222222222251', 'a1111111-1111-4111-8111-111111111105', 'mojito-passion', 'موهيتو باشن', 'Passion Mojito', null, 2000, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222252', 'a1111111-1111-4111-8111-111111111105', 'mojito-strawberry', 'موهيتو فراولة', 'Strawberry Mojito', null, 2000, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222253', 'a1111111-1111-4111-8111-111111111105', 'mojito-peach', 'موهيتو خوخ', 'Peach Mojito', null, 2000, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222255', 'a1111111-1111-4111-8111-111111111105', 'mojito-passion-blue', 'موهيتو باشن بلو', 'Passion Blue Mojito', null, 2000, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222256', 'a1111111-1111-4111-8111-111111111105', 'mojito-mix', 'موهيتو مكس', 'Mix Mojito', null, 2000, null, true, true, false, 5),
  ('b2222222-2222-4222-8222-222222222254', 'a1111111-1111-4111-8111-111111111105', 'mojito-signature', 'موهيتو سيجنتشر', 'Signature Mojito', null, 2000, null, true, true, true, 6),
  -- Desserts / Sweet
  ('b2222222-2222-4222-8222-222222222271', 'a1111111-1111-4111-8111-111111111107', 'brownie-cheesecake', 'براوني تشيز كيك', 'Brownie Cheesecake', null, 2200, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222272', 'a1111111-1111-4111-8111-111111111107', 'dates-cake', 'كعك التمر', 'Dates Cake', null, 2400, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222274', 'a1111111-1111-4111-8111-111111111107', 'red-velvet', 'كعك رد فلفت', 'Red Velvet Cake', null, 2200, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222278', 'a1111111-1111-4111-8111-111111111107', 'chocolate-coffee-cake', 'كعك القهوة بالشوكولاتة', 'Chocolate Coffee Cake', null, 2200, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222273', 'a1111111-1111-4111-8111-111111111107', 'molten-chocolate', 'مولتن الشوكولاتة', 'Molten Chocolate', null, 2400, null, true, true, true, 5),
  ('b2222222-2222-4222-8222-222222222279', 'a1111111-1111-4111-8111-111111111107', 'chocolate-cake', 'كعك الشوكولاتة', 'Chocolate Cake', null, 2200, null, true, true, false, 6),
  ('b2222222-2222-4222-8222-222222222280', 'a1111111-1111-4111-8111-111111111107', 'lemon-cake', 'كعك الليمون', 'Lemon Cake', null, 2200, null, true, true, false, 7),
  ('b2222222-2222-4222-8222-222222222277', 'a1111111-1111-4111-8111-111111111107', 'brownies', 'براونيز', 'Brownies', null, 1000, null, true, true, false, 8),
  ('b2222222-2222-4222-8222-222222222276', 'a1111111-1111-4111-8111-111111111107', 'cookies', 'كوكيز', 'Cookies', 'بستاشيو / شوكولاتة', 1000, null, true, true, false, 9),
  -- Sandwiches
  ('b2222222-2222-4222-8222-222222222291', 'a1111111-1111-4111-8111-111111111109', 'halloumi', 'حلومي', 'Halloumi', null, 1800, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222292', 'a1111111-1111-4111-8111-111111111109', 'club', 'كلوب', 'Club', null, 2000, null, true, true, true, 2),
  ('b2222222-2222-4222-8222-222222222293', 'a1111111-1111-4111-8111-111111111109', 'tuna', 'تونة', 'Tuna', null, 1800, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222294', 'a1111111-1111-4111-8111-111111111109', 'chicken', 'دجاج', 'Chicken', null, 2000, null, true, true, false, 4),
  -- Water
  ('b2222222-2222-4222-8222-222222222299', 'a1111111-1111-4111-8111-111111111110', 'mineral-water', 'مياه معدنية', 'Mineral Water', null, 100, null, true, true, false, 1);

-- Modifiers
insert into public.modifier_groups (id, slug, name_ar, name_en, required, min_selection, max_selection, sort_order) values
  ('c3333333-3333-4333-8333-333333333301', 'size', 'الحجم', 'Size', true, 1, 1, 1),
  ('c3333333-3333-4333-8333-333333333302', 'milk', 'الحليب', 'Milk', true, 1, 1, 2),
  ('c3333333-3333-4333-8333-333333333303', 'extra-shot', 'شوت إضافي', 'Extra Shot', false, 0, 2, 3);

insert into public.modifier_options (id, group_id, slug, name_ar, name_en, price_delta_minor, sort_order) values
  ('d4444444-4444-4444-8444-444444444401', 'c3333333-3333-4333-8333-333333333301', 'regular', 'عادي', 'Regular', 0, 1),
  ('d4444444-4444-4444-8444-444444444402', 'c3333333-3333-4333-8333-333333333301', 'large', 'كبير', 'Large', 300, 2),
  ('d4444444-4444-4444-8444-444444444403', 'c3333333-3333-4333-8333-333333333302', 'full-fat', 'حليب كامل', 'Full Fat', 0, 1),
  ('d4444444-4444-4444-8444-444444444404', 'c3333333-3333-4333-8333-333333333302', 'oat', 'شوفان', 'Oat Milk', 200, 2),
  ('d4444444-4444-4444-8444-444444444405', 'c3333333-3333-4333-8333-333333333302', 'almond', 'لوز', 'Almond', 200, 3),
  ('d4444444-4444-4444-8444-444444444406', 'c3333333-3333-4333-8333-333333333303', 'one-shot', 'شوت واحد', 'One Shot', 300, 1);

-- Attach size/milk to latte-style drinks
insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, g.sort_order
from public.products p
cross join public.modifier_groups g
where p.slug in (
  'caffe-latte-hot','spanish-latte-hot','caramel-latte-hot','pistachio-latte-hot',
  'caffe-latte-cold','spanish-latte-cold','caramel-latte-cold','pistachio-latte-cold',
  'cappuccino','flat-white','mocha','white-mocha'
)
and g.slug in ('size','milk','extra-shot');
