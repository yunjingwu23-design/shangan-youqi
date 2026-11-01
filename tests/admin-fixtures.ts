import { createServerClient } from '@supabase/ssr';
import { spawnSync } from 'node:child_process';
import { admin, SessionClient, dbUrl, anonKey } from './helpers';
import type { AdminRole } from '../lib/admin/model';
export async function adminFixture(label: string, role?: AdminRole) {
  const email = `p0-${label}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}@example.com`,
    client = new SessionClient(),
    generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (generated.error || !generated.data.user || !generated.data.properties)
    throw new Error('Local Auth fixture creation failed');
  const auth = createServerClient(dbUrl, anonKey, {
    cookies: {
      getAll: () => [...client.cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) client.cookies.set(item.name, item.value);
      },
    },
  });
  const verified = await auth.auth.verifyOtp({
    type: 'email',
    token_hash: generated.data.properties.hashed_token,
  });
  if (verified.error) throw new Error('Local Auth fixture verification failed');
  const profile = (await client.request('/api/profile')).data.profile;
  if (role) {
    const assigned = await admin
      .from('admin_memberships')
      .insert({ user_id: profile.user_id, role });
    if (assigned.error) throw new Error('Trusted local fixture role setup failed');
  }
  return { email, client, authId: generated.data.user.id, userId: profile.user_id as string };
}
export type AdminFixture = Awaited<ReturnType<typeof adminFixture>>;
// Simulate an older login only in this local fixture's Auth sessions, then obtain
// a real Auth-signed token through refresh instead of forging a JWT or waiting.
export async function ageAdminOtpSession(actor: AdminFixture) {
  if (!/^[a-f0-9-]{36}$/.test(actor.authId)) throw new Error('Invalid local fixture ID');
  localAdminSql(`update auth.mfa_amr_claims
    set created_at=now()-interval '20 minutes',updated_at=now()-interval '20 minutes'
    where authentication_method='otp'
      and session_id in (select id from auth.sessions where user_id='${actor.authId}'::uuid);`);
  const auth = createServerClient(dbUrl, anonKey, {
    cookies: {
      getAll: () => [...actor.client.cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) actor.client.cookies.set(item.name, item.value);
      },
    },
  });
  const refreshed = await auth.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session)
    throw new Error('Local aged OTP session refresh failed');
  const claims = JSON.parse(
    Buffer.from(refreshed.data.session.access_token.split('.')[1], 'base64url').toString('utf8')
  );
  const otp = claims.amr?.find((claim: { method: string }) => claim.method === 'otp');
  if (claims.sub !== actor.authId || !otp || otp.timestamp > Date.now() / 1000 - 19 * 60)
    throw new Error('Local refreshed session must retain an OTP older than fifteen minutes');
}
export function localAdminSql(sql: string) {
  if (new URL(dbUrl).hostname !== '127.0.0.1') throw new Error('Local database only');
  const environment = { ...process.env };
  for (const name of [
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
  ])
    delete environment[name];
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
      '-v',
      'ON_ERROR_STOP=1',
      '-tA',
    ],
    { env: environment, input: sql, encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error('Local admin test SQL failed: ' + result.stderr);
  return result.stdout;
}
export async function removeAdminFixtures(fixtures: AdminFixture[], jobIds: string[] = []) {
  for (const id of jobIds) {
    const result = await admin.from('job_catalog').delete().eq('id', id);
    if (result.error) throw new Error('Local job fixture cleanup failed');
  }
  const owners = fixtures.map((actor) => actor.userId);
  if (owners.length) {
    const files = await admin
      .from('jd_import_files')
      .select('id,file_type')
      .in('uploaded_by', owners)
      .is('attached_job_id', null);
    if (files.error) throw new Error('Local file fixture lookup failed');
    for (const file of files.data || []) {
      const removed = await admin.storage
        .from('jd-originals')
        .remove([`${file.id}.${file.file_type}`]);
      const deleted = await admin.from('jd_import_files').delete().eq('id', file.id);
      if (removed.error || deleted.error) throw new Error('Local file fixture cleanup failed');
    }
    if (owners.some((id) => !/^[a-f0-9-]{36}$/.test(id)))
      throw new Error('Invalid local fixture ID');
    localAdminSql(
      `delete from public.admin_memberships where user_id=any(array[${owners.map((id) => "'" + id + "'::uuid").join(',')}]);`
    );
  }
  for (const actor of fixtures) {
    const revoked = await admin.from('admin_invitations').delete().eq('created_by', actor.userId);
    const removed = await admin.auth.admin.deleteUser(actor.authId);
    if (revoked.error || removed.error) throw new Error('Local account fixture cleanup failed');
  }
}
