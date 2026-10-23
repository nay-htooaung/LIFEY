-- A new account starts with the theme picked on the sign-in screen (raw_user_meta_data.theme).
-- Anything that is not one of the app's themes falls back to the default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_locale text := coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en');
  v_theme text := coalesce(new.raw_user_meta_data ->> 'theme', '');
begin
  if v_locale not in ('en', 'ja') then v_locale := 'en'; end if;
  if v_theme not in ('midnight', 'light', 'milky') then v_theme := 'midnight'; end if;
  insert into public.profiles (id, display_name, locale, theme)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    v_locale,
    v_theme
  );
  insert into public.spaces (kind, name, tone, owner_id)
  values ('personal', case when v_locale = 'ja' then '自分' else 'Me' end, 'me', new.id)
  returning id into v_space;
  insert into public.space_members (space_id, user_id, role) values (v_space, new.id, 'owner');
  perform public.seed_categories(v_space, 'personal', v_locale);
  return new;
end;
$$;
