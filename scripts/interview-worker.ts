import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { runInterviewTask } from '../lib/interviews/worker';
import { ChatReportProvider, type InterviewProvider } from '../lib/interviews/provider';
import { TencentAsrProvider } from '../lib/interviews/asr';

function buildProvider(): InterviewProvider | undefined {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  // Report provider needs one of the chat-model keys.
  const hasReportKey =
    !!process.env.DEEPSEEK_API_KEY ||
    !!process.env.HUNYUAN_API_KEY ||
    !!process.env.OPENAI_API_KEY;

  if (!hasReportKey) {
    console.log('No chat model key configured; running private audio cleanup only.');
    return undefined;
  }

  const report = new ChatReportProvider();

  // Transcribe via Tencent ASR when configured; otherwise there is no
  // speech-to-text, so transcription tasks would fail. We still return a
  // provider so report-only tasks can run, but mark transcribe unavailable.
  if (secretId && secretKey) {
    const asr = new TencentAsrProvider({ secretId, secretKey });
    return {
      transcribeModel: asr.transcribeModel,
      reviewModel: report.reviewModel,
      transcribe: (path, signal) => asr.transcribe(path, signal),
      report: (input, signal) => report.report(input, signal),
    };
  }

  // No ASR configured: provide a stubbed transcribe that fails cleanly so
  // report-only runs still work and transcription errors are reported clearly.
  return {
    transcribeModel: 'asr-unconfigured',
    reviewModel: report.reviewModel,
    transcribe: async () => {
      throw new Error('ASR_UNCONFIGURED');
    },
    report: (input, signal) => report.report(input, signal),
  };
}

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Worker requires server-side Supabase configuration');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const provider = buildProvider();
  const stop = new AbortController();
  process.once('SIGINT', () => stop.abort());
  process.once('SIGTERM', () => stop.abort());
  while (!stop.signal.aborted) {
    try {
      const worked = await runInterviewTask(db, provider, stop.signal);
      if (process.argv.includes('--once')) break;
      if (!worked) await setTimeout(2000, undefined, { signal: stop.signal });
    } catch (err) {
      if (stop.signal.aborted) break;
      console.error('INTERVIEW_WORKER_UNAVAILABLE', err instanceof Error ? err.message : err);
      if (process.argv.includes('--once')) process.exitCode = 1;
      if (process.argv.includes('--once')) break;
      await setTimeout(5000, undefined, { signal: stop.signal }).catch(() => {});
    }
  }
}
void main().catch(() => {
  console.error('INTERVIEW_WORKER_STARTUP_FAILED');
  process.exitCode = 1;
});
