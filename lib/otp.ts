// Supabase supports email OTP lengths from 6 through 10 digits. Keep the
// browser and API aligned; Supabase verifies the complete code and its expiry.
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;
export const OTP_INPUT_PATTERN = `[0-9]{${OTP_MIN_LENGTH},${OTP_MAX_LENGTH}}`;
// Absolute end check: JavaScript's `$` also accepts a trailing newline.
export const OTP_PATTERN = new RegExp(`^${OTP_INPUT_PATTERN}(?![\\s\\S])`);
