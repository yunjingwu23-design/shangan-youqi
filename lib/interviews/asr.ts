import { readFile } from 'node:fs/promises';
import { createHmac, createHash } from 'node:crypto';
import { ProviderError } from './provider';

// Tencent Cloud one-sentence recognition via API 3.0 (SentenceRecognition).
// Endpoint: https://asr.tencentcloudapi.com
// Auth: TC3-HMAC-SHA256 signature (SecretId + SecretKey).
//
// Credentials come from the Cloud API key page (https://console.cloud.tencent.com/cam/capi),
// NOT from the TRTC console. Free quota: 5000 calls/month.

export interface TencentAsrConfig {
  secretId: string;
  secretKey: string;
}

function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

function hmacSha256(key: string | Buffer, input: string | Buffer): Buffer {
  return createHmac('sha256', key).update(input).digest();
}

function hmacSha256Hex(key: string | Buffer, input: string | Buffer): string {
  return createHmac('sha256', key).update(input).digest('hex');
}

/**
 * Build the TC3-HMAC-SHA256 Authorization header for a Tencent Cloud API 3.0
 * request. Pure function; never transmits the secret key.
 */
export function buildTc3Authorization(params: {
  secretId: string;
  secretKey: string;
  service: string;
  action: string;
  version: string;
  region: string;
  timestamp: number;
  payload: string;
}): { authorization: string; signedHeaders: string } {
  const { secretId, secretKey, service, action, version, region, timestamp, payload } = params;

  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const credentialScope = `${date}/${service}/tc3_request`;

  const host = `${service}.tencentcloudapi.com`;
  const contentType = 'application/json; charset=utf-8';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';

  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join('\n');

  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256Hex(secretSigning, stringToSign);

  const authorization =
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, signedHeaders };
}

export interface AsrProvider {
  transcribeModel: string;
  transcribe(path: string, signal: AbortSignal): Promise<string>;
}

/**
 * Tencent Cloud ASR provider backed by the API 3.0 SentenceRecognition action.
 * The worker slices long recordings into ≤60s chunks before calling transcribe.
 */
export class TencentAsrProvider implements AsrProvider {
  transcribeModel = 'tencent-asr-sentence';
  private readonly service = 'asr';
  private readonly action = 'SentenceRecognition';
  private readonly version = '2019-06-14';
  private readonly region = 'ap-guangzhou';

  constructor(
    private config: TencentAsrConfig,
    private transport: typeof fetch = fetch
  ) {}

  async transcribe(path: string, signal: AbortSignal): Promise<string> {
    const combined = AbortSignal.any([signal, AbortSignal.timeout(60000)]);
    const bytes = await readFile(path);
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = JSON.stringify({
      ProjectId: 0,
      SubServiceType: 2, // one-sentence recognition
      EngSerViceType: '16k_zh', // Mandarin
      SourceType: 1, // local upload
      VoiceFormat: 'mp3',
      Data: bytes.toString('base64'),
      DataLen: bytes.length,
    });

    const { authorization } = buildTc3Authorization({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      service: this.service,
      action: this.action,
      version: this.version,
      region: this.region,
      timestamp,
      payload,
    });

    const host = `${this.service}.tencentcloudapi.com`;
    let response: Response;
    try {
      response = await this.transport(`https://${host}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Host: host,
          'X-TC-Action': this.action,
          'X-TC-Version': this.version,
          'X-TC-Timestamp': String(timestamp),
          'X-TC-Region': this.region,
          Authorization: authorization,
        },
        body: payload,
        signal: combined,
      });
    } catch {
      throw new ProviderError(signal.aborted ? 'cancelled' : 'provider_timeout', !signal.aborted);
    }
    if (!response.ok) {
      throw new ProviderError(
        response.status === 401 || response.status === 403
          ? 'provider_auth'
          : response.status === 429
            ? 'provider_rate_limit'
            : 'provider_error',
        response.status === 429 || response.status >= 500
      );
    }
    const result = (await response.json()) as {
      Response?: { Result?: string; Error?: { Code?: string; Message?: string } };
    };
    const body = result.Response;
    if (!body || body.Error) {
      throw new ProviderError('audio_asr_error', false);
    }
    const text = (body.Result ?? '').trim();
    if (!text) throw new ProviderError('audio_no_speech', false);
    return text;
  }
}
