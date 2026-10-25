-- Privacy and integrity checks for the money schema.
-- Users: you (ja locale), sam (shares "Our Home" with you), eve (a stranger).
\set ON_ERROR_STOP 1
\set QUIET 1

create schema t;
create function t.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'TEST FAIL: %', msg; end if; end $$;
create function t.as_user(u text) returns void language sql as
$$ select set_config('request.jwt.claim.sub', current_setting('t.' || u), false) $$;
grant usage on schema t to authenticated;

select set_config('t.you', '00000000-0000-0000-0000-00000000000a', false),
       set_config('t.sam', '00000000-0000-0000-0000-00000000000b', false),
       set_config('t.eve', '00000000-0000-0000-0000-00000000000c', false);

-- sign-up needs a single-use invitation code
select set_config('t.inv1', public.create_signup_invite('you'), false),
       set_config('t.inv2', public.create_signup_invite('sam'), false),
       set_config('t.inv3', public.create_signup_invite('eve', 1), false),
       set_config('t.inv_old', public.create_signup_invite('expired'), false);
update public.signup_invites set expires_at = now() - interval '1 minute' where code = current_setting('t.inv_old');
select t.ok(current_setting('t.inv1') ~ '^INV-[0-9A-F]{5}-[0-9A-F]{5}$', 'invitation code format');

insert into auth.users (id, email, raw_user_meta_data) values
  (current_setting('t.you')::uuid, 'you@example.com',
   jsonb_build_object('locale', 'ja', 'theme', 'light', 'display_name', 'You', 'invite_code', current_setting('t.inv1'))),
  (current_setting('t.sam')::uuid, 'sam@example.com', jsonb_build_object('invite_code', lower(current_setting('t.inv2')))),
  (current_setting('t.eve')::uuid, 'eve@example.com', jsonb_build_object('theme', 'neon', 'invite_code', ' ' || current_setting('t.inv3') || ' '));

select t.ok((select count(*) from public.signup_invites where used_at is not null) = 3, 'codes are spent on sign-up');
select t.ok((select used_by from public.signup_invites where code = current_setting('t.inv2')) = current_setting('t.sam')::uuid,
            'code records who used it');
do $$ begin
  insert into auth.users (id, email) values (gen_random_uuid(), 'nocode@example.com');
  raise exception 'TEST FAIL: sign-up without a code';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'again@example.com', jsonb_build_object('invite_code', current_setting('t.inv1')));
  raise exception 'TEST FAIL: a code worked twice';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'late@example.com', jsonb_build_object('invite_code', current_setting('t.inv_old')));
  raise exception 'TEST FAIL: an expired code worked';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'guess@example.com', '{"invite_code":"INV-00000-00000"}');
  raise exception 'TEST FAIL: an unknown code worked';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.ok((select count(*) from auth.users) = 3, 'rejected sign-ups leave no user');

select t.ok((select count(*) from public.profiles) = 3, 'sign-up creates a profile');
select t.ok((select count(*) from public.spaces where kind = 'personal') = 3, 'sign-up creates a personal space');
select t.ok(exists (select 1 from public.categories c join public.spaces s on s.id = c.space_id
                          where s.owner_id = current_setting('t.you')::uuid and c.name = '食費'), 'categories seeded in Japanese');
select t.ok((select display_name from public.profiles where id = current_setting('t.sam')::uuid) = 'sam', 'display name falls back to email');
select t.ok((select theme from public.profiles where id = current_setting('t.you')::uuid) = 'light', 'sign-up keeps the theme picked');
select t.ok((select theme from public.profiles where id = current_setting('t.eve')::uuid) = 'midnight', 'an unknown sign-up theme falls back');

set role authenticated;

-- profile look: your own only, from the fixed themes
select t.as_user('you');
update public.profiles set theme = 'milky', avatar = '🐱' where id = auth.uid();
select t.ok((select theme = 'milky' and avatar = '🐱' from public.profiles where id = auth.uid()), 'you can set your theme and character');
update public.profiles set avatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==' where id = auth.uid();
select t.ok((select avatar like 'data:image/jpeg;base64,%' from public.profiles where id = auth.uid()), 'you can set a photo');
do $$ begin
  update public.profiles set avatar = 'data:text/html;base64,PHNjcmlwdD4=' where id = auth.uid();
  raise exception 'TEST FAIL: set something that is not an image as a photo';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.profiles set avatar = 'data:image/jpeg;base64,' || repeat('A', 130000) where id = auth.uid();
  raise exception 'TEST FAIL: set a photo that is too large';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
