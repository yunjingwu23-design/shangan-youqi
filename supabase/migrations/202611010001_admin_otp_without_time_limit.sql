-- Keep the historical helper name so existing admin RPCs use the new policy.
-- A verified OTP session is still required; its age adds no extra expiry.
-- Normal Auth session expiry, active roles and invitation expiry are unchanged.
create or replace function private.recent_admin_otp() returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->'amr','[]')) m
    where m->>'method'='otp')
  then raise exception 'ADMIN_REAUTH' using errcode='42501'; end if;
end $$;

comment on function private.recent_admin_otp() is 'Requires an OTP-authenticated session without an additional administrator OTP age limit. Historical name retained for existing RPC callers.';
revoke all on function private.recent_admin_otp() from public,anon,authenticated;
