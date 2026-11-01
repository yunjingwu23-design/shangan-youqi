import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { admin, SessionClient, dbUrl, anonKey } from './helpers';
import { createClient } from '@supabase/supabase-js';
import {
  OpenAIInterviewProvider,
  ProviderError,
  reportCost,
  transcriptionCost,
} from '../lib/interviews/provider';
import { runInterviewTask, cleanInterviewAudio } from '../lib/interviews/worker';
import { inspectAudio, encodeAudioChunk, planAudioChunks } from '../lib/interviews/audio';
import {
  AUDIO_BUCKET,
  uploadSchema,
  reportSchema,
  validateEvidence,
} from '../lib/interviews/schema';

function sql(statement: string) {
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
    { input: statement, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const segment = {
  id: randomUUID(),
  speaker: '候选人',
  start: 0,
  end: 2,
  text: '我负责需求梳理，并与工程师确认验收标准。',
};
function reportFor(s = segment) {
  return {
    summary: '受访者描述了需求梳理和验收标准确认。',
    observations: [
      {
        category: '项目证据',
        finding: '回答提到了负责的具体工作。',
        evidence: [{ segment_id: s.id, quote: s.text }],
        suggestion: '下次补充一个真实的验收标准例子。',
        uncertainty: '未说明项目结果，不能据此推断效果。',
      },
    ],
    action_plan: [
      {
        action: '整理一个真实项目案例。',
        reason: '帮助说明实际负责的工作。',
        priority: 'high',
        evidence_segment_ids: [s.id],
      },
    ],
    unknowns: ['无法判断面试官的录用意向。'],
  };
}

test('report evidence and consent boundaries reject invented references and missing authorization', () => {
  const report = reportSchema.parse(reportFor());
  assert.equal(validateEvidence(report, [segment]), report);
  assert.throws(
    () =>
      validateEvidence(
        {
          ...report,
          observations: [
            {
              ...report.observations[0],
              evidence: [{ segment_id: segment.id, quote: '我带领一百人团队' }],
            },
          ],
        },
        [segment]
      ),
    /EVIDENCE/
  );
  assert.throws(
    () =>
      validateEvidence(
        {
          ...report,
          action_plan: [{ ...report.action_plan[0], evidence_segment_ids: [randomUUID()] }],
        },
        [segment]
      ),
    /EVIDENCE/
  );
  assert.equal(uploadSchema.safeParse({ recordingConsent: false }).success, false);
  assert.equal(transcriptionCost(3600), 0.36);
  assert.ok(Math.abs(reportCost(20000, 4000) - 0.0144) < 1e-10);
  assert.throws(() => planAudioChunks(7201));
  assert.throws(() => planAudioChunks(NaN));
  assert.equal(planAudioChunks(241).length, 3);
});

test(
  'real audio, private Storage, durable queue and report lifecycle (OpenAI contract fixture, NOT live AI)',
  { timeout: 120000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'syq-interview-test-'));
    const file = join(dir, 'test.wav');
    const generated = spawnSync(
      'ffmpeg',
      [
        '-nostdin',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=16000',
        '-t',
        '2',
        '-ac',
        '1',
        '-y',
        file,
      ],
      { encoding: 'utf8' }
    );
    assert.equal(generated.status, 0);
    const audio = await readFile(file);
    let calls = 0,
      failAt = 0,
      failNext = false,
      delayNext = false;
    let unblock: (() => void) | undefined;
    let arrived: (() => void) | undefined;
    const server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      assert.equal(req.headers.authorization, 'Bearer contract-test-only');
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/v1/audio/transcriptions') {
        calls++;
        assert.ok(req.headers['content-type']?.startsWith('multipart/form-data; boundary='));
        assert.ok(bytes.includes(Buffer.from('gpt-4o-transcribe')));
        assert.ok(bytes.includes(Buffer.from('interview-segment.mp3')));
        if (failNext || calls === failAt) {
          failNext = false;
          res.statusCode = 429;
          res.end('{}');
          return;
        }
        if (delayNext) {
          delayNext = false;
          arrived?.();
          await new Promise<void>((resolve) => {
            unblock = resolve;
          });
        }
        res.end(JSON.stringify({ text: segment.text }));
      } else if (req.url === '/v1/responses') {
        const body = JSON.parse(bytes.toString());
        assert.equal(body.store, false);
        assert.equal(body.model, 'gpt-4.1-mini');
        assert.equal(body.text.format.type, 'json_schema');
        assert.equal(body.text.format.strict, true);
        const input = JSON.parse(body.input[1].content[0].text);
        assert.equal(input.segments[0].speaker, '候选人');
        res.end(
          JSON.stringify({
            status: 'completed',
            usage: { input_tokens: 1200, output_tokens: 600 },
            output: [
              {
                type: 'message',
                content: [
                  { type: 'output_text', text: JSON.stringify(reportFor(input.segments[0])) },
                ],
              },
            ],
          })
        );
      } else {
        res.statusCode = 404;
        res.end('{}');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const provider = new OpenAIInterviewProvider('contract-test-only', async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://api.openai.com');
      return fetch(`http://127.0.0.1:${address.port}${url.pathname}`, init);
    });
    const a = new SessionClient(),
      b = new SessionClient(),
      guest = new SessionClient();
    const ids: string[] = [];
    t.after(async () => {
      unblock?.();
      await a.request('/api/analytics/consent', 'POST', { choice: 'reject' });
      for (const id of ids) await admin.auth.admin.deleteUser(id);
      await cleanInterviewAudio(admin);
      await rm(dir, { recursive: true, force: true });
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    await a.authenticate(`interview-a-${Date.now()}@example.com`);
    await b.authenticate(`interview-b-${Date.now()}@example.com`);
    const da = await a.database(),
      db = await b.database();
    ids.push(da.session.user.id, db.session.user.id);
    const profile = (await a.request('/api/profile')).data.profile;
    assert.equal(
      (await a.request('/api/analytics/consent', 'POST', { choice: 'accept' })).response.status,
      200
    );
    const analyticsBefore = {
      created: Number(
        sql("select count(*) from private.site_events where event_type='ai_interview_create';")
      ),
      requested: Number(
        sql("select count(*) from private.site_events where event_type='ai_report_request';")
      ),
    };
    const job = (
      await a.request('/api/entries', 'POST', {
        kind: 'application',
        title: '产品经理',
        company: '内部测试',
      })
    ).data.entry;
    const baseDetails = {
      jobId: job.id,
      title: '测试录音复盘',
      round: '一面',
      fileName: 'test.wav',
      fileSize: audio.length,
      mimeType: 'audio/wav',
      recordingConsent: true,
      contextConsent: false,
      jd: '',
      resume: '',
    };
    async function createUploaded(bytes = audio, overrides: Partial<typeof baseDetails> = {}) {
      const details = { ...baseDetails, ...overrides, fileSize: bytes.length };
      const created = await a.request('/api/interviews', 'POST', details);
      assert.equal(created.response.status, 201, JSON.stringify(created.data));
      const id = created.data.id;
      assert.match(id, /^[0-9a-f-]{36}$/);
      const signed = await a.request(`/api/interviews/${id}/upload`, 'POST', {});
      assert.equal(signed.response.status, 200, JSON.stringify(signed.data));
      const uploaded = await fetch(signed.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': details.mimeType, 'x-upsert': 'false' },
        body: bytes,
      });
      assert.ok(uploaded.ok, `Private upload status ${uploaded.status}`);
      return { id, path: signed.data.path, url: signed.data.uploadUrl };
    }
    let current: Awaited<ReturnType<typeof createUploaded>>;
    await t.test(
      'media inspection and time-based reencoding produce independently decodable files',
      async () => {
        const signal = AbortSignal.timeout(30000);
        assert.ok((await inspectAudio(file, signal)) >= 2);
        const path = join(dir, 'chunk.mp3');
        await encodeAudioChunk(file, path, 0, 1, signal);
        assert.ok((await stat(path)).size < 24 * 1024 * 1024);
        assert.ok((await inspectAudio(path, signal)) >= 1);
        const fake = join(dir, 'not-audio');
        await writeFile(fake, '#EXTM3U\nhttp://example.invalid/private');
        await assert.rejects(() => inspectAudio(fake, signal), /CONTAINER/);
      }
    );
    await t.test(
      'authorization, ownership, private Storage and service-only queue are enforced',
      async () => {
        assert.equal((await guest.request('/api/interviews')).response.status, 401);
        assert.equal(
          (await a.request('/api/interviews', 'POST', { ...baseDetails, recordingConsent: false }))
            .response.status,
          400
        );
        assert.equal(
          (await a.request('/api/interviews', 'POST', { ...baseDetails, jd: '未经授权的资料' }))
            .response.status,
          400
        );
        assert.equal(
          (await b.request('/api/interviews', 'POST', baseDetails)).response.status,
          404
        );
        current = await createUploaded();
        assert.equal(
          Number(
            sql("select count(*) from private.site_events where event_type='ai_interview_create';")
          ),
          analyticsBefore.created + 1
        );
        assert.equal((await b.request(`/api/interviews/${current.id}`)).response.status, 404);
        assert.equal(
          (await b.request(`/api/interviews/${current.id}/upload`, 'POST', {})).response.status,
          404
        );
        assert.ok((await db.db.storage.from(AUDIO_BUCKET).download(current.path)).error);
        assert.equal((await da.db.storage.from(AUDIO_BUCKET).download(current.path)).error, null);
        const anon = createClient(dbUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        assert.ok((await anon.storage.from(AUDIO_BUCKET).download(current.path)).error);
        assert.ok(
          (
            await da.db.storage
              .from(AUDIO_BUCKET)
              .upload(`${profile.user_id}/forged/source`, audio, { contentType: 'audio/wav' })
          ).error
        );
        assert.ok((await da.db.rpc('interview_worker', { operation: 'claim' })).error);
        assert.ok(
          (await da.db.from('interview_tasks').insert({ interview_id: current.id, kind: 'report' }))
            .error
        );
        assert.equal(
          (await b.request(`/api/interviews/${current.id}`, 'DELETE', {})).response.status,
          404
        );
      }
    );
    await t.test(
      'uploaded recording queues durably and is transcribed through the HTTP API contract',
      async () => {
        assert.equal(
          (await a.request(`/api/interviews/${current.id}/transcribe`, 'POST', {})).response.status,
          202
        );
        await runInterviewTask(admin); // No key/provider: do not fake a successful transcription.
        assert.equal(
          (await a.request(`/api/interviews/${current.id}`)).data.interview.status,
          'queued'
        );
        await runInterviewTask(admin, provider);
        const detail = (await a.request(`/api/interviews/${current.id}`)).data;
        const unconfirmed = await da.db.rpc('interview_action', {
          interview: current.id,
          action: 'report',
          payload: { version: 1 },
        });
        assert.equal(unconfirmed.error?.message, 'TRANSCRIPT_UNCONFIRMED');
        assert.equal(detail.interview.status, 'review');
        assert.equal(detail.transcript.segments[0].text, segment.text);
        assert.equal(detail.transcript.segments[0].speaker, '未标注');
        assert.equal(calls, 1);
      }
    );
    await t.test(
      'manual speaker correction is versioned and unconfirmed analysis cannot start',
      async () => {
        const detail = (await a.request(`/api/interviews/${current.id}`)).data;
        assert.equal(
          (
            await a.request(`/api/interviews/${current.id}/report`, 'POST', {
              version: 1,
              confirmed: false,
            })
          ).response.status,
          400
        );
        const segments = detail.transcript.segments.map((s: typeof segment) => ({
          ...s,
          speaker: '候选人',
          text: s.text + '（已校对）',
        }));
        assert.equal(
          (
            await a.request(`/api/interviews/${current.id}/transcript`, 'PUT', {
              version: 1,
              segments,
            })
          ).response.status,
          200
        );
        assert.equal(
          (
            await a.request(`/api/interviews/${current.id}/transcript`, 'PUT', {
              version: 1,
              segments,
            })
          ).response.status,
          409
        );
        assert.equal((await a.request(`/api/interviews/${current.id}`)).data.transcript.version, 2);
      }
    );
    await t.test(
      'Responses report uses confirmed transcript, saves citations, supports edit and regeneration',
      async () => {
        assert.equal(
          (
            await a.request(`/api/interviews/${current.id}/report`, 'POST', {
              version: 2,
              confirmed: true,
            })
          ).response.status,
          202
        );
        await runInterviewTask(admin, provider);
        let detail = (await a.request(`/api/interviews/${current.id}`)).data;
        assert.equal(
          Number(
            sql("select count(*) from private.site_events where event_type='ai_report_request';")
          ),
          analyticsBefore.requested + 1
        );
        assert.equal(
          sql(
            "select count(*) from private.site_events where event_type in ('ai_interview_create','ai_report_request') and (to_jsonb(site_events)::text like '%test.wav%' or to_jsonb(site_events)::text like '%已校对%');"
          ),
          '0'
        );
        assert.equal(detail.interview.status, 'complete');
        assert.equal(detail.reports[0].source_version, 2);
        assert.equal(
          detail.reports[0].body.observations[0].evidence[0].quote,
          detail.transcript.segments[0].text
        );
        const body = { ...detail.reports[0].body, summary: '用户人工补充的练习总结' };
        assert.equal(
          (await a.request(`/api/interviews/${current.id}/report`, 'PUT', { revision: 1, body }))
            .response.status,
          200
        );
        detail = (await a.request(`/api/interviews/${current.id}`)).data;
        assert.equal(detail.reports[0].author, 'manual');
        assert.equal(detail.reports.length, 2);
        assert.equal(
          (
            await a.request(`/api/interviews/${current.id}/report`, 'POST', {
              version: 2,
              confirmed: true,
            })
          ).response.status,
          202
        );
        await runInterviewTask(admin, provider);
        detail = (await a.request(`/api/interviews/${current.id}`)).data;
        assert.equal(detail.reports[0].revision, 3);
        const usage = (await a.request('/api/interviews/usage')).data.usage;
        assert.ok(Number(usage.estimated_usd) > 0);
        assert.equal(Number(usage.input_tokens), 2400);
        assert.equal(Number(usage.output_tokens), 1200);
        assert.equal(
          (await a.request(`/api/interviews/${current.id}/report`, 'DELETE', {})).response.status,
          200
        );
        assert.equal((await a.request(`/api/interviews/${current.id}`)).data.reports.length, 0);
      }
    );
    await t.test('retry backoff survives provider errors without re-uploading audio', async () => {
      const item = await createUploaded();
      await a.request(`/api/interviews/${item.id}/transcribe`, 'POST', {});
      failNext = true;
      await runInterviewTask(admin, provider);
      let detail = (await a.request(`/api/interviews/${item.id}`)).data;
      assert.equal(detail.task.state, 'queued');
      assert.equal(detail.task.error_code, 'provider_rate_limit');
      sql(`update public.interview_tasks set available_at=now() where id='${detail.task.id}'`);
      await runInterviewTask(admin, provider);
      detail = (await a.request(`/api/interviews/${item.id}`)).data;
      assert.equal(detail.interview.status, 'review');
      assert.equal(detail.task.attempts, 2);
    });
    await t.test(
      'multi-part audio resumes from completed chunks after a later chunk fails',
      async () => {
        const longPath = join(dir, 'long-test.mp3');
        const generated = spawnSync('ffmpeg', [
          '-nostdin',
          '-v',
          'error',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=440:sample_rate=16000',
          '-t',
          '121',
          '-ac',
          '1',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '32k',
          '-y',
          longPath,
        ]);
        assert.equal(generated.status, 0);
        const item = await createUploaded(await readFile(longPath), {
          fileName: 'long-test.mp3',
          mimeType: 'audio/mpeg',
        });
        await a.request(`/api/interviews/${item.id}/transcribe`, 'POST', {});
        const before = calls;
        failAt = before + 2;
        await runInterviewTask(admin, provider);
        let detail = (await a.request(`/api/interviews/${item.id}`)).data;
        assert.equal(detail.task.state, 'queued');
        assert.equal(detail.task.progress, 48);
        sql(`update public.interview_tasks set available_at=now() where id='${detail.task.id}'`);
        await runInterviewTask(admin, provider);
        detail = (await a.request(`/api/interviews/${item.id}`)).data;
        assert.equal(detail.interview.status, 'review');
        assert.equal(detail.transcript.segments.length, 2);
        assert.equal(calls - before, 3, 'must not transcribe the completed first chunk twice');
      }
    );
    await t.test(
      'in-flight cancellation prevents late model results from restoring a cancelled task',
      async () => {
        const item = await createUploaded();
        await a.request(`/api/interviews/${item.id}/transcribe`, 'POST', {});
        delayNext = true;
        const started = new Promise<void>((resolve) => {
          arrived = resolve;
        });
        const running = runInterviewTask(admin, provider);
        await started;
        assert.equal(
          (await a.request(`/api/interviews/${item.id}/cancel`, 'POST', {})).response.status,
          200
        );
        unblock?.();
        await running;
        const detail = (await a.request(`/api/interviews/${item.id}`)).data;
        assert.equal(detail.interview.status, 'cancelled');
        assert.equal(detail.transcript, null);
      }
    );
    await t.test(
      'expired leases are recovered and stale Workers lose all write privileges',
      async () => {
        const item = await createUploaded();
        await a.request(`/api/interviews/${item.id}/transcribe`, 'POST', {});
        const first = await admin.rpc('interview_worker', { operation: 'claim' });
        assert.ifError(first.error);
        sql(
          `update public.interview_tasks set lease_until=now()-interval '1 second' where id='${first.data.id}'`
        );
        const second = await admin.rpc('interview_worker', { operation: 'claim' });
        assert.ifError(second.error);
        assert.equal(first.data.id, second.data.id);
        assert.notEqual(first.data.lease_token, second.data.lease_token);
        const stale = await admin.rpc('interview_worker', {
          operation: 'heartbeat',
          task: first.data.id,
          lease: first.data.lease_token,
        });
        assert.equal(stale.error?.message, 'LEASE_LOST');
        await a.request(`/api/interviews/${item.id}/cancel`, 'POST', {});
      }
    );
    await t.test('concurrent budget reservations cannot exceed the per-user cap', async () => {
      const work = [];
      for (let i = 0; i < 2; i++) {
        const item = await createUploaded();
        await a.request(`/api/interviews/${item.id}/transcribe`, 'POST', {});
        const claimed = await admin.rpc('interview_worker', { operation: 'claim' });
        assert.ifError(claimed.error);
        work.push(claimed.data);
      }
      sql(
        `update private.interview_limits set monthly_usd=(select estimated_usd+0.015 from private.interview_usage where user_id='${profile.user_id}' and period=date_trunc('month',now())::date) where user_id='${profile.user_id}'`
      );
      const results = await Promise.all(
        work.map((task) =>
          admin.rpc('interview_worker', {
            operation: 'bill',
            task: task.id,
            lease: task.lease_token,
            payload: {
              id: randomUUID(),
              estimated_usd: 0.01,
              audio_seconds: 0,
              model: 'contract-budget-test',
            },
          })
        )
      );
      assert.equal(results.filter((r) => !r.error).length, 1);
      assert.equal(results.find((r) => r.error)?.error?.message, 'QUOTA_EXCEEDED');
      for (const task of work)
        await a.request(`/api/interviews/${task.interview_id}/cancel`, 'POST', {});
      sql(`update private.interview_limits set monthly_usd=5 where user_id='${profile.user_id}'`);
    });
    await t.test(
      'delete removes records and audio; durable cleanup handles late signed uploads',
      async () => {
        assert.equal(
          (await a.request(`/api/interviews/${current.id}`, 'DELETE', {})).response.status,
          200
        );
        assert.equal((await a.request(`/api/interviews/${current.id}`)).response.status, 404);
        const marker = await admin.storage.from(AUDIO_BUCKET).download(current.path);
        assert.equal(marker.data?.size, 0, 'original audio bytes must be removed');
        const late = await fetch(current.url, {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/wav', 'x-upsert': 'false' },
          body: audio,
        });
        assert.equal(late.ok, false, 'old non-upsert tokens cannot overwrite the deletion marker');
        assert.ok((await da.db.storage.from(AUDIO_BUCKET).download(current.path)).error);
        await cleanInterviewAudio(admin);
        assert.equal((await admin.storage.from(AUDIO_BUCKET).download(current.path)).data?.size, 0);
        assert.ok(
          Number(
            sql(`select count(*) from private.interview_cleanup where path='${current.path}'`)
          ) > 0
        );
        sql(
          `update private.interview_cleanup set retain_until=now()-interval '1 second',next_attempt=now() where path='${current.path}'`
        );
        await cleanInterviewAudio(admin);
        assert.ok((await admin.storage.from(AUDIO_BUCKET).download(current.path)).error);
      }
    );
    await t.test(
      'personal-data clearing and account closure remove audio and all interview rows',
      async () => {
        const first = await createUploaded();
        assert.equal(
          (await a.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' }))
            .response.status,
          200
        );
        assert.equal((await a.request('/api/interviews')).data.interviews.length, 0);
        assert.equal((await admin.storage.from(AUDIO_BUCKET).download(first.path)).data?.size, 0);
        assert.ok(
          Number((await a.request('/api/interviews/usage')).data.usage.estimated_usd) > 0,
          'clearing content must not reset paid usage quotas'
        );
        const replacement = (
          await a.request('/api/entries', 'POST', {
            kind: 'application',
            title: '账号注销清理测试',
          })
        ).data.entry;
        const second = await createUploaded(audio, { jobId: replacement.id });
        assert.equal(
          (await a.request('/api/account', 'DELETE', { confirmation: '注销账号' })).response.status,
          200
        );
        assert.equal((await a.request('/api/profile')).response.status, 401);
        assert.equal(
          (await admin.from('interviews').select('id').eq('id', second.id)).data?.length,
          0
        );
        assert.equal((await admin.storage.from(AUDIO_BUCKET).download(second.path)).data?.size, 0);
      }
    );
  }
);

test('provider authentication, timeout and cancellation failures remain explicit and fail closed', async () => {
  const input = { segments: [segment], jobTitle: '测试岗位', round: '一面', jd: '', resume: '' };
  const unauthenticated = new OpenAIInterviewProvider(
    'fixture-only',
    async () => new Response('{}', { status: 401 })
  );
  await assert.rejects(
    () => unauthenticated.report(input, new AbortController().signal),
    (error) => error instanceof ProviderError && error.code === 'provider_auth' && !error.retryable
  );
  const timedOut = new OpenAIInterviewProvider('fixture-only', async () => {
    throw new DOMException('fixture timeout', 'TimeoutError');
  });
  await assert.rejects(
    () => timedOut.report(input, new AbortController().signal),
    (error) =>
      error instanceof ProviderError && error.code === 'provider_timeout' && error.retryable
  );
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    () => timedOut.report(input, cancelled.signal),
    (error) => error instanceof ProviderError && error.code === 'cancelled' && !error.retryable
  );
});
