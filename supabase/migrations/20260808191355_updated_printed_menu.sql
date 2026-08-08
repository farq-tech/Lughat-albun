-- Sync live catalog with updated printed menu (Coffee Languages / لغات البن).
-- Deactivate off-menu items; upsert categories/products by slug (preserve FKs).

-- Store contact + English name from printed board
update public.store_settings
set
  name_ar = 'لغات البن',
  name_en = 'Coffee Languages',
  phone = '0558442220',
  updated_at = now();

-- Clear product images (text-first menu)
update public.products set image_path = null;

-- Upsert menu categories (no fixed IDs — avoid PK clashes with existing rows)
insert into public.categories (slug, name_ar, name_en, sort_order, is_active)
values
  ('hot-coffee', 'القهوة الحارة', 'Hot Coffee', 1, true),
  ('cold-coffee', 'القهوة الباردة', 'Cold Coffee', 2, true),
  ('drip', 'قطرة', 'V60 / Chemex / Aeropress', 3, true),
  ('milkshake', 'ميلك شيك', 'Milkshake', 4, true),
  ('mojito', 'موجيتو', 'Mojito', 5, true),
  ('warm-drinks', 'مشروبات ساخنة', 'Hot Drinks', 6, true),
  ('sweets', 'حلويات', 'Sweets', 7, true),
  ('iced-tea', 'آيس تي', 'Iced Tea', 8, true)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Deactivate categories not on the printed menu
update public.categories
set is_active = false, updated_at = now()
where slug in (
  'hot-drinks', 'cold-drinks', 'drip-coffee', 'coffee-tea',
  'desserts', 'sandwiches', 'water', 'croissant', 'ice-tea'
);

-- Deactivate every product first; menu items are reactivated below
update public.products
set is_active = false, is_available = false, is_featured = false, updated_at = now();

