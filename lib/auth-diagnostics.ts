// Log only a small allowlist of upstream metadata. Never include response bodies,
// messages, hints, email addresses, rate-limit identifiers or credentials.
export function authLimitDiagnostic(status: number, error: unknown) {
  const candidate = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return {
    httpStatus: Number.isInteger(status) && status >= 0 && status <= 599 ? status : 0,
    errorCode:
      typeof candidate === 'string' && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(candidate)
        ? candidate
        : error
          ? 'UPSTREAM_ERROR'
          : 'INVALID_RPC_RESPONSE',
  };
}

// These claims are decoded only to diagnose configuration, never to establish
// authentication or grant privileges. Log fixed labels/booleans, not key material.
export function adminCredentialDiagnostic(url: string, key?: string, publicKey?: string) {
  let credentialKind = 'unknown';
  let credentialProjectMatches: boolean | null = null;
  if (!key) credentialKind = 'missing';
  else if (key.startsWith('sb_secret_')) credentialKind = 'secret';
  else if (key.startsWith('sb_publishable_')) credentialKind = 'publishable';
  else if (key.length <= 8192 && key.split('.').length === 3) {
    try {
      const claims: unknown = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (claims && typeof claims === 'object') {
        const role = 'role' in claims ? claims.role : undefined;
        credentialKind =
          role === 'service_role'
            ? 'legacy_service_role'
            : role === 'anon'
              ? 'legacy_anon'
              : 'legacy_other';
        const host = new URL(url).hostname;
        if ('ref' in claims && typeof claims.ref === 'string' && host.endsWith('.supabase.co')) {
          credentialProjectMatches = claims.ref === host.slice(0, -'.supabase.co'.length);
        }
      }
    } catch {
      // A malformed credential must not leak through an exception or log.
    }
  }
  return {
    credentialKind,
    credentialMatchesPublicKey: Boolean(key && publicKey && key === publicKey),
    credentialProjectMatches,
    credentialHasWhitespace: Boolean(key && /\s/.test(key)),
  };
}

export function authLimitPermissionTarget(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) return 'unknown';
  // Match only known resources; never emit arbitrary upstream error text.
  switch (error.message) {
    case 'permission denied for schema public':
      return 'public_schema';
    case 'permission denied for schema private':
      return 'private_schema';
    case 'permission denied for function consume_auth_rate_limit':
      return 'rate_limit_function';
    case 'permission denied for table auth_rate_limits':
      return 'rate_limit_table';
    default:
      return 'unknown';
  }
}
