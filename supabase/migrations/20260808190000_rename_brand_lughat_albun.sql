-- Official brand name from logo: لغات البن / Bean Languages
update public.store_settings
set
  name_ar = 'لغات البن',
  name_en = 'Bean Languages',
  updated_at = now()
where name_ar is distinct from 'لغات البن'
   or name_en is distinct from 'Bean Languages';
