-- Local-only bootstrap. Hosted Supabase already provides these roles/functions.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password 'local-only-password';
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole password 'local-only-password';
create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema public to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
alter function auth.uid() owner to supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
