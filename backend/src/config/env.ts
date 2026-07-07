/**
 * Fail fast at boot if required secrets are missing, rather than throwing
 * deep inside a request (e.g. jwt.sign with an undefined secret).
 */
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if ((process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}
