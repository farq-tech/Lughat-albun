-- Align live menu with official Bean Languages PDF:
-- clear product images, deactivate off-menu items, upsert missing items.

-- Clear all product images (text-first menu)
update public.products set image_path = null;

-- Deactivate categories not on the official PDF
update public.categories
set is_active = false
where slug in ('ice-tea', 'croissant');

-- Re-order official categories
update public.categories set sort_order = 1 where slug = 'hot-drinks';
update public.categories set sort_order = 2 where slug = 'cold-drinks';
update public.categories set sort_order = 3 where slug = 'drip-coffee';
update public.categories set sort_order = 4 where slug = 'coffee-tea';
update public.categories set sort_order = 5 where slug = 'mojito';
update public.categories set sort_order = 6 where slug = 'desserts';
update public.categories set sort_order = 7 where slug = 'sandwiches';
update public.categories set sort_order = 8 where slug = 'water';

-- Deactivate products not on the official PDF
update public.products
set is_active = false, is_available = false, is_featured = false
where slug in (
  'macchiato',
  'karak',
  'ice-tea-mix',
  'ice-tea-peach',
  'tiramisu',
  'croissant-plain',
  'croissant-cheese',
  'croissant-berries'
);

-- Move Turkish coffee from hot drinks to Coffee & Tea (official section)
update public.products p
set
  category_id = c.id,
  name_ar = 'قهوة تركية',
  name_en = 'Turkish Coffee',
  price_minor = 1200,
  image_path = null,
  is_active = true,
  is_available = true,
  is_featured = false,
  sort_order = 4
from public.categories c
where p.slug = 'turkish-coffee'
  and c.slug = 'coffee-tea';

-- Refresh official product names / prices / availability
update public.products set name_ar = 'إسبرسو', name_en = 'Espresso', price_minor = 900, is_active = true, is_available = true, sort_order = 1 where slug = 'espresso';
update public.products set name_ar = 'أمريكانو', name_en = 'Americano', price_minor = 1200, is_active = true, is_available = true, sort_order = 2 where slug = 'americano-hot';
update public.products set name_ar = 'كورتادو', name_en = 'Cortado', price_minor = 1300, is_active = true, is_available = true, sort_order = 3 where slug = 'cortado';
update public.products set name_ar = 'فلات وايت', name_en = 'Flat White', price_minor = 1400, is_active = true, is_available = true, is_featured = true, sort_order = 4 where slug = 'flat-white';
update public.products set name_ar = 'كابتشينو', name_en = 'Cappuccino', price_minor = 1400, is_active = true, is_available = true, is_featured = true, sort_order = 5 where slug = 'cappuccino';
update public.products set name_ar = 'موكا', name_en = 'Mocha', price_minor = 1400, is_active = true, is_available = true, sort_order = 6 where slug = 'mocha';
update public.products set name_ar = 'كافيه لاتيه', name_en = 'Caffe Latte', price_minor = 1400, is_active = true, is_available = true, sort_order = 7 where slug = 'caffe-latte-hot';
update public.products set name_ar = 'سبانش لاتيه', name_en = 'Spanish Latte', price_minor = 1600, is_active = true, is_available = true, is_featured = true, sort_order = 8 where slug = 'spanish-latte-hot';
update public.products set name_ar = 'كراميل لاتيه', name_en = 'Caramel Latte', price_minor = 1600, is_active = true, is_available = true, sort_order = 9 where slug = 'caramel-latte-hot';
update public.products set name_ar = 'بستاشيو لاتيه', name_en = 'Pistachio Latte', price_minor = 1800, is_active = true, is_available = true, is_featured = true, sort_order = 10 where slug = 'pistachio-latte-hot';
update public.products set name_ar = 'هوت شوكليت', name_en = 'Hot Chocolate', price_minor = 2000, is_active = true, is_available = true, sort_order = 11 where slug = 'hot-chocolate';

update public.products set name_ar = 'أمريكانو', name_en = 'Americano', price_minor = 1300, is_active = true, is_available = true, sort_order = 1 where slug = 'americano-cold';
update public.products set name_ar = 'كافيه لاتيه', name_en = 'Caffe Latte', price_minor = 1800, is_active = true, is_available = true, is_featured = true, sort_order = 2 where slug = 'caffe-latte-cold';
update public.products set name_ar = 'سبانش لاتيه', name_en = 'Spanish Latte', price_minor = 2000, is_active = true, is_available = true, is_featured = true, sort_order = 3 where slug = 'spanish-latte-cold';
update public.products set name_ar = 'كراميل لاتيه', name_en = 'Caramel Latte', price_minor = 2000, is_active = true, is_available = true, sort_order = 4 where slug = 'caramel-latte-cold';
update public.products set name_ar = 'بستاشيو لاتيه', name_en = 'Pistachio Latte', price_minor = 2200, is_active = true, is_available = true, is_featured = true, sort_order = 5 where slug = 'pistachio-latte-cold';
update public.products set name_ar = 'وايت موكا', name_en = 'White Mocha', price_minor = 2000, is_active = true, is_available = true, sort_order = 6 where slug = 'white-mocha';

update public.products set name_ar = 'V60', name_en = 'V60', price_minor = 1400, is_active = true, is_available = true, is_featured = true, sort_order = 1 where slug = 'v60';
update public.products set name_ar = 'كيمكس', name_en = 'Chemex', price_minor = 1400, is_active = true, is_available = true, sort_order = 2 where slug = 'chemex';
update public.products set name_ar = 'آيس دريب', name_en = 'Ice Drip', price_minor = 1600, is_active = true, is_available = true, sort_order = 3 where slug = 'ice-drip';

