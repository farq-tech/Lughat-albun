-- Seed: لغات البن / Coffee Languages — updated printed menu
-- Prices in halalas (SAR * 100). No product images.

insert into public.store_settings (
  name_ar, name_en, timezone, currency, tax_rate_bps, service_fee_minor,
  base_prep_minutes, car_pickup_enabled, temporary_pause, max_active_car_orders, phone
) values (
  'لغات البن',
  'Coffee Languages',
  'Asia/Riyadh',
  'SAR',
  1500,
  0,
  5,
  true,
  false,
  12,
  '0558442220'
);

insert into public.store_hours (day_of_week, is_closed, open_time, close_time) values
  (0, false, '00:00', '23:59'),
  (1, false, '00:00', '23:59'),
  (2, false, '00:00', '23:59'),
  (3, false, '00:00', '23:59'),
  (4, false, '00:00', '23:59'),
  (5, false, '00:00', '23:59'),
  (6, false, '00:00', '23:59');

insert into public.categories (id, slug, name_ar, name_en, sort_order) values
  ('a1111111-1111-4111-8111-111111111101', 'hot-coffee', 'القهوة الحارة', 'Hot Coffee', 1),
  ('a1111111-1111-4111-8111-111111111102', 'cold-coffee', 'القهوة الباردة', 'Cold Coffee', 2),
  ('a1111111-1111-4111-8111-111111111103', 'drip', 'قطرة', 'V60 / Chemex / Aeropress', 3),
  ('a1111111-1111-4111-8111-111111111104', 'milkshake', 'ميلك شيك', 'Milkshake', 4),
  ('a1111111-1111-4111-8111-111111111105', 'mojito', 'موهيتو', 'Mojito', 5),
  ('a1111111-1111-4111-8111-111111111106', 'warm-drinks', 'مشروبات ساخنة', 'Hot Drinks', 6),
  ('a1111111-1111-4111-8111-111111111107', 'sweets', 'حلويات', 'Sweets', 7),
  ('a1111111-1111-4111-8111-111111111108', 'iced-tea', 'آيس تي', 'Iced Tea', 8);

