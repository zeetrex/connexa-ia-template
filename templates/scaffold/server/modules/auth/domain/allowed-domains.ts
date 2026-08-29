export const ALLOWED_EMAIL_DOMAINS = {{ALLOWED_EMAIL_DOMAINS}} as const;

export function isAllowedEmail(email: string, emailVerified: boolean): boolean {
  if (!emailVerified) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
}