update public.profiles set avatar = '🐱' where id = auth.uid();
do $$ begin
  update public.profiles set theme = 'neon' where id = auth.uid();
  raise exception 'TEST FAIL: an unknown theme was saved';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

-- you: create a household and money in both spaces
select t.as_user('you');
select set_config('t.home', public.create_household('Our Home', 'a')::text, false);
select set_config('t.code', (select invite_code from public.spaces where id = current_setting('t.home')::uuid), false);
select set_config('t.my_space', (select id::text from public.spaces where kind = 'personal'), false);
select t.ok((select count(*) from public.spaces) = 2, 'you see your two spaces');

-- the cash source every personal space starts with
select set_config('t.cash', (select id::text from public.sources where fixed), false);
select t.ok((select name = '現金' and kind = 'cash' and space_id = current_setting('t.my_space')::uuid
             from public.sources where id = current_setting('t.cash')::uuid), 'sign-up adds a cash source in your language');
select t.ok((select count(*) from public.sources s join public.spaces sp on sp.id = s.space_id
             where s.fixed and sp.kind = 'household') = 0, 'a new space gets no cash source');
update public.sources set opening_balance = 5000 where id = current_setting('t.cash')::uuid;
select t.ok((select opening_balance from public.sources where id = current_setting('t.cash')::uuid) = 5000, 'cash balance can be edited');
do $$ begin
  update public.sources set name = 'Wallet' where id = current_setting('t.cash')::uuid;
  raise exception 'TEST FAIL: renamed the cash source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.sources set kind = 'bank' where id = current_setting('t.cash')::uuid;
  raise exception 'TEST FAIL: retyped the cash source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.sources set archived = true where id = current_setting('t.cash')::uuid;
  raise exception 'TEST FAIL: archived the cash source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  delete from public.sources where id = current_setting('t.cash')::uuid;
  raise exception 'TEST FAIL: deleted the cash source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.sources (space_id, name, kind, fixed) values (current_setting('t.home')::uuid, 'Cash', 'cash', true);
  raise exception 'TEST FAIL: a member added a fixed source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.sources (space_id, name, kind) values (current_setting('t.my_space')::uuid, 'Old', 'savings');
  raise exception 'TEST FAIL: added a savings source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
insert into public.sources (space_id, name, kind) values (current_setting('t.my_space')::uuid, 'Suica', 'emoney')
returning set_config('t.suica', id::text, false) \gset
do $$ begin
  update public.sources set fixed = true where id = current_setting('t.suica')::uuid;
  raise exception 'TEST FAIL: made a source fixed';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

insert into public.sources (space_id, name, kind, opening_balance)
values (current_setting('t.my_space')::uuid, 'Everyday', 'bank', 400000) returning set_config('t.chk', id::text, false) \gset
insert into public.payment_methods (space_id, name, kind, source_id, credit_limit, closing_day, payment_day)
values (current_setting('t.my_space')::uuid, 'Visa', 'credit', current_setting('t.chk')::uuid, 500000, 15, 26)
returning set_config('t.visa', id::text, false) \gset
insert into public.sources (space_id, name, kind) values (current_setting('t.home')::uuid, 'Joint', 'bank')
returning set_config('t.joint', id::text, false) \gset
insert into public.payment_methods (space_id, name, kind, source_id)
values (current_setting('t.home')::uuid, 'Joint debit', 'debit', current_setting('t.joint')::uuid)
returning set_config('t.jdeb', id::text, false) \gset