-- Upsert products by slug into the new categories
with menu(slug, category_slug, name_ar, name_en, description_ar, price_minor, is_featured, sort_order) as (
  values
    -- Hot coffee
    ('espresso', 'hot-coffee', 'اسبريسو', 'Espresso', null::text, 900, false, 1),
    ('americano-hot', 'hot-coffee', 'أمريكانو', 'Americano', null, 1100, false, 2),
    ('latte-hot', 'hot-coffee', 'لاتيه', 'Latte', null, 1400, true, 3),
    ('cappuccino', 'hot-coffee', 'كابتشينو', 'Cappuccino', null, 1400, true, 4),
    ('flat-white', 'hot-coffee', 'فلات وايت', 'Flat White', null, 1400, false, 5),
    ('cortado', 'hot-coffee', 'كورتادو', 'Cortado', null, 1300, false, 6),
    ('piccolo', 'hot-coffee', 'بيكولو', 'Piccolo', null, 1200, false, 7),
    ('mocha-hot', 'hot-coffee', 'موكا', 'Mocha', null, 1500, false, 8),
    ('spanish-latte-hot', 'hot-coffee', 'سبانش لاتيه', 'Spanish Latte', null, 1600, true, 9),
    ('white-mocha-hot', 'hot-coffee', 'وايت موكا', 'White Mocha', null, 1700, false, 10),
    ('toffee-nut-latte-hot', 'hot-coffee', 'توفي نت لاتيه', 'Toffee Nut Latte', null, 1700, false, 11),
    ('caramel-macchiato-hot', 'hot-coffee', 'كراميل ماكياتو', 'Caramel Macchiato', null, 1600, false, 12),
    ('turkish-coffee', 'hot-coffee', 'قهوة تركية', 'Turkish Coffee', null, 1000, false, 13),
    ('french-coffee', 'hot-coffee', 'قهوة فرنسية', 'French Coffee', null, 1300, false, 14),
    -- Cold coffee
    ('americano-cold', 'cold-coffee', 'آيس أمريكانو', 'Iced Americano', null, 1300, false, 1),
    ('latte-cold', 'cold-coffee', 'آيس لاتيه', 'Iced Latte', null, 1600, true, 2),
    ('spanish-latte-cold', 'cold-coffee', 'آيس سبانش لاتيه', 'Iced Spanish Latte', null, 1800, true, 3),
    ('pistachio-latte-cold', 'cold-coffee', 'آيس بستاشيو لاتيه', 'Iced Pistachio Latte', null, 1900, true, 4),
    ('white-mocha-cold', 'cold-coffee', 'آيس وايت موكا', 'Iced White Mocha', null, 1900, false, 5),
    ('toffee-nut-latte-cold', 'cold-coffee', 'آيس توفي نت لاتيه', 'Iced Toffee Nut Latte', null, 1900, false, 6),
    ('caramel-macchiato-cold', 'cold-coffee', 'آيس كراميل ماكياتو', 'Iced Caramel Macchiato', null, 1800, false, 7),
    ('cold-brew', 'cold-coffee', 'كولد برو', 'Cold Brew', null, 1800, false, 8),
    -- Drip origins
    ('ethiopia', 'drip', 'أثيوبيا', 'Ethiopia', 'V60 / Chemex / Aeropress', 1800, true, 1),
    ('brazil', 'drip', 'برازيل', 'Brazil', 'V60 / Chemex / Aeropress', 1600, false, 2),
    ('colombia', 'drip', 'كولومبيا', 'Colombia', 'V60 / Chemex / Aeropress', 1700, false, 3),
    ('el-salvador', 'drip', 'السلفادور', 'El Salvador', 'V60 / Chemex / Aeropress', 1800, false, 4),
    ('specialty-tea', 'drip', 'شاي مختص', 'Speciality Tea', null, 800, false, 5),
    -- Milkshake
    ('milkshake-vanilla', 'milkshake', 'فانيلا', 'Vanilla Milkshake', null, 1600, false, 1),
    ('milkshake-chocolate', 'milkshake', 'شوكولاتة', 'Chocolate Milkshake', null, 1600, false, 2),
    ('milkshake-strawberry', 'milkshake', 'فراولة', 'Strawberry Milkshake', null, 1600, false, 3),
    ('milkshake-oreo', 'milkshake', 'أوريو', 'Oreo Milkshake', null, 1700, true, 4),
    ('milkshake-lotus', 'milkshake', 'لوتس', 'Lotus Milkshake', null, 1800, false, 5),
    ('milkshake-pistachio', 'milkshake', 'بستاشيو', 'Pistachio Milkshake', null, 1900, true, 6),
    -- Mojito
    ('mojito-blueberry', 'mojito', 'توت أزرق', 'Blueberry Mojito', null, 1500, false, 1),
    ('mojito-strawberry', 'mojito', 'فراولة', 'Strawberry Mojito', null, 1500, false, 2),
    ('mojito-mix-berries', 'mojito', 'مكس بيري', 'Mix Berries Mojito', null, 1600, true, 3),
    ('mojito-passion', 'mojito', 'باشن فروت', 'Passion Fruit Mojito', null, 1600, false, 4),
    -- Hot drinks
    ('hot-chocolate', 'warm-drinks', 'هوت شوكليت', 'Hot Chocolate', null, 1300, false, 1),
    ('sahlab', 'warm-drinks', 'سحلب', 'Sahlab', null, 1200, false, 2),
    ('karak', 'warm-drinks', 'شاي كرك', 'Karak Tea', null, 500, true, 3),
    ('green-tea', 'warm-drinks', 'شاي أخضر', 'Green Tea', null, 400, false, 4),
    ('red-tea', 'warm-drinks', 'شاي أحمر', 'Red Tea', null, 300, false, 5),
    -- Sweets
    ('san-sebastian', 'sweets', 'سان سيباستيان', 'San Sebastian', null, 1800, true, 1),
    ('honey-cake', 'sweets', 'كيكة العسل', 'Honey Cake', null, 1500, false, 2),
    ('saffron-cake', 'sweets', 'كيكة الزعفران', 'Saffron Cake', null, 1600, false, 3),
    ('tiramisu', 'sweets', 'تيراميسو', 'Tiramisu', null, 1700, false, 4),
    ('brownies', 'sweets', 'براوني', 'Brownies', null, 1000, false, 5),
    ('cookies', 'sweets', 'كوكيز', 'Cookies', null, 800, false, 6),
    ('crepe', 'sweets', 'كريب', 'Crepe', null, 1800, false, 7),
    ('waffle', 'sweets', 'وافل', 'Waffle', null, 1600, false, 8),
    ('pancake', 'sweets', 'بانكيك', 'Pancake', null, 1500, false, 9),
    -- Iced tea
    ('iced-tea-peach', 'iced-tea', 'خوخ', 'Peach Iced Tea', null, 1400, false, 1),
    ('iced-tea-lemon', 'iced-tea', 'ليمون', 'Lemon Iced Tea', null, 1400, false, 2)
)
update public.products p
set
  category_id = c.id,
  name_ar = m.name_ar,
  name_en = m.name_en,
  description_ar = m.description_ar,
  price_minor = m.price_minor,
  image_path = null,
  is_active = true,
  is_available = true,
  is_featured = m.is_featured,
  sort_order = m.sort_order,
  updated_at = now()
