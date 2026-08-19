/**
 * Sanitizes user input string by stripping potential HTML tags and malicious scripts.
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Validates that a number is a positive, finite, non-NaN number.
 */
export function isValidPositiveNumber(val: any): boolean {
  if (typeof val !== 'number') return false;
  if (isNaN(val) || !isFinite(val)) return false;
  return val > 0;
}

/**
 * Validates username format (alphanumeric, underscores, 3-30 characters)
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username.trim());
}

/**
 * Validates password strength (minimum 6 characters, maximum 100 characters)
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6 && password.length <= 100;
}
