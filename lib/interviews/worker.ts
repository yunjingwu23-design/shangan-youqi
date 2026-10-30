import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  segmentsSchema,
  reportSchema,
  validateEvidence,
} from './schema';
import { inspectAudio, encodeAudioChunk, planAudioChunks } from './audio';
import { tombstoneInterviewAudio } from './audio-storage';
import {
  ProviderError,
  REVIEW_INSTRUCTIONS,
  reviewInputText,
  transcriptionCost,
  reportCost,
  type InterviewProvider,
} from './provider';

type Task = {
  id: string;
  interview_id: string;
  kind: 'transcribe' | 'report';
  lease_token: string;
  target_version: number;
};
async function rpc(db: SupabaseClient, operation: string, task?: Task, payload: unknown = {}) {
  const { data, error } = await db
    .rpc('interview_worker', {
      operation,
      task: task?.id || null,
      lease: task?.lease_token || null,
      payload,
    })
    .abortSignal(AbortSignal.timeout(10000));
  if (error)
    throw new Error(
      error.message === 'LEASE_LOST'
        ? 'LEASE_LOST'
        : error.message === 'QUOTA_EXCEEDED'
          ? 'QUOTA_EXCEEDED'
          : 'QUEUE_UNAVAILABLE'
    );
  return data;
}
export async function cleanInterviewAudio(db: SupabaseClient) {
  const rows = (await rpc(db, 'cleanup_list')) as { path: string; retain_until: string }[];
  for (const row of rows) {
    const { error } =
      new Date(row.retain_until).getTime() > Date.now()
        ? await tombstoneInterviewAudio(db, row.path)
        : await db.storage.from(AUDIO_BUCKET).remove([row.path]);
    if (!error) await rpc(db, 'cleanup_done', undefined, { path: row.path });
  }
}
export async function runInterviewTask(
  db: SupabaseClient,
  provider?: InterviewProvider,
  shutdown?: AbortSignal
) {
  await cleanInterviewAudio(db);
  if (!provider || shutdown?.aborted) return false;
  const task = (await rpc(db, 'claim')) as Task | null;
  if (!task) return false;
  const controller = new AbortController();
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(30 * 60 * 1000),
    ...(shutdown ? [shutdown] : []),
  ]);
  let progress = 1;
  let heartbeating = false;
  const heartbeat = setInterval(async () => {
    if (heartbeating) return;
    heartbeating = true;
    try {
      await rpc(db, 'heartbeat', task, { progress });
    } catch {
      controller.abort();
    } finally {
      heartbeating = false;
    }
  }, 15000);
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'syq-interview-'));
    await rpc(db, 'heartbeat', task, { progress });
    const { data: item, error } = await db
      .from('interviews')
      .select('*')
      .eq('id', task.interview_id)
      .single();
    if (error || !item) throw new Error('LEASE_LOST');
    if (task.kind === 'transcribe') {
      const { data: object, error: downloadError } = await db.storage
        .from(AUDIO_BUCKET)
        .download(
          item.audio_path,
          {},
          { signal: AbortSignal.any([signal, AbortSignal.timeout(5 * 60 * 1000)]) }
        );
      if (downloadError || !object) throw new Error('STORAGE_UNAVAILABLE');
      if (object.size !== item.file_size || object.size > MAX_AUDIO_BYTES)
        throw new Error('AUDIO_CONTAINER_INVALID');
      const source = join(directory, 'source');
      await writeFile(source, new Uint8Array(await object.arrayBuffer()), { mode: 0o600 });
      const duration = await inspectAudio(source, signal);
      const plan = planAudioChunks(duration);
      const completed = (await rpc(db, 'chunks', task)) as {
        id: string;
        start: number;
        end: number;
        speaker: string;
        text: string;
      }[];
      const segments = [];
      for (const piece of plan) {
        signal.throwIfAborted();
        let segment = completed.find((s) => s.start === piece.start && s.end === piece.end);
        if (!segment) {
          const target = join(directory, `chunk-${piece.index}.mp3`);
          await encodeAudioChunk(source, target, piece.start, piece.end, signal);
          const callId = randomUUID();
          const cost = transcriptionCost(piece.end - piece.start);
          await rpc(db, 'bill', task, {
            id: callId,
            estimated_usd: cost,
            audio_seconds: piece.end - piece.start,
            model: provider.transcribeModel,
          });
          const text = await provider.transcribe(target, signal);
          await rpc(db, 'settle', task, {
            id: callId,
            estimated_usd: cost,
            input_tokens: 0,
            output_tokens: 0,
          });
          segment = {
            id: randomUUID(),
            start: piece.start,
            end: piece.end,
            speaker: '未标注',
            text,
          };
          segmentsSchema.parse([segment]);
          await rpc(db, 'chunk', task, { index: piece.index, segment });
          await rm(target, { force: true });
        }
        segments.push(segment);
        progress = Math.round(((piece.index + 1) / plan.length) * 95);
        await rpc(db, 'heartbeat', task, { progress });
      }
      await rpc(db, 'complete', task, { segments: segmentsSchema.parse(segments), duration });
    } else {
      if (item.transcript_version !== task.target_version) throw new Error('VERSION_CONFLICT');
      const { data: transcript, error: sourceError } = await db
        .from('interview_transcripts')
        .select('segments,confirmed_at')
        .eq('interview_id', item.id)
        .eq('version', task.target_version)
        .single();
      if (sourceError || !transcript?.confirmed_at) throw new Error('TRANSCRIPT_UNCONFIRMED');
      const segments = segmentsSchema.parse(transcript.segments);
      const input = {
        segments,
        jobTitle: item.job_title,
        round: item.round,
        jd: item.context_consent ? item.jd : '',
        resume: item.context_consent ? item.resume : '',
      };
      // Reserve a conservative UTF-8 byte bound plus schema/message overhead.
      const upperInput = Buffer.byteLength(reviewInputText(input) + REVIEW_INSTRUCTIONS) + 20000;
      const callId = randomUUID();
      await rpc(db, 'bill', task, {
        id: callId,
        estimated_usd: reportCost(upperInput, 6000),
        audio_seconds: 0,
        model: provider.reviewModel,
      });
      progress = 30;
      const result = await provider.report(input, signal);
      await rpc(db, 'settle', task, {
        id: callId,
        estimated_usd: reportCost(result.inputTokens, result.outputTokens),
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      });
      const body = validateEvidence(reportSchema.parse(result.body), segments);
      await rpc(db, 'complete', task, { body, model: provider.reviewModel });
    }
  } catch (error) {
    const known = error instanceof Error ? error.message : '';
    const labels: Record<string, string> = {
      AUDIO_DURATION_INVALID: 'audio_duration_invalid',
      AUDIO_CONTAINER_INVALID: 'audio_invalid',
      AUDIO_PROCESS_FAILED: 'audio_invalid',
      AUDIO_CHUNK_TOO_LARGE: 'audio_invalid',
      STORAGE_UNAVAILABLE: 'storage_unavailable',
      QUOTA_EXCEEDED: 'quota_exceeded',
      REPORT_EVIDENCE_INVALID: 'report_invalid',
      VERSION_CONFLICT: 'version_conflict',
      TRANSCRIPT_UNCONFIRMED: 'transcript_unconfirmed',
    };
    const code =
      known === 'LEASE_LOST'
        ? 'lease_lost'
        : error instanceof ProviderError
          ? error.code
          : signal.aborted
            ? 'worker_timeout'
            : labels[known] || 'worker_error';
    // A stale/cancelled Worker cannot change state or publish results.
    if (known !== 'LEASE_LOST') {
      const retry =
        error instanceof ProviderError
          ? error.retryable
          : known === 'STORAGE_UNAVAILABLE' || known === 'QUEUE_UNAVAILABLE';
      try {
        await rpc(db, 'fail', task, { code, retry });
      } catch {
        /* Lease lost/cancelled: result intentionally discarded. */
      }
    }
    console.error('INTERVIEW_TASK_FAILED', { taskId: task.id, code });
  } finally {
    clearInterval(heartbeat);
    controller.abort();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
  return true;
}
