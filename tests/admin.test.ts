import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { admin, base, dbUrl, anonKey, SessionClient } from './helpers';
import {
  adminFixture,
  removeAdminFixtures,
  localAdminSql,
  ageAdminOtpSession,
  type AdminFixture,
} from './admin-fixtures';
import { emptyAdminDraft, adminDraftSchema } from '../lib/admin/model';
const cookies = (actor: AdminFixture) =>
  [...actor.client.cookies].map(([name, value]) => name + '=' + value).join('; ');
async function upload(actor: AdminFixture, name: string, bytes: Uint8Array, origin = base) {
  const response = await fetch(base + '/api/admin/jd-import?name=' + encodeURIComponent(name), {
    method: 'POST',
    headers: { Cookie: cookies(actor), Origin: origin, 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
  });
  return { response, data: await response.json() };
}
async function file(actor: AdminFixture, id: string) {
  return fetch(base + '/api/admin/jd-files/' + id, { headers: { Cookie: cookies(actor) } });
}
function adminScript(name: string, ...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${name}.ts`, ...args], {
    env: process.env,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
test('P0 real admin roles, private JD files, versioned review and public publication', async (t) => {
  const actors: AdminFixture[] = [],
    jobIds: string[] = [],
    guest = new SessionClient();
  t.after(async () => removeAdminFixtures(actors, jobIds));
  const root = await adminFixture('root'),
    editor = await adminFixture('editor'),
    reviewer = await adminFixture('reviewer'),
    ordinary = await adminFixture('ordinary'),
    other = await adminFixture('other-editor');
  actors.push(root, editor, reviewer, ordinary, other);
  const anonymous = createClient(dbUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let job: any, expiryJob: any, txtFile: any;
  const raw =
    'P0 原始招聘 JD。某测试公司招聘产品实习生，北京。职责：整理真实产品需求。要求：在校生。招聘方明确有留用可能，按业务考核决定。投递邮箱 recruit@example.com，邮件主题：姓名-岗位。请提交简历和可到岗日期。内部原文标记 P0-RAW-ONLY。';
  const draft = adminDraftSchema.parse({
    ...emptyAdminDraft,
    company: 'P0 本地招聘公司',
    title: 'P0 产品实习生',
    type: 'conversion_internship',
    city: '北京',
    responsibilities: '整理真实产品需求，维护项目文档。',
    requirements: '在校生，具有基本协作能力。',
    source_url: 'https://example.com/p0/source',
    apply_url: 'https://example.com/p0/apply',
    contacts: [{ email: 'recruit@example.com', label: '本岗位招聘邮箱' }],
    mail_subject: '姓名-岗位',
    application_instructions: '请提交简历和可到岗日期。',
    raw_jd: raw,
    retention_evidence: '招聘方明确有留用可能，按业务考核决定。',
  });
  async function step(
    actor: AdminFixture,
    action: string,
    note = '已核对招聘方原文、投递方式和留用依据。',
    checked = false,
    target = job
  ) {
    const result = await actor.client.request(`/api/admin/jobs/${target.id}/transition`, 'POST', {
      expectedVersion: target.version,
      action,
      reason: note,
      sourceChecked: checked,
    });
    if (result.response.ok && target === job) job = result.data.job;
    return result;
  }
  await t.test(
    'first super admin requires trusted initialization and a verified account; browser roles and repeated bootstrap are rejected',
    async () => {
      assert.equal((await guest.request('/api/admin/jobs')).response.status, 401);
      assert.equal((await ordinary.client.request('/api/admin/jobs')).response.status, 403);
      const db = await ordinary.client.database();
      assert.ok(
        (
          await db.db
            .from('admin_memberships')
            .insert({ user_id: ordinary.userId, role: 'super_admin' })
        ).error
      );
      assert.ok((await db.db.rpc('bootstrap_site_admin', { admin_email: ordinary.email })).error);
      const spoof = await fetch(dbUrl + '/auth/v1/user', {
        method: 'PUT',
        headers: {
          apikey: anonKey,
          Authorization: 'Bearer ' + db.session.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { role: 'super_admin', is_admin: true } }),
      });
      assert.equal(spoof.status, 200);
      assert.equal((await ordinary.client.request('/api/admin/jobs')).response.status, 403);
      const existing = await admin
        .from('admin_memberships')
        .select('user_id')
        .eq('role', 'super_admin')
        .eq('active', true);
      assert.equal(
        existing.data?.length,
        0,
        'admin tests require no unrelated local super administrator'
      );
      localAdminSql(
        'delete from private.admin_bootstrap_guard where not exists(select 1 from public.app_users a where a.user_id=initialized_by);'
      );
      const unverified = await admin.auth.admin.createUser({
        email: 'p0-unverified-' + Date.now() + '@example.com',
        email_confirm: false,
      });
      assert.ifError(unverified.error);
      try {
        assert.equal(
          (await admin.rpc('bootstrap_site_admin', { admin_email: unverified.data.user.email }))
            .error?.message,
          'ADMIN_VERIFIED_ACCOUNT_REQUIRED'
        );
      } finally {
        await admin.auth.admin.deleteUser(unverified.data.user.id);
      }
      assert.match(adminScript('admin-bootstrap', '--email', root.email), /超级管理员初始化成功/);
      const initialized = await admin
        .from('admin_memberships')
        .select('user_id,role')
        .eq('user_id', root.userId)
        .single();
      assert.ifError(initialized.error);
      assert.equal(initialized.data.role, 'super_admin');
      assert.equal(
        (await admin.rpc('bootstrap_site_admin', { admin_email: ordinary.email })).error?.message,
        'ADMIN_BOOTSTRAPPED'
      );
      assert.equal((await root.client.request('/api/admin/team')).response.status, 200);
    }
  );
  await t.test(
    'super-admin invitations are email-bound and single-use; clients cannot select or forge the invited role',
    async () => {
      for (const [actor, role] of [
        [editor, 'editor'],
        [reviewer, 'reviewer'],
        [other, 'editor'],
      ] as const) {
        const made = await root.client.request('/api/admin/team', 'POST', {
          action: 'invite',
          email: actor.email,
          role,
        });
        assert.equal(made.response.status, 201, JSON.stringify(made.data));
        const token = new URL(made.data.url).searchParams.get('token');
        assert.equal(
          (await ordinary.client.request('/api/admin/invitations/accept', 'POST', { token }))
            .response.status,
          400
        );
        assert.equal(
          (
            await actor.client.request('/api/admin/invitations/accept', 'POST', {
              token,
              role: 'super_admin',
            })
          ).response.status,
          400
        );
        const accepted = await actor.client.request('/api/admin/invitations/accept', 'POST', {
          token,
        });
        assert.equal(accepted.response.status, 200, JSON.stringify(accepted.data));
        assert.equal(accepted.data.role, role);
        assert.equal(
          (await actor.client.request('/api/admin/invitations/accept', 'POST', { token })).response
            .status,
          400
        );
      }
      assert.equal((await editor.client.request('/api/admin/team')).response.status, 403);
      const rootDb = await root.client.database();
      assert.ok((await rootDb.db.from('admin_invitations').select('token_hash')).error);
    }
  );
  await t.test(
    'permission changes still require email OTP even through direct database RPC',
    async () => {
      for (const amr of [[], [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }]]) {
        const claims = JSON.stringify({ sub: root.authId, role: 'authenticated', amr }).replaceAll(
          "'",
          "''"
        );
        localAdminSql(`begin;
          set local role authenticated;
          select set_config('request.jwt.claims','${claims}',true);
          do $$ begin
            perform public.admin_create_invitation('missing-otp@example.com','editor','${'a'.repeat(64)}');
            raise exception 'MISSING_OTP_WAS_ACCEPTED';
          exception when insufficient_privilege then
            if sqlerrm<>'ADMIN_REAUTH' then raise; end if;
          end $$;
          rollback;`);
      }
    }
  );
  await t.test(
    'a real refreshed session with an OTP older than fifteen minutes can invite, revoke and manage roles through API and RPC',
    async () => {
      // Keep the suite's root login fresh for its separate account-deletion checks.
      const aged = await adminFixture('older-otp', 'super_admin');
      try {
        await ageAdminOtpSession(aged);
        const made = await aged.client.request('/api/admin/team', 'POST', {
          action: 'invite',
          email: 'older-otp-' + Date.now() + '@example.com',
          role: 'editor',
        });
        assert.equal(made.response.status, 201, JSON.stringify(made.data));
        const revoked = await aged.client.request('/api/admin/team', 'POST', {
          action: 'revoke',
          id: made.data.invitation.id,
        });
        assert.equal(revoked.response.status, 200, JSON.stringify(revoked.data));
        assert.equal(
          (
            await admin
              .from('admin_invitations')
              .select('state')
              .eq('id', made.data.invitation.id)
              .single()
          ).data?.state,
          'revoked'
        );
        const changed = await aged.client.request('/api/admin/team', 'POST', {
          action: 'change',
          userId: other.userId,
          role: 'editor',
          active: false,
          reason: '验证旧邮箱登录会话仍可管理管理员权限。',
        });
        assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
        assert.equal((await other.client.request('/api/admin/jobs')).response.status, 403);
        const database = await aged.client.database();
        const restored = await database.db.rpc('admin_change_membership', {
          target_user: other.userId,
          target_role: 'editor',
          is_active: true,
          reason: '恢复本地测试编辑账号，继续验证后台流程。',
        });
        assert.ifError(restored.error);
        assert.equal((await other.client.request('/api/admin/jobs')).response.status, 200);
      } finally {
        await removeAdminFixtures([aged]);
      }
    }
  );
  await t.test(
    'TXT, DOCX and text PDF import really extracts text and stores byte-identical originals in private Storage',
    async () => {
      const denied = await upload(ordinary, 'jd.txt', Buffer.from(raw));
      assert.equal(denied.response.status, 403);
      assert.equal((await upload(editor, 'jd.csv', Buffer.from(raw))).response.status, 400);
      assert.equal(
        (await upload(editor, 'jd.txt', Buffer.from(raw), 'https://outside.invalid')).response
          .status,
        403
      );
      assert.equal(
        (await upload(editor, 'jd.txt', new Uint8Array(3 * 1024 * 1024 + 1))).response.status,
        413
      );
      for (const [name, bytes, contains] of [
        ['jd.txt', Buffer.from(raw), '招聘方明确有留用可能'],
        ['jd.docx', readFileSync('tests/fixtures/resume-original.docx'), 'Original Candidate'],
        ['jd.pdf', readFileSync('tests/fixtures/resume-original.pdf'), 'Original Candidate'],
      ] as const) {
        const imported = await upload(editor, name, bytes);
        assert.equal(imported.response.status, 201, JSON.stringify(imported.data));
        if (name === 'jd.txt') txtFile = imported.data.file;
        assert.ok(imported.data.file.text.includes(contains));
        assert.deepEqual(
          Buffer.from(await (await file(editor, imported.data.file.id)).arrayBuffer()),
          bytes
        );
        assert.equal((await file(ordinary, imported.data.file.id)).status, 403);
        assert.equal((await file(other, imported.data.file.id)).status, 404);
      }
      assert.equal((await admin.storage.getBucket('jd-originals')).data?.public, false);
      const db = await ordinary.client.database();
      assert.ok((await db.db.storage.from('jd-originals').download(txtFile.id + '.txt')).error);
    }
  );
  await t.test(
    'editor draft persists its source, file, contact and instructions while anonymous/public readers cannot see it',
    async () => {
      const created = await editor.client.request('/api/admin/jobs', 'POST', {
        job: { ...draft, source_file_id: txtFile.id },
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.data));
      job = created.data.job;
      jobIds.push(job.id);
      assert.equal(job.created_by, editor.userId);
      assert.equal(job.state, 'draft');
      assert.equal(job.contacts[0].email, 'recruit@example.com');
      assert.equal(created.data.sources[0].original_jd, raw);
      assert.equal(created.data.sources[0].file_id, txtFile.id);
      assert.equal(
        (await anonymous.from('job_catalog').select('id').eq('id', job.id)).data?.length,
        0
      );
      assert.equal((await anonymous.from('job_sources').select('*')).data?.length || 0, 0);
      assert.equal((await fetch(base + '/jobs/' + job.id)).status, 404);
      const second = new SessionClient();
      second.cookies = new Map(editor.client.cookies);
      assert.equal((await second.request('/api/admin/jobs?id=' + job.id)).data.job.raw_jd, raw);
      assert.equal(
        (
          await other.client.request('/api/admin/jobs', 'POST', {
            id: job.id,
            expectedVersion: job.version,
            job: draft,
          })
        ).response.status,
        403
      );
    }
  );
  await t.test(
    'trusted cleanup command deletes stale unattached originals but retains an equally old attached source',
    async () => {
      const orphan = await upload(editor, 'abandoned-jd.txt', Buffer.from(raw));
      assert.equal(orphan.response.status, 201);
      const aged = await admin
        .from('jd_import_files')
        .update({ created_at: new Date(Date.now() - 25 * 3600000).toISOString() })
        .in('id', [txtFile.id, orphan.data.file.id]);
      assert.ifError(aged.error);
      assert.match(adminScript('admin-cleanup-jd'), /已清理 [1-9][0-9]* 个/);
      assert.equal(
        (await admin.from('jd_import_files').select('id').eq('id', orphan.data.file.id)).data
          ?.length,
        0
      );
      assert.ok(
        (await admin.storage.from('jd-originals').download(orphan.data.file.id + '.txt')).error
      );
      assert.equal((await file(editor, txtFile.id)).status, 200);
    }
  );
  await t.test(
    'direct state writes, editor approval, reviewer editing, client ownership and state injection cannot bypass workflow',
    async () => {
      const db = await editor.client.database();
      assert.ok(
        (await db.db.from('job_catalog').update({ state: 'published' }).eq('id', job.id)).error
      );
      assert.equal(
        (
          await editor.client.request('/api/admin/jobs', 'POST', {
            id: job.id,
            expectedVersion: job.version,
            job: { ...draft, state: 'published' },
          })
        ).response.status,
        400
      );
      assert.equal(
        (
          await editor.client.request('/api/admin/jobs', 'POST', {
            job: { ...draft, created_by: root.userId },
          })
        ).response.status,
        400
      );
      assert.equal(
        (await step(editor, 'approve', '本人直接批准会被拒绝', true)).response.status,
        403
      );
      assert.equal((await step(reviewer, 'publish')).response.status, 409);
      assert.equal(
        (await reviewer.client.request('/api/admin/jobs', 'POST', { job: draft })).response.status,
        403
      );
      const bad = await editor.client.request('/api/admin/jobs', 'POST', {
        job: { ...draft, retention_evidence: '不存在的留用承诺', source_file_id: null },
      });
      assert.equal(bad.response.status, 201);
      jobIds.push(bad.data.job.id);
      assert.equal((await step(editor, 'submit', '', false, bad.data.job)).response.status, 400);
    }
  );
  await t.test(
    'submission locks content; verified reviewer approval is atomic and publishing makes the same job visible in the real frontend',
    async () => {
      assert.equal((await step(editor, 'submit')).response.status, 200);
      assert.equal(
        (
          await editor.client.request('/api/admin/jobs', 'POST', {
            id: job.id,
            expectedVersion: job.version,
            job: draft,
          })
        ).response.status,
        409
      );
      assert.equal((await step(reviewer, 'approve', '说明过短', true)).response.status, 400);
      const reviewerDb = await reviewer.client.database();
      const noCheck = await reviewerDb.db.rpc('admin_transition_job', {
        job_id: job.id,
        expected_version: job.version,
        action: 'approve',
        reason: '完整的核验说明但缺少来源确认',
        source_checked: null,
      });
      assert.equal(noCheck.error?.message, 'ADMIN_SOURCE_CHECK_REQUIRED');
      const version = job.version;
      const approved = await Promise.all([
        reviewer.client.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
          expectedVersion: version,
          action: 'approve',
          reason: '已核对原始 JD、投递邮箱和留用原文。',
          sourceChecked: true,
        }),
        reviewer.client.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
          expectedVersion: version,
          action: 'approve',
          reason: '已核对原始 JD、投递邮箱和留用原文。',
          sourceChecked: true,
        }),
      ]);
      assert.equal(approved.filter((result) => result.response.status === 200).length, 1);
      assert.equal(approved.filter((result) => result.response.status === 409).length, 1);
      job = approved.find((result) => result.response.ok)!.data.job;
      assert.equal(job.approved_revision, job.revision);
      assert.equal((await step(reviewer, 'publish')).response.status, 200);
      const visible = await anonymous.from('job_catalog').select('*').eq('id', job.id);
      assert.equal(visible.data?.length, 1);
      assert.equal(visible.data?.[0].application_instructions, draft.application_instructions);
      const page = await fetch(base + '/jobs/' + job.id);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes(draft.title));
      assert.ok(html.includes('recruit@example.com'));
      assert.ok(html.includes(draft.application_instructions));
      assert.ok(!html.includes('P0-RAW-ONLY'));
      assert.equal(
        (await ordinary.client.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'application' }))
          .response.status,
        200
      );
    }
  );
  await t.test(
    'duplicates warn without merging and published edits invalidate approval and preserve source/review history',
    async () => {
      const duplicate = await other.client.request('/api/admin/jobs', 'POST', { job: draft });
      assert.equal(duplicate.response.status, 201);
      jobIds.push(duplicate.data.job.id);
      assert.ok(duplicate.data.duplicates.some((item: any) => item.id === job.id));
      assert.equal((await step(editor, 'revise')).response.status, 200);
      assert.equal(job.state, 'draft');
      assert.equal(job.approved_revision, null);
      assert.equal((await fetch(base + '/jobs/' + job.id)).status, 404);
      const before = job.version,
        saved = await editor.client.request('/api/admin/jobs', 'POST', {
          id: job.id,
          expectedVersion: before,
          job: { ...draft, requirements: '经过重新校订的真实要求。', source_file_id: txtFile.id },
        });
      assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
      job = saved.data.job;
      assert.equal(job.revision, 2);
      assert.equal(saved.data.sources.length, 2);
      assert.ok(saved.data.reviews.some((review: any) => review.action === 'approve'));
      assert.equal(
        (
          await editor.client.request('/api/admin/jobs', 'POST', {
            id: job.id,
            expectedVersion: before,
            job: draft,
          })
        ).response.status,
        409
      );
      assert.equal((await step(reviewer, 'publish')).response.status, 409);
      assert.equal((await step(editor, 'submit')).response.status, 200);
      assert.equal(
        (await step(reviewer, 'reject', '请核对最新要求与来源信息，再次提交。')).response.status,
        200
      );
      assert.equal(job.state, 'rejected');
    }
  );
  await t.test(
    'a reviewer promoted from editor cannot approve a job they originally authored',
    async () => {
      const created = await other.client.request('/api/admin/jobs', 'POST', {
        job: { ...draft, title: 'P0 原作者审核隔离', source_file_id: null },
      });
      assert.equal(created.response.status, 201);
      let own = created.data.job;
      jobIds.push(own.id);
      const submitted = await step(other, 'submit', '', false, own);
      assert.equal(submitted.response.status, 200);
      own = submitted.data.job;
      const changed = await root.client.request('/api/admin/team', 'POST', {
        action: 'change',
        userId: other.userId,
        role: 'reviewer',
        active: true,
        reason: '验证角色变更后仍然不能审核本人岗位。',
      });
      assert.equal(changed.response.status, 200);
      assert.equal(
        (await step(other, 'approve', '已核验来源但本人岗位必须由其他人审核。', true, own)).response
          .status,
        403
      );
      const restored = await root.client.request('/api/admin/team', 'POST', {
        action: 'change',
        userId: other.userId,
        role: 'editor',
        active: true,
        reason: '本地角色隔离验收结束恢复编辑。',
      });
      assert.equal(restored.response.status, 200);
    }
  );
  await t.test(
    'super-admin self-review is explicit; deadline hides jobs even before expiry processing and preserves personal applications',
    async () => {
      const created = await root.client.request('/api/admin/jobs', 'POST', {
        job: {
          ...draft,
          title: 'P0 到期岗位测试',
          source_file_id: null,
          deadline_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
      assert.equal(created.response.status, 201);
      expiryJob = created.data.job;
      jobIds.push(expiryJob.id);
      for (const [action, checked] of [
        ['submit', false],
        ['approve', true],
        ['publish', false],
      ] as const) {
        const changed = await step(
          root,
          action,
          '单人运营已逐项核对原文、来源、投递与留用说明。',
          checked,
          expiryJob
        );
        assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
        expiryJob = changed.data.job;
      }
      const stored = await admin
        .from('job_reviews')
        .select('self_review')
        .eq('job_id', expiryJob.id)
        .eq('action', 'approve')
        .single();
      assert.equal(stored.data?.self_review, true);
      const application = await ordinary.client.request(`/api/jobs/${expiryJob.id}/save`, 'POST', {
        kind: 'application',
      });
      assert.equal(application.response.status, 200);
      assert.ifError(
        (
          await admin
            .from('job_catalog')
            .update({ deadline_at: new Date(Date.now() - 1000).toISOString() })
            .eq('id', expiryJob.id)
        ).error
      );
      assert.equal(
        (await anonymous.from('job_catalog').select('id').eq('id', expiryJob.id)).data?.length,
        0
      );
      assert.equal((await fetch(base + '/jobs/' + expiryJob.id)).status, 404);
      assert.equal(
        (
          await ordinary.client.request(`/api/jobs/${expiryJob.id}/save`, 'POST', {
            kind: 'favorite',
          })
        ).response.status,
        404
      );
      const expired = await reviewer.client.request('/api/admin/overview', 'POST', {});
      assert.equal(expired.response.status, 200, JSON.stringify(expired.data));
      assert.ok(expired.data.expired >= 1);
      assert.equal(
        (await admin.from('job_catalog').select('state').eq('id', expiryJob.id).single()).data
          ?.state,
        'expired'
      );
      assert.ok(
        (await ordinary.client.request('/api/entries?kind=application')).data.entries.some(
          (entry: any) => entry.source_job_id === expiryJob.id
        )
      );
    }
  );
  await t.test(
    'expired/revoked invitations fail and disabling an editor revokes existing JWT access at API and database layers',
    async () => {
      const expired = await root.client.request('/api/admin/team', 'POST', {
        action: 'invite',
        email: ordinary.email,
        role: 'reviewer',
      });
      assert.equal(expired.response.status, 201);
      await admin
        .from('admin_invitations')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('id', expired.data.invitation.id);
      assert.equal(
        (
          await ordinary.client.request('/api/admin/invitations/accept', 'POST', {
            token: new URL(expired.data.url).searchParams.get('token'),
          })
        ).response.status,
        400
      );
      const revoked = await root.client.request('/api/admin/team', 'POST', {
        action: 'invite',
        email: ordinary.email,
        role: 'editor',
      });
      assert.equal(
        (
          await root.client.request('/api/admin/team', 'POST', {
            action: 'revoke',
            id: revoked.data.invitation.id,
          })
        ).response.status,
        200
      );
      assert.equal(
        (
          await ordinary.client.request('/api/admin/invitations/accept', 'POST', {
            token: new URL(revoked.data.url).searchParams.get('token'),
          })
        ).response.status,
        400
      );
      const disabled = await root.client.request('/api/admin/team', 'POST', {
        action: 'change',
        userId: editor.userId,
        role: 'editor',
        active: false,
        reason: '本地权限撤销测试，确认旧会话立即失效。',
      });
      assert.equal(disabled.response.status, 200, JSON.stringify(disabled.data));
      assert.equal((await editor.client.request('/api/admin/jobs')).response.status, 403);
      const db = await editor.client.database();
      assert.equal((await db.db.from('job_sources').select('id')).data?.length, 0);
      assert.ok((await db.db.rpc('admin_duplicate_jobs', { payload: draft })).error);
      assert.equal((await file(editor, txtFile.id)).status, 403);
    }
  );
  await t.test(
    'audit rows cannot be rewritten and the final super administrator cannot be demoted or deleted through Auth',
    async () => {
      const db = await root.client.database();
      assert.ok(
        (await db.db.from('admin_audit_logs').update({ note: 'forged' }).eq('job_id', job.id)).error
      );
      assert.ok((await db.db.from('job_reviews').delete().eq('job_id', job.id)).error);
      assert.equal((await ordinary.client.request('/api/admin/logs')).response.status, 403);
      const editorLogs = await other.client.request('/api/admin/logs');
      assert.equal(editorLogs.response.status, 200);
      assert.ok(editorLogs.data.logs.every((row: any) => row.visibility === 'job'));
      const logs = (await root.client.request('/api/admin/logs')).data.logs;
      assert.ok(logs.some((row: any) => row.action === 'membership_changed'));
      assert.ok(
        logs.some(
          (row: any) =>
            row.action === 'membership_changed' &&
            row.from_state === 'editor:active' &&
            row.to_state === 'editor:disabled'
        )
      );
      assert.ok(logs.some((row: any) => row.action === 'publish'));
      assert.equal(
        (
          await root.client.request('/api/admin/team', 'POST', {
            action: 'change',
            userId: root.userId,
            role: 'editor',
            active: false,
            reason: '尝试停用最后一个超级管理员。',
          })
        ).response.status,
        409
      );
      assert.equal(
        (await root.client.request('/api/account', 'DELETE', { confirmation: '注销账号' })).response
          .status,
        409
      );
      assert.ok((await admin.auth.admin.deleteUser(root.authId)).error);
      assert.ifError((await admin.auth.admin.getUserById(root.authId)).error);
    }
  );
});