update public.products set name_ar = 'كوب شاهي أحمر', name_en = 'Red Tea Cup', price_minor = 1000, is_active = true, is_available = true, sort_order = 1 where slug = 'red-tea';
update public.products set name_ar = 'كوب شاهي أخضر', name_en = 'Green Tea Cup', price_minor = 1000, is_active = true, is_available = true, sort_order = 2 where slug = 'green-tea';
update public.products set name_ar = 'قهوة سعودية', name_en = 'Saudi Coffee', price_minor = 1000, is_active = true, is_available = true, is_featured = true, sort_order = 3 where slug = 'saudi-coffee';
update public.products set name_ar = 'كركديه بارد', name_en = 'Cold Roselle', price_minor = 1600, is_active = true, is_available = true, sort_order = 5 where slug = 'cold-roselle';

update public.products set name_ar = 'موهيتو باشن', name_en = 'Passion Mojito', price_minor = 2000, is_active = true, is_available = true, sort_order = 1 where slug = 'mojito-passion';
update public.products set name_ar = 'موهيتو فراولة', name_en = 'Strawberry Mojito', price_minor = 2000, is_active = true, is_available = true, sort_order = 2 where slug = 'mojito-strawberry';
update public.products set name_ar = 'موهيتو خوخ', name_en = 'Peach Mojito', price_minor = 2000, is_active = true, is_available = true, sort_order = 3 where slug = 'mojito-peach';
update public.products set name_ar = 'موهيتو سيجنتشر', name_en = 'Signature Mojito', price_minor = 2000, is_active = true, is_available = true, is_featured = true, sort_order = 6 where slug = 'mojito-signature';

update public.products set name_ar = 'براوني تشيز كيك', name_en = 'Brownie Cheesecake', price_minor = 2200, is_active = true, is_available = true, sort_order = 1 where slug = 'brownie-cheesecake';
update public.products set name_ar = 'كعك التمر', name_en = 'Dates Cake', price_minor = 2400, is_active = true, is_available = true, sort_order = 2 where slug = 'dates-cake';
update public.products set name_ar = 'كعك رد فلفت', name_en = 'Red Velvet Cake', price_minor = 2200, is_active = true, is_available = true, sort_order = 3 where slug = 'red-velvet';
update public.products set name_ar = 'مولتن الشوكولاتة', name_en = 'Molten Chocolate', price_minor = 2400, is_active = true, is_available = true, is_featured = true, sort_order = 5 where slug = 'molten-chocolate';
update public.products set name_ar = 'براونيز', name_en = 'Brownies', price_minor = 1000, is_active = true, is_available = true, sort_order = 8 where slug = 'brownies';
update public.products set name_ar = 'كوكيز', name_en = 'Cookies', description_ar = 'بستاشيو / شوكولاتة', price_minor = 1000, is_active = true, is_available = true, sort_order = 9 where slug = 'cookies';

update public.products set name_ar = 'حلومي', name_en = 'Halloumi', price_minor = 1800, is_active = true, is_available = true, sort_order = 1 where slug = 'halloumi';
update public.products set name_ar = 'كلوب', name_en = 'Club', price_minor = 2000, is_active = true, is_available = true, is_featured = true, sort_order = 2 where slug = 'club';
update public.products set name_ar = 'تونة', name_en = 'Tuna', price_minor = 1800, is_active = true, is_available = true, sort_order = 3 where slug = 'tuna';
update public.products set name_ar = 'دجاج', name_en = 'Chicken', price_minor = 2000, is_active = true, is_available = true, sort_order = 4 where slug = 'chicken';
update public.products set name_ar = 'مياه معدنية', name_en = 'Mineral Water', price_minor = 100, is_active = true, is_available = true, sort_order = 1 where slug = 'mineral-water';

-- Insert missing official products
insert into public.products (
  id, category_id, slug, name_ar, name_en, description_ar, price_minor,
  image_path, is_active, is_available, is_featured, sort_order
)
select
  v.id, c.id, v.slug, v.name_ar, v.name_en, v.description_ar, v.price_minor,
  null, true, true, v.is_featured, v.sort_order
from (
  values
    ('b2222222-2222-4222-8222-222222222255'::uuid, 'mojito', 'mojito-passion-blue', 'موهيتو باشن بلو', 'Passion Blue Mojito', null::text, 2000, false, 4),
    ('b2222222-2222-4222-8222-222222222256'::uuid, 'mojito', 'mojito-mix', 'موهيتو مكس', 'Mix Mojito', null::text, 2000, false, 5),
    ('b2222222-2222-4222-8222-222222222278'::uuid, 'desserts', 'chocolate-coffee-cake', 'كعك القهوة بالشوكولاتة', 'Chocolate Coffee Cake', null::text, 2200, false, 4),
    ('b2222222-2222-4222-8222-222222222279'::uuid, 'desserts', 'chocolate-cake', 'كعك الشوكولاتة', 'Chocolate Cake', null::text, 2200, false, 6),
    ('b2222222-2222-4222-8222-222222222280'::uuid, 'desserts', 'lemon-cake', 'كعك الليمون', 'Lemon Cake', null::text, 2200, false, 7)
) as v(id, category_slug, slug, name_ar, name_en, description_ar, price_minor, is_featured, sort_order)
join public.categories c on c.slug = v.category_slug
where not exists (
  select 1 from public.products p where p.slug = v.slug
);
