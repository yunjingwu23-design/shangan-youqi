import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { adminCredentialDiagnostic, authLimitPermissionTarget } from '../lib/auth-diagnostics';
import { admin, anonKey, base, dbUrl, mailboxCode, SessionClient } from './helpers';

test('real Supabase OTP, persisted data and RLS isolation', async (t) => {
  const suffix = Date.now();
  const emailA = `a-${suffix}@example.com`;
  const emailB = `b-${suffix}@example.com`;
  const a = new SessionClient(),
    b = new SessionClient(),
    guest = new SessionClient();
  const ids: string[] = [];
  t.after(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  });
  await t.test('anonymous API is denied and mutation requires same origin', async () => {
    assert.equal((await guest.request('/api/profile')).response.status, 401);
    assert.equal((await guest.request('/api/entries')).response.status, 401);
    assert.equal(
      (await guest.request('/api/auth/otp', 'POST', { email: emailA }, 'https://evil.example'))
        .response.status,
      403
    );
    assert.equal(
      (await guest.request('/api/auth/otp', 'POST', { email: emailA }, null)).response.status,
      403
    );
  });
  let codeA = '';
  await t.test('new signup delivers six-digit OTP and establishes HTTP-only cookies', async () => {
    codeA = await a.authenticate(emailA);
    assert.match(codeA, /^\d{6}$/);
    assert.equal((await a.request('/api/profile')).response.status, 200);
    const { session } = await a.database();
    ids.push(session.user.id);
    await b.authenticate(emailB);
    const other = await b.database();
    ids.push(other.session.user.id);
  });
  const da = await a.database();
  const db = await b.database();
  const pa = (await a.request('/api/profile')).data.profile;
  const pb = (await b.request('/api/profile')).data.profile;
  const createdIds: string[] = [];
  await t.test(
    'automatic profiles have stable internal IDs independent from auth IDs',
    async () => {
      assert.notEqual(pa.user_id, pb.user_id);
      assert.notEqual(pa.user_id, da.session.user.id);
      assert.equal((await a.request('/api/profile')).data.profile.user_id, pa.user_id);
    }
  );
  await t.test('used or incorrect OTP cannot authenticate', async () => {
    assert.equal(
      (await guest.request('/api/auth/verify', 'POST', { email: emailA, token: codeA })).response
        .status,
      400
    );
    assert.equal(
      (await guest.request('/api/auth/verify', 'POST', { email: emailA, token: '000000' })).response
        .status,
      400
    );
  });
  await t.test('repeated send is persistently rate limited', async () => {
    const result = await guest.request('/api/auth/otp', 'POST', { email: emailA });
    assert.equal(result.response.status, 429);
    assert.ok(Number(result.response.headers.get('retry-after')) > 0);
  });
  await t.test('profile edits and all four data kinds persist in PostgreSQL', async () => {
    const saved = await a.request('/api/profile', 'PATCH', {
      full_name: '测试求职者',
      desired_role: '产品经理',
      city: '上海',
      bio: '真实持久化验证',
    });
    assert.equal(saved.response.status, 200);
    for (const kind of ['application', 'resume', 'favorite', 'interview_review']) {
      const result = await a.request('/api/entries', 'POST', {
        kind,
        title: `测试-${kind}`,
        company: '测试公司',
        content: '用户私有内容',
        status: 'applied',
      });
      assert.equal(result.response.status, 201);
      assert.equal(result.data.entry.user_id, pa.user_id);
      createdIds.push(result.data.entry.id);
    }
    const direct = await da.db.from('workspace_entries').select('*');
    assert.ifError(direct.error);
    assert.equal(direct.data.length, 4);
  });
  await t.test(
    'independent device session restores same identity and sees synced data',
    async () => {
      const newDevice = createClient(dbUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const refresh = await newDevice.auth.refreshSession({
        refresh_token: da.session.refresh_token,
      });
      assert.ifError(refresh.error);
      const mapping = await newDevice.from('app_users').select('user_id').single();
      assert.equal(mapping.data?.user_id, pa.user_id);
      const profile = await newDevice.from('profiles').select('full_name').single();
      assert.equal(profile.data?.full_name, '测试求职者');
      const entries = await newDevice.from('workspace_entries').select('*');
      assert.equal(entries.data?.length, 4);
    }
  );
  await t.test(
    'existing-account OTP login retains internal ID and records after cooldown',
    async () => {
      // Simulate time passing only in this isolated local test stack; OTP still comes
      // from the real SMTP mailbox and is verified by real Supabase Auth.
      const bucket = createHmac('sha256', process.env.AUTH_RATE_LIMIT_SECRET!)
        .update(`send-email-minute:${emailA}`)
        .digest('hex');
      const elapsed = spawnSync(
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
          '-c',
          `update private.auth_rate_limits set expires_at=now()-interval '1 second' where bucket_key='${bucket}'; update auth.users set confirmation_sent_at=now()-interval '2 minutes',recovery_sent_at=now()-interval '2 minutes' where email='${emailA}'`,
        ],
        { encoding: 'utf8' }
      );
      assert.equal(elapsed.status, 0, elapsed.stderr);
      const again = new SessionClient();
      assert.equal(
        (await again.request('/api/auth/otp', 'POST', { email: emailA })).response.status,
        200
      );
      const code = await mailboxCode(emailA, codeA);
      assert.equal(
        (await again.request('/api/auth/verify', 'POST', { email: emailA, token: code })).response
          .status,
        200
      );
      assert.equal((await again.request('/api/profile')).data.profile.user_id, pa.user_id);
      assert.equal((await again.request('/api/entries')).data.total, 4);
    }
  );
  await t.test('repeated verification guesses are rate limited', async () => {
    const email = `guess-${suffix}@example.com`;
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await guest.request('/api/auth/verify', 'POST', { email, token: '000000' })).response
          .status,
        400
      );
    assert.equal(
      (await guest.request('/api/auth/verify', 'POST', { email, token: '000000' })).response.status,
      429
    );
  });
  await t.test('B cannot read A data even via direct REST bypassing app', async () => {
    const rows = await db.db.from('workspace_entries').select('*').eq('user_id', pa.user_id);
    assert.ifError(rows.error);
    assert.equal(rows.data.length, 0);
    const profile = await db.db.from('profiles').select('*').eq('user_id', pa.user_id);
    assert.equal(profile.data?.length, 0);
    const mapping = await db.db.from('app_users').select('*').eq('user_id', pa.user_id);
    assert.equal(mapping.data?.length, 0);
  });
  await t.test('B cannot update or delete A data through API or direct REST', async () => {
    assert.equal(
      (await b.request('/api/entries', 'PATCH', { id: createdIds[0], title: '篡改' })).response
        .status,
      404
    );
    assert.equal(
      (await b.request('/api/entries', 'DELETE', { id: createdIds[0] })).response.status,
      404
    );
    const updated = await db.db
      .from('workspace_entries')
      .update({ title: '篡改' })
      .eq('id', createdIds[0])
      .select();
    assert.equal(updated.data?.length, 0);
    const removed = await db.db.from('workspace_entries').delete().eq('id', createdIds[0]).select();
    assert.equal(removed.data?.length, 0);
    const profile = await db.db
      .from('profiles')
      .update({ full_name: '篡改' })
      .eq('user_id', pa.user_id)
      .select();
    assert.equal(profile.data?.length, 0);
  });
  await t.test('ownership forgery and browser identity linking are rejected', async () => {
    const forged = await db.db
      .from('workspace_entries')
      .insert({ user_id: pa.user_id, kind: 'resume', title: '伪造' });
    assert.ok(forged.error);
    assert.equal(
      (
        await b.request('/api/entries', 'POST', {
          user_id: pa.user_id,
          kind: 'resume',
          title: '伪造',
        })
      ).response.status,
      400
    );
    const changed = await db.db
      .from('app_users')
      .update({ auth_user_id: da.session.user.id })
      .eq('user_id', pb.user_id);
    assert.ok(changed.error);
    const linked = await db.db.from('external_identities').insert({
      user_id: pb.user_id,
      provider: 'wechat',
      issuer: 'unverified',
      subject: 'forged',
      verified_at: new Date().toISOString(),
    });
    assert.ok(linked.error);
  });
  await t.test('limiter is service-only and atomic across concurrent requests', async () => {
    const bucket = randomBytes(32).toString('hex');
    const anonymous = createClient(dbUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonymousResult = await anonymous.rpc('consume_auth_rate_limit', {
      bucket,
      maximum: 3,
      period_seconds: 60,
    });
    assert.equal(anonymousResult.status, 401);
    assert.equal(anonymousResult.error?.code, '42501');
    assert.equal(authLimitPermissionTarget(anonymousResult.error), 'rate_limit_function');
    assert.equal(
      adminCredentialDiagnostic(dbUrl, anonKey, anonKey).credentialMatchesPublicKey,
      true
    );
    const denied = await db.db.rpc('consume_auth_rate_limit', {
      bucket,
      maximum: 3,
      period_seconds: 60,
    });
    assert.ok(denied.error);
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        admin.rpc('consume_auth_rate_limit', { bucket, maximum: 3, period_seconds: 60 })
      )
    );
    assert.ok(results.every((r) => !r.error));
    assert.equal(results.filter((r) => r.data.allowed).length, 3);
  });
  await t.test('owner can edit and delete their own records', async () => {
    const edited = await a.request('/api/entries', 'PATCH', {
      id: createdIds[0],
      status: 'interview',
      content: '已安排面试',
    });
    assert.equal(edited.data.entry.status, 'interview');
    assert.equal(
      (await a.request('/api/entries', 'DELETE', { id: createdIds[2] })).response.status,
      200
    );
  });
  await t.test('data deletion is confirmed, transactional and scoped to the caller', async () => {
    await b.request('/api/entries', 'POST', { kind: 'application', title: 'B 保留的投递' });
    assert.equal(
      (await a.request('/api/account/data', 'DELETE', { confirmation: '错误' })).response.status,
      400
    );
    assert.equal(
      (await a.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' })).response
        .status,
      200
    );
    assert.equal((await a.request('/api/entries')).data.total, 0);
    assert.equal((await a.request('/api/profile')).data.profile.full_name, '');
    assert.equal((await b.request('/api/entries')).data.total, 1);
  });
  await t.test('expired OTP is rejected by real Auth', async () => {
    const email = `expired-${suffix}@example.com`;
    assert.equal((await guest.request('/api/auth/otp', 'POST', { email })).response.status, 200);
    const code = await mailboxCode(email);
    // Controlled local-only expiry; no production target permitted by helpers.ts.
    const expired = spawnSync(
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
        '-c',
        `update auth.users set confirmation_sent_at=now()-interval '20 minutes', recovery_sent_at=now()-interval '20 minutes' where email='${email}'`,
      ],
      { encoding: 'utf8' }
    );
    assert.equal(expired.status, 0, expired.stderr);
    assert.equal(
      (await guest.request('/api/auth/verify', 'POST', { email, token: code })).response.status,
      400
    );
    const users = await admin.auth.admin.listUsers();
    const user = users.data.users.find((u) => u.email === email);
    if (user) ids.push(user.id);
  });
  await t.test('logout clears browser session; cookie-free requests are denied', async () => {
    assert.equal((await b.request('/api/auth/logout', 'POST', {})).response.status, 200);
    assert.equal((await b.request('/api/profile')).response.status, 401);
  });
  await t.test('account deletion removes Auth user and cascades every private table', async () => {
    // Refresh-token exchange above did not change the OTP authentication time.
    for (const kind of ['application', 'resume', 'favorite', 'interview_review']) {
      const created = await a.request('/api/entries', 'POST', { kind, title: '注销前的真实数据' });
      assert.equal(created.response.status, 201);
    }
    assert.equal((await a.request('/api/entries')).data.total, 4);
    const removed = await a.request('/api/account', 'DELETE', { confirmation: '注销账号' });
    assert.equal(removed.response.status, 200, JSON.stringify(removed.data));
    const auth = await admin.auth.admin.getUserById(da.session.user.id);
    assert.ok(auth.error);
    const mapping = await admin.from('app_users').select('*').eq('user_id', pa.user_id);
    assert.equal(mapping.data?.length, 0);
    const profile = await admin.from('profiles').select('*').eq('user_id', pa.user_id);
    assert.equal(profile.data?.length, 0);
    const records = await admin.from('workspace_entries').select('*').eq('user_id', pa.user_id);
    assert.equal(records.data?.length, 0);
    assert.equal((await a.request('/api/profile')).response.status, 401);
    const oldToken = await da.db.from('workspace_entries').select('*');
    assert.equal(oldToken.data?.length, 0);
  });
});
