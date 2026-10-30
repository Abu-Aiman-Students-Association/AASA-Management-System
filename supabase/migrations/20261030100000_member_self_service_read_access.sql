create policy "members read own linked record"
on public.aasa_members
for select
to authenticated
using (auth_user_id = auth.uid());

create policy "members read own membership card"
on public.aasa_member_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.aasa_members m
    where m.id = aasa_member_cards.member_id
      and m.auth_user_id = auth.uid()
  )
);
