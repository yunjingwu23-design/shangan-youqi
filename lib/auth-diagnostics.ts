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
