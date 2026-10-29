create or replace function public.aasa_cast_secret_ballot(p_election_id uuid, p_position_id uuid, p_candidate_id uuid)
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
