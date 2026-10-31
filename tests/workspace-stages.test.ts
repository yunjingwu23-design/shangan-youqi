import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { admin, SessionClient } from './helpers';
import { adminFixture, localAdminSql, removeAdminFixtures } from './admin-fixtures';
import { applicationStatusValues } from '../lib/application-status';

test('real persisted workspace stages, legacy preservation and user isolation', async (t) => {
  const owner = await adminFixture('stages-owner'),
    other = await adminFixture('stages-other');
  t.after(() => removeAdminFixtures([owner, other]));
  const content = '保留原有备注：岗位有 5 轮面试，状态只由本人按实际进度修改。';
  let id = '';
  await t.test(
    'each of the eleven stages can be created and updated in PostgreSQL and recovered on another device',
    async () => {
      const original = await owner.client.request('/api/entries', 'POST', {
        kind: 'application',
        title: '分阶段投递',
        company: '本地测试公司',
        content,
      });
      assert.equal(original.response.status, 201);
      id = original.data.entry.id;
      assert.equal(original.data.entry.status, 'planned');
      for (const status of applicationStatusValues) {
        const changed = await owner.client.request('/api/entries', 'PATCH', { id, status });
        assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
        assert.equal(changed.data.entry.status, status);
        assert.equal(changed.data.entry.content, content);
        assert.equal(changed.data.entry.user_id, owner.userId);
        const stored = await admin
          .from('workspace_entries')
          .select('status,content')
          .eq('id', id)
          .single();
        assert.ifError(stored.error);
        assert.equal(stored.data.status, status);
        assert.equal(stored.data.content, content);
        const created = await owner.client.request('/api/entries', 'POST', {
          kind: 'application',
          title: '直接创建 ' + status,
          status,
          content,
        });
        assert.equal(created.response.status, 201, JSON.stringify(created.data));
        assert.equal(created.data.entry.status, status);
      }
      const device = new SessionClient();
      device.cookies = new Map(owner.client.cookies);
      const restored = await device.request('/api/entries?kind=application&id=' + id);
      assert.equal(restored.data.entries[0].status, 'offer');
      assert.equal(restored.data.entries[0].content, content);
      assert.equal(restored.data.entries[0].user_id, owner.userId);
    }
  );
  await t.test(
    'invalid stages and owner forgery fail, while another authenticated user cannot read or change a stage',
    async () => {
      for (const status of ['interview_6', 'fake_offer', null])
        assert.equal(
          (await owner.client.request('/api/entries', 'PATCH', { id, status })).response.status,
          400
        );
      assert.equal(
        (
          await owner.client.request('/api/entries', 'PATCH', {
            id,
            status: 'oral_oc',
            user_id: other.userId,
          })
        ).response.status,
        400
      );
      assert.equal(
        (await other.client.request('/api/entries?kind=application&id=' + id)).data.entries.length,
        0
      );
      assert.equal(
        (await other.client.request('/api/entries', 'PATCH', { id, status: 'assessment' })).response
          .status,
        404
      );
      const db = await other.client.database();
      const attempted = await db.db
        .from('workspace_entries')
        .update({ status: 'ai_interview' })
        .eq('id', id)
        .select();
      assert.ifError(attempted.error);
      assert.equal(attempted.data.length, 0);
      assert.equal(
        (await admin.from('workspace_entries').select('status').eq('id', id).single()).data?.status,
        'offer'
      );
    }
  );
  await t.test(
    'old interview and closed entries retain their status and notes through reads, saves and repeated migration',
    async () => {
      for (const status of ['interview', 'closed']) {
        const saved = await owner.client.request('/api/entries', 'POST', {
          kind: 'application',
          title: '历史 ' + status,
          status,
          content,
        });
        assert.equal(saved.response.status, 201);
        const updated = await owner.client.request('/api/entries', 'PATCH', {
          id: saved.data.entry.id,
          company: '仅修改公司名',
        });
        assert.equal(updated.response.status, 200);
        assert.equal(updated.data.entry.status, status);
        assert.equal(updated.data.entry.content, content);
      }
      const before = await admin
        .from('workspace_entries')
        .select('*')
        .eq('user_id', owner.userId)
        .order('id');
      assert.ifError(before.error);
      localAdminSql(readFileSync('supabase/migrations/202610310006_workspace_stages.sql', 'utf8'));
      const after = await admin
        .from('workspace_entries')
        .select('*')
        .eq('user_id', owner.userId)
        .order('id');
      assert.ifError(after.error);
      assert.deepEqual(after.data, before.data);
    }
  );
});