from menu m
join public.categories c on c.slug = m.category_slug
where p.slug = m.slug;

insert into public.products (
  category_id, slug, name_ar, name_en, description_ar, price_minor,
  image_path, is_active, is_available, is_featured, sort_order
)
select
  c.id, m.slug, m.name_ar, m.name_en, m.description_ar, m.price_minor,
  null, true, true, m.is_featured, m.sort_order
from (
  values
    ('espresso', 'hot-coffee', 'اسبريسو', 'Espresso', null::text, 900, false, 1),
    ('americano-hot', 'hot-coffee', 'أمريكانو', 'Americano', null, 1100, false, 2),
    ('latte-hot', 'hot-coffee', 'لاتيه', 'Latte', null, 1400, true, 3),
    ('cappuccino', 'hot-coffee', 'كابتشينو', 'Cappuccino', null, 1400, true, 4),
    ('flat-white', 'hot-coffee', 'فلات وايت', 'Flat White', null, 1400, false, 5),
    ('cortado', 'hot-coffee', 'كورتادو', 'Cortado', null, 1300, false, 6),
    ('piccolo', 'hot-coffee', 'بيكولو', 'Piccolo', null, 1200, false, 7),
    ('mocha-hot', 'hot-coffee', 'موكا', 'Mocha', null, 1500, false, 8),
    ('spanish-latte-hot', 'hot-coffee', 'سبانش لاتيه', 'Spanish Latte', null, 1600, true, 9),
    ('white-mocha-hot', 'hot-coffee', 'وايت موكا', 'White Mocha', null, 1700, false, 10),
    ('toffee-nut-latte-hot', 'hot-coffee', 'توفي نت لاتيه', 'Toffee Nut Latte', null, 1700, false, 11),
    ('caramel-macchiato-hot', 'hot-coffee', 'كراميل ماكياتو', 'Caramel Macchiato', null, 1600, false, 12),
    ('turkish-coffee', 'hot-coffee', 'قهوة تركية', 'Turkish Coffee', null, 1000, false, 13),
    ('french-coffee', 'hot-coffee', 'قهوة فرنسية', 'French Coffee', null, 1300, false, 14),
    ('americano-cold', 'cold-coffee', 'آيس أمريكانو', 'Iced Americano', null, 1300, false, 1),
    ('latte-cold', 'cold-coffee', 'آيس لاتيه', 'Iced Latte', null, 1600, true, 2),
    ('spanish-latte-cold', 'cold-coffee', 'آيس سبانش لاتيه', 'Iced Spanish Latte', null, 1800, true, 3),
    ('pistachio-latte-cold', 'cold-coffee', 'آيس بستاشيو لاتيه', 'Iced Pistachio Latte', null, 1900, true, 4),
    ('white-mocha-cold', 'cold-coffee', 'آيس وايت موكا', 'Iced White Mocha', null, 1900, false, 5),
    ('toffee-nut-latte-cold', 'cold-coffee', 'آيس توفي نت لاتيه', 'Iced Toffee Nut Latte', null, 1900, false, 6),
    ('caramel-macchiato-cold', 'cold-coffee', 'آيس كراميل ماكياتو', 'Iced Caramel Macchiato', null, 1800, false, 7),
    ('cold-brew', 'cold-coffee', 'كولد برو', 'Cold Brew', null, 1800, false, 8),
    ('ethiopia', 'drip', 'أثيوبيا', 'Ethiopia', 'V60 / Chemex / Aeropress', 1800, true, 1),
    ('brazil', 'drip', 'برازيل', 'Brazil', 'V60 / Chemex / Aeropress', 1600, false, 2),
    ('colombia', 'drip', 'كولومبيا', 'Colombia', 'V60 / Chemex / Aeropress', 1700, false, 3),
    ('el-salvador', 'drip', 'السلفادور', 'El Salvador', 'V60 / Chemex / Aeropress', 1800, false, 4),
    ('specialty-tea', 'drip', 'شاي مختص', 'Speciality Tea', null, 800, false, 5),
    ('milkshake-vanilla', 'milkshake', 'فانيلا', 'Vanilla Milkshake', null, 1600, false, 1),
    ('milkshake-chocolate', 'milkshake', 'شوكولاتة', 'Chocolate Milkshake', null, 1600, false, 2),
    ('milkshake-strawberry', 'milkshake', 'فراولة', 'Strawberry Milkshake', null, 1600, false, 3),
    ('milkshake-oreo', 'milkshake', 'أوريو', 'Oreo Milkshake', null, 1700, true, 4),
    ('milkshake-lotus', 'milkshake', 'لوتس', 'Lotus Milkshake', null, 1800, false, 5),
    ('milkshake-pistachio', 'milkshake', 'بستاشيو', 'Pistachio Milkshake', null, 1900, true, 6),
    ('mojito-blueberry', 'mojito', 'توت أزرق', 'Blueberry Mojito', null, 1500, false, 1),
    ('mojito-strawberry', 'mojito', 'فراولة', 'Strawberry Mojito', null, 1500, false, 2),
    ('mojito-mix-berries', 'mojito', 'مكس بيري', 'Mix Berries Mojito', null, 1600, true, 3),
    ('mojito-passion', 'mojito', 'باشن فروت', 'Passion Fruit Mojito', null, 1600, false, 4),
    ('hot-chocolate', 'warm-drinks', 'هوت شوكليت', 'Hot Chocolate', null, 1300, false, 1),
    ('sahlab', 'warm-drinks', 'سحلب', 'Sahlab', null, 1200, false, 2),
    ('karak', 'warm-drinks', 'شاي كرك', 'Karak Tea', null, 500, true, 3),
    ('green-tea', 'warm-drinks', 'شاي أخضر', 'Green Tea', null, 400, false, 4),
    ('red-tea', 'warm-drinks', 'شاي أحمر', 'Red Tea', null, 300, false, 5),
    ('san-sebastian', 'sweets', 'سان سيباستيان', 'San Sebastian', null, 1800, true, 1),
    ('honey-cake', 'sweets', 'كيكة العسل', 'Honey Cake', null, 1500, false, 2),
    ('saffron-cake', 'sweets', 'كيكة الزعفران', 'Saffron Cake', null, 1600, false, 3),
    ('tiramisu', 'sweets', 'تيراميسو', 'Tiramisu', null, 1700, false, 4),
    ('brownies', 'sweets', 'براوني', 'Brownies', null, 1000, false, 5),
    ('cookies', 'sweets', 'كوكيز', 'Cookies', null, 800, false, 6),
    ('crepe', 'sweets', 'كريب', 'Crepe', null, 1800, false, 7),
    ('waffle', 'sweets', 'وافل', 'Waffle', null, 1600, false, 8),
    ('pancake', 'sweets', 'بانكيك', 'Pancake', null, 1500, false, 9),
    ('iced-tea-peach', 'iced-tea', 'خوخ', 'Peach Iced Tea', null, 1400, false, 1),
    ('iced-tea-lemon', 'iced-tea', 'ليمون', 'Lemon Iced Tea', null, 1400, false, 2)
) as m(slug, category_slug, name_ar, name_en, description_ar, price_minor, is_featured, sort_order)
join public.categories c on c.slug = m.category_slug
where not exists (select 1 from public.products p where p.slug = m.slug);

