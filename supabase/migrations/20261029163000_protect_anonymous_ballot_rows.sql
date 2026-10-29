drop policy if exists aasa_secret_ballots_read_permission on public.aasa_secret_ballots;
revoke select on table public.aasa_secret_ballots from anon, authenticated;
comment on table public.aasa_secret_ballots is 'Anonymous individual ballot records. Direct client reads are prohibited; authorised closed-election results are exposed only as aggregate counts through a permission-checked RPC.';
