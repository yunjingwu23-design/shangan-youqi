import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

process.loadEnvFile('.env.local');
if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname !== '127.0.0.1')
  throw new Error('Release installer tests require the isolated local stack');
const environment = { ...process.env };
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete environment[key];
function docker(args, input) {
  return spawnSync(
    'docker',
    ['--host=unix:///var/run/docker.sock', 'exec', '-i', 'syq-auth-local-db-1', ...args],
    { env: environment, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 60000 }
  );
}
function sql(database, input, allowedFailure = false) {
  assert.match(database, /^(postgres|syq_salary_release_[a-f0-9]+)$/);
  const r = docker(
    ['psql', '-U', 'postgres', '-d', database, '-qAt', '-v', 'ON_ERROR_STOP=1'],
    input
  );
  if (!allowedFailure) assert.equal(r.status, 0, r.stderr);
  return r;
}
test('production salary installer applies atomically to existing schema and refuses replay without data loss', () => {
  const database = 'syq_salary_release_' + randomBytes(5).toString('hex');
  sql('postgres', `create database ${database};`);
  try {
    // Schema only, no user data or credentials copied. Never modify the active app database.
    const dump = docker([
      'pg_dump',
      '-U',
      'postgres',
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      'postgres',
    ]);
    assert.equal(dump.status, 0, dump.stderr);
    sql(database, dump.stdout);
    sql(
      database,
      `drop table if exists public.salary_verifications,public.salary_moderation_logs,public.salary_complaints,public.salary_reports,public.personal_offers,public.salary_sources,public.salary_role_aliases,public.salary_companies cascade;
      do $$ declare f record; begin
      for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname like 'salary\\_%' escape '\\'
      loop execute format('drop function %I.%I(%s) cascade',f.nspname,f.proname,f.args); end loop; end $$;
      insert into auth.users(id,email) values('10000000-0000-4000-9000-000000000001','salary-release-local@example.com');
      insert into public.workspace_entries(user_id,kind,title) select user_id,'application','preserved local release fixture' from public.app_users where auth_user_id='10000000-0000-4000-9000-000000000001';`
    );
    const installer = readFileSync('supabase/install-salary.sql', 'utf8');
    const first = sql(database, installer);
    assert.match(first.stdout, /t\|t\|t\|t\|t\|t/);
    sql(database, "insert into public.salary_companies(name) values('preserved salary fixture');");
    const again = sql(database, installer, true);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /薪资结构已存在/);
    assert.equal(
      sql(
        database,
        "select count(*) from public.salary_companies where name='preserved salary fixture';"
      ).stdout.trim(),
      '1'
    );
    assert.equal(
      sql(
        database,
        "select count(*) from public.workspace_entries where title='preserved local release fixture';"
      ).stdout.trim(),
      '1'
    );
  } finally {
    sql('postgres', `drop database ${database} with(force);`);
  }
});

test('installer supports sites without optional AI tables and preserves custom cleanup and role checks', () => {
  const database = 'syq_salary_release_' + randomBytes(5).toString('hex');
  sql('postgres', `create database ${database};`);
  try {
    const dump = docker([
      'pg_dump',
      '-U',
      'postgres',
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      'postgres',
    ]);
    assert.equal(dump.status, 0, dump.stderr);
    sql(database, dump.stdout);
    sql(
      database,
      `drop table if exists public.salary_verifications,public.salary_moderation_logs,public.salary_complaints,public.salary_reports,public.personal_offers,public.salary_sources,public.salary_role_aliases,public.salary_companies cascade;
    do $$ declare f record; begin
      for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname like 'salary\\_%' escape '\\'
      loop execute format('drop function %I.%I(%s) cascade',f.nspname,f.proname,f.args);end loop;end $$;
    drop table public.interviews cascade;
    drop function private.require_admin(text[]);
    create table private.salary_cleanup_marker(user_id uuid);
    create or replace function public.delete_my_personal_data() returns void language plpgsql security definer set search_path='' as $$
    declare owner_id uuid:=private.current_user_id();
    begin
      if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
      delete from public.workspace_entries where user_id=owner_id;
      update public.profiles set bio='' where user_id=owner_id;
      insert into private.salary_cleanup_marker values(owner_id);
    end $$;
    insert into auth.users(id,email) values('10000000-0000-4000-9000-000000000002','salary-release-optional-local@example.com');
    insert into public.workspace_entries(user_id,kind,title) select user_id,'application','existing career record' from public.app_users where auth_user_id='10000000-0000-4000-9000-000000000002';
    update public.profiles set bio='preserved before cleanup';`
    );
    const installed = sql(database, readFileSync('supabase/install-salary.sql', 'utf8'));
    assert.match(installed.stdout, /t\|t\|t\|t\|t\|t/);
    assert.equal(
      sql(database, 'select count(*) from public.admin_memberships;').stdout.trim(),
      '0'
    );
    assert.equal(
      sql(database, "select to_regclass('public.interviews') is null;").stdout.trim(),
      't'
    );
    assert.equal(
      sql(
        database,
        "select not has_function_privilege('authenticated','private.salary_previous_personal_data()','execute');"
      ).stdout.trim(),
      't'
    );
    const denied = sql(
      database,
      `begin;set local role authenticated;
    select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-9000-000000000002"}',true);
    select public.salary_manage('company','{"name":"forbidden","url":""}'::jsonb);commit;`,
      true
    );
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /ADMIN_FORBIDDEN/);
    sql(
      database,
      `insert into public.personal_offers(user_id,company,role,city,cohort,education,data_year,basis,base_salary) select user_id,'local fixture','开发','上海',2027,'本科',2026,'monthly',20000 from public.app_users;
    begin;set local role authenticated;
    select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-9000-000000000002"}',true);
    select public.delete_my_personal_data();commit;`
    );
    assert.equal(sql(database, 'select count(*) from public.personal_offers;').stdout.trim(), '0');
    assert.equal(
      sql(database, 'select count(*) from public.workspace_entries;').stdout.trim(),
      '0'
    );
    assert.equal(
      sql(database, 'select count(*) from private.salary_cleanup_marker;').stdout.trim(),
      '1'
    );
  } finally {
    sql('postgres', `drop database ${database} with(force);`);
  }
});

test('missing required base tables are named and stop installation before changing user data', () => {
  const database = 'syq_salary_release_' + randomBytes(5).toString('hex');
  sql('postgres', `create database ${database};`);
  try {
    sql(
      database,
      `create table public.app_users(user_id uuid);insert into public.app_users values('10000000-0000-4000-9000-000000000003');`
    );
    const result = sql(database, readFileSync('supabase/install-salary.sql', 'utf8'), true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /public.profiles/);
    assert.match(result.stderr, /public.admin_memberships/);
    assert.equal(sql(database, 'select count(*) from public.app_users;').stdout.trim(), '1');
    assert.equal(
      sql(database, "select to_regclass('public.salary_reports') is null;").stdout.trim(),
      't'
    );
  } finally {
    sql('postgres', `drop database ${database} with(force);`);
  }
});