-- cards sharing one credit limit
insert into public.payment_methods (space_id, name, kind, source_id, credit_limit, closing_day, payment_day, limit_shared_with)
values (current_setting('t.my_space')::uuid, 'Visa family', 'credit', current_setting('t.chk')::uuid, 999, 15, 26, current_setting('t.visa')::uuid)
returning set_config('t.visa2', id::text, false) \gset
select t.ok((select credit_limit from public.payment_methods where id = current_setting('t.visa2')::uuid) is null, 'a sharing card has no limit of its own');
do $$ begin
  insert into public.payment_methods (space_id, name, kind, source_id, closing_day, payment_day, limit_shared_with)
  values (current_setting('t.my_space')::uuid, 'Chain', 'credit', current_setting('t.chk')::uuid, 15, 26, current_setting('t.visa2')::uuid);
  raise exception 'TEST FAIL: shared a limit through another sharing card';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.payment_methods set limit_shared_with = current_setting('t.visa2')::uuid where id = current_setting('t.visa')::uuid;
  raise exception 'TEST FAIL: a card others share with pointed elsewhere';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.payment_methods set kind = 'debit', closing_day = null, payment_day = null where id = current_setting('t.visa')::uuid;
  raise exception 'TEST FAIL: a shared card stopped being credit';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.payment_methods (space_id, name, kind, source_id, closing_day, payment_day, limit_shared_with)
  values (current_setting('t.home')::uuid, 'Cross', 'credit', current_setting('t.joint')::uuid, 15, 26, current_setting('t.visa')::uuid);
  raise exception 'TEST FAIL: shared a limit with a card in another space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  update public.payment_methods set limit_shared_with = current_setting('t.visa')::uuid where id = current_setting('t.jdeb')::uuid;
  raise exception 'TEST FAIL: a debit card shared a credit limit';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

-- a household entry paid with your personal card
insert into public.entries (space_id, kind, amount, method_id, note)
values (current_setting('t.home')::uuid, 'expense', 5400, current_setting('t.visa')::uuid, 'Pizza night')
returning set_config('t.pizza', id::text, false) \gset
-- a household entry paid by bank transfer from your personal account, with a name
insert into public.entries (space_id, kind, amount, source_id, name)
values (current_setting('t.home')::uuid, 'expense', 80000, current_setting('t.chk')::uuid, 'Rent')
returning set_config('t.rent', id::text, false) \gset
select t.ok((select method_id is null and name = 'Rent' from public.entries where id = current_setting('t.rent')::uuid), 'bank transfer keeps its source and name');
select t.ok((select sum(amount) from public.money_flows() where source_id = current_setting('t.chk')::uuid and kind = 'expense') = 80000,
            'your flows include the transfer');
do $$ begin
  insert into public.entries (space_id, kind, amount) values (current_setting('t.my_space')::uuid, 'expense', 1);
  raise exception 'TEST FAIL: expense with no way to pay';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
-- a transfer from your personal bank into the shared account, with a fee
insert into public.entries (space_id, kind, amount, fee, source_id, to_source_id, category_id, method_id)
values (current_setting('t.my_space')::uuid, 'transfer', 50000, 220, current_setting('t.chk')::uuid, current_setting('t.joint')::uuid,
        (select id from public.categories where space_id = current_setting('t.my_space')::uuid limit 1), current_setting('t.visa')::uuid)
returning set_config('t.move', id::text, false) \gset
select t.ok((select method_id is null and category_id is null from public.entries where id = current_setting('t.move')::uuid),
            'a transfer has no method or category');
select t.ok((select sum(amount) from public.money_flows() where source_id = current_setting('t.chk')::uuid and kind = 'expense') = 80000 + 50220,
            'a transfer takes amount and fee out of the source');
select t.ok((select sum(amount) from public.money_flows() where source_id = current_setting('t.joint')::uuid and kind = 'income') = 50000,
            'a transfer puts the amount into the target');
-- charging e-money with a credit card: a charge on the card, money into the e-money source
insert into public.entries (space_id, kind, amount, fee, method_id, to_source_id)
values (current_setting('t.my_space')::uuid, 'transfer', 3000, 50, current_setting('t.visa')::uuid, current_setting('t.suica')::uuid)
returning set_config('t.charge', id::text, false) \gset
select t.ok((select method_id = current_setting('t.visa')::uuid and source_id is null from public.entries where id = current_setting('t.charge')::uuid),
            'a card charge keeps its card');
select t.ok(exists (select 1 from public.money_flows() where method_id = current_setting('t.visa')::uuid and kind = 'expense' and amount = 3050),
            'a card charge puts amount and fee on the card');
