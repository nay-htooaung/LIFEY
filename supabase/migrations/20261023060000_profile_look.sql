-- Personal look, saved on the profile so it follows the person across devices.
--   avatar: a character from the app's fixed list (null = the initial of the name)
--   theme:  one of the app's fixed colour themes
alter table public.profiles
  add column avatar text check (length(avatar) <= 16),
  add column theme text not null default 'midnight' check (theme in ('midnight', 'light', 'milky'));
