-- A profile photo: the app shrinks it to a small square JPEG and stores it on the profile as a data URL, like a
-- character id. Whoever can read the profile (you and the people in your spaces) sees it, as they see the character.
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar is null
  or length(avatar) <= 16
  or (length(avatar) <= 120000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$')
);