select t.ok((select sum(amount) from public.money_flows() where source_id = current_setting('t.suica')::uuid and kind = 'income') = 3000,
            'a card charge puts the amount into the e-money');
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id, to_source_id)
  values (current_setting('t.my_space')::uuid, 'transfer', 1, current_setting('t.visa')::uuid, current_setting('t.chk')::uuid);
  raise exception 'TEST FAIL: a card charged a bank account';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id, to_source_id)
  values (current_setting('t.home')::uuid, 'transfer', 1, current_setting('t.jdeb')::uuid, current_setting('t.suica')::uuid);
  raise exception 'TEST FAIL: a debit card charged e-money';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.payment_methods (space_id, name, kind, source_id)
  values (current_setting('t.my_space')::uuid, 'PayPay', 'emoney', current_setting('t.chk')::uuid);
  raise exception 'TEST FAIL: added an e-money payment method';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.entries (space_id, kind, amount, source_id, to_source_id)
  values (current_setting('t.my_space')::uuid, 'transfer', 1, current_setting('t.chk')::uuid, current_setting('t.chk')::uuid);
  raise exception 'TEST FAIL: transfer to the same source';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.entries (space_id, kind, amount, fee, source_id) values (current_setting('t.my_space')::uuid, 'expense', 1, 5, current_setting('t.chk')::uuid);
  if (select fee from public.entries where kind = 'expense' and amount = 1 order by created_at desc limit 1) <> 0 then
    raise exception 'TEST FAIL: an expense kept a fee';
  end if;
  delete from public.entries where kind = 'expense' and amount = 1;
end $$;
-- a personal entry paid with the shared debit card
insert into public.entries (space_id, kind, amount, method_id, note)
values (current_setting('t.my_space')::uuid, 'expense', 1200, current_setting('t.jdeb')::uuid, 'Book for me');
-- repeating entries: one row per occurrence, duplicates ignored
insert into public.entries (space_id, kind, amount, method_id, note, repeat)
values (current_setting('t.my_space')::uuid, 'expense', 7700, current_setting('t.visa')::uuid, 'Gym', 'monthly')
returning set_config('t.gym', id::text, false) \gset
insert into public.entries (space_id, kind, amount, method_id, repeat_of, occurred_on)
values (current_setting('t.my_space')::uuid, 'expense', 7700, current_setting('t.visa')::uuid, current_setting('t.gym')::uuid, '2026-11-01')
on conflict (repeat_of, occurred_on) do nothing;
insert into public.entries (space_id, kind, amount, method_id, repeat_of, occurred_on)
values (current_setting('t.my_space')::uuid, 'expense', 7700, current_setting('t.visa')::uuid, current_setting('t.gym')::uuid, '2026-11-01')
on conflict (repeat_of, occurred_on) do nothing;
select t.ok((select count(*) from public.entries where repeat_of = current_setting('t.gym')::uuid) = 1, 'repeat occurrence posted once');
-- a payment method must live in the same space as its source
do $$ begin
  insert into public.payment_methods (space_id, name, kind, source_id)
  values (current_setting('t.home')::uuid, 'Bad', 'debit', current_setting('t.chk')::uuid);
  raise exception 'TEST FAIL: method linked to a source in another space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
-- categories must come from the entry's space
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id, category_id)
  values (current_setting('t.home')::uuid, 'expense', 100, current_setting('t.jdeb')::uuid,
          (select id from public.categories where space_id = current_setting('t.my_space')::uuid limit 1));
  raise exception 'TEST FAIL: entry used a category from another space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

-- sam joins and looks around
select t.as_user('sam');
select t.ok((select count(*) from public.spaces where id = current_setting('t.home')::uuid) = 0, 'sam cannot see the household before joining');
select public.join_household(lower(current_setting('t.code')));
select t.ok((select count(*) from public.spaces) = 2, 'sam sees personal + household after joining');
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 2, 'sam sees the household entries');
select t.ok((select count(*) from public.money_flows() where source_id = current_setting('t.chk')::uuid) = 0, 'flows hide transfers from your personal bank');
select t.ok((select sum(amount) from public.money_flows() where source_id = current_setting('t.joint')::uuid and kind = 'income') = 50000,
            'sam sees money arrive in the shared account');
select t.ok((select count(*) from public.entries where id = current_setting('t.move')::uuid) = 0, 'sam cannot see your personal transfer entry');
do $$ begin
  insert into public.entries (space_id, kind, amount, source_id, to_source_id)
  values (current_setting('t.home')::uuid, 'transfer', 1, current_setting('t.joint')::uuid, current_setting('t.chk')::uuid);
  raise exception 'TEST FAIL: sam moved money into your personal bank';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.ok((select created_by from public.entries where id = current_setting('t.pizza')::uuid) = current_setting('t.you')::uuid, 'sam sees who logged it');
