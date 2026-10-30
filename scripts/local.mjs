import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { randomBytes, createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
process.chdir(new URL('..', import.meta.url).pathname);
const action = process.argv[2] || 'start';
const environment = { ...process.env };
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete environment[key];
mkdirSync('.local', { recursive: true });
const secretPath = '.local/jwt-secret';
if (!existsSync(secretPath))
  writeFileSync(secretPath, randomBytes(32).toString('hex'), { mode: 0o600 });
environment.LOCAL_JWT_SECRET = readFileSync(secretPath, 'utf8').trim();
environment.LOCAL_ANON_KEY = token('anon');
environment.LOCAL_SERVICE_KEY = token('service_role');
function compose(...args) {
  const result = spawnSync(
    'docker',
    ['--host=unix:///var/run/docker.sock', 'compose', '-f', 'infra/compose.yml', ...args],
    { env: environment, stdio: 'inherit' }
  );
  if (result.status !== 0) throw new Error(`docker compose failed (${result.status})`);
}
if (action === 'stop') {
  compose('stop');
  process.exit(0);
}
compose('up', '-d', '--wait', '--wait-timeout', '90', 'db', 'mail', 'templates');
const roleCheck = spawnSync(
  'docker',
  [
    '--host=unix:///var/run/docker.sock',
    'compose',
    '-f',
    'infra/compose.yml',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'postgres',
    '-tAc',
    "select count(*) from pg_roles where rolname = 'supabase_auth_admin'",
  ],
  { env: environment, encoding: 'utf8' }
);
if (roleCheck.status !== 0) throw new Error('Cannot inspect local roles');
if (roleCheck.stdout.trim() === '0') {
  const setup = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'compose',
      '-f',
      'infra/compose.yml',
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-1',
    ],
    { env: environment, input: readFileSync('infra/init.sql', 'utf8'), encoding: 'utf8' }
  );
  if (setup.status !== 0) {
    process.stderr.write(setup.stderr);
    throw new Error('Local role bootstrap failed');
  }
}
const ownerFix = spawnSync(
  'docker',
  [
    '--host=unix:///var/run/docker.sock',
    'compose',
    '-f',
    'infra/compose.yml',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'alter function auth.uid() owner to supabase_auth_admin',
  ],
  { env: environment, encoding: 'utf8' }
);
if (ownerFix.status !== 0) throw new Error('Local auth ownership bootstrap failed');
compose('up', '-d', '--wait', '--wait-timeout', '90');
for (let i = 0; ; i++) {
  try {
    if ((await fetch('http://127.0.0.1:54321/auth/v1/health')).ok) break;
  } catch {}
  if (i > 60) throw new Error('Supabase Auth did not become ready');
  await setTimeout(500);
}
// Supabase's hosted database provides this JWT helper. Reapply its modern form
// after GoTrue's historical migrations have run on stock PostgreSQL.
const helperSql = readFileSync('infra/init.sql', 'utf8')
  .split('create function auth.uid()')[1]
  .split('grant usage on schema auth')[0];
const helper = spawnSync(
  'docker',
  [
    '--host=unix:///var/run/docker.sock',
    'compose',
    '-f',
    'infra/compose.yml',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
  ],
  { env: environment, input: 'create or replace function auth.uid()' + helperSql, encoding: 'utf8' }
);
if (helper.status !== 0) {
  process.stderr.write(helper.stderr);
  throw new Error('Local JWT helper failed');
}
// Apply each migration once. No destructive reset of a developer's database.
const migration = readFileSync('supabase/migrations/202610300001_auth_and_workspace.sql', 'utf8');
const check = spawnSync(
  'docker',
  [
    '--host=unix:///var/run/docker.sock',
    'compose',
    '-f',
    'infra/compose.yml',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'postgres',
    '-tAc',
    "select to_regclass('public.app_users') is not null",
  ],
  { env: environment, encoding: 'utf8' }
);
if (check.status !== 0) throw new Error('Database readiness check failed');
if (check.stdout.trim() === 'f') {
  const migrated = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'compose',
      '-f',
      'infra/compose.yml',
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-1',
    ],
    { env: environment, input: migration, encoding: 'utf8' }
  );
  if (migrated.status !== 0) {
    process.stderr.write(migrated.stderr);
    throw new Error('Migration failed');
  }
}
// Storage runs its own schema migrations before the bucket/RLS migration.
for (let attempt = 0; ; attempt++) {
  const ready = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'exec',
      'syq-auth-local-db-1',
      'psql',
      '-U',
      'postgres',
      '-tAc',
      "select to_regclass('storage.objects') is not null",
    ],
    { env: environment, encoding: 'utf8' }
  );
  if (ready.status === 0 && ready.stdout.trim() === 't') break;
  if (attempt >= 60) throw new Error('Local Storage schema did not become ready');
  await setTimeout(500);
}
function localSql(sql) {
  const run = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'exec',
      '-i',
      'syq-auth-local-db-1',
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-1',
    ],
    { env: environment, input: sql, encoding: 'utf8' }
  );
  if (run.status !== 0) {
    process.stderr.write(run.stderr);
    throw new Error('Local migration failed');
  }
  return run.stdout;
}
// Hosted Supabase bootstraps these Storage privileges; a stock local Postgres
// does not. Row policies below remain authoritative for ordinary users.
localSql(`grant usage on schema storage to anon,authenticated,service_role;
grant all on all tables in schema storage to service_role;
grant all on all sequences in schema storage to service_role;
grant select on storage.buckets to anon,authenticated;
grant select on storage.objects to anon;
grant select,insert,update,delete on storage.objects to authenticated;`);
localSql(
  "create table if not exists private.local_migrations(name text primary key); insert into private.local_migrations values('202610300001_auth_and_workspace.sql') on conflict do nothing;"
);
for (const name of readdirSync('supabase/migrations')
  .filter((n) => n.endsWith('.sql'))
  .sort()) {
  const applied = spawnSync(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'exec',
      'syq-auth-local-db-1',
      'psql',
      '-U',
      'postgres',
      '-tAc',
      `select count(*) from private.local_migrations where name='${name}'`,
    ],
    { env: environment, encoding: 'utf8' }
  );
  if (applied.status !== 0) throw new Error('Cannot inspect migration ledger');
  if (applied.stdout.trim() === '1') continue;
  localSql(
    readFileSync(`supabase/migrations/${name}`, 'utf8') +
      `\ninsert into private.local_migrations values('${name}');`
  );
  console.log(`Applied ${name}`);
}
compose('kill', '-s', 'SIGUSR1', 'rest');
compose('restart', 'gateway');
function token(role) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      role,
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 315360000,
    })
  ).toString('base64url');
  return `${head}.${body}.${createHmac('sha256', environment.LOCAL_JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
const localEnv = `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${token('anon')}\nSUPABASE_SERVICE_ROLE_KEY=${token('service_role')}\nAPP_URL=http://localhost:3000\nAUTH_RATE_LIMIT_SECRET=${randomBytes(32).toString('hex')}\nTRUST_PROXY=false\n`;
if (!existsSync('.env.local')) writeFileSync('.env.local', localEnv, { mode: 0o600 });
else {
  const current = readFileSync('.env.local', 'utf8');
  if (!current.includes('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'))
    console.warn(
      'Existing .env.local preserved. Do not run integration tests against a hosted project.'
    );
}
console.log(
  'Local Supabase Auth + PostgreSQL ready. Local credentials saved privately; no remote project changed.'
);
