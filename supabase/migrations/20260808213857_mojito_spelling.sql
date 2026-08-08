-- Prefer موهيتو spelling for the Mojito category label.
update public.categories
set name_ar = 'موهيتو', updated_at = now()
where slug = 'mojito' and name_ar is distinct from 'موهيتو';