select t.ok((select count(*) from public.entries where space_id = current_setting('t.my_space')::uuid) = 0, 'sam cannot see your personal entries');
select t.ok((select count(*) from public.payment_methods where id = current_setting('t.visa')::uuid) = 0, 'sam cannot see your personal card');
select t.ok((select count(*) from public.sources where id = current_setting('t.chk')::uuid) = 0, 'sam cannot see your personal bank');
select t.ok((select count(*) from public.money_flows() where method_id = current_setting('t.visa')::uuid) = 0, 'flows hide charges on your personal card');
select t.ok((select sum(amount) from public.money_flows() where method_id = current_setting('t.jdeb')::uuid) = 1200, 'flows show your personal charge on the shared card');
select t.ok((select count(*) from public.profiles) = 2, 'sam sees himself and you');
select t.ok((select count(*) from public.categories where space_id = current_setting('t.home')::uuid) = 6, 'sam sees household categories');

update public.entries set amount = 1 where id = current_setting('t.pizza')::uuid;
select t.ok((select amount from public.entries where id = current_setting('t.pizza')::uuid) = 5400, 'sam cannot edit your entry');
delete from public.entries where id = current_setting('t.pizza')::uuid;
select t.ok((select count(*) from public.entries where id = current_setting('t.pizza')::uuid) = 1, 'sam cannot delete your entry');

do $$ begin
  insert into public.entries (space_id, kind, amount, method_id)
  values (current_setting('t.home')::uuid, 'expense', 999, current_setting('t.visa')::uuid);
  raise exception 'TEST FAIL: sam paid with your personal card';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

insert into public.entries (space_id, kind, amount, method_id, created_by)
values (current_setting('t.home')::uuid, 'expense', 3200, current_setting('t.jdeb')::uuid, current_setting('t.you')::uuid)
returning set_config('t.thai', id::text, false) \gset
select t.ok((select created_by from public.entries where id = current_setting('t.thai')::uuid) = current_setting('t.sam')::uuid, 'logger cannot be spoofed');

do $$ begin
  perform public.seed_categories(current_setting('t.home')::uuid, 'household', 'en');
  raise exception 'TEST FAIL: internal seed_categories callable by users';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform 1 from public.signup_invites limit 1;
  raise exception 'TEST FAIL: users can read invitation codes';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.create_signup_invite();
  raise exception 'TEST FAIL: users can create invitation codes';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  set local role anon;
  perform public.create_signup_invite();
  raise exception 'TEST FAIL: anon can create invitation codes';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform 1 from public.entries limit 1;
  set local role anon;
  perform 1 from public.entries limit 1;
  raise exception 'TEST FAIL: anon can read entries';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
-- eve is a stranger
select t.as_user('eve');
select t.ok((select count(*) from public.spaces) = 1, 'eve sees only her own space');
select t.ok((select count(*) from public.entries) = 0, 'eve sees no entries');
select t.ok((select count(*) from public.profiles) = 1, 'eve sees only herself');
select t.ok((select count(*) from public.money_flows()) = 0, 'eve sees no flows');
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id)
  values (current_setting('t.home')::uuid, 'expense', 1, current_setting('t.jdeb')::uuid);
  raise exception 'TEST FAIL: eve wrote into a household she is not in';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.join_household('LFY-NOPE00');
  raise exception 'TEST FAIL: unknown invite code accepted';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.space_members (space_id, user_id) values (current_setting('t.home')::uuid, auth.uid());
  raise exception 'TEST FAIL: eve added herself without a code';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

-- members cannot take over a space or delete it
select t.as_user('sam');
do $$ begin
  update public.spaces set owner_id = auth.uid() where id = current_setting('t.home')::uuid;
  raise exception 'TEST FAIL: a member changed the owner';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.set_space_deleted(current_setting('t.home')::uuid, true);
  raise exception 'TEST FAIL: a member deleted the space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.remove_space_member(current_setting('t.home')::uuid, current_setting('t.you')::uuid);
  raise exception 'TEST FAIL: a member removed the owner';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
