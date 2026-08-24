import jwt from "jsonwebtoken";
import { getJwtSecret } from "../services/runtimeConfig";

export type AuthClaims = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  mode?: string;
  iat?: number;
  exp?: number;
};

function readBearerToken(req: any) {
  const raw = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  if (!raw) return "";
  const m = raw.match(/^\s*Bearer\s+(.+)\s*$/i);
  if (!m) return "";
  const token = String(m[1] || "").trim();
  if (!token) return "";
  return token.replace(/^"+|"+$/g, "").trim();
}

function readQueryToken(req: any) {
  const candidates = [
    req?.query?.auth_token,
    req?.query?.access_token,
    req?.query?.token,
  ];
  for (const value of candidates) {
    const token = String(value || "").trim().replace(/^"+|"+$/g, "");
    if (token) return token;
  }
  return "";
}

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function supabaseAnonKey() {
  return String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
}

function firebaseApiKey() {
  return String(process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "").trim();
}

async function verifySupabaseAccessToken(token: string): Promise<AuthClaims | null> {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;

  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`
      }
    });
    if (!r.ok) return null;
    const user: any = await r.json();
    if (!user?.id) return null;

    return {
      sub: String(user.id),
      email: user.email || null,
      phone: user.phone || null,
      name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      mode: "supabase_access"
    };
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(token: string): Promise<AuthClaims | null> {
  const key = firebaseApiKey();
  if (!key) return null;

  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    if (!r.ok) return null;
    const out: any = await r.json();
    const user = Array.isArray(out?.users) ? out.users[0] : null;
    if (!user?.localId) return null;

    return {
      sub: String(user.localId),
      email: user.email || null,
      phone: user.phoneNumber || null,
      name: user.displayName || null,
      mode: "firebase_id"
    };
  } catch {
    return null;
  }
}

export function getAuthClaims(req: any): AuthClaims | null {
  return ((req as any).auth || null) as AuthClaims | null;
}

export async function requireAuth(req: any, res: any, next: any) {
  const token = readBearerToken(req) || readQueryToken(req);
  if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthClaims;
    if (!decoded?.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    (req as any).auth = decoded;
    return next();
  } catch {
    const supabaseClaims = await verifySupabaseAccessToken(token);
    if (supabaseClaims?.sub) {
      (req as any).auth = supabaseClaims;
      return next();
    }
    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (!firebaseClaims?.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    (req as any).auth = firebaseClaims;
    return next();
  }
}
