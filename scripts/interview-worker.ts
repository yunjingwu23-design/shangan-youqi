import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { runInterviewTask } from '../lib/interviews/worker';
import { OpenAIInterviewProvider } from '../lib/interviews/provider';
async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Worker requires server-side Supabase configuration');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const provider = process.env.OPENAI_API_KEY
    ? new OpenAIInterviewProvider(process.env.OPENAI_API_KEY)
    : undefined;
  if (!provider) console.log('AI provider not configured; running private audio cleanup only.');
  const stop = new AbortController();
  process.once('SIGINT', () => stop.abort());
  process.once('SIGTERM', () => stop.abort());
  while (!stop.signal.aborted) {
    try {
      const worked = await runInterviewTask(db, provider, stop.signal);
      if (process.argv.includes('--once')) break;
      if (!worked) await setTimeout(2000, undefined, { signal: stop.signal });
    } catch {
      if (stop.signal.aborted) break;
      console.error('INTERVIEW_WORKER_UNAVAILABLE');
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
