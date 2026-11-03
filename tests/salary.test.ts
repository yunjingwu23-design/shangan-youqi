import test from 'node:test';
import assert from 'node:assert/strict';
import { admin, SessionClient } from './helpers';
import { adminFixture, type AdminFixture } from './admin-fixtures';
import { salaryDefaults } from '../lib/salary/model';
test('salary privacy, moderation, personal ownership and data clearing on real local Supabase', async (t) => {
  const fixtures: AdminFixture[] = [];
  const suffix = Date.now()
    .toString(36)
    .replace(/[0-9]/g, (n) => String.fromCharCode(97 + Number(n)));
  let companyId = '';
  const reportIds: string[] = [];
  t.after(async () => {
    for (const f of fixtures) await admin.auth.admin.deleteUser(f.authId);
    if (companyId) await admin.from('salary_companies').delete().eq('id', companyId);
  });
  const reviewer = await adminFixture('salary-reviewer', 'reviewer');
  fixtures.push(reviewer);
  for (let i = 0; i < 5; i++) fixtures.push(await adminFixture('salary-' + i));
  const a = fixtures[1],
    b = fixtures[2],
    guest = new SessionClient();
  const input = {
    ...salaryDefaults,
    company: `薪资测试${suffix}`,
    role: '软件开发',
    city: '上海',
    base_salary: 20000,
    salary_months: 14,
    bonus: 10000,
    stock: 0,
    subsidy: 6000,
  };
  const adminPath = '/api/admin/salary';
  const listing = async () =>
    (await guest.request('/api/salary?company=' + encodeURIComponent(input.company))).data.groups;
  const review = async (id: string, version: number, state = 'approved') =>
    reviewer.client.request(adminPath, 'POST', {
      action: 'review',
      id,
      version,
      state,
      company_id: companyId,
      role: '软件开发',
      city: '上海',
      source_id: null,
      verified: false,
      privacy_checked: true,
      note: '已核查公司岗位城市并移除身份信息，仅作为用户自述。',
    });
  await t.test('guest/private APIs, CSRF and admin privilege boundaries', async () => {
    assert.equal((await guest.request('/api/salary/reports')).response.status, 401);
    assert.equal((await guest.request('/api/salary/offers', 'POST', input)).response.status, 401);
    assert.equal(
      (await a.client.request('/api/salary/reports', 'POST', input, 'https://evil.example'))
        .response.status,
      403
    );
    assert.equal((await a.client.request(adminPath)).response.status, 403);
    assert.equal(
      (await a.client.request('/api/salary/reports', 'POST', { ...input, state: 'approved' }))
        .response.status,
      400
    );
  });
  await t.test(
    'real submissions stay private, duplicate submission is rejected, other owners cannot edit',
    async () => {
      for (const f of fixtures.slice(1)) {
        const r = await f.client.request('/api/salary/reports', 'POST', input);
        assert.equal(r.response.status, 201, JSON.stringify(r.data));
        reportIds.push(r.data.report.id);
      }
      assert.equal(
        (await a.client.request('/api/salary/reports', 'POST', input)).response.status,
        409
      );
      assert.deepEqual(await listing(), []);
      const direct = await b.client.database();
      const read = await direct.db.from('salary_reports').select('*').eq('id', reportIds[0]);
      assert.equal(read.error, null);
      assert.deepEqual(read.data, []);
      assert.equal(
        (
          await b.client.request('/api/salary/reports', 'PATCH', {
            ...input,
            id: reportIds[0],
            version: 1,
          })
        ).response.status,
        409
      );
      const forge = await direct.db
        .from('salary_reports')
        .update({ state: 'approved' })
        .eq('id', reportIds[1]);
      assert.ok(forge.error);
      const rpc = await direct.db.rpc('salary_review', {
        p_id: reportIds[0],
        p_version: 1,
        p_state: 'approved',
        p_company: null,
        p_role: '开发',
        p_city: '上海',
        p_source: null,
        p_verified: false,
        p_note: '绕过应用直接调用接口的测试内容',
      });
      assert.ok(rpc.error);
    }
  );
  await t.test(
    'reviewed fixed cohorts suppress four contributors and release only coarse aggregate at five',
    async () => {
      const r = await reviewer.client.request(adminPath, 'POST', {
        action: 'company',
        payload: { name: input.company, url: '' },
      });
      assert.equal(r.response.status, 200, JSON.stringify(r.data));
      const companies = (await reviewer.client.request(adminPath)).data.companies;
      companyId = companies.find((c: any) => c.name === input.company).id;
      for (const id of reportIds.slice(0, 4)) {
        const r = await review(id, 1);
        assert.equal(r.response.status, 200, JSON.stringify(r.data));
      }
      assert.deepEqual(await listing(), []);
      assert.equal((await review(reportIds[4], 1)).response.status, 200);
      const groups = await listing();
      assert.equal(groups.length, 1);
      const g = groups[0];
      assert.equal(g.sample_floor, 5);
      assert.equal(g.median, 20000);
      assert.equal(g.total_median, 296000);
      assert.equal('user_id' in g, false);
      assert.equal('id' in g, false);
      assert.equal('base_salary' in g, false);
      assert.equal((await review(reportIds[4], 1)).response.status, 409);
    }
  );
  await t.test(
    'self-review, source verification, source deactivation and internal licensing privacy',
    async () => {
      const own = await reviewer.client.request('/api/salary/reports', 'POST', {
        ...input,
        company: '自审测试公司',
      });
      assert.equal(own.response.status, 201);
      assert.equal((await review(own.data.report.id, 1)).response.status, 403);
      const source = await reviewer.client.request(adminPath, 'POST', {
        action: 'source',
        payload: {
          name: '本地自动化测试来源（非真实薪资）',
          url: 'https://example.com',
          credibility: 'licensed',
          authorization_note: '仅用于隔离本地自动化测试，不代表任何真实数据授权。',
        },
      });
      assert.equal(source.response.status, 200, JSON.stringify(source.data));
      const sources = (await reviewer.client.request(adminPath)).data.sources;
      const sourceId = sources.find((s: any) => s.name === '本地自动化测试来源（非真实薪资）').id;
      try {
        const body = {
          action: 'review',
          id: reportIds[4],
          version: 2,
          state: 'approved',
          company_id: companyId,
          role: '软件开发',
          city: '上海',
          source_id: sourceId,
          verified: false,
          privacy_checked: true,
          note: '本地自动化测试来源核验，非真实外部薪资记录。',
        };
        assert.equal((await reviewer.client.request(adminPath, 'POST', body)).response.status, 400);
        assert.equal(
          (await reviewer.client.request(adminPath, 'POST', { ...body, verified: true })).response
            .status,
          200
        );
        const direct = await a.client.database();
        assert.ok((await direct.db.from('salary_sources').select('authorization_note')).error);
        assert.equal(
          (
            await reviewer.client.request(adminPath, 'POST', {
              action: 'source_toggle',
              payload: { id: sourceId, active: false },
            })
          ).response.status,
          200
        );
        assert.deepEqual(await listing(), []);
        assert.equal(
          (
            await reviewer.client.request(adminPath, 'POST', {
              action: 'source_toggle',
              payload: { id: sourceId, active: true },
            })
          ).response.status,
          200
        );
        assert.equal((await listing()).length, 1);
      } finally {
        await admin.from('salary_reports').update({ source_id: null }).eq('source_id', sourceId);
        await admin.from('salary_sources').delete().eq('id', sourceId);
      }
    }
  );
  await t.test(
    'per-metric privacy also suppresses stock and total when fewer than five contributors disclose them',
    async () => {
      const edit = await a.client.request('/api/salary/reports', 'PATCH', {
        ...input,
        id: reportIds[0],
        version: 2,
        stock: null,
      });
      assert.equal(edit.response.status, 200);
      assert.equal((await review(reportIds[0], 3)).response.status, 200);
      let g = (await listing())[0];
      assert.equal(g.stock_median, null);
      assert.equal(g.total_median, null);
      assert.equal(g.fixed_median, 280000);
      const restore = await a.client.request('/api/salary/reports', 'PATCH', {
        ...input,
        id: reportIds[0],
        version: 4,
      });
      assert.equal(restore.response.status, 200);
      assert.equal((await review(reportIds[0], 5)).response.status, 200);
      g = (await listing())[0];
      assert.equal(g.total_median, 296000);
      const direct = await reviewer.client.database();
      const stale = await direct.db.rpc('salary_review', {
        p_id: reportIds[0],
        p_version: null,
        p_state: 'approved',
        p_company: companyId,
        p_role: '软件开发',
        p_city: '上海',
        p_source: null,
        p_verified: false,
        p_note: '直接 RPC 缺少并发版本号必须被拒绝。',
      });
      assert.equal(stale.error?.code, '40001');
    }
  );
  await t.test(
    'personal offers never become public and unknown stock does not invent total',
    async () => {
      const r = await a.client.request('/api/salary/offers', 'POST', { ...input, stock: null });
      assert.equal(r.response.status, 201, JSON.stringify(r.data));
      const id = r.data.offer.id;
      const read = await b.client.request('/api/salary/offers');
      assert.equal(
        read.data.offers.some((v: any) => v.id === id),
        false
      );
      assert.equal(
        (await b.client.request('/api/salary/offers', 'DELETE', { id })).response.status,
        404
      );
      assert.equal(
        (
          await a.client.request('/api/salary/offers', 'PATCH', {
            ...input,
            id,
            version: 1,
            city: '深圳',
          })
        ).response.status,
        200
      );
      assert.equal(
        (await a.client.request('/api/salary/offers', 'DELETE', { id })).response.status,
        200
      );
    }
  );
  await t.test(
    'editing an approved report withdraws it; complaints can be resolved only by moderators',
    async () => {
      const r = await a.client.request('/api/salary/reports', 'PATCH', {
        ...input,
        id: reportIds[0],
        version: 6,
        base_salary: 21000,
      });
      assert.equal(r.response.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.report.state, 'pending');
      assert.deepEqual(await listing(), []);
      const complaint = await a.client.request('/api/salary/complaints', 'POST', {
        group_key: input.company,
        reason: '此统计组中可能存在重复数据，请审核员核查。',
      });
      assert.equal(complaint.response.status, 201);
      const d = (await reviewer.client.request(adminPath)).data;
      const c = d.complaints.find((v: any) => v.group_key === input.company);
      assert.ok(c);
      assert.equal(
        (
          await a.client.request(adminPath, 'POST', {
            action: 'resolve',
            payload: { id: c.id, resolution: '已核验并处理可能重复的投稿数据。' },
          })
        ).response.status,
        403
      );
      assert.equal(
        (
          await reviewer.client.request(adminPath, 'POST', {
            action: 'resolve',
            payload: { id: c.id, resolution: '已核验并处理可能重复的投稿数据。' },
          })
        ).response.status,
        200
      );
    }
  );
  await t.test(
    'daily salaries cannot be mixed with annual compensation, own deletion and personal purge work',
    async () => {
      assert.equal(
        (
          await a.client.request('/api/salary/reports', 'POST', {
            ...input,
            basis: 'daily',
            salary_months: 12,
          })
        ).response.status,
        400
      );
      assert.equal(
        (await a.client.request('/api/salary/reports', 'DELETE', { id: reportIds[0] })).response
          .status,
        200
      );
      await a.client.request('/api/salary/offers', 'POST', input);
      const direct = await a.client.database();
      const purge = await direct.db.rpc('delete_my_personal_data');
      assert.equal(purge.error, null);
      assert.deepEqual((await a.client.request('/api/salary/offers')).data.offers, []);
    }
  );
});
