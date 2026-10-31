import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { admin, SessionClient, dbUrl, anonKey, base } from './helpers';
import { emptyResume } from '../lib/resume';
import { emptyAdminDraft } from '../lib/admin/model';
import { localAdminSql } from './admin-fixtures';
test('reconnected site: published jobs, operator RLS and private resume persistence', async (t) => {
  const a = new SessionClient(),
    b = new SessionClient(),
    guest = new SessionClient();
  const users: string[] = [],
    jobs: string[] = [];
  let operatorId: string | undefined;
  t.after(async () => {
    for (const id of jobs) await admin.from('job_catalog').delete().eq('id', id);
    if (operatorId && /^[a-f0-9-]{36}$/.test(operatorId))
      localAdminSql(`delete from public.admin_memberships where user_id='${operatorId}'::uuid;`);
    for (const id of users) await admin.auth.admin.deleteUser(id);
  });
  await a.authenticate(`site-a-${Date.now()}@example.com`);
  await b.authenticate(`site-b-${Date.now()}@example.com`);
  const da = await a.database(),
    db = await b.database();
  users.push(da.session.user.id, db.session.user.id);
  const pa = (await a.request('/api/profile')).data.profile,
    pb = (await b.request('/api/profile')).data.profile;
  operatorId = pa.user_id;
  const anonymous = createClient(dbUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const input = {
    ...emptyAdminDraft,
    company: '本地测试公司',
    title: '整站接入测试岗位',
    type: 'daily_internship',
    city: '北京',
    industry: '测试',
    cohort: '2027 届',
    responsibilities: '仅用于本地验证，不会发布到正式项目。',
    requirements: '本地测试要求',
    source_url: 'https://example.com/verified-test-source',
    apply_url: 'https://example.com/apply-test',
    contacts: [{ email: 'fixture@example.com', label: '本地测试邮箱' }],
    mail_subject: '测试主题',
    aliases: ['fixture-company'],
    retention_evidence: '',
    raw_jd:
      '本地测试公司招聘整站接入测试岗位。本地测试要求。仅用于本地验证，不会发布到正式项目。投递邮箱 fixture@example.com。',
  };
  let job: any;
  await t.test(
    'operators are explicit and ordinary users cannot elevate themselves or publish jobs',
    async () => {
      assert.equal((await guest.request('/api/admin/jobs')).response.status, 401);
      assert.equal((await b.request('/api/admin/jobs')).response.status, 403);
      assert.ok((await db.db.from('site_managers').insert({ user_id: pb.user_id })).error);
      assert.ok((await db.db.from('job_catalog').insert(input)).error);
      assert.ifError((await admin.from('site_managers').insert({ user_id: pa.user_id })).error);
      assert.equal((await a.request('/api/admin/jobs')).response.status, 403);
      assert.ifError(
        (await admin.from('admin_memberships').insert({ user_id: pa.user_id, role: 'super_admin' }))
          .error
      );
      const draft = await a.request('/api/admin/jobs', 'POST', {
        job: input,
      });
      assert.equal(draft.response.status, 201, JSON.stringify(draft.data));
      job = draft.data.job;
      jobs.push(job.id);
      const unseen = await anonymous.from('job_catalog').select('id').eq('id', job.id);
      assert.equal(unseen.data?.length, 0);
      assert.equal(
        (await b.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'application' })).response
          .status,
        404
      );
    }
  );
  await t.test(
    'publication validates review and sources before exposing a job and its contacts',
    async () => {
      const noReview = await a.request('/api/admin/jobs', 'POST', {
        id: job.id,
        expectedUpdatedAt: job.updated_at,
        job: { ...input, state: 'published' },
        sourceReviewed: false,
      });
      assert.equal(noReview.response.status, 400);
      for (const action of ['submit', 'approve', 'publish']) {
        const result = await a.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
          expectedVersion: job.version,
          action,
          reason: '本地端到端验证，已核对来源、职责要求与投递方式。',
          sourceChecked: true,
        });
        assert.equal(result.response.status, 200, JSON.stringify(result.data));
        job = result.data.job;
      }
      const visible = await anonymous.from('job_catalog').select('*').eq('id', job.id);
      assert.equal(visible.data?.length, 1);
      assert.equal(visible.data?.[0].contacts[0].email, 'fixture@example.com');
      const forbidden = await db.db
        .from('job_catalog')
        .update({ title: '未授权篡改' })
        .eq('id', job.id)
        .select();
      assert.ok(forbidden.error);
      const page = await fetch(`${base}/jobs/${job.id}`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes('整站接入测试岗位'));
      assert.ok(html.includes('fixture@example.com'));
    }
  );
  await t.test('adding a published job is atomic, user-owned and idempotent', async () => {
    const results = await Promise.all([
      b.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'application' }),
      b.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'application' }),
    ]);
    assert.ok(results.every((r) => r.response.status === 200));
    assert.equal(results[0].data.entry_id, results[1].data.entry_id);
    assert.equal(results.filter((r) => r.data.created).length, 1);
    const entry = await db.db
      .from('workspace_entries')
      .select('*')
      .eq('id', results[0].data.entry_id)
      .single();
    assert.equal(entry.data?.user_id, pb.user_id);
    assert.equal(entry.data?.source_job_id, job.id);
    assert.equal(entry.data?.status, 'planned');
    const other = await da.db
      .from('workspace_entries')
      .select('id')
      .eq('id', results[0].data.entry_id);
    assert.equal(other.data?.length, 0);
    assert.equal(
      (await b.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'favorite' })).response.status,
      200
    );
    assert.equal(
      (await b.request(`/api/jobs/${job.id}/save`, 'POST', { kind: 'resume' })).response.status,
      400
    );
  });
  let resume: any;
  await t.test(
    'a structured resume persists and a second user cannot read or overwrite it',
    async () => {
      const document = emptyResume('测试候选人', 'site-test@example.com');
      document.sections[0].body = '一段真实的本地测试经历';
      const created = await b.request('/api/resumes', 'POST', {
        title: '我的岗位简历',
        company: '测试公司',
        document,
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.data));
      resume = created.data.resume;
      const read = await b.request(`/api/resumes?id=${resume.id}`);
      assert.equal(read.data.resume.document.sections[0].body, '一段真实的本地测试经历');
      assert.equal((await a.request(`/api/resumes?id=${resume.id}`)).response.status, 404);
      assert.equal(
        (
          await a.request('/api/resumes', 'POST', {
            id: resume.id,
            expectedUpdatedAt: resume.updated_at,
            title: '他人修改',
            company: '',
            document,
          })
        ).response.status,
        409
      );
      const second = new SessionClient();
      second.cookies = new Map(b.cookies);
      assert.equal(
        (await second.request(`/api/resumes?id=${resume.id}`)).data.resume.document.basics.name,
        '测试候选人'
      );
    }
  );
  await t.test(
    'stale saves are rejected without losing content and legacy drafts remain readable',
    async () => {
      const current = (await b.request(`/api/resumes?id=${resume.id}`)).data.resume;
      const changed = await b.request('/api/resumes', 'POST', {
        id: resume.id,
        expectedUpdatedAt: resume.updated_at,
        title: '已更新的岗位版本',
        company: '',
        document: current.document,
      });
      assert.equal(changed.response.status, 200);
      const stale = await b.request('/api/resumes', 'POST', {
        id: resume.id,
        expectedUpdatedAt: resume.updated_at,
        title: '过期覆盖',
        company: '',
        document: current.document,
      });
      assert.equal(stale.response.status, 409);
      assert.equal(
        (await b.request(`/api/resumes?id=${resume.id}`)).data.resume.title,
        '已更新的岗位版本'
      );
      const legacy = (
        await b.request('/api/entries', 'POST', {
          kind: 'resume',
          title: '原有草稿',
          content: '此前保存的文字简历，不应丢失。',
        })
      ).data.entry;
      const read = (await b.request(`/api/resumes?id=${legacy.id}`)).data.resume;
      assert.equal(read.legacy, true);
      assert.equal(read.document.sections[0].body, legacy.content);
      const raw = await db.db
        .from('workspace_entries')
        .select('content')
        .eq('id', legacy.id)
        .single();
      assert.equal(raw.data?.content, legacy.content);
    }
  );
  await t.test(
    'IA collection filters preserve old favorites, isolate resources and obey ownership',
    async () => {
      const resource = (
        await b.request('/api/entries', 'POST', {
          kind: 'favorite',
          title: '资料筛选测试',
          content: JSON.stringify({ format: 'shangan-resource-v1', slug: 'behavioral-stories' }),
          url: 'https://example.com/resources/test',
        })
      ).data.entry;
      const old = (
        await b.request('/api/entries', 'POST', {
          kind: 'favorite',
          title: '此前收藏的岗位',
          content: '原有文字收藏应继续可见',
        })
      ).data.entry;
      const jobs = (await b.request('/api/entries?kind=favorite&collection=jobs')).data.entries;
      const resources = (await b.request('/api/entries?kind=favorite&collection=resources')).data
        .entries;
      assert.ok(jobs.some((entry: any) => entry.id === old.id));
      assert.ok(!jobs.some((entry: any) => entry.id === resource.id));
      assert.ok(resources.some((entry: any) => entry.id === resource.id));
      assert.ok(!resources.some((entry: any) => entry.id === old.id));
      assert.equal(
        (await a.request('/api/entries?kind=favorite&id=' + resource.id)).data.entries.length,
        0
      );
      assert.equal(
        (await b.request('/api/entries?kind=favorite&id=' + old.id)).data.entries[0].content,
        old.content
      );
      assert.equal((await b.request('/api/profile')).data.profile.user_id, pb.user_id);
    }
  );
  await t.test(
    'server-rendered search stays private and read-only navigation preserves records and user ID',
    async () => {
      const title = 'IA-private-record-' + Date.now();
      const record = (
        await b.request('/api/entries', 'POST', {
          kind: 'application',
          title,
          content: '导航期间不可被修改',
          company: title + '-only-owner',
          status: 'interview',
        })
      ).data.entry;
      const cookie = [...b.cookies].map(([key, value]) => key + '=' + value).join('; ');
      const otherCookie = [...a.cookies].map(([key, value]) => key + '=' + value).join('; ');
      const before = await db.db.from('workspace_entries').select('*').order('id');
      assert.equal(before.error, null);
      const own = await fetch(base + '/search?q=' + title, { headers: { Cookie: cookie } });
      const other = await fetch(base + '/search?q=' + title, { headers: { Cookie: otherCookie } });
      const publicResponse = await fetch(base + '/search?q=' + title);
      const ownHtml = await own.text(),
        otherHtml = await other.text(),
        guestHtml = await publicResponse.text();
      assert.ok(ownHtml.includes(record.id));
      assert.ok(ownHtml.includes(title + '-only-owner'));
      assert.ok(!otherHtml.includes(record.id));
      assert.ok(!otherHtml.includes(title + '-only-owner'));
      assert.ok(!guestHtml.includes(record.id));
      assert.ok(!guestHtml.includes(title + '-only-owner'));
      assert.match(own.headers.get('cache-control') || '', /no-store/);
      for (const path of [
        '/workspace',
        '/resume?id=' + resume.id,
        '/resources',
        '/interview-center/history',
      ]) {
        const response = await fetch(base + path, { headers: { Cookie: cookie } });
        assert.equal(response.status, 200);
        await response.arrayBuffer();
      }
      const after = await db.db.from('workspace_entries').select('*').order('id');
      assert.equal(after.error, null);
      assert.deepEqual(after.data, before.data);
      assert.equal((await b.request('/api/profile')).data.profile.user_id, pb.user_id);
      assert.equal(
        (await b.request('/api/entries?kind=application&id=' + record.id)).data.entries[0].content,
        '导航期间不可被修改'
      );
    }
  );
});
