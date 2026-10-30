import { spawn } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { MAX_AUDIO_SECONDS } from './schema';

export function planAudioChunks(duration: number, chunkSeconds = 120) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_AUDIO_SECONDS)
    throw new Error('AUDIO_DURATION_INVALID');
  if (!Number.isInteger(chunkSeconds) || chunkSeconds < 1 || chunkSeconds > 120)
    throw new Error('AUDIO_CHUNK_INVALID');
  return Array.from({ length: Math.ceil(duration / chunkSeconds) }, (_, index) => ({
    index,
    start: index * chunkSeconds,
    end: Math.min(duration, (index + 1) * chunkSeconds),
  }));
}
async function command(binary: string, args: string[], signal: AbortSignal, timeout: number) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { signal, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let diagnosticBytes = 0;
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (output.length > 65536) child.kill('SIGKILL');
    });
    child.stderr.on('data', (chunk) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > 65536) child.kill('SIGKILL');
    });
    child.once('error', () => {
      clearTimeout(timer);
      child.kill('SIGKILL');
      reject(new Error(signal.aborted ? 'CANCELLED' : 'AUDIO_PROCESS_FAILED'));
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error(signal.aborted ? 'CANCELLED' : 'AUDIO_PROCESS_FAILED'));
    });
  });
}
export async function inspectAudio(path: string, signal: AbortSignal) {
  const file = await open(path, 'r');
  const buffer = Buffer.alloc(16);
  let header: Buffer;
  try {
    const { bytesRead } = await file.read(buffer, 0, 16, 0);
    header = buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
  const valid =
    header.subarray(0, 3).toString() === 'ID3' ||
    (header[0] === 255 && (header[1] & 224) === 224) ||
    (header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WAVE') ||
    header.subarray(4, 8).toString() === 'ftyp' ||
    header.subarray(0, 4).toString() === 'OggS' ||
    header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!valid) throw new Error('AUDIO_CONTAINER_INVALID');
  const raw = await command(
    'ffprobe',
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_entries',
      'format=duration:stream=codec_type',
      '-of',
      'json',
      path,
    ],
    signal,
    20000
  );
  const result = JSON.parse(raw);
  if (!result.streams?.some((s: { codec_type: string }) => s.codec_type === 'audio'))
    throw new Error('AUDIO_CONTAINER_INVALID');
  const duration = Number(result.format?.duration);
  planAudioChunks(duration);
  return duration;
}
export async function encodeAudioChunk(
  source: string,
  target: string,
  start: number,
  end: number,
  signal: AbortSignal
) {
  await command(
    'ffmpeg',
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-ss',
      String(start),
      '-i',
      source,
      '-t',
      String(end - start),
      '-map',
      '0:a:0',
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '64k',
      '-y',
      target,
    ],
    signal,
    120000
  );
  if ((await stat(target)).size >= 24 * 1024 * 1024) throw new Error('AUDIO_CHUNK_TOO_LARGE');
}
