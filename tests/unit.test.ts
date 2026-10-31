import {
  adminCredentialDiagnostic,
  authLimitDiagnostic,
  authLimitPermissionTarget,
} from '../lib/auth-diagnostics';
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath } from '../lib/navigation';
import { exampleJobs, filterJobs, catalogJobSchema } from '../lib/catalog';
import { emptyResume, readResume, resumeSaveSchema } from '../lib/resume';
import {
  emailSchema,
  otpVerifySchema,
  entrySchema,
  entryPatchSchema,
  profileSchema,
} from '../lib/validation';
test('email is normalized and invalid addresses rejected', () => {
  assert.equal(emailSchema.parse('  Alice@Example.com '), 'alice@example.com');
  assert.equal(emailSchema.safeParse('not-email').success, false);
});
test('login return paths allow site modules and reject external or looping destinations', () => {
  for (const path of ['/resume', '/mock', '/jobs/example?from=home', '/workspace/interviews', '/'])
    assert.equal(safeReturnPath(path), path);
  for (const path of [
    undefined,
    'https://outside.invalid',
    '//outside.invalid',
    '/\\outside.invalid',
    '/login',
    '/api/account',
    '/\nexternal',
  ])
    assert.equal(safeReturnPath(path), '/workspace');
});
test('job search expands only recorded aliases and preserves exact and combined filters', () => {
  assert.equal(filterJobs(exampleJobs, { q: 'CICC', mode: 'fuzzy' })[0].company, '中金公司');
  assert.equal(filterJobs(exampleJobs, { q: 'CICC', mode: 'exact' }).length, 0);
  assert.equal(
    filterJobs(exampleJobs, {
      q: '财务分析',
      mode: 'fuzzy',
      city: '深圳',
      type: 'autumn_recruitment',
    }).length,
    1
  );
  assert.equal(filterJobs(exampleJobs, { q: '不存在的企业' }).length, 0);
});
test('publication requires a source and conversion claims require evidence', () => {
  const { id, verified_at, published_at, updated_at, preview, ...input } = exampleJobs[1];
  assert.equal(catalogJobSchema.safeParse({ ...input, state: 'published' }).success, false);
  assert.equal(
    catalogJobSchema.safeParse({
      ...input,
      state: 'published',
      source_url: 'https://example.com/source',
    }).success,
    false
  );
  assert.equal(
    catalogJobSchema.safeParse({
      ...input,
      state: 'published',
      source_url: 'https://example.com/source',
      retention_evidence: '招聘方原文示例：有留用可能',
    }).success,
    true
  );
});
test('legacy resume text is preserved on read and user ownership cannot be submitted', () => {
  const text = '原有真实经历。'.repeat(1200);
  const parsed = readResume(text, crypto.randomUUID());
  assert.equal(parsed.legacy, true);
  assert.equal(parsed.document.sections.map((s) => s.body).join(''), text);
  const document = emptyResume('测试求职者', 'candidate@example.com');
  assert.equal(
    resumeSaveSchema.safeParse({
      title: '测试简历',
      company: '',
      document,
      user_id: crypto.randomUUID(),
    }).success,
    false
  );
});
test('OTP accepts complete 6–10 digit codes, including eight digits and leading zeroes', () => {
  for (const token of [
    '12345',
    '12345678901',
    'abcdef',
    '<img/>',
    '１２３４５６７８',
    '12 345678',
    '12345678\n',
  ])
    assert.equal(otpVerifySchema.safeParse({ email: 'a@example.com', token }).success, false);
  for (const token of ['012345', '0123456', '01234567', '012345678', '0123456789']) {
    const parsed = otpVerifySchema.parse({ email: 'a@example.com', token });
    assert.equal(parsed.token, token, 'must not truncate codes or lose leading zeroes');
  }
});
test('clients cannot submit their own user_id or overwrite ownership/kind', () => {
  assert.equal(
    entrySchema.safeParse({ kind: 'application', title: 'A', user_id: crypto.randomUUID() })
      .success,
    false
  );
  assert.equal(
    entryPatchSchema.safeParse({ id: crypto.randomUUID(), user_id: crypto.randomUUID() }).success,
    false
  );
  assert.equal(
    entryPatchSchema.safeParse({ id: crypto.randomUUID(), kind: 'resume' }).success,
    false
  );
  assert.equal(
    profileSchema.safeParse({
      full_name: 'A',
      desired_role: '',
      city: '',
      bio: '',
      user_id: crypto.randomUUID(),
    }).success,
    false
  );
});
test('links forbid scripts, data URLs, credentials, and malformed input', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc/passwd',
    'https://u:p@example.com',
    'invalid',
  ])
    assert.equal(entrySchema.safeParse({ kind: 'favorite', title: 'A', url }).success, false);
  assert.equal(
    entrySchema.safeParse({ kind: 'favorite', title: 'A', url: 'https://example.com/path' })
      .success,
    true
  );
});
test('content and fields have explicit limits and valid types', () => {
  assert.equal(entrySchema.safeParse({ kind: 'application', title: ' ' }).success, false);
  assert.equal(entrySchema.safeParse({ kind: 'other', title: 'A' }).success, false);
  assert.equal(
    entrySchema.safeParse({ kind: 'resume', title: 'A', content: 'a'.repeat(20001) }).success,
    false
  );
});

