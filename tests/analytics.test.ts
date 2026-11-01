import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin, base, anonKey, dbUrl, SessionClient } from './helpers';
import { adminFixture, localAdminSql, removeAdminFixtures } from './admin-fixtures';
import { emptyAdminDraft } from '../lib/admin/model';
import { emptyResume } from '../lib/resume';
import { beijingDate, dateShift, type AnalyticsReport } from '../lib/analytics/model';
test('real first-party analytics, privacy, aggregates, role isolation and attributable audit', async (t) => {
  const root = await adminFixture('analytics-root', 'super_admin'),
    ordinary = await adminFixture('analytics-user'),
    editor = await adminFixture('analytics-editor', 'editor'),
    reviewer = await adminFixture('analytics-reviewer', 'reviewer'),
    disabled = await adminFixture('analytics-disabled', 'editor');
  const actors = [root, ordinary, editor, reviewer, disabled],
    jobs: string[] = [],
    ids: string[] = [];
  const a = new SessionClient(),
    b = new SessionClient(),
    c = new SessionClient(),
    guest = new SessionClient();
  const today = beijingDate();
  const rows = () =>
    JSON.parse(
      localAdminSql(
        `select coalesce(json_agg(t),'[]') from private.site_events t where id in (${ids.map((id) => "'" + id + "'::uuid").join(',') || 'null'});`
      )
    );
  t.after(async () => {
    if (ids.length)
      localAdminSql(
        `delete from private.site_events where id in (${ids.map((id) => "'" + id + "'::uuid").join(',')});`
      );
    // Server-generated events belong only to these disposable logged-in fixtures.
    await ordinary.client.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' });
    await removeAdminFixtures(actors, jobs);
  });
  async function report(query = 'preset=today') {
    const result = await root.client.request('/api/admin/analytics?' + query);
    assert.equal(result.response.status, 200, JSON.stringify(result.data));
    return result.data as AnalyticsReport;
  }
  async function event(client: SessionClient, payload: Record<string, unknown> = {}) {
    const id = randomUUID();
    ids.push(id);
    const body = { id, type: 'page_view', page: '/jobs', ...payload };
    const result = await client.request('/api/analytics/events', 'POST', body);
    return { ...result, id, body };
  }
  await admin.from('admin_memberships').update({ active: false }).eq('user_id', disabled.userId);
  await t.test(
    'page, API, direct RPC and raw event storage reject unauthorized and disabled users',
    async () => {
      assert.equal((await guest.request('/api/admin/analytics')).response.status, 401);
      for (const actor of [ordinary, disabled]) {
        assert.equal((await actor.client.request('/api/admin/analytics')).response.status, 403);
        const db = await actor.client.database();
        assert.equal(
          (await db.db.rpc('admin_site_analytics', { from_date: today, to_date: today })).error
            ?.code,
          '42501'
        );
      }
      const anonymous = await fetch(dbUrl + '/rest/v1/rpc/admin_site_analytics', {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_date: today, to_date: today }),
      });
      assert.ok([401, 403].includes(anonymous.status));
      const db = await ordinary.client.database();
      assert.ok((await db.db.from('site_events').select('*')).error);
      assert.throws(
        () =>
          localAdminSql(
            'begin;set local role authenticated;select * from private.site_events;rollback;'
          ),
        /permission denied/
      );
      assert.ok((await db.db.rpc('record_site_event', {})).error);
      assert.ok((await db.db.rpc('erase_site_analytics', {})).error);
      for (const actor of [editor, reviewer])
        assert.equal((await actor.client.request('/api/admin/analytics')).response.status, 200);
      const denied = await fetch(base + '/admin/analytics', {
        headers: { Cookie: [...ordinary.client.cookies].map(([k, v]) => k + '=' + v).join('; ') },
      });
      assert.ok((await denied.text()).includes('当前账号没有运营权限'));
    }
  );
  await t.test(
    'consent is required, cookies contain no identity, and unsafe event payloads fail',
    async () => {
      const unconsented = await event(guest);
      assert.equal(unconsented.data.accepted, false);
      for (const client of [a, b, c, ordinary.client]) {
        const consent = await client.request('/api/analytics/consent', 'POST', {
          choice: 'accept',
        });
        assert.equal(consent.response.status, 200);
        const cookie = client.cookies.get('syq_analytics')!;
        assert.match(cookie, /^[a-f0-9-]{36}\.[a-f0-9]{64}$/);
        assert.ok(!cookie.includes(ordinary.email));
        const state = await client.request('/api/analytics/consent');
        assert.deepEqual(Object.keys(state.data).sort(), ['choice', 'privacySignal']);
      }
      for (const payload of [
        { content: 'PRIVATE-CONTENT-MUST-NOT-BE-STORED' },
        { type: 'resume_save' },
        { type: 'search', page: '/search', keyword: 'candidate@example.com' },
        { page: '/resume?token=private' },
        { page: '/admin' },
        { type: 'job_click', jobId: randomUUID() },
      ]) {
        assert.equal((await event(a, payload)).response.status, 400);
      }
      const cross = await a.request(
        '/api/analytics/events',
        'POST',
        { id: randomUUID(), type: 'page_view', page: '/jobs' },
        'https://evil.invalid'
      );
      assert.equal(cross.response.status, 403);
      const forged = new SessionClient();
      forged.cookies.set('syq_analytics', randomUUID() + '.' + 'a'.repeat(64));
      assert.equal((await event(forged)).data.accepted, false);
      assert.equal(rows().length, 0);
    }
  );
  await t.test('DNT, GPC and automated traffic do not write events', async () => {
    for (const extra of [
      { DNT: '1' },
      { 'Sec-GPC': '1' },
      { 'User-Agent': 'ExampleBot/1.0' },
    ] as Record<string, string>[]) {
      const id = randomUUID();
      ids.push(id);
      const response = await fetch(base + '/api/analytics/events', {
        method: 'POST',
        headers: {
          Origin: base,
          'Content-Type': 'application/json',
          Cookie: [...a.cookies].map(([k, v]) => k + '=' + v).join('; '),
          ...extra,
        },
        body: JSON.stringify({ id, type: 'page_view', page: '/jobs' }),
      });
      assert.equal((await response.json()).accepted, false);
    }
    assert.equal(rows().length, 0);
  });
  let job: any, baseline: AnalyticsReport;
  await t.test(
    'JD create, edit, review, publish and administrator login retain account and version audit',
    async () => {
      const input = {
        ...emptyAdminDraft,
        company: '真实埋点测试公司',
        title: '真实分析岗位 ' + Date.now(),
        type: 'daily_internship',
        city: '上海',
        responsibilities: '整理产品需求。',
        requirements: '在校生。',
        source_url: 'https://example.com/analytics/source',
        apply_url: 'https://example.com/analytics/apply',
        raw_jd: '授权的本地测试招聘原文：上海产品实习生，整理产品需求，在校生。',
      };
      const made = await root.client.request('/api/admin/jobs', 'POST', { job: input });
      assert.equal(made.response.status, 201, JSON.stringify(made.data));
      job = made.data.job;
      jobs.push(job.id);
      const saved = await root.client.request('/api/admin/jobs', 'POST', {
        id: job.id,
        expectedVersion: job.version,
        job: { ...input, title: input.title + ' 更新' },
      });
      assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
      job = saved.data.job;
      for (const action of ['submit', 'approve', 'publish']) {
        const changed = await root.client.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
          expectedVersion: job.version,
          action,
          reason: '已核验本地招聘原文、来源和投递方式。',
          sourceChecked: true,
        });
        assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
        job = changed.data.job;
      }
      const logs = await admin
        .from('admin_audit_logs')
        .select('actor_id,action,version')
        .eq('job_id', job.id);
      for (const action of ['draft_created', 'draft_saved', 'submit', 'approve', 'publish'])
        assert.ok(
          logs.data?.some(
            (row) => row.action === action && row.actor_id === root.userId && row.version > 0
          ),
          action
        );
      await report();
      await report();
      const login = await admin
        .from('admin_audit_logs')
        .select('id')
        .eq('actor_id', root.userId)
        .eq('action', 'admin_login');
      assert.equal(login.data?.length, 1);
      baseline = await report();
    }
  );
  let firstId = '';
  await t.test(
    'real browser events persist once and PV, period UV, sources, categories and keyword thresholds aggregate correctly',
    async () => {
      const first = await event(a, { page: '/jobs/:id', jobId: job.id, source: 'baidu' });
      assert.equal(first.data.accepted, true);
      firstId = first.id;
      await a.request('/api/analytics/events', 'POST', first.body);
      for (const [client, payload] of [
        [a, { page: '/jobs/:id', jobId: job.id, source: 'internal' }],
        [b, { category: 'daily_internship', source: 'google' }],
        [c, { page: '/jobs/:id', jobId: job.id, source: 'direct' }],
        [ordinary.client, { page: '/resume', source: 'internal' }],
      ] as const)
        assert.equal((await event(client, payload)).data.accepted, true);
      await event(a, { type: 'job_click', jobId: job.id });
      await event(a, { type: 'application_link_click', page: '/jobs/:id', jobId: job.id });
      await event(b, { type: 'category_click', category: 'daily_internship' });
      for (const client of [a, a, b, c])
        await event(client, { type: 'search', page: '/search', keyword: '产品' });
      await event(a, { type: 'search', page: '/search', keyword: '风控' });
      const data = await report();
      assert.equal(data.totals.pv - baseline.totals.pv, 5);
      assert.equal(data.totals.uv - baseline.totals.uv, 4);
      assert.equal(data.totals.active_users - baseline.totals.active_users, 1);
      assert.equal(data.totals.application_clicks - baseline.totals.application_clicks, 1);
      assert.equal(data.jobs.find((j) => j.id === job.id)?.views, 3);
      const category = data.categories.find((v) => v.category === 'daily_internship')!;
      const before = baseline.categories.find((v) => v.category === 'daily_internship')!;
      assert.equal(category.views - before.views, 4);
      assert.equal(category.clicks - before.clicks, 2);
      assert.equal(
        data.sources.find((v) => v.source === 'baidu')!.views -
          (baseline.sources.find((v) => v.source === 'baidu')?.views || 0),
        1
      );
      assert.ok(
        data.keywords.some((k) => k.keyword === '产品' && k.searches >= 4 && k.visitors >= 3)
      );
      assert.ok(!data.keywords.some((k) => k.keyword === '风控'));
      const expected = Number(
        localAdminSql(
          `select count(*) from public.app_users where created_at>='${today}'::date::timestamp at time zone 'Asia/Shanghai' and created_at<('${today}'::date+1)::timestamp at time zone 'Asia/Shanghai';`
        ).trim()
      );
      assert.equal(data.totals.new_users, expected);
      assert.equal(rows().filter((r: any) => r.id === firstId).length, 1);
      assert.ok(!JSON.stringify(rows()).includes(ordinary.email));
    }
  );
  await t.test(
    'only successful business saves count and no private resume or Mock text is recorded',
    async () => {
      for (const kind of ['favorite', 'application'])
        for (let i = 0; i < 2; i++) {
          assert.equal(
            (await ordinary.client.request(`/api/jobs/${job.id}/save`, 'POST', { kind })).response
              .status,
            200
          );
        }
      const privateText = 'PRIVATE-RESUME-AND-MOCK-CONTENT';
      const document = emptyResume('测试用户', 'private@example.com');
      document.sections[0].body = privateText;
      const saved = await ordinary.client.request('/api/resumes', 'POST', {
        title: '私有简历',
        company: '',
        document,
      });
      assert.equal(saved.response.status, 201, JSON.stringify(saved.data));
      const interest = await ordinary.client.request('/api/entries', 'POST', {
        kind: 'interview_review',
        title: '私人意向',
        content: JSON.stringify({ format: 'shangan-mock-interest-v1', note: privateText }),
      });
      assert.equal(interest.response.status, 201);
      const data = await report();
      assert.equal(data.totals.job_saves - baseline.totals.job_saves, 1);
      assert.equal(data.totals.workspace_adds - baseline.totals.workspace_adds, 1);
      assert.equal(data.features.resume_saves - baseline.features.resume_saves, 1);
      assert.equal(data.features.mock_interest - baseline.features.mock_interest, 1);
      assert.equal(
        localAdminSql(
          `select count(*) from private.site_events where to_jsonb(site_events)::text like '%${privateText}%';`
        ).trim(),
        '0'
      );
    }
  );
  await t.test(
    'custom date ranges respect Beijing midnight and period UV is not a daily sum',
    async () => {
      const day = dateShift(today, -40),
        samples = [];
      for (let i = 0; i < 3; i++) samples.push((await event(a)).id);
      localAdminSql(
        `update private.site_events set occurred_at=('${day}'::date::timestamp at time zone 'Asia/Shanghai') - interval '1 second' where id='${samples[0]}';`
      );
      localAdminSql(
        `update private.site_events set occurred_at='${day}'::date::timestamp at time zone 'Asia/Shanghai' where id='${samples[1]}';`
      );
      localAdminSql(
        `update private.site_events set occurred_at=('${day}'::date+1)::timestamp at time zone 'Asia/Shanghai' where id='${samples[2]}';`
      );
      const single = await report(`preset=custom&from=${day}&to=${day}`);
      assert.equal(single.totals.pv, 1);
      assert.equal(single.totals.uv, 1);
      const combined = await report(
        `preset=custom&from=${dateShift(day, -1)}&to=${dateShift(day, 1)}`
      );
      assert.equal(combined.totals.pv, 3);
      assert.equal(combined.totals.uv, 1);
      assert.equal(
        combined.trend.reduce((s, d) => s + d.uv, 0),
        3
      );
      assert.equal(
        (
          await root.client.request(
            '/api/admin/analytics?preset=custom&from=2000-01-01&to=' + today
          )
        ).response.status,
        400
      );
      const direct = await root.client.database();
      assert.equal(
        (
          await direct.db.rpc('admin_site_analytics', {
            from_date: today,
            to_date: dateShift(today, 1),
          })
        ).error?.code,
        '22023'
      );
    }
  );
  await t.test(
    'retention cleanup, consent withdrawal and personal purge remove the correct events',
    async () => {
      const expired = await event(b);
      localAdminSql(
        `update private.site_events set occurred_at=now()-interval '91 days' where id='${expired.id}';`
      );
      assert.ifError((await admin.rpc('cleanup_site_analytics')).error);
      assert.ok(!rows().some((row: any) => row.id === expired.id));
      assert.equal(
        (await a.request('/api/analytics/consent', 'POST', { choice: 'reject' })).response.status,
        200
      );
      assert.ok(!rows().some((row: any) => row.id === firstId));
      assert.equal((await event(a)).data.accepted, false);
      assert.equal(
        (
          await ordinary.client.request('/api/account/data', 'DELETE', {
            confirmation: '删除个人数据',
          })
        ).response.status,
        200
      );
      assert.equal((await report()).totals.active_users, baseline.totals.active_users);
    }
  );
  await t.test(
    'closing a JD stays attributable and does not invent successful applications',
    async () => {
      const closed = await root.client.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
        action: 'close',
        expectedVersion: job.version,
        reason: '本地测试招聘结束，验证下架审计。',
        sourceChecked: false,
      });
      assert.equal(closed.response.status, 200);
      const logs = await admin
        .from('admin_audit_logs')
        .select('actor_id,action,from_state,to_state')
        .eq('job_id', job.id)
        .eq('action', 'close');
      assert.equal(logs.data?.[0]?.actor_id, root.userId);
      assert.equal(logs.data?.[0]?.to_state, 'closed');
      assert.equal(
        (await event(b, { type: 'application_link_click', jobId: job.id, page: '/jobs/:id' }))
          .response.status,
        400
      );
      assert.ok(!Object.hasOwn((await report()).totals, 'successful_applications'));
    }
  );
});