update public.spaces set name = 'Our Place' where id = current_setting('t.home')::uuid;
select t.ok((select name from public.spaces where id = current_setting('t.home')::uuid) = 'Our Place', 'members can rename a space');
update public.spaces set tone = 'c' where id = current_setting('t.home')::uuid;
select t.ok((select tone from public.spaces where id = current_setting('t.home')::uuid) = 'c', 'members can recolour a space');
update public.spaces set tone = 'b' where id = current_setting('t.my_space')::uuid;
select t.as_user('you');
select t.ok((select tone from public.spaces where id = current_setting('t.my_space')::uuid) = 'me', 'sam cannot recolour your personal space');
update public.spaces set tone = 'd' where id = current_setting('t.my_space')::uuid;
select t.ok((select tone from public.spaces where id = current_setting('t.my_space')::uuid) = 'd', 'you can recolour your personal space');
do $$ begin
  update public.spaces set tone = 'x' where id = current_setting('t.my_space')::uuid;
  raise exception 'TEST FAIL: an unknown colour was saved';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.as_user('sam');

-- sam leaves; nothing is deleted, and rejoining brings it all back
select public.leave_household(current_setting('t.home')::uuid);
select t.ok((select count(*) from public.spaces) = 1, 'sam no longer sees the space');
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 0, 'sam no longer sees its entries');
select t.as_user('you');
select t.ok((select count(*) from public.space_members where space_id = current_setting('t.home')::uuid and left_at is null) = 1, 'space keeps its other member');
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid and created_by = current_setting('t.sam')::uuid) = 1,
            'what sam logged stays');
select t.ok((select count(*) from public.profiles where id = current_setting('t.sam')::uuid) = 1, 'you still see the name of a member who left');
do $$ begin
  perform public.leave_household(current_setting('t.home')::uuid);
  raise exception 'TEST FAIL: the owner left instead of deleting';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.as_user('sam');
select public.join_household(current_setting('t.code'));
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 3, 'rejoining shows the entries again');

-- the owner removes sam; a new code keeps him out, the old one no longer works
select t.as_user('you');
select public.remove_space_member(current_setting('t.home')::uuid, current_setting('t.sam')::uuid);
select set_config('t.code2', public.reset_invite_code(current_setting('t.home')::uuid), false);
select t.as_user('sam');
select t.ok((select count(*) from public.spaces where id = current_setting('t.home')::uuid) = 0, 'a removed member loses the space');
do $$ begin
  perform public.join_household(current_setting('t.code'));
  raise exception 'TEST FAIL: the old invite code still works';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select public.join_household(current_setting('t.code2'));
select t.ok((select count(*) from public.spaces where id = current_setting('t.home')::uuid) = 1, 'invited again with the new code');

-- the owner deletes the space: hidden from everyone, nothing lost, the owner can restore it
select t.as_user('you');
select public.set_space_deleted(current_setting('t.home')::uuid, true);
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 0, 'a deleted space shows no entries');
select t.ok((select deleted_at is not null from public.spaces where id = current_setting('t.home')::uuid), 'the owner still sees the deleted space');
select t.as_user('sam');
select t.ok((select count(*) from public.spaces where id = current_setting('t.home')::uuid) = 0, 'members no longer see a deleted space');
do $$ begin
  perform public.join_household(current_setting('t.code2'));
  raise exception 'TEST FAIL: joined a deleted space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.set_space_deleted(current_setting('t.home')::uuid, false);
  raise exception 'TEST FAIL: a member restored the space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.as_user('you');
select public.set_space_deleted(current_setting('t.home')::uuid, false);
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 3, 'restoring brings every entry back');
select t.as_user('sam');
select t.ok((select count(*) from public.entries where space_id = current_setting('t.home')::uuid) = 3, 'members see it again after a restore');

select t.as_user('you');
update public.profiles set avatar = '🐶' where id = current_setting('t.sam')::uuid;
select t.as_user('sam');
select t.ok((select avatar is null from public.profiles where id = auth.uid()), 'you cannot change someone else''s character');

-- the assistant's use: counted per person per day with no limit, readable only by its owner, written only by ai_use()
select t.as_user('you');
select t.ok(public.ai_use() = 1, 'the first assistant request is counted');
select t.ok(public.ai_use() = 2, 'each request counts');
select t.ok((select requests from public.ai_usage where user_id = auth.uid()) = 2, 'you see your own usage');
do $$ begin
  update public.ai_usage set requests = 0;
  raise exception 'TEST FAIL: reset own usage';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.ai_usage (user_id, day, requests) values (auth.uid(), current_date + 1, 0);
  raise exception 'TEST FAIL: wrote usage directly';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.as_user('sam');
