/**
 * Normalize any phone input to the canonical stored format:
 * bare digits, with the Indian country code (91) stripped.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits;
}