test('auth diagnostics retain useful HTTP/SQL codes without logging upstream secrets', () => {
  const sensitive = 'sensitive-example-key';
  const error = {
    code: '42501',
    message: sensitive,
    details: 'person@example.com',
    hint: sensitive,
  };
  const result = authLimitDiagnostic(403, error);
  assert.deepEqual(result, { httpStatus: 403, errorCode: '42501' });
  assert.equal(JSON.stringify(result).includes(sensitive), false);
  assert.equal(JSON.stringify(result).includes('person@example.com'), false);
  assert.equal(authLimitDiagnostic(404, { code: 'PGRST202' }).errorCode, 'PGRST202');
});

test('auth diagnostics reject arbitrary error code content and distinguish malformed RPC responses', () => {
  assert.deepEqual(authLimitDiagnostic(401, { code: 'sensitive-example-key' }), {
    httpStatus: 401,
    errorCode: 'UPSTREAM_ERROR',
  });
  assert.deepEqual(authLimitDiagnostic(200, null), {
    httpStatus: 200,
    errorCode: 'INVALID_RPC_RESPONSE',
  });
});

test('credential diagnostics distinguish public and admin keys without disclosing values or claims', () => {
  const url = 'https://example-project.supabase.co';
  const publicKey = 'sb_publishable_synthetic-test-value';
  assert.deepEqual(adminCredentialDiagnostic(url, publicKey, publicKey), {
    credentialKind: 'publishable',
    credentialMatchesPublicKey: true,
    credentialProjectMatches: null,
    credentialHasWhitespace: false,
  });
  const secret = 'sb_secret_synthetic-test-value';
  assert.equal(adminCredentialDiagnostic(url, secret, publicKey).credentialKind, 'secret');
  assert.equal(JSON.stringify(adminCredentialDiagnostic(url, secret)).includes(secret), false);
  const legacy = (role: string, ref: string) =>
    `synthetic.${Buffer.from(
      JSON.stringify({
        role,
        ref,
        email: 'private@example.com',
      })
    ).toString('base64url')}.signature`;
  const matching = adminCredentialDiagnostic(url, legacy('service_role', 'example-project'));
  assert.equal(matching.credentialKind, 'legacy_service_role');
  assert.equal(matching.credentialProjectMatches, true);
  assert.equal(JSON.stringify(matching).includes('private@example.com'), false);
  const wrongProject = adminCredentialDiagnostic(url, legacy('service_role', 'other-project'));
  assert.equal(wrongProject.credentialProjectMatches, false);
  assert.equal(
    adminCredentialDiagnostic(url, legacy('anon', 'example-project')).credentialKind,
    'legacy_anon'
  );
  assert.equal(
    adminCredentialDiagnostic(url, legacy('sensitive-role', 'example-project')).credentialKind,
    'legacy_other'
  );
  assert.equal(adminCredentialDiagnostic(url, 'bad.!.jwt').credentialKind, 'unknown');
  assert.equal(adminCredentialDiagnostic(url).credentialKind, 'missing');
  assert.equal(adminCredentialDiagnostic(url, `${secret}\n`).credentialHasWhitespace, true);
});

test('permission diagnostics emit only fixed resource labels', () => {
  for (const [message, expected] of [
    ['permission denied for schema public', 'public_schema'],
    ['permission denied for schema private', 'private_schema'],
    ['permission denied for function consume_auth_rate_limit', 'rate_limit_function'],
    ['permission denied for table auth_rate_limits', 'rate_limit_table'],
    ['permission denied for table private-sensitive-name', 'unknown'],
    ['sensitive@example.com sb_secret_private', 'unknown'],
  ]) {
    assert.equal(authLimitPermissionTarget({ message }), expected);
  }
  assert.equal(authLimitPermissionTarget(null), 'unknown');
});