select t.ok((select count(*) from public.ai_usage) = 0, 'members do not see each other''s usage');
select t.ok(public.ai_use() = 1, 'each person is counted on their own');
reset role;
update public.ai_usage set requests = 150 where user_id = current_setting('t.you')::uuid;
set role authenticated;
select t.as_user('you');
select t.ok(public.ai_use() = 151, 'there is no daily limit');
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform public.ai_use();
  raise exception 'TEST FAIL: used the assistant signed out';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
reset role;
set role anon;
do $$ begin
  perform public.ai_use();
  raise exception 'TEST FAIL: anon used the assistant';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;


reset role;

-- 貯金: a pot belongs to its space; members see it and its moves, strangers do not, nobody deletes a pot
select t.as_user('you');
set role authenticated;
with x as (
  insert into public.pots (space_id, name, goal, monthly) values (current_setting('t.home')::uuid, '旅行', 300000, 20000) returning id
)
select set_config('t.pot', (select id::text from x), false);
insert into public.pot_moves (pot_id, space_id, amount, created_by)
  values (current_setting('t.pot')::uuid, current_setting('t.home')::uuid, 20000, current_setting('t.sam')::uuid);
select t.ok((select created_by from public.pot_moves where pot_id = current_setting('t.pot')::uuid) = current_setting('t.you')::uuid,
            'a move is always logged as its maker');
do $$ begin
  insert into public.pots (space_id, name)
    values ((select id from public.spaces where kind = 'personal' and owner_id = current_setting('t.sam')::uuid), 'Not yours');
  raise exception 'TEST FAIL: made a pot in someone else''s space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.pot_moves (pot_id, space_id, amount)
    values (current_setting('t.pot')::uuid, (select id from public.spaces where kind = 'personal' and owner_id = auth.uid()), 1000);
  raise exception 'TEST FAIL: logged a move under another space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.pot_moves (pot_id, space_id, amount) values (current_setting('t.pot')::uuid, current_setting('t.home')::uuid, 0);
  raise exception 'TEST FAIL: logged a move of 0';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  delete from public.pots where id = current_setting('t.pot')::uuid;
  raise exception 'TEST FAIL: deleted a pot';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
select t.ok((select count(*) from public.pots where id = current_setting('t.pot')::uuid) = 1, 'a pot cannot be deleted, only archived');

select t.as_user('sam');
select t.ok((select count(*) from public.pots where id = current_setting('t.pot')::uuid) = 1, 'members see a shared pot');
select t.ok((select sum(amount) from public.pot_moves where pot_id = current_setting('t.pot')::uuid) = 20000, 'members see its moves');
update public.pot_moves set amount = 1 where pot_id = current_setting('t.pot')::uuid;
delete from public.pot_moves where pot_id = current_setting('t.pot')::uuid;
select t.ok((select sum(amount) from public.pot_moves where pot_id = current_setting('t.pot')::uuid) = 20000, 'members cannot change or delete others'' moves');
insert into public.pot_moves (pot_id, space_id, amount) values (current_setting('t.pot')::uuid, current_setting('t.home')::uuid, -5000);
update public.pots set archived = true where id = current_setting('t.pot')::uuid;
select t.ok((select archived from public.pots where id = current_setting('t.pot')::uuid), 'members can archive a shared pot');

select t.as_user('eve');
select t.ok((select count(*) from public.pots where id = current_setting('t.pot')::uuid) = 0, 'strangers do not see a pot');
select t.ok((select count(*) from public.pot_moves where pot_id = current_setting('t.pot')::uuid) = 0, 'strangers do not see its moves');
do $$ begin
  insert into public.pot_moves (pot_id, space_id, amount) values (current_setting('t.pot')::uuid, current_setting('t.home')::uuid, 100);
  raise exception 'TEST FAIL: a stranger put money in a pot';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
-- a personal card shared into a space: members pay with it there, but never see or change the card
select t.as_user('eve');
select set_config('t.eve_home', public.create_household('Eve Home', 'b')::text, false);
select t.as_user('you');
insert into public.method_shares (method_id, space_id) values (current_setting('t.visa')::uuid, current_setting('t.home')::uuid);
do $$ begin
  insert into public.method_shares (method_id, space_id) values (current_setting('t.jdeb')::uuid, current_setting('t.home')::uuid);
  raise exception 'TEST FAIL: shared a method that is not personal';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.method_shares (method_id, space_id) values (current_setting('t.visa')::uuid, current_setting('t.eve_home')::uuid);
  raise exception 'TEST FAIL: shared a card into a space you are not in';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.method_shares (method_id, space_id) values (current_setting('t.visa')::uuid, current_setting('t.my_space')::uuid);
  raise exception 'TEST FAIL: shared a card into a personal space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;