insert into public.products (
  id, category_id, slug, name_ar, name_en, description_ar, price_minor,
  image_path, is_active, is_available, is_featured, sort_order
) values
  -- Hot coffee
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111101', 'espresso', 'اسبريسو', 'Espresso', null, 900, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222202', 'a1111111-1111-4111-8111-111111111101', 'americano-hot', 'أمريكانو', 'Americano', null, 1100, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222208', 'a1111111-1111-4111-8111-111111111101', 'latte-hot', 'لاتيه', 'Latte', null, 1400, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111101', 'cappuccino', 'كابتشينو', 'Cappuccino', null, 1400, null, true, true, true, 4),
  ('b2222222-2222-4222-8222-222222222205', 'a1111111-1111-4111-8111-111111111101', 'flat-white', 'فلات وايت', 'Flat White', null, 1400, null, true, true, false, 5),
  ('b2222222-2222-4222-8222-222222222203', 'a1111111-1111-4111-8111-111111111101', 'cortado', 'كورتادو', 'Cortado', null, 1300, null, true, true, false, 6),
  ('b2222222-2222-4222-8222-222222222214', 'a1111111-1111-4111-8111-111111111101', 'piccolo', 'بيكولو', 'Piccolo', null, 1200, null, true, true, false, 7),
  ('b2222222-2222-4222-8222-222222222207', 'a1111111-1111-4111-8111-111111111101', 'mocha-hot', 'موكا', 'Mocha', null, 1500, null, true, true, false, 8),
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111101', 'spanish-latte-hot', 'سبانش لاتيه', 'Spanish Latte', null, 1600, null, true, true, true, 9),
  ('b2222222-2222-4222-8222-222222222215', 'a1111111-1111-4111-8111-111111111101', 'white-mocha-hot', 'وايت موكا', 'White Mocha', null, 1700, null, true, true, false, 10),
  ('b2222222-2222-4222-8222-222222222216', 'a1111111-1111-4111-8111-111111111101', 'toffee-nut-latte-hot', 'توفي نت لاتيه', 'Toffee Nut Latte', null, 1700, null, true, true, false, 11),
  ('b2222222-2222-4222-8222-222222222217', 'a1111111-1111-4111-8111-111111111101', 'caramel-macchiato-hot', 'كراميل ماكياتو', 'Caramel Macchiato', null, 1600, null, true, true, false, 12),
  ('b2222222-2222-4222-8222-222222222246', 'a1111111-1111-4111-8111-111111111101', 'turkish-coffee', 'قهوة تركية', 'Turkish Coffee', null, 1000, null, true, true, false, 13),
  ('b2222222-2222-4222-8222-222222222218', 'a1111111-1111-4111-8111-111111111101', 'french-coffee', 'قهوة فرنسية', 'French Coffee', null, 1300, null, true, true, false, 14),
  -- Cold coffee
  ('b2222222-2222-4222-8222-222222222221', 'a1111111-1111-4111-8111-111111111102', 'americano-cold', 'آيس أمريكانو', 'Iced Americano', null, 1300, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111102', 'latte-cold', 'آيس لاتيه', 'Iced Latte', null, 1600, null, true, true, true, 2),
  ('b2222222-2222-4222-8222-222222222223', 'a1111111-1111-4111-8111-111111111102', 'spanish-latte-cold', 'آيس سبانش لاتيه', 'Iced Spanish Latte', null, 1800, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222225', 'a1111111-1111-4111-8111-111111111102', 'pistachio-latte-cold', 'آيس بستاشيو لاتيه', 'Iced Pistachio Latte', null, 1900, null, true, true, true, 4),
  ('b2222222-2222-4222-8222-222222222226', 'a1111111-1111-4111-8111-111111111102', 'white-mocha-cold', 'آيس وايت موكا', 'Iced White Mocha', null, 1900, null, true, true, false, 5),
  ('b2222222-2222-4222-8222-222222222227', 'a1111111-1111-4111-8111-111111111102', 'toffee-nut-latte-cold', 'آيس توفي نت لاتيه', 'Iced Toffee Nut Latte', null, 1900, null, true, true, false, 6),
  ('b2222222-2222-4222-8222-222222222228', 'a1111111-1111-4111-8111-111111111102', 'caramel-macchiato-cold', 'آيس كراميل ماكياتو', 'Iced Caramel Macchiato', null, 1800, null, true, true, false, 7),
  ('b2222222-2222-4222-8222-222222222229', 'a1111111-1111-4111-8111-111111111102', 'cold-brew', 'كولد برو', 'Cold Brew', null, 1800, null, true, true, false, 8),
  -- Drip / filter origins
  ('b2222222-2222-4222-8222-222222222231', 'a1111111-1111-4111-8111-111111111103', 'ethiopia', 'أثيوبيا', 'Ethiopia', 'V60 / Chemex / Aeropress', 1800, null, true, true, true, 1),
  ('b2222222-2222-4222-8222-222222222232', 'a1111111-1111-4111-8111-111111111103', 'brazil', 'برازيل', 'Brazil', 'V60 / Chemex / Aeropress', 1600, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222233', 'a1111111-1111-4111-8111-111111111103', 'colombia', 'كولومبيا', 'Colombia', 'V60 / Chemex / Aeropress', 1700, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222234', 'a1111111-1111-4111-8111-111111111103', 'el-salvador', 'السلفادور', 'El Salvador', 'V60 / Chemex / Aeropress', 1800, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222235', 'a1111111-1111-4111-8111-111111111103', 'specialty-tea', 'شاي مختص', 'Speciality Tea', null, 800, null, true, true, false, 5),
  -- Milkshake
  ('b2222222-2222-4222-8222-222222222241', 'a1111111-1111-4111-8111-111111111104', 'milkshake-vanilla', 'فانيلا', 'Vanilla Milkshake', null, 1600, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222242', 'a1111111-1111-4111-8111-111111111104', 'milkshake-chocolate', 'شوكولاتة', 'Chocolate Milkshake', null, 1600, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222243', 'a1111111-1111-4111-8111-111111111104', 'milkshake-strawberry', 'فراولة', 'Strawberry Milkshake', null, 1600, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222244', 'a1111111-1111-4111-8111-111111111104', 'milkshake-oreo', 'أوريو', 'Oreo Milkshake', null, 1700, null, true, true, true, 4),
  ('b2222222-2222-4222-8222-222222222245', 'a1111111-1111-4111-8111-111111111104', 'milkshake-lotus', 'لوتس', 'Lotus Milkshake', null, 1800, null, true, true, false, 5),
  ('b2222222-2222-4222-8222-222222222247', 'a1111111-1111-4111-8111-111111111104', 'milkshake-pistachio', 'بستاشيو', 'Pistachio Milkshake', null, 1900, null, true, true, true, 6),
  -- Mojito
  ('b2222222-2222-4222-8222-222222222251', 'a1111111-1111-4111-8111-111111111105', 'mojito-blueberry', 'توت أزرق', 'Blueberry Mojito', null, 1500, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222252', 'a1111111-1111-4111-8111-111111111105', 'mojito-strawberry', 'فراولة', 'Strawberry Mojito', null, 1500, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222253', 'a1111111-1111-4111-8111-111111111105', 'mojito-mix-berries', 'مكس بيري', 'Mix Berries Mojito', null, 1600, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222254', 'a1111111-1111-4111-8111-111111111105', 'mojito-passion', 'باشن فروت', 'Passion Fruit Mojito', null, 1600, null, true, true, false, 4),
  -- Hot drinks (non-espresso)
  ('b2222222-2222-4222-8222-222222222261', 'a1111111-1111-4111-8111-111111111106', 'hot-chocolate', 'هوت شوكليت', 'Hot Chocolate', null, 1300, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222262', 'a1111111-1111-4111-8111-111111111106', 'sahlab', 'سحلب', 'Sahlab', null, 1200, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222263', 'a1111111-1111-4111-8111-111111111106', 'karak', 'شاي كرك', 'Karak Tea', null, 500, null, true, true, true, 3),
  ('b2222222-2222-4222-8222-222222222264', 'a1111111-1111-4111-8111-111111111106', 'green-tea', 'شاي أخضر', 'Green Tea', null, 400, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222265', 'a1111111-1111-4111-8111-111111111106', 'red-tea', 'شاي أحمر', 'Red Tea', null, 300, null, true, true, false, 5),

  -- Sweets
  ('b2222222-2222-4222-8222-222222222271', 'a1111111-1111-4111-8111-111111111107', 'san-sebastian', 'سان سيباستيان', 'San Sebastian', null, 1800, null, true, true, true, 1),
  ('b2222222-2222-4222-8222-222222222272', 'a1111111-1111-4111-8111-111111111107', 'honey-cake', 'كيكة العسل', 'Honey Cake', null, 1500, null, true, true, false, 2),
  ('b2222222-2222-4222-8222-222222222273', 'a1111111-1111-4111-8111-111111111107', 'saffron-cake', 'كيكة الزعفران', 'Saffron Cake', null, 1600, null, true, true, false, 3),
  ('b2222222-2222-4222-8222-222222222274', 'a1111111-1111-4111-8111-111111111107', 'tiramisu', 'تيراميسو', 'Tiramisu', null, 1700, null, true, true, false, 4),
  ('b2222222-2222-4222-8222-222222222275', 'a1111111-1111-4111-8111-111111111107', 'brownies', 'براوني', 'Brownies', null, 1000, null, true, true, false, 5),
  ('b2222222-2222-4222-8222-222222222276', 'a1111111-1111-4111-8111-111111111107', 'cookies', 'كوكيز', 'Cookies', null, 800, null, true, true, false, 6),
  ('b2222222-2222-4222-8222-222222222291', 'a1111111-1111-4111-8111-111111111107', 'crepe', 'كريب', 'Crepe', null, 1800, null, true, true, false, 7),
  ('b2222222-2222-4222-8222-222222222292', 'a1111111-1111-4111-8111-111111111107', 'waffle', 'وافل', 'Waffle', null, 1600, null, true, true, false, 8),
  ('b2222222-2222-4222-8222-222222222293', 'a1111111-1111-4111-8111-111111111107', 'pancake', 'بانكيك', 'Pancake', null, 1500, null, true, true, false, 9),
  -- Iced tea
  ('b2222222-2222-4222-8222-222222222281', 'a1111111-1111-4111-8111-111111111108', 'iced-tea-peach', 'خوخ', 'Peach Iced Tea', null, 1400, null, true, true, false, 1),
  ('b2222222-2222-4222-8222-222222222282', 'a1111111-1111-4111-8111-111111111108', 'iced-tea-lemon', 'ليمون', 'Lemon Iced Tea', null, 1400, null, true, true, false, 2);

-- Additions from printed menu (+ dual-price size choices)
insert into public.modifier_groups (id, slug, name_ar, name_en, required, min_selection, max_selection, sort_order) values
  ('c3333333-3333-4333-8333-333333333301', 'turkish-size', 'الحجم', 'Size', true, 1, 1, 1),
  ('c3333333-3333-4333-8333-333333333302', 'sweet-size', 'الحجم', 'Size', true, 1, 1, 2),
  ('c3333333-3333-4333-8333-333333333303', 'plant-milk', 'حليب نباتي', 'Plant Milk', false, 0, 1, 3),
  ('c3333333-3333-4333-8333-333333333304', 'extra-shot', 'زيادة شوت', 'Extra Shot', false, 0, 2, 4),
  ('c3333333-3333-4333-8333-333333333305', 'syrup', 'سيروب', 'Syrup', false, 0, 1, 5);

insert into public.modifier_options (id, group_id, slug, name_ar, name_en, price_delta_minor, sort_order) values
  ('d4444444-4444-4444-8444-444444444401', 'c3333333-3333-4333-8333-333333333301', 'turkish-10', 'عادي', 'Regular', 0, 1),
  ('d4444444-4444-4444-8444-444444444402', 'c3333333-3333-4333-8333-333333333301', 'turkish-12', 'كبير', 'Large', 200, 2),
  ('d4444444-4444-4444-8444-444444444403', 'c3333333-3333-4333-8333-333333333302', 'sweet-base', 'عادي', 'Regular', 0, 1),
  ('d4444444-4444-4444-8444-444444444404', 'c3333333-3333-4333-8333-333333333302', 'sweet-loaded', 'مع إضافات', 'With toppings', 400, 2),
  ('d4444444-4444-4444-8444-444444444405', 'c3333333-3333-4333-8333-333333333303', 'oat', 'شوفان', 'Oat', 500, 1),
  ('d4444444-4444-4444-8444-444444444406', 'c3333333-3333-4333-8333-333333333303', 'almond', 'لوز', 'Almond', 500, 2),
  ('d4444444-4444-4444-8444-444444444407', 'c3333333-3333-4333-8333-333333333303', 'soy', 'صويا', 'Soy', 500, 3),
  ('d4444444-4444-4444-8444-444444444408', 'c3333333-3333-4333-8333-333333333304', 'one-shot', 'شوت واحد', 'One Shot', 300, 1),
  ('d4444444-4444-4444-8444-444444444409', 'c3333333-3333-4333-8333-333333333305', 'add-syrup', 'إضافة سيروب', 'Add Syrup', 300, 1);

-- Coffee drink additions (optional)
insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, g.sort_order
from public.products p
cross join public.modifier_groups g
where p.slug in (
  'latte-hot','cappuccino','flat-white','mocha-hot','spanish-latte-hot',
  'white-mocha-hot','toffee-nut-latte-hot','caramel-macchiato-hot',
  'latte-cold','spanish-latte-cold','pistachio-latte-cold','white-mocha-cold',
  'toffee-nut-latte-cold','caramel-macchiato-cold','piccolo','cortado'
)
and g.slug in ('plant-milk','extra-shot','syrup');

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, 1
from public.products p
join public.modifier_groups g on g.slug = 'turkish-size'
where p.slug = 'turkish-coffee';

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, 1
from public.products p
join public.modifier_groups g on g.slug = 'sweet-size'
where p.slug in ('crepe','waffle','pancake');
