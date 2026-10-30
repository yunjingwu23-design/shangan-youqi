import {
  adminCredentialDiagnostic,
  authLimitDiagnostic,
  authLimitPermissionTarget,
} from '../lib/auth-diagnostics';
import test from 'node:test';
import assert from 'node:assert/strict';
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
test('OTP requires exactly six digits', () => {
  for (const token of ['12345', '1234567', 'abcdef', '<img/>'])
    assert.equal(otpVerifySchema.safeParse({ email: 'a@example.com', token }).success, false);
  assert.equal(
    otpVerifySchema.safeParse({ email: 'a@example.com', token: '123456' }).success,
    true
  );
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