-- Replace modifier model with printed-menu additions (no fixed IDs)
update public.modifier_groups
set is_active = false, updated_at = now()
where slug in ('size', 'milk');

update public.modifier_options o
set is_active = false, is_available = false, updated_at = now()
from public.modifier_groups g
where o.group_id = g.id and g.slug in ('size', 'milk');

insert into public.modifier_groups (slug, name_ar, name_en, required, min_selection, max_selection, sort_order, is_active)
values
  ('turkish-size', 'الحجم', 'Size', true, 1, 1, 1, true),
  ('sweet-size', 'الحجم', 'Size', true, 1, 1, 2, true),
  ('plant-milk', 'حليب نباتي', 'Plant Milk', false, 0, 1, 3, true),
  ('extra-shot', 'زيادة شوت', 'Extra Shot', false, 0, 2, 4, true),
  ('syrup', 'سيروب', 'Syrup', false, 0, 1, 5, true)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  required = excluded.required,
  min_selection = excluded.min_selection,
  max_selection = excluded.max_selection,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.modifier_options (group_id, slug, name_ar, name_en, price_delta_minor, sort_order, is_active, is_available)
select g.id, v.slug, v.name_ar, v.name_en, v.price_delta_minor, v.sort_order, true, true
from (
  values
    ('turkish-size', 'turkish-10', 'عادي', 'Regular', 0, 1),
    ('turkish-size', 'turkish-12', 'كبير', 'Large', 200, 2),
    ('sweet-size', 'sweet-base', 'عادي', 'Regular', 0, 1),
    ('sweet-size', 'sweet-loaded', 'مع إضافات', 'With toppings', 400, 2),
    ('plant-milk', 'oat', 'شوفان', 'Oat', 500, 1),
    ('plant-milk', 'almond', 'لوز', 'Almond', 500, 2),
    ('plant-milk', 'soy', 'صويا', 'Soy', 500, 3),
    ('extra-shot', 'one-shot', 'شوت واحد', 'One Shot', 300, 1),
    ('syrup', 'add-syrup', 'إضافة سيروب', 'Add Syrup', 300, 1)
) as v(group_slug, slug, name_ar, name_en, price_delta_minor, sort_order)
join public.modifier_groups g on g.slug = v.group_slug
on conflict (group_id, slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  price_delta_minor = excluded.price_delta_minor,
  sort_order = excluded.sort_order,
  is_active = true,
  is_available = true,
  updated_at = now();

-- Rebuild product ↔ modifier links for active menu items
delete from public.product_modifier_groups
where product_id in (select id from public.products where is_active = true);

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, g.sort_order
from public.products p
cross join public.modifier_groups g
where p.is_active
  and p.slug in (
    'latte-hot','cappuccino','flat-white','mocha-hot','spanish-latte-hot',
    'white-mocha-hot','toffee-nut-latte-hot','caramel-macchiato-hot',
    'latte-cold','spanish-latte-cold','pistachio-latte-cold','white-mocha-cold',
    'toffee-nut-latte-cold','caramel-macchiato-cold','piccolo','cortado'
  )
  and g.slug in ('plant-milk','extra-shot','syrup')
  and g.is_active;

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, 1
from public.products p
join public.modifier_groups g on g.slug = 'turkish-size' and g.is_active
where p.slug = 'turkish-coffee' and p.is_active;

insert into public.product_modifier_groups (product_id, modifier_group_id, sort_order)
select p.id, g.id, 1
from public.products p
join public.modifier_groups g on g.slug = 'sweet-size' and g.is_active
where p.slug in ('crepe','waffle','pancake') and p.is_active;
