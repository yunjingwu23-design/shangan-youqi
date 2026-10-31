import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Dedicated, disposable databases inside the explicit local Docker socket.
// Never resets or modifies the application's running database or a hosted project.
const environment = { ...process.env };
for (const name of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete environment[name];
const installer = readFileSync('supabase/install-admin.sql', 'utf8');
const account = readFileSync('supabase/migrations/202610300001_auth_and_workspace.sql', 'utf8');
const catalog = readFileSync('supabase/migrations/202610310003_public_catalog.sql', 'utf8');
const workflow = readFileSync('supabase/migrations/202610310005_admin_workflow.sql', 'utf8');
const owner = '10000000-0000-4000-8000-000000000001';
const editor = '10000000-0000-4000-8000-000000000002';
const ordinary = '10000000-0000-4000-8000-000000000003';
const system = `
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
grant usage on schema public,auth to anon,authenticated,service_role;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
alter table storage.objects enable row level security;
`;
function run(database, sql, allowedFailure = false) {
  assert.match(database, /^(postgres|syq_admin_install_[a-f0-9]+)$/);
  const result = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'exec',
      '-i',
      'syq-auth-local-db-1',
      'psql',
      '-U',
      'postgres',
      '-d',
      database,
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { env: environment, input: sql, encoding: 'utf8', timeout: 30000 }
  );
  if (!allowedFailure) assert.equal(result.status, 0, result.stderr);
  return result;
}
function value(database, sql) {
  return run(database, sql).stdout.trim();
}
function baseline(database) {
  run(
    database,
    system +
      account +
      `
    insert into auth.users values('${owner}','876901712@qq.com',now()),('${editor}','legacy-editor@example.com',now()),('${ordinary}','ordinary@example.com',now());
    insert into public.workspace_entries(user_id,kind,title,content)
      select user_id,'resume','原有简历不可丢失','原有求职者的简历正文' from public.app_users where auth_user_id='${ordinary}';
  `
  );
}
function snapshot(database) {
  return value(
    database,
    `select jsonb_build_object(
    'users',(select jsonb_agg(to_jsonb(t) order by user_id) from public.app_users t),
    'profiles',(select jsonb_agg(to_jsonb(t) order by user_id) from public.profiles t),
    'entries',(select jsonb_agg(to_jsonb(t) order by id) from public.workspace_entries t),
    'jobs',(select jsonb_agg(to_jsonb(t) order by id) from public.job_catalog t),
    'sources',(select jsonb_agg(to_jsonb(t) order by id) from public.job_sources t),
    'meta',(select jsonb_agg(to_jsonb(t) order by job_id) from public.job_admin_meta t),
    'members',(select jsonb_agg(to_jsonb(t) order by user_id) from public.admin_memberships t),
    'reviews',(select jsonb_agg(to_jsonb(t) order by id) from public.job_reviews t),
    'audit',(select jsonb_agg(to_jsonb(t) order by id) from public.admin_audit_logs t),
    'guard',(select to_jsonb(t) from private.admin_bootstrap_guard t));`
  );
}
test('owner SQL installer recovers missing and partial catalog dependencies without resetting data', async (t) => {
  const databases = [];
  t.after(() => {
    for (const database of databases) run('postgres', `drop database ${database};`);
  });
  function fresh(withAccounts = true) {
    const database = 'syq_admin_install_' + randomBytes(8).toString('hex');
    run('postgres', `create database ${database} template template0;`);
    databases.push(database);
    if (withAccounts) baseline(database);
    return database;
  }
  await t.test(
    'account-only database installs the entire catalog and verified owner, and repeated installation preserves published jobs and approvals',
    () => {
      const db = fresh();
      const mapping = value(
        db,
        'select jsonb_agg(to_jsonb(t) order by user_id) from public.app_users t;'
      );
      run(db, installer);
      assert.equal(
        value(db, 'select jsonb_agg(to_jsonb(t) order by user_id) from public.app_users t;'),
        mapping
      );
      const payload = {
        company: '安装修复验收公司',
        title: '产品实习生',
        type: 'daily_internship',
        city: '北京',
        industry: '',
        cohort: '',
        responsibilities: '梳理产品需求',
        requirements: '在校生',
        source_url: 'https://example.com/authorized-jd',
        apply_url: '',
        contacts: [{ email: 'recruit@example.com', label: '本岗位邮箱' }],
        mail_subject: '姓名-岗位',
        aliases: [],
        retention_evidence: '',
        application_instructions: '请附可到岗日期',
        raw_jd: '授权的招聘原文：北京产品实习生，梳理产品需求，要求在校生。',
        deadline_at: null,
        source_published_at: null,
        source_file_id: null,
      };
      run(
        db,
        `begin; set local role authenticated; set local request.jwt.claims='${JSON.stringify({ sub: owner, role: 'authenticated' })}';
      do $flow$ declare saved jsonb; position_id uuid; begin
        saved:=public.admin_save_job(null,null,'${JSON.stringify(payload).replaceAll("'", "''")}'::jsonb); position_id:=(saved->>'id')::uuid;
        perform public.admin_transition_job(position_id,1,'submit');
        perform public.admin_transition_job(position_id,2,'approve','项目所有者已核对真实原文及投递方式。',true);
        perform public.admin_transition_job(position_id,3,'publish');
      end $flow$; commit;
      insert into public.site_managers(user_id) select user_id from public.app_users where auth_user_id='${ordinary}';`
      );
      const before = snapshot(db);
      run(db, installer);
      assert.equal(snapshot(db), before);
      assert.equal(
        value(
          db,
          `select count(*) from public.admin_memberships m join public.app_users a using(user_id) where a.auth_user_id='${ordinary}';`
        ),
        '0',
        're-running must not grant new roles from obsolete flags'
      );
      assert.equal(
        value(db, "select count(*) from public.job_catalog where state='published';"),
        '1'
      );
      assert.equal(
        value(
          db,
          "select has_function_privilege('anon','public.bootstrap_site_admin(text)','execute') or has_function_privilege('authenticated','public.bootstrap_site_admin(text)','execute');"
        ),
        'f'
      );
      assert.equal(
        value(
          db,
          "select bool_and(relrowsecurity) from pg_class where oid in ('public.admin_memberships'::regclass,'public.job_catalog'::regclass,'public.job_sources'::regclass);"
        ),
        't'
      );
    }
  );
  await t.test(
    'an existing catalog and its legacy editors survive the combined installation',
    () => {
      const db = fresh();
      run(db, catalog);
      run(
        db,
        `insert into public.site_managers(user_id) select user_id from public.app_users where auth_user_id='${editor}';
      insert into public.job_catalog(company,title,type,city,responsibilities,requirements,source_url,state,verified_at,published_at)
      values('原有招聘公司','原有岗位','daily_internship','北京','原有职责','原有要求','https://example.com/original','published',now(),now());`
      );
      const original = value(
        db,
        'select jsonb_agg(to_jsonb(t) order by id) from public.job_catalog t;'
      );
      run(db, installer);
      const kept = value(
        db,
        "select jsonb_agg(to_jsonb(t)-'application_instructions'-'deadline_at' order by id) from public.job_catalog t;"
      );
      assert.deepEqual(JSON.parse(kept), JSON.parse(original));
      assert.equal(
        value(
          db,
          `select role from public.admin_memberships m join public.app_users a using(user_id) where a.auth_user_id='${editor}';`
        ),
        'editor'
      );
      assert.equal(value(db, "select count(*) from public.job_sources where kind='legacy';"), '1');
    }
  );
  await t.test('an existing job table with a missing site_managers table is repaired', () => {
    const db = fresh();
    run(db, catalog);
    run(db, 'drop table public.site_managers cascade;');
    run(db, installer);
    assert.equal(
      value(
        db,
        "select to_regclass('public.site_managers') is not null and to_regprocedure('public.bootstrap_site_admin(text)') is not null;"
      ),
      't'
    );
  });
  await t.test(
    'the first admin table left by an interrupted attempt is reused without changing existing role state',
    () => {
      const db = fresh();
      const firstTable = workflow.match(/create table public\.admin_memberships [\s\S]*?\n\);/);
      assert.ok(firstTable);
      run(db, firstTable[0]);
      run(
        db,
        `insert into public.admin_memberships(user_id,role,active) select user_id,'editor',false from public.app_users where auth_user_id='${editor}';`
      );
      run(db, installer);
      assert.equal(
        value(
          db,
          `select role||':'||active from public.admin_memberships m join public.app_users a using(user_id) where a.auth_user_id='${editor}';`
        ),
        'editor:false'
      );
    }
  );
  await t.test(
    'missing account prerequisites or an unverified owner fail atomically with no half-installed catalog',
    () => {
      const empty = fresh(false);
      run(empty, system);
      const missing = run(empty, installer, true);
      assert.notEqual(missing.status, 0);
      assert.match(missing.stderr, /账号基础表或身份映射/);
      assert.equal(value(empty, "select to_regclass('public.site_managers') is null;"), 't');
      const db = fresh();
      run(db, `update auth.users set email_confirmed_at=null where id='${owner}';`);
      const result = run(db, installer, true);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /ADMIN_VERIFIED_ACCOUNT_REQUIRED/);
      assert.equal(
        value(
          db,
          "select to_regclass('public.job_catalog') is null and to_regclass('public.admin_memberships') is null;"
        ),
        't'
      );
      assert.equal(value(db, 'select count(*) from public.workspace_entries;'), '1');
    }
  );
  await t.test(
    'an already initialized project keeps its existing super administrator without granting a different account',
    () => {
      const db = fresh();
      run(db, catalog + workflow);
      run(db, "select public.bootstrap_site_admin('legacy-editor@example.com');");
      const before = snapshot(db);
      run(db, installer);
      assert.equal(snapshot(db), before);
      assert.equal(
        value(
          db,
          `select count(*) from public.admin_memberships m join public.app_users a using(user_id) where a.auth_user_id='${owner}';`
        ),
        '0'
      );
    }
  );
});
