function requireTextEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export function getJwtSecret() {
  return requireTextEnv("JWT_SECRET");
}

export function getAdminAllowedEmail() {
  return requireTextEnv("ADMIN_ALLOWED_EMAIL").toLowerCase();
}

export function getMartVendorJwtSecret() {
  const vendorSecret = String(process.env.MART_VENDOR_JWT_SECRET || "").trim();
  return vendorSecret || getJwtSecret();
}

export function validateCriticalRuntimeConfig() {
  getJwtSecret();
  getAdminAllowedEmail();
}
