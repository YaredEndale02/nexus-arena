/**
 * Helper utility for phone-first authentication and phone number normalization.
 */

/**
 * Normalizes a raw phone input (e.g. "0911223344", "+251911223344", "0712345678")
 * to a clean numerical string.
 */
export function normalizePhoneNumber(phone: string): string {
  const digitsOnly = (phone || "").replace(/\D/g, "");
  if (!digitsOnly) return "";

  // If starts with 0 (e.g. 0911223344), convert to 251911223344
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return `251${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

/**
 * Determines whether a string is a phone number or an email.
 */
export function isPhoneNumber(input: string): boolean {
  const trimmed = (input || "").trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7;
}

/**
 * Converts a phone number or email into a valid Supabase auth email credential.
 * If input is a phone number, returns `phone_digits@phone.nexus`.
 * If input is an email, returns trimmed email.
 */
export function toAuthEmailCredential(input: string): string {
  const trimmed = (input || "").trim();
  if (isPhoneNumber(trimmed)) {
    const normalized = normalizePhoneNumber(trimmed);
    return `${normalized}@phone.nexus`;
  }
  return trimmed;
}