select t.as_user('sam');
select set_config('t.sam_space', (select id::text from public.spaces where kind = 'personal' and owner_id = auth.uid()), false);
select t.ok((select count(*) from public.payment_methods where id = current_setting('t.visa')::uuid) = 0, 'a shared card stays unreadable to members');
select t.ok((select count(*) from public.method_shares where space_id = current_setting('t.home')::uuid) = 1, 'members see that a card is shared into their space');
select t.ok((select count(*) from public.shared_methods() where method_id = current_setting('t.visa')::uuid and space_id = current_setting('t.home')::uuid
             and name = 'Visa' and kind = 'credit' and owner_id = current_setting('t.you')::uuid and active) = 1,
            'members learn only the shared card''s name, kind and owner');
insert into public.entries (space_id, kind, amount, method_id, name)
values (current_setting('t.home')::uuid, 'expense', 2800, current_setting('t.visa')::uuid, 'Groceries')
returning set_config('t.sam_visa', id::text, false) \gset
select t.ok((select count(*) from public.money_flows() where method_id = current_setting('t.visa')::uuid) = 0, 'members do not see the shared card''s charges as flows');
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id)
  values (current_setting('t.sam_space')::uuid, 'expense', 100, current_setting('t.visa')::uuid);
  raise exception 'TEST FAIL: paid with a shared card outside its space';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id, to_source_id)
  values (current_setting('t.home')::uuid, 'transfer', 100, current_setting('t.visa')::uuid, current_setting('t.suica')::uuid);
  raise exception 'TEST FAIL: charged e-money with a shared card';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  insert into public.method_shares (method_id, space_id) values (current_setting('t.visa')::uuid, current_setting('t.sam_space')::uuid);
  raise exception 'TEST FAIL: a member shared someone else''s card';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
update public.method_shares set stopped_at = now();
update public.payment_methods set name = 'Mine' where id = current_setting('t.visa')::uuid;

select t.as_user('you');
select t.ok((select stopped_at is null from public.method_shares where method_id = current_setting('t.visa')::uuid), 'members cannot stop a share');
select t.ok((select name from public.payment_methods where id = current_setting('t.visa')::uuid) = 'Visa', 'members cannot change a shared card');
select t.ok(exists (select 1 from public.money_flows() where method_id = current_setting('t.visa')::uuid and amount = 2800),
            'a member''s charge goes on the owner''s card');
update public.method_shares set stopped_at = now() where method_id = current_setting('t.visa')::uuid;

select t.as_user('sam');
do $$ begin
  insert into public.entries (space_id, kind, amount, method_id)
  values (current_setting('t.home')::uuid, 'expense', 100, current_setting('t.visa')::uuid);
  raise exception 'TEST FAIL: paid with a card after its share stopped';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
update public.entries set name = 'Groceries (week 4)' where id = current_setting('t.sam_visa')::uuid;
select t.ok((select name from public.entries where id = current_setting('t.sam_visa')::uuid) = 'Groceries (week 4)',
            'an entry paid with the card can still be edited after the share stops');
select t.ok((select not active from public.shared_methods() where method_id = current_setting('t.visa')::uuid), 'a stopped share still names the card');

select t.as_user('eve');
select t.ok((select count(*) from public.shared_methods()) = 0, 'strangers learn nothing about shared cards');
select t.ok((select count(*) from public.method_shares) = 0, 'strangers do not see shares');

select t.as_user('you');
update public.method_shares set stopped_at = null where method_id = current_setting('t.visa')::uuid;
select t.ok((select stopped_at is null from public.method_shares where method_id = current_setting('t.visa')::uuid), 'a card can be shared again');
reset role;
set role anon;
do $$ begin
  perform 1 from public.pots;
  raise exception 'TEST FAIL: anon read pots';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
do $$ begin
  perform 1 from public.shared_methods();
  raise exception 'TEST FAIL: anon read shared cards';
exception when others then if sqlerrm like 'TEST FAIL%' then raise; end if; end $$;
reset role;
\echo 'privacy tests passed'
