create or replace function public.aasa_snapshot_voter_eligibility_on_voting_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_eligible_count integer;
begin
  if new.status = 'voting' and old.status is distinct from 'voting' then
    insert into public.aasa_voter_eligibility (
      election_id, member_id, eligible, rule_snapshot, checked_at
    )
    select
      new.id,
      m.id,
      true,
      pg_catalog.jsonb_build_object(
        'basis', 'active_membership_at_voting_open',
        'membership_status', m.status,
        'snapshot_at', pg_catalog.now()
      ),
      pg_catalog.now()
    from public.aasa_members m
    where m.status = 'active'
    on conflict (election_id, member_id) do nothing;

    select count(*) into v_eligible_count
    from public.aasa_voter_eligibility
    where election_id = new.id and eligible = true;

    if v_eligible_count = 0 then
      raise exception 'Voting cannot open because no eligible members were found';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.aasa_snapshot_voter_eligibility_on_voting_open()
from public, anon, authenticated;

drop trigger if exists aasa_snapshot_voter_eligibility_on_voting_open
on public.aasa_elections;
create trigger aasa_snapshot_voter_eligibility_on_voting_open
after update of status on public.aasa_elections
for each row
execute function public.aasa_snapshot_voter_eligibility_on_voting_open();

create or replace function public.aasa_cast_secret_ballot(
  p_election_id uuid,
  p_position_id uuid,
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_member uuid;
begin
  if v_user is null or not public.aasa_has_permission('elections.vote') then
    raise exception 'Not authorised to vote';
  end if;

  select id into v_member
  from public.aasa_members
  where auth_user_id = v_user and status = 'active';

  if v_member is null then
    raise exception 'An active, verified membership account is required';
  end if;

  if not exists (
    select 1
    from public.aasa_voter_eligibility ve
    where ve.election_id = p_election_id
      and ve.member_id = v_member
      and ve.eligible = true
  ) then
    raise exception 'This member is not eligible to vote in this election';
  end if;

  if not exists (
    select 1 from public.aasa_elections e
    where e.id = p_election_id and e.status = 'voting'
      and pg_catalog.now() between e.opens_at and e.closes_at
  ) then
    raise exception 'Voting is not open for this election';
  end if;

  if not exists (
    select 1
    from public.aasa_election_candidates c
    join public.aasa_members m on m.id = c.member_id
    where c.id = p_candidate_id and c.election_id = p_election_id
      and c.position_id = p_position_id and c.status = 'approved'
      and m.status = 'active'
  ) then
    raise exception 'Candidate is not approved for this position and election';
  end if;

  insert into public.aasa_vote_receipts(election_id, voter_user_id, position_id)
  values (p_election_id, v_user, p_position_id);

  insert into public.aasa_secret_ballots(election_id, position_id, candidate_id)
  values (p_election_id, p_position_id, p_candidate_id);

  return pg_catalog.jsonb_build_object('status', 'recorded', 'message', 'Your ballot has been recorded.');
exception when unique_violation then
  raise exception 'A vote has already been recorded for this position in this election';
end;
$function$;

create or replace function public.aasa_get_open_elections()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_member_id uuid;
begin
  if auth.uid() is null or not public.aasa_has_permission('elections.vote') then
    raise exception 'Not authorised to access voting';
  end if;

  select m.id into v_member_id
  from public.aasa_members m
  where m.auth_user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_member_id is null then
    raise exception 'An active, verified membership account is required';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'election_id',e.id,'title',e.title,'opens_at',e.opens_at,'closes_at',e.closes_at,
        'position_id',p.id,'position_title',p.title,'candidate_id',c.id,
        'candidate_name',m.full_name,'member_number',m.member_number,'statement',c.statement,
        'has_voted',exists(
          select 1 from public.aasa_vote_receipts vr
          where vr.election_id=e.id and vr.position_id=p.id and vr.voter_user_id=auth.uid()
        )
      ) order by e.opens_at,p.title,m.full_name
    ),
    '[]'::jsonb
  )
  into v_result
  from public.aasa_elections e
  join public.aasa_voter_eligibility ve
    on ve.election_id=e.id and ve.member_id=v_member_id and ve.eligible=true
  join public.aasa_election_candidates c
    on c.election_id=e.id and c.status='approved'
  join public.aasa_positions p on p.id=c.position_id
  join public.aasa_members m on m.id=c.member_id and m.status='active'
  where e.status='voting'
    and pg_catalog.now() between e.opens_at and e.closes_at;

  return v_result;
end;
$function$;
