import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
import { admin, SessionClient, base, dbUrl, anonKey } from './helpers';
import { wordBlocks, editWord, validateDocx } from '../lib/resume-files/word';
import { NativePdf, subsetFont } from '../lib/resume-files/pdf';
import { RESUME_BUCKET } from '../lib/resume-files/model';
import { emptyResume } from '../lib/resume';
import { templateWord } from '../lib/resume-files/template-word';
const cookie = (client: SessionClient) =>
  [...client.cookies].map(([key, value]) => key + '=' + value).join('; ');
async function fixture(client: SessionClient, email: string) {
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  assert.ifError(generated.error);
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
  assert.ifError(verified.error);
  return generated.data.user.id;
}
async function upload(client: SessionClient, name: string, bytes: Uint8Array, origin = base) {
  const response = await fetch(base + '/api/resumes/upload?name=' + encodeURIComponent(name), {
    method: 'POST',
    headers: { Cookie: cookie(client), Origin: origin, 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
  });
  return { response, data: await response.json() };
}
async function raw(client: SessionClient, id: string) {
  return fetch(base + `/api/resumes/${id}/file`, { headers: { Cookie: cookie(client) } });
}
test('real original resumes: private upload, native editing, versioning and deletion', async (t) => {
  const a = new SessionClient(),
    b = new SessionClient(),
    guest = new SessionClient(),
    users: string[] = [];
  let aUid = '',
    bUid = '',
    pdfId = '',
    wordId = '',
    cloneId = '';
  const word = readFileSync('tests/fixtures/resume-original.docx'),
    pdf = readFileSync('tests/fixtures/resume-original.pdf');
  t.after(async () => {
    for (const client of [a, b]) {
      try {
        await client.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' });
      } catch {}
    }
    for (const id of users) await admin.auth.admin.deleteUser(id);
  });
  users.push(
    await fixture(a, `resume-a-${Date.now()}@example.com`),
    await fixture(b, `resume-b-${Date.now()}@example.com`)
  );
  aUid = (await a.request('/api/profile')).data.profile.user_id;
  bUid = (await b.request('/api/profile')).data.profile.user_id;
  await t.test(
    'upload rejects guests, cross-origin requests, legacy DOC, invalid bytes and oversized files',
    async () => {
      assert.equal((await upload(guest, 'cv.pdf', pdf)).response.status, 401);
      assert.equal(
        (await upload(a, 'cv.pdf', pdf, 'https://outside.invalid')).response.status,
        403
      );
      assert.equal((await upload(a, 'cv.doc', word)).response.status, 400);
      assert.equal(
        (await upload(a, 'cv.pdf', new TextEncoder().encode('fake PDF'))).response.status,
        400
      );
      assert.equal(
        (await upload(a, 'cv.docx', new TextEncoder().encode('not zip'))).response.status,
        400
      );
      assert.equal(
        (await upload(a, 'cv.pdf', new Uint8Array(3 * 1024 * 1024 + 1))).response.status,
        413
      );
    }
  );
  await t.test(
    'PDF and DOCX persist in a private bucket and unchanged originals download byte for byte',
    async () => {
      const p = await upload(a, '原版简历.pdf', pdf),
        w = await upload(a, '自定义模板.docx', word);
      assert.equal(p.response.status, 201, JSON.stringify(p.data));
      assert.equal(w.response.status, 201, JSON.stringify(w.data));
      pdfId = p.data.resume.id;
      wordId = w.data.resume.id;
      assert.equal((await admin.storage.getBucket(RESUME_BUCKET)).data?.public, false);
      assert.deepEqual(Buffer.from(await (await raw(a, pdfId)).arrayBuffer()), pdf);
      assert.deepEqual(Buffer.from(await (await raw(a, wordId)).arrayBuffer()), word);
      const restored = new SessionClient();
      restored.cookies = new Map(a.cookies);
      assert.equal(
        (await restored.request('/api/resumes?id=' + wordId)).data.resume.original.fileName,
        '自定义模板.docx'
      );
      assert.equal((await a.request('/api/profile')).data.profile.user_id, aUid);
    }
  );
  await t.test(
    'B and anonymous clients cannot read, export or update A files, even through Storage',
    async () => {
      assert.equal((await raw(guest, pdfId)).status, 401);
      assert.equal((await raw(b, wordId)).status, 404);
      assert.equal(
        (
          await b.request(`/api/resumes/${wordId}/original`, 'PUT', {
            title: 'forged',
            expectedUpdatedAt: new Date().toISOString(),
            edits: [],
          })
        ).response.status,
        404
      );
      assert.equal(
        (await b.request(`/api/resumes/${wordId}/file`, 'POST', { edits: [] })).response.status,
        404
      );
      const other = await b.database();
      assert.ok(
        (await other.db.storage.from(RESUME_BUCKET).download(aUid + '/' + wordId + '.docx')).error
      );
      assert.equal(
        (
          await a.request('/api/entries', 'PATCH', {
            id: wordId,
            content: 'overwrite original metadata',
          })
        ).response.status,
        400
      );
    }
  );
  let current: any;
  const name = wordBlocks(word).find((block) => block.text === 'Original Candidate')!,
    edits = [{ key: name.key, text: '保留原模板的候选人' }];
  await t.test(
    'Word edits preserve tables, pictures, headers, styles and all other archive parts',
    async () => {
      current = (await a.request('/api/resumes?id=' + wordId)).data.resume;
      const saved = await a.request(`/api/resumes/${wordId}/original`, 'PUT', {
        title: '已修改的原版',
        expectedUpdatedAt: current.updated_at,
        edits,
      });
      assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
      assert.equal(
        (
          await a.request(`/api/resumes/${wordId}/original`, 'PUT', {
            title: 'stale',
            expectedUpdatedAt: current.updated_at,
            edits: [],
          })
        ).response.status,
        409
      );
      const response = await fetch(base + `/api/resumes/${wordId}/file`, {
        method: 'POST',
        headers: { Cookie: cookie(a), Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits }),
      });
      assert.equal(response.status, 200);
      const modified = new Uint8Array(await response.arrayBuffer()),
        before = validateDocx(word),
        after = validateDocx(modified);
      assert.ok(wordBlocks(modified).some((block) => block.text === '保留原模板的候选人'));
      for (const path of Object.keys(before))
        if (path !== 'word/document.xml') assert.deepEqual(after[path], before[path], path);
      assert.deepEqual(
        Buffer.from(await (await raw(a, wordId)).arrayBuffer()),
        word,
        'original must remain immutable'
      );
    }
  );
  await t.test(
    'native PDF replaces actual selectable text, preserves page geometry and exports compact embedded Chinese fonts',
    async () => {
      const font = await subsetFont(
        readFileSync('public/fonts/resume/NotoSansSC-Regular.ttf'),
        '新的候选人姓名',
        readFileSync('public/vendor/resume/harfbuzz-subset.wasm')
      );
      assert.ok(font.length < 100000);
      const engine = await NativePdf.create(
          pdf,
          readFileSync('public/vendor/resume/pdfium.wasm'),
          async () => font
        ),
        info = engine.info();
      assert.equal(info.pages, 2);
      const changed = [
        {
          key: info.blocks.find((block) => block.text === 'Original Candidate')!.key,
          text: '新的候选人姓名',
        },
      ];
      const sameBefore = await engine.render(1, []),
        sameAfter = await engine.render(1, changed);
      assert.deepEqual(sameBefore.pixels, sameAfter.pixels);
      const firstBefore = await engine.render(0, []),
        firstAfter = await engine.render(0, changed);
      assert.deepEqual(
        firstBefore.pixels.slice(firstBefore.width * 170 * 4),
        firstAfter.pixels.slice(firstAfter.width * 170 * 4)
      );
      const exported = await engine.export(changed),
        reopened = await NativePdf.create(
          exported,
          readFileSync('public/vendor/resume/pdfium.wasm'),
          async () => font
        );
      assert.ok(reopened.info().blocks.some((block) => block.text === '新的候选人姓名'));
      assert.ok(!reopened.info().blocks.some((block) => block.text === 'Original Candidate'));
      assert.ok(exported.length < 100000);
      const firstPage = info.blocks.filter((block) => block.page === 0);
      assert.ok(firstPage.length >= 2);
      const multiple = await engine.export([
        { key: firstPage[0].key, text: '' },
        { key: firstPage[1].key, text: '新的候选人姓名' },
      ]);
      const afterDeletion = (
        await NativePdf.create(
          multiple,
          readFileSync('public/vendor/resume/pdfium.wasm'),
          async () => font
        )
      ).info();
      assert.ok(!afterDeletion.blocks.some((block) => block.text === firstPage[0].text));
      assert.ok(!afterDeletion.blocks.some((block) => block.text === firstPage[1].text));
      assert.ok(afterDeletion.blocks.some((block) => block.text === '新的候选人姓名'));
    }
  );
  await t.test(
    'cloning retains current edits but deleting one version removes only its own original',
    async () => {
      const clone = await a.request(`/api/resumes/${wordId}/original`, 'POST', {
        title: '独立版本',
        edits,
      });
      assert.equal(clone.response.status, 201);
      cloneId = clone.data.resume.id;
      assert.deepEqual(clone.data.resume.original.edits, edits);
      assert.equal(
        (await a.request('/api/entries', 'DELETE', { id: cloneId })).response.status,
        200
      );
      assert.ok(
        (await admin.storage.from(RESUME_BUCKET).download(aUid + '/' + cloneId + '.docx')).error
      );
      assert.equal((await raw(a, wordId)).status, 200);
      for (const template of ['classic', 'compact', 'sidebar'] as const) {
        const doc = emptyResume('模板测试');
        doc.template = template;
        doc.sections[0].body = '真实经历';
        assert.ok(wordBlocks(templateWord(doc)).some((block) => block.text === '模板测试'));
      }
    }
  );
  await t.test(
    'personal purge, single-version deletion and account closure remove owned files while keeping another user intact',
    async () => {
      const own = await upload(b, 'b.pdf', pdf);
      assert.equal(own.response.status, 201);
      assert.equal(
        (await a.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' })).response
          .status,
        200
      );
      assert.equal((await admin.storage.from(RESUME_BUCKET).list(aUid)).data?.length, 0);
      assert.equal((await raw(b, own.data.resume.id)).status, 200);
      assert.equal(
        (await b.request('/api/entries', 'DELETE', { id: own.data.resume.id })).response.status,
        200
      );
      assert.equal((await admin.storage.from(RESUME_BUCKET).list(bUid)).data?.length, 0);
      const finalUpload = await upload(b, 'before-account-closure.docx', word);
      assert.equal(finalUpload.response.status, 201);
      const closed = await b.request('/api/account', 'DELETE', { confirmation: '注销账号' });
      assert.equal(closed.response.status, 200, JSON.stringify(closed.data));
      assert.equal((await admin.storage.from(RESUME_BUCKET).list(bUid)).data?.length, 0);
      assert.equal((await b.request('/api/profile')).response.status, 401);
      assert.ok((await admin.auth.admin.getUserById(users[1])).error);
    }
  );
});
