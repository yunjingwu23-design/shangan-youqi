import test from 'node:test';
import assert from 'node:assert/strict';
import { admin, SessionClient, mailboxCode } from './helpers';
import { adminFixture, removeAdminFixtures, type AdminFixture } from './admin-fixtures';
import { invitationMail } from './admin-email-fixtures';

test('real invitation email, mailbox verification, role binding and delivery failures', async (t) => {
  const root = await adminFixture('email-root', 'super_admin'),
    existing = await adminFixture('email-existing'),
    wrong = await adminFixture('email-wrong');
  const actors: AdminFixture[] = [root, existing, wrong];
  const freshEmail = `new-admin-mail-${Date.now()}@example.com`,
    normalEmail = `normal-login-mail-${Date.now()}@example.com`,
    fresh = new SessionClient();
  t.after(async () => {
    const users = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users;
    for (const found of users.filter((user) =>
      [freshEmail, normalEmail].includes(user.email || '')
    )) {
      const mapping = await admin
        .from('app_users')
        .select('user_id')
        .eq('auth_user_id', found.id)
        .single();
      if (mapping.data)
        actors.push({
          email: found.email!,
          client: fresh,
          authId: found.id,
          userId: mapping.data.user_id,
        });
    }
    await removeAdminFixtures(actors);
  });
  let first: any;
  await t.test(
    'new recipient receives a real link and code through existing Auth SMTP; sender session stays unchanged and roles stay pending',
    async () => {
      const created = await root.client.request('/api/admin/team', 'POST', {
        action: 'invite',
        email: freshEmail,
        role: 'editor',
        delivery: 'email',
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.data));
      assert.equal(created.data.delivery.status, 'sent', JSON.stringify(created.data.delivery));
      first = created.data;
      const mail = await invitationMail(freshEmail);
      assert.equal(mail.url.href, first.url);
      assert.equal(mail.url.searchParams.get('sent'), '1');
      assert.equal(mail.code.length, 8);
      assert.ok(mail.html.includes('运营后台邀请'), 'Invitation heading is missing');
      const state = await admin
        .from('admin_invitations')
        .select('state,accepted_by')
        .eq('id', first.invitation.id)
        .single();
      assert.equal(state.data?.state, 'pending');
      assert.equal(state.data?.accepted_by, null);
      assert.equal(
        (
          await fresh.request('/api/admin/invitations/accept', 'POST', {
            token: mail.url.searchParams.get('token'),
          })
        ).response.status,
        401
      );
      assert.equal((await root.client.request('/api/profile')).data.profile.user_id, root.userId);
      const landing = await fetch(mail.url);
      assert.equal(landing.status, 200);
      const html = await landing.text();
      assert.ok(html.includes(freshEmail));
      assert.ok(html.includes('邮箱验证码'));
      assert.ok(!html.includes('验证并领取邀请'));
    }
  );
  await t.test(
    'wrong mailbox is rejected; the invited mailbox verifies the original emailed code and receives only its assigned role',
    async () => {
      const mail = await invitationMail(freshEmail),
        token = mail.url.searchParams.get('token');
      assert.equal(
        (await wrong.client.request('/api/admin/invitations/accept', 'POST', { token })).response
          .status,
        400
      );
      assert.equal(
        (await fresh.request('/api/auth/verify', 'POST', { email: freshEmail, token: mail.code }))
          .response.status,
        200
      );
      const accepted = await fresh.request('/api/admin/invitations/accept', 'POST', { token });
      assert.equal(accepted.response.status, 200);
      assert.equal(accepted.data.role, 'editor');
      assert.equal((await fresh.request('/api/admin/jobs')).response.status, 200);
      assert.equal((await fresh.request('/api/admin/team')).response.status, 403);
      assert.equal(
        (await fresh.request('/api/admin/invitations/accept', 'POST', { token })).response.status,
        400
      );
    }
  );
  await t.test(
    'an already verified account receives the Magic Link template and retains its internal identity',
    async () => {
      const created = await root.client.request('/api/admin/team', 'POST', {
        action: 'invite',
        email: existing.email,
        role: 'reviewer',
        delivery: 'email',
      });
      assert.equal(created.response.status, 201);
      assert.equal(created.data.delivery.status, 'sent');
      const mail = await invitationMail(existing.email);
      assert.equal(
        (
          await existing.client.request('/api/auth/verify', 'POST', {
            email: existing.email,
            token: mail.code,
          })
        ).response.status,
        200
      );
      assert.equal(
        (await existing.client.request('/api/profile')).data.profile.user_id,
        existing.userId
      );
      const accepted = await existing.client.request('/api/admin/invitations/accept', 'POST', {
        token: mail.url.searchParams.get('token'),
      });
      assert.equal(accepted.response.status, 200);
      assert.equal(accepted.data.role, 'reviewer');
    }
  );
  await t.test(
    'send rate limits are truthful failures with a usable manual fallback, while unauthorized or cross-site sends are denied',
    async () => {
      const limited = await root.client.request('/api/admin/team', 'POST', {
        action: 'invite',
        email: existing.email,
        role: 'editor',
        delivery: 'email',
      });
      assert.equal(limited.response.status, 201);
      assert.equal(limited.data.delivery.status, 'failed');
      assert.ok(limited.data.delivery.retryAfter > 0);
      assert.equal(new URL(limited.data.url).searchParams.has('sent'), false);
      assert.equal(
        (
          await wrong.client.request('/api/admin/team', 'POST', {
            action: 'invite',
            email: 'denied-admin-mail@example.com',
            role: 'super_admin',
            delivery: 'email',
          })
        ).response.status,
        403
      );
      assert.equal(
        (
          await root.client.request(
            '/api/admin/team',
            'POST',
            {
              action: 'invite',
              email: 'denied-admin-mail@example.com',
              role: 'editor',
              delivery: 'email',
            },
            'https://outside.invalid'
          )
        ).response.status,
        403
      );
      const revoked = await root.client.request('/api/admin/team', 'POST', {
        action: 'revoke',
        id: limited.data.invitation.id,
      });
      assert.equal(revoked.response.status, 200);
      const landing = await fetch(limited.data.url);
      const html = await landing.text();
      assert.ok(html.includes('已撤销或已过期'));
      assert.ok(!html.includes('验证并进入后台</button>'));
    }
  );
  await t.test(
    'ordinary OTP emails keep the normal login content without an invitation link',
    async () => {
      const sent = await wrong.client.request('/api/auth/otp', 'POST', { email: normalEmail });
      assert.equal(sent.response.status, 200);
      assert.equal((await mailboxCode(normalEmail)).length, 8);
      const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
      const item = inbox.messages.find((mail: { To: { Address: string }[] }) =>
        mail.To.some((target) => target.Address === normalEmail)
      );
      assert.ok(item);
      const message = await (
        await fetch('http://127.0.0.1:54324/api/v1/message/' + item.ID)
      ).json();
      assert.equal((message.HTML || '').includes('运营后台邀请'), false);
      assert.equal((message.HTML || '').includes('/admin/accept?'), false);
    }
  );
});
